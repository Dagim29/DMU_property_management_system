"""
Serializers for Team Communication
"""
from rest_framework import serializers
from apps.maintenance.communication_models import (
    TeamMessage,
    TeamConversation,
    TeamAnnouncement,
    AnnouncementRead
)
from apps.users.models import User


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for messages."""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'profile_photo', 'role']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class TeamMessageSerializer(serializers.ModelSerializer):
    """Serializer for team messages."""
    sender_info = UserMinimalSerializer(source='sender', read_only=True)
    recipient_info = UserMinimalSerializer(source='recipient', read_only=True)
    work_order_id = serializers.IntegerField(source='work_order.id', read_only=True, allow_null=True)
    
    class Meta:
        model = TeamMessage
        fields = [
            'id', 'sender', 'sender_info', 'recipient', 'recipient_info',
            'message_type', 'priority', 'subject', 'message', 'attachment',
            'is_read', 'read_at', 'work_order', 'work_order_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['sender', 'is_read', 'read_at', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Set sender from request context
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)


class TeamMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating team messages."""
    
    class Meta:
        model = TeamMessage
        fields = [
            'recipient', 'message_type', 'priority', 'subject',
            'message', 'attachment', 'work_order'
        ]
    
    def validate(self, data):
        # Direct messages must have a recipient
        if data.get('message_type') == 'DIRECT' and not data.get('recipient'):
            raise serializers.ValidationError({
                'recipient': 'Recipient is required for direct messages'
            })
        
        # Broadcast messages should not have a recipient
        if data.get('message_type') in ['BROADCAST', 'ANNOUNCEMENT'] and data.get('recipient'):
            raise serializers.ValidationError({
                'recipient': 'Broadcast messages should not have a specific recipient'
            })
        
        return data


class TeamConversationSerializer(serializers.ModelSerializer):
    """Serializer for conversations."""
    participant_1_info = UserMinimalSerializer(source='participant_1', read_only=True)
    participant_2_info = UserMinimalSerializer(source='participant_2', read_only=True)
    last_message_preview = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TeamConversation
        fields = [
            'id', 'participant_1', 'participant_1_info', 'participant_2', 'participant_2_info',
            'last_message', 'last_message_at', 'last_message_preview',
            'other_participant', 'unread_count', 'created_at'
        ]
        read_only_fields = ['created_at', 'last_message_at']
    
    def get_last_message_preview(self, obj):
        if obj.last_message:
            return {
                'message': obj.last_message.message[:100],
                'sender_id': obj.last_message.sender.id,
                'created_at': obj.last_message.created_at
            }
        return None
    
    def get_other_participant(self, obj):
        request_user = self.context['request'].user
        other = obj.participant_2 if obj.participant_1.id == request_user.id else obj.participant_1
        return UserMinimalSerializer(other).data
    
    def get_unread_count(self, obj):
        request_user = self.context['request'].user
        return obj.get_unread_count(request_user)


class TeamAnnouncementSerializer(serializers.ModelSerializer):
    """Serializer for team announcements."""
    author_info = UserMinimalSerializer(source='author', read_only=True)
    is_read_by_user = serializers.SerializerMethodField()
    target_users_info = UserMinimalSerializer(source='target_specific_users', many=True, read_only=True)
    
    class Meta:
        model = TeamAnnouncement
        fields = [
            'id', 'author', 'author_info', 'title', 'content', 'category',
            'priority', 'target_all_technicians', 'target_specific_users',
            'target_users_info', 'attachment', 'is_pinned', 'is_active',
            'expires_at', 'view_count', 'is_read_by_user', 'created_at', 'updated_at'
        ]
        read_only_fields = ['author', 'view_count', 'created_at', 'updated_at']
    
    def get_is_read_by_user(self, obj):
        request_user = self.context['request'].user
        return AnnouncementRead.objects.filter(
            announcement=obj,
            user=request_user
        ).exists()
    
    def create(self, validated_data):
        # Set author from request context
        validated_data['author'] = self.context['request'].user
        target_users = validated_data.pop('target_specific_users', [])
        announcement = super().create(validated_data)
        if target_users:
            announcement.target_specific_users.set(target_users)
        return announcement


class TeamAnnouncementCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating announcements."""
    target_specific_user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = TeamAnnouncement
        fields = [
            'title', 'content', 'category', 'priority',
            'target_all_technicians', 'target_specific_user_ids',
            'attachment', 'is_pinned', 'expires_at'
        ]
    
    def validate(self, data):
        # If not targeting all, must have specific users
        if not data.get('target_all_technicians') and not data.get('target_specific_user_ids'):
            raise serializers.ValidationError({
                'target_specific_user_ids': 'Must specify target users if not targeting all technicians'
            })
        return data
    
    def create(self, validated_data):
        target_user_ids = validated_data.pop('target_specific_user_ids', [])
        validated_data['author'] = self.context['request'].user
        
        announcement = TeamAnnouncement.objects.create(**validated_data)
        
        if target_user_ids:
            users = User.objects.filter(id__in=target_user_ids)
            announcement.target_specific_users.set(users)
        
        return announcement


class AnnouncementReadSerializer(serializers.ModelSerializer):
    """Serializer for announcement read tracking."""
    
    class Meta:
        model = AnnouncementRead
        fields = ['id', 'announcement', 'user', 'created_at']
        read_only_fields = ['user', 'created_at']
