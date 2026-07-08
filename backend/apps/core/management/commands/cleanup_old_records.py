"""
BR-DM-01 & BR-DM-02: Clean up old records based on retention policies
- Asset disposal records: 10 years
- Maintenance records: 7 years
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.assets.models import AssetDisposal
from apps.maintenance.models import MaintenanceRequest


class Command(BaseCommand):
    help = 'Clean up old records based on retention policies (BR-DM-01, BR-DM-02)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = timezone.now().date()
        
        # BR-DM-01: Asset disposal records (10 years)
        disposal_records = AssetDisposal.objects.filter(
            retention_date__lte=today,
            marked_for_deletion=False
        )
        
        disposal_count = disposal_records.count()
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'[DRY RUN] Would mark {disposal_count} asset disposal records for deletion'
                )
            )
        else:
            disposal_records.update(marked_for_deletion=True)
            self.stdout.write(
                self.style.SUCCESS(
                    f'Marked {disposal_count} asset disposal records for deletion (BR-DM-01)'
                )
            )
        
        # BR-DM-02: Maintenance records (7 years)
        maintenance_records = MaintenanceRequest.objects.filter(
            retention_date__lte=today,
            marked_for_deletion=False
        )
        
        maintenance_count = maintenance_records.count()
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'[DRY RUN] Would mark {maintenance_count} maintenance records for deletion'
                )
            )
        else:
            maintenance_records.update(marked_for_deletion=True)
            self.stdout.write(
                self.style.SUCCESS(
                    f'Marked {maintenance_count} maintenance records for deletion (BR-DM-02)'
                )
            )
        
        # Summary
        total = disposal_count + maintenance_count
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'\n[DRY RUN] Total records that would be marked: {total}'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    'Run without --dry-run to actually mark records for deletion'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nTotal records marked for deletion: {total}'
                )
            )
            self.stdout.write(
                self.style.SUCCESS(
                    'Records are marked but not deleted. Review and permanently delete manually if needed.'
                )
            )
