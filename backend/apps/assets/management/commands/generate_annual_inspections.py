"""
BR-OW-02: Generate annual inspection tasks with standardized checklist
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.assets.models import Asset, AssetVerification
from apps.users.models import User


class Command(BaseCommand):
    help = 'Generate annual inspection tasks with standardized checklist (BR-OW-02)'
    
    # BR-OW-02: Standardized inspection checklist
    INSPECTION_CHECKLIST = {
        'physical_condition': [
            'Check for physical damage',
            'Verify structural integrity',
            'Inspect for wear and tear',
            'Check cleanliness and maintenance'
        ],
        'location_verification': [
            'Verify asset is in recorded location',
            'Check room/building assignment',
            'Verify campus assignment'
        ],
        'documentation': [
            'Verify asset ID is visible',
            'Check QR code is readable',
            'Verify documentation is up to date'
        ],
        'functionality': [
            'Test basic functionality (if applicable)',
            'Check for operational issues',
            'Verify safety features'
        ],
        'compliance': [
            'Check warranty status',
            'Verify insurance coverage',
            'Check maintenance records'
        ]
    }

    def handle(self, *args, **options):
        today = timezone.now().date()
        
        # Get all assets that need annual verification
        assets = Asset.objects.filter(
            verification_status__in=['PENDING', 'NOT_REQUIRED']
        )
        
        # Get property managers to assign inspections
        property_managers = User.objects.filter(
            role='PROPERTY_MANAGER',
            is_active=True
        )
        
        if not property_managers.exists():
            self.stdout.write(
                self.style.WARNING('No active property managers found')
            )
            return
        
        inspections_created = 0
        
        for asset in assets:
            # Check if asset needs annual inspection
            if asset.last_verification_date:
                days_since_last = (today - asset.last_verification_date).days
                if days_since_last < 365:
                    continue  # Skip if inspected within last year
            
            # Create verification record with standardized checklist
            verification = AssetVerification.objects.create(
                asset=asset,
                verification_date=today,
                verified_by=property_managers.first(),
                status='SCHEDULED',
                notes=self._generate_checklist_notes()
            )
            
            # Update asset verification status
            asset.verification_status = 'PENDING'
            asset.next_verification_date = today + timedelta(days=365)
            asset.save(update_fields=['verification_status', 'next_verification_date'])
            
            inspections_created += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created inspection for {asset.asset_id}'
                )
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Total annual inspections created: {inspections_created}'
            )
        )
    
    def _generate_checklist_notes(self):
        """Generate standardized checklist notes."""
        notes = "ANNUAL INSPECTION CHECKLIST (BR-OW-02)\n\n"
        
        for category, items in self.INSPECTION_CHECKLIST.items():
            notes += f"{category.upper().replace('_', ' ')}:\n"
            for item in items:
                notes += f"  [ ] {item}\n"
            notes += "\n"
        
        notes += "INSPECTOR NOTES:\n"
        notes += "(Add any additional observations or issues found during inspection)\n"
        
        return notes
