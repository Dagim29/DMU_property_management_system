# Generated migration for Asset Assignment Request notification types

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_servicerating_portalsuggestion_assetfeedback'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('maintenance_request', 'Maintenance Request'),
                    ('work_order', 'Work Order'),
                    ('asset_assignment', 'Asset Assignment'),
                    ('request_overdue', 'Request Overdue'),
                    ('request_completed', 'Request Completed'),
                    ('status_change', 'Status Change'),
                    ('system', 'System Notification'),
                    ('asset_assignment_request', 'Asset Assignment Request'),
                    ('asset_assignment_approved', 'Asset Assignment Approved'),
                    ('asset_assignment_rejected', 'Asset Assignment Rejected'),
                    ('asset_assignment_waitlisted', 'Asset Assignment Waitlisted'),
                    ('asset_assignment_active', 'Asset Assignment Active'),
                    ('asset_available', 'Asset Available'),
                    ('asset_return_initiated', 'Asset Return Initiated'),
                    ('asset_return_completed', 'Asset Return Completed'),
                ],
                max_length=50
            ),
        ),
    ]
