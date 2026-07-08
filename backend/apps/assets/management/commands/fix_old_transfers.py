"""
Management command to fix old transfer records that are missing transferred_by and completed_date.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.assets.models import AssetTransfer
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Fix old transfer records by setting transferred_by and completed_date for completed transfers'

    def handle(self, *args, **options):
        # Get all completed transfers without transferred_by or completed_date
        transfers_to_fix = AssetTransfer.objects.filter(
            approval_status='COMPLETED'
        ).filter(
            transferred_by__isnull=True
        ) | AssetTransfer.objects.filter(
            approval_status='COMPLETED',
            completed_date__isnull=True
        )
        
        count = transfers_to_fix.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No transfers need fixing.'))
            return
        
        self.stdout.write(f'Found {count} transfer(s) to fix...')
        
        # Get a property manager to assign as the transferred_by user
        # (You can modify this to use a specific user if needed)
        property_manager = User.objects.filter(role='PROPERTY_MANAGER').first()
        
        if not property_manager:
            # Fallback to any admin user
            property_manager = User.objects.filter(role='SUPER_ADMIN').first()
        
        if not property_manager:
            self.stdout.write(self.style.ERROR('No property manager or admin user found to assign transfers to.'))
            return
        
        fixed_count = 0
        for transfer in transfers_to_fix:
            updated = False
            
            if not transfer.transferred_by:
                transfer.transferred_by = property_manager
                updated = True
                self.stdout.write(f'  - Transfer #{transfer.id}: Set transferred_by to {property_manager.get_full_name()}')
            
            if not transfer.completed_date:
                # Use transfer_date as completed_date for old records
                transfer.completed_date = transfer.transfer_date
                updated = True
                self.stdout.write(f'  - Transfer #{transfer.id}: Set completed_date to {transfer.transfer_date}')
            
            if updated:
                transfer.save()
                fixed_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully fixed {fixed_count} transfer record(s)!'))
