"""
Daily automated task to process expired waitlist entries.
Moves to next person in queue if user doesn't respond within 24 hours.

Usage: python manage.py process_expired_waitlist
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.assets.assignment_models import AssetWaitlist, AssignmentRequestHistory
from apps.core.models import Notification


class Command(BaseCommand):
    help = 'Process expired waitlist notifications and advance queue'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Processing expired waitlist entries...'))
        
        now = timezone.now()
        
        # Find notified entries past response deadline
        expired_entries = AssetWaitlist.objects.filter(
            status='NOTIFIED',
            response_deadline__lt=now
        ).select_related('asset', 'user', 'request')
        
        self.stdout.write(f'Found {expired_entries.count()} expired entries')
        
        processed_assets = set()
        
        for entry in expired_entries:
            self.stdout.write(
                self.style.WARNING(
                    f'  ⏰ Expired: {entry.user.username} - {entry.asset.asset_id} '
                    f'(Position {entry.position})'
                )
            )
            
            # Mark as expired
            entry.mark_expired()
            
            # Create history entry
            AssignmentRequestHistory.objects.create(
                request=entry.request,
                action='EXPIRED',
                old_status='WAITLISTED',
                new_status='EXPIRED',
                notes='Waitlist notification expired - no response within 24 hours'
            )
            
            # Notify user
            Notification.objects.create(
                user=entry.user,
                notification_type='waitlist_expired',
                title='Waitlist Opportunity Expired',
                message=f'Your waitlist opportunity for {entry.asset.name} has expired '
                       f'due to no response. The asset has been offered to the next person in queue.',
                related_object_type='AssetAssignmentRequest',
                related_object_id=entry.request.id
            )
            
            # Track asset for queue advancement
            processed_assets.add(entry.asset)
        
        # Advance queue for affected assets
        for asset in processed_assets:
            self._advance_waitlist_queue(asset)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Processed {expired_entries.count()} expired entries'
            )
        )
        self.stdout.write(f'   Advanced queue for {len(processed_assets)} assets')

    def _advance_waitlist_queue(self, asset):
        """Notify next person in waitlist queue."""
        # Reorder positions
        waiting_entries = AssetWaitlist.objects.filter(
            asset=asset,
            status='WAITING'
        ).order_by('position')
        
        for index, entry in enumerate(waiting_entries, start=1):
            if entry.position != index:
                entry.position = index
                entry.save(update_fields=['position'])
                
                # Update request
                entry.request.waitlist_position = index
                entry.request.save(update_fields=['waitlist_position'])
        
        # Notify next in queue
        next_entry = waiting_entries.first()
        if next_entry:
            next_entry.notify_user()
            
            Notification.objects.create(
                user=next_entry.user,
                notification_type='asset_available',
                title='🎉 Asset Now Available!',
                message=f'{asset.name} is now available! You have 24 hours to respond. '
                       f'Please review your request and accept the terms to proceed.',
                related_object_type='AssetAssignmentRequest',
                related_object_id=next_entry.request.id
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✉️  Notified next in queue: {next_entry.user.username} '
                    f'(Position {next_entry.position})'
                )
            )
