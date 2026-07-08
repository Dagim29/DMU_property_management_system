"""
Team Communication Models
Handles direct messages, group chats, and announcements between supervisors and technicians.
"""
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class TeamMessage(TimeStampedModel):
    """Direct messages between team members."""
    
    MESSAGE_TYPE_CHOICES = [
        ('DIRECT', 'Direct Message'),
        ('BROADCAST', 'Broadcast'),
        ('ANNOUNCEMENT', 'Announcement'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('NORMAL', 'Normal'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]
    
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_team_messages'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_team_messages',
        null=True,
        blank=True,
        help_text="Null for broadcast messages"
    )
    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPE_CHOICES,
        default='DIRECT'
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='NORMAL'
    )
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    
    # Attachments (optional)
    attachment = models.FileField(
        upload_to='team_messages/%Y/%m/',
        null=True,
        blank=True
    )
    
    # Read tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Related work order (optional context)
    work_order = models.ForeignKey(
        'maintenance.WorkOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_messages'
    )
    
    # Soft delete
    is_deleted_by_sender = models.BooleanField(default=False)
    is_deleted_by_recipient = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sender', 'recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['message_type', '-created_at']),
        ]
    
    def __str__(self):
        if self.message_type == 'BROADCAST':
            return f"Broadcast from {self.sender.get_full_name()}: {self.subject}"
        return f"Message from {self.sender.get_full_name()} to {self.recipient.get_full_name() if self.recipient else 'All'}"
    
    def mark_as_read(self):
        """Mark message as read."""
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class TeamConversation(TimeStampedModel):
    """
    Represents a conversation thread between two users.
    Helps organize messages into conversations.
    """
    participant_1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_as_p1'
    )
    participant_2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_as_p2'
    )
    last_message = models.ForeignKey(
        TeamMessage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )
    last_message_at = models.DateTimeField(auto_now=True)
    
    # Unread counts
    unread_count_p1 = models.IntegerField(default=0)
    unread_count_p2 = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-last_message_at']
        unique_together = [['participant_1', 'participant_2']]
        indexes = [
            models.Index(fields=['participant_1', '-last_message_at']),
            models.Index(fields=['participant_2', '-last_message_at']),
        ]
    
    def __str__(self):
        return f"Conversation: {self.participant_1.get_full_name()} ↔ {self.participant_2.get_full_name()}"
    
    @classmethod
    def get_or_create_conversation(cls, user1, user2):
        """Get or create a conversation between two users."""
        # Ensure consistent ordering
        if user1.id > user2.id:
            user1, user2 = user2, user1
        
        conversation, created = cls.objects.get_or_create(
            participant_1=user1,
            participant_2=user2
        )
        return conversation
    
    def get_unread_count(self, user):
        """Get unread count for a specific user."""
        if user.id == self.participant_1.id:
            return self.unread_count_p1
        elif user.id == self.participant_2.id:
            return self.unread_count_p2
        return 0
    
    def increment_unread(self, for_user):
        """Increment unread count for a user."""
        if for_user.id == self.participant_1.id:
            self.unread_count_p1 += 1
        elif for_user.id == self.participant_2.id:
            self.unread_count_p2 += 1
        self.save(update_fields=['unread_count_p1', 'unread_count_p2'])
    
    def reset_unread(self, for_user):
        """Reset unread count for a user."""
        if for_user.id == self.participant_1.id:
            self.unread_count_p1 = 0
            self.save(update_fields=['unread_count_p1'])
        elif for_user.id == self.participant_2.id:
            self.unread_count_p2 = 0
            self.save(update_fields=['unread_count_p2'])


class TeamAnnouncement(TimeStampedModel):
    """
    Team-wide announcements from supervisors.
    """
    CATEGORY_CHOICES = [
        ('GENERAL', 'General'),
        ('SAFETY', 'Safety Alert'),
        ('POLICY', 'Policy Update'),
        ('SCHEDULE', 'Schedule Change'),
        ('TRAINING', 'Training'),
        ('MAINTENANCE', 'Maintenance Update'),
    ]
    
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='team_announcements'
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='GENERAL'
    )
    priority = models.CharField(
        max_length=10,
        choices=TeamMessage.PRIORITY_CHOICES,
        default='NORMAL'
    )
    
    # Targeting
    target_all_technicians = models.BooleanField(default=True)
    target_specific_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='targeted_announcements',
        blank=True
    )
    
    # Attachments
    attachment = models.FileField(
        upload_to='announcements/%Y/%m/',
        null=True,
        blank=True
    )
    
    # Visibility
    is_pinned = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    view_count = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['-is_pinned', '-created_at']),
            models.Index(fields=['is_active', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} by {self.author.get_full_name()}"
    
    def increment_view_count(self):
        """Increment view count."""
        self.view_count += 1
        self.save(update_fields=['view_count'])


class AnnouncementRead(TimeStampedModel):
    """Track which users have read which announcements."""
    announcement = models.ForeignKey(
        TeamAnnouncement,
        on_delete=models.CASCADE,
        related_name='reads'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='announcement_reads'
    )
    
    class Meta:
        unique_together = [['announcement', 'user']]
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} read {self.announcement.title}"
