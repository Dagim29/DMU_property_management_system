"""
Views for Team Communication
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, Max, Case, When, IntegerField
from django.utils import timezone
from django.db import transaction

from apps.maintenance.communication_models import (
    TeamMessage,
    TeamConversation,
    TeamAnnouncement,
    AnnouncementRead
)
from apps.maintenance.communication_serializers import (
    TeamMessageSerializer,
    TeamMessageCreateSerializer,
    TeamConversationSerializer,
    TeamAnnouncementSerializer,
    TeamAnnouncementCreateSerializer,
    AnnouncementReadSerializer,
    UserMinimalSerializer
)
from apps.users.models import User
from apps.core.models import Notification


class TeamMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for team messages.
    Handles direct messages and broadcasts.
    """
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TeamMessageCreateSerializer
        return TeamMessageSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Get messages where user is sender or recipient
        queryset = TeamMessage.objects.filter(
            Q(sender=user, is_deleted_by_sender=False) |
            Q(recipient=user, is_deleted_by_recipient=False) |
            Q(message_type__in=['BROADCAST', 'ANNOUNCEMENT'], recipient__isnull=True)
        ).select_related('sender', 'recipient', 'work_order').order_by('-created_at')
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new message."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        message_type = serializer.validated_data.get('message_type', 'DIRECT')
        
        if message_type == 'BROADCAST':
            # Create broadcast messages for all technicians
            return self._create_broadcast(serializer.validated_data)
        else:
            # Create direct message
            return self._create_direct_message(serializer.validated_data)
    
    def _create_direct_message(self, validated_data):
        """Create a direct message."""
        validated_data['sender'] = self.request.user
        message = TeamMessage.objects.create(**validated_data)
        
        # Update or create conversation
        if message.recipient:
            conversation = TeamConversation.get_or_create_conversation(
                message.sender,
                message.recipient
            )
            conversation.last_message = message
            conversation.last_message_at = message.created_at
            conversation.increment_unread(message.recipient)
            conversation.save()
            
            # Create notification for recipient
            # Determine correct link based on recipient role
            if message.recipient.role == 'MAINTENANCE_SUPERVISOR':
                link = f'/dashboard/supervisor/communication?user={message.sender.id}'
            elif message.recipient.role == 'MAINTENANCE_TECHNICIAN':
                link = f'/dashboard/technician/communication?user={message.sender.id}'
            else:
                link = f'/dashboard/communication?user={message.sender.id}'
            
            Notification.objects.create(
                user=message.recipient,
                title=f"New message from {message.sender.get_full_name()}",
                message=message.message[:100],
                notification_type='INFO',
                link=link
            )
        
        serializer = TeamMessageSerializer(message, context={'request': self.request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def _create_broadcast(self, validated_data):
        """Create broadcast messages for all technicians."""
        sender = self.request.user
        validated_data['sender'] = sender
        validated_data['message_type'] = 'BROADCAST'
        
        # Get all technicians
        technicians = User.objects.filter(
            role='MAINTENANCE_TECHNICIAN',
            is_active=True
        )
        
        messages_created = []
        for tech in technicians:
            message_data = validated_data.copy()
            message_data['recipient'] = tech
            message = TeamMessage.objects.create(**message_data)
            messages_created.append(message)
            
            # Create notification
            Notification.objects.create(
                user=tech,
                title=f"📢 Broadcast from {sender.get_full_name()}",
                message=message.message[:100],
                notification_type='WARNING',
                link='/dashboard/technician/communication'
            )
        
        return Response({
            'message': f'Broadcast sent to {len(messages_created)} technicians',
            'count': len(messages_created)
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """Get all conversations for the current user."""
        user = request.user
        
        # Get conversations where user is a participant
        conversations = TeamConversation.objects.filter(
            Q(participant_1=user) | Q(participant_2=user)
        ).select_related('participant_1', 'participant_2', 'last_message')
        
        serializer = TeamConversationSerializer(
            conversations,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def conversation_with(self, request):
        """Get messages in a conversation with a specific user."""
        other_user_id = request.query_params.get('user_id')
        
        if not other_user_id:
            return Response(
                {'error': 'user_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get messages between the two users
        messages = TeamMessage.objects.filter(
            Q(sender=request.user, recipient=other_user, is_deleted_by_sender=False) |
            Q(sender=other_user, recipient=request.user, is_deleted_by_recipient=False)
        ).select_related('sender', 'recipient').order_by('created_at')
        
        # Mark messages as read
        TeamMessage.objects.filter(
            sender=other_user,
            recipient=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        # Reset unread count in conversation
        conversation = TeamConversation.get_or_create_conversation(request.user, other_user)
        conversation.reset_unread(request.user)
        
        serializer = TeamMessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a message as read."""
        message = self.get_object()
        
        if message.recipient != request.user:
            return Response(
                {'error': 'You can only mark your own messages as read'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.mark_as_read()
        
        return Response({'status': 'Message marked as read'})
    
    @action(detail=True, methods=['delete'])
    def soft_delete(self, request, pk=None):
        """Soft delete a message."""
        message = self.get_object()
        
        if message.sender == request.user:
            message.is_deleted_by_sender = True
        elif message.recipient == request.user:
            message.is_deleted_by_recipient = True
        else:
            return Response(
                {'error': 'You can only delete your own messages'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.save()
        
        return Response({'status': 'Message deleted'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get unread message count for current user."""
        count = TeamMessage.objects.filter(
            recipient=request.user,
            is_read=False,
            is_deleted_by_recipient=False
        ).count()
        
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['get'])
    def team_members(self, request):
        """Get list of team members for messaging."""
        user = request.user
        
        if user.role == 'MAINTENANCE_SUPERVISOR':
            # Supervisors can message technicians
            members = User.objects.filter(
                role='MAINTENANCE_TECHNICIAN',
                is_active=True
            )
        elif user.role == 'MAINTENANCE_TECHNICIAN':
            # Technicians can message supervisors and other technicians
            members = User.objects.filter(
                Q(role='MAINTENANCE_SUPERVISOR') | Q(role='MAINTENANCE_TECHNICIAN'),
                is_active=True
            ).exclude(id=user.id)
        else:
            members = User.objects.none()
        
        serializer = UserMinimalSerializer(members, many=True)
        return Response(serializer.data)


class TeamAnnouncementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for team announcements.
    Supervisors can create, technicians can read.
    """
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TeamAnnouncementCreateSerializer
        return TeamAnnouncementSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        queryset = TeamAnnouncement.objects.filter(
            is_active=True
        ).select_related('author').prefetch_related('target_specific_users')
        
        # Filter by user role
        if user.role == 'MAINTENANCE_TECHNICIAN':
            # Technicians see announcements targeted to them
            queryset = queryset.filter(
                Q(target_all_technicians=True) |
                Q(target_specific_users=user)
            )
        
        # Filter out expired announcements
        now = timezone.now()
        queryset = queryset.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        )
        
        return queryset.order_by('-is_pinned', '-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new announcement (supervisors only)."""
        if request.user.role != 'MAINTENANCE_SUPERVISOR':
            return Response(
                {'error': 'Only supervisors can create announcements'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Set author and send notifications."""
        announcement = serializer.save()
        
        # Determine recipients
        if announcement.target_all_technicians:
            recipients = User.objects.filter(
                role='MAINTENANCE_TECHNICIAN',
                is_active=True
            )
        else:
            recipients = announcement.target_specific_users.all()
        
        # Create notifications
        for recipient in recipients:
            # Determine correct link based on recipient role
            if recipient.role == 'MAINTENANCE_SUPERVISOR':
                link = '/dashboard/supervisor/communication'
            elif recipient.role == 'MAINTENANCE_TECHNICIAN':
                link = '/dashboard/technician/communication'
            else:
                link = '/dashboard/communication'
            
            Notification.objects.create(
                user=recipient,
                title=f"📢 New Announcement: {announcement.title}",
                message=announcement.content[:100],
                notification_type='WARNING' if announcement.priority in ['HIGH', 'URGENT'] else 'INFO',
                link=link
            )
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark announcement as read by current user."""
        announcement = self.get_object()
        
        read_record, created = AnnouncementRead.objects.get_or_create(
            announcement=announcement,
            user=request.user
        )
        
        if created:
            announcement.increment_view_count()
        
        return Response({'status': 'Announcement marked as read'})
    
    @action(detail=True, methods=['post'])
    def toggle_pin(self, request, pk=None):
        """Toggle pin status (supervisors only)."""
        if request.user.role != 'MAINTENANCE_SUPERVISOR':
            return Response(
                {'error': 'Only supervisors can pin announcements'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        announcement = self.get_object()
        announcement.is_pinned = not announcement.is_pinned
        announcement.save()
        
        return Response({
            'status': 'Announcement pinned' if announcement.is_pinned else 'Announcement unpinned',
            'is_pinned': announcement.is_pinned
        })
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread announcements."""
        user = request.user
        
        # Get all active announcements for user
        announcements = self.get_queryset()
        
        # Get read announcement IDs
        read_ids = AnnouncementRead.objects.filter(
            user=user,
            announcement__in=announcements
        ).values_list('announcement_id', flat=True)
        
        # Count unread
        unread_count = announcements.exclude(id__in=read_ids).count()
        
        return Response({'unread_count': unread_count})
