# Generated migration for Asset Assignment Request System

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('assets', '0010_rename_assets_chec_checkou_idx_assets_chec_checkou_1a081e_idx_and_more'),
    ]

    operations = [
        # Add fields to Asset model
        migrations.AddField(
            model_name='asset',
            name='is_requestable',
            field=models.BooleanField(default=True, help_text='Can users request this asset?'),
        ),
        migrations.AddField(
            model_name='asset',
            name='max_assignment_days',
            field=models.PositiveIntegerField(default=90, help_text='Maximum days for temporary assignment'),
        ),
        
        # Create AssetAssignmentRequest model
        migrations.CreateModel(
            name='AssetAssignmentRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('request_id', models.CharField(editable=False, max_length=50, unique=True)),
                ('request_date', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(choices=[('PENDING_REVIEW', 'Pending Review'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'), ('WAITLISTED', 'Waitlisted'), ('ACTIVE', 'Active Assignment'), ('RETURNED', 'Returned'), ('CANCELLED', 'Cancelled'), ('EXPIRED', 'Expired')], default='PENDING_REVIEW', max_length=20)),
                ('priority', models.CharField(choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('URGENT', 'Urgent')], default='MEDIUM', max_length=10)),
                ('purpose', models.TextField(help_text='Why do you need this asset?')),
                ('assignment_type', models.CharField(choices=[('TEMPORARY', 'Temporary Assignment'), ('PERMANENT', 'Permanent Assignment'), ('PROJECT_BASED', 'Project-Based Assignment')], default='TEMPORARY', max_length=20)),
                ('requested_start_date', models.DateField()),
                ('requested_end_date', models.DateField(blank=True, help_text='Required for temporary assignments', null=True)),
                ('department', models.CharField(blank=True, max_length=100)),
                ('project_name', models.CharField(blank=True, max_length=200)),
                ('review_date', models.DateTimeField(blank=True, null=True)),
                ('review_notes', models.TextField(blank=True)),
                ('rejection_reason', models.TextField(blank=True)),
                ('waitlist_position', models.PositiveIntegerField(blank=True, null=True)),
                ('waitlist_added_date', models.DateTimeField(blank=True, null=True)),
                ('estimated_available_date', models.DateField(blank=True, null=True)),
                ('notify_when_available', models.BooleanField(default=True)),
                ('waitlist_notified', models.BooleanField(default=False)),
                ('waitlist_notification_date', models.DateTimeField(blank=True, null=True)),
                ('waitlist_response_deadline', models.DateTimeField(blank=True, null=True)),
                ('assignment_start_date', models.DateTimeField(blank=True, null=True)),
                ('assignment_end_date', models.DateField(blank=True, null=True)),
                ('actual_return_date', models.DateTimeField(blank=True, null=True)),
                ('assignment_condition', models.CharField(blank=True, choices=[('EXCELLENT', 'Excellent'), ('GOOD', 'Good'), ('FAIR', 'Fair'), ('POOR', 'Poor'), ('DAMAGED', 'Damaged')], help_text='Asset condition at handover', max_length=20)),
                ('return_condition', models.CharField(blank=True, choices=[('EXCELLENT', 'Excellent'), ('GOOD', 'Good'), ('FAIR', 'Fair'), ('POOR', 'Poor'), ('DAMAGED', 'Damaged')], help_text='Asset condition at return', max_length=20)),
                ('assignment_condition_notes', models.TextField(blank=True)),
                ('return_condition_notes', models.TextField(blank=True)),
                ('handover_photos', models.JSONField(blank=True, default=list, help_text='URLs to handover photos')),
                ('return_photos', models.JSONField(blank=True, default=list, help_text='URLs to return photos')),
                ('terms_accepted', models.BooleanField(default=False)),
                ('terms_accepted_date', models.DateTimeField(blank=True, null=True)),
                ('user_signature', models.TextField(blank=True, help_text='Digital signature/confirmation')),
                ('training_required', models.BooleanField(default=False)),
                ('training_completed', models.BooleanField(default=False)),
                ('training_completed_date', models.DateTimeField(blank=True, null=True)),
                ('user_notified', models.BooleanField(default=False)),
                ('manager_notified', models.BooleanField(default=False)),
                ('reminder_sent_count', models.PositiveIntegerField(default=0)),
                ('last_reminder_date', models.DateTimeField(blank=True, null=True)),
                ('is_overdue', models.BooleanField(default=False)),
                ('overdue_days', models.PositiveIntegerField(default=0)),
                ('asset', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignment_requests', to='assets.asset')),
                ('requested_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='asset_assignment_requests', to=settings.AUTH_USER_MODEL)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_assignment_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-request_date'],
            },
        ),
        
        # Create AssetWaitlist model
        migrations.CreateModel(
            name='AssetWaitlist',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('position', models.PositiveIntegerField(help_text='Position in queue (1 = next)')),
                ('added_date', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(choices=[('WAITING', 'Waiting in Queue'), ('NOTIFIED', 'User Notified'), ('EXPIRED', 'Expired - No Response'), ('FULFILLED', 'Request Fulfilled'), ('CANCELLED', 'Cancelled by User')], default='WAITING', max_length=20)),
                ('notification_sent', models.BooleanField(default=False)),
                ('notification_date', models.DateTimeField(blank=True, null=True)),
                ('response_deadline', models.DateTimeField(blank=True, help_text='User must respond by this time', null=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('asset', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='waitlist_entries', to='assets.asset')),
                ('request', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='waitlist_entry', to='assets.assetassignmentrequest')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='waitlist_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['asset', 'position'],
                'unique_together': {('asset', 'position')},
            },
        ),
        
        # Create AssignmentRequestHistory model
        migrations.CreateModel(
            name='AssignmentRequestHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('action', models.CharField(choices=[('CREATED', 'Request Created'), ('REVIEWED', 'Request Reviewed'), ('APPROVED', 'Request Approved'), ('REJECTED', 'Request Rejected'), ('WAITLISTED', 'Added to Waitlist'), ('NOTIFIED', 'User Notified'), ('TERMS_ACCEPTED', 'Terms Accepted'), ('ACTIVATED', 'Assignment Activated'), ('RETURNED', 'Asset Returned'), ('CANCELLED', 'Request Cancelled'), ('EXPIRED', 'Request Expired'), ('OVERDUE', 'Assignment Overdue'), ('REMINDER_SENT', 'Reminder Sent')], max_length=20)),
                ('action_date', models.DateTimeField(auto_now_add=True)),
                ('old_status', models.CharField(blank=True, max_length=20)),
                ('new_status', models.CharField(blank=True, max_length=20)),
                ('notes', models.TextField(blank=True)),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Additional action metadata')),
                ('performed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='history', to='assets.assetassignmentrequest')),
            ],
            options={
                'verbose_name_plural': 'Assignment Request Histories',
                'ordering': ['-action_date'],
            },
        ),
        
        # Add indexes
        migrations.AddIndex(
            model_name='assetassignmentrequest',
            index=models.Index(fields=['request_id'], name='assets_asse_request_idx'),
        ),
        migrations.AddIndex(
            model_name='assetassignmentrequest',
            index=models.Index(fields=['status'], name='assets_asse_status_idx'),
        ),
        migrations.AddIndex(
            model_name='assetassignmentrequest',
            index=models.Index(fields=['requested_by', 'status'], name='assets_asse_req_by_status_idx'),
        ),
        migrations.AddIndex(
            model_name='assetassignmentrequest',
            index=models.Index(fields=['asset', 'status'], name='assets_asse_asset_status_idx'),
        ),
        migrations.AddIndex(
            model_name='assetassignmentrequest',
            index=models.Index(fields=['priority', 'request_date'], name='assets_asse_priority_idx'),
        ),
        migrations.AddIndex(
            model_name='assetassignmentrequest',
            index=models.Index(fields=['waitlist_position'], name='assets_asse_waitlist_idx'),
        ),
        migrations.AddIndex(
            model_name='assetassignmentrequest',
            index=models.Index(fields=['is_overdue'], name='assets_asse_overdue_idx'),
        ),
        migrations.AddIndex(
            model_name='assetwaitlist',
            index=models.Index(fields=['asset', 'status', 'position'], name='assets_wait_asset_status_idx'),
        ),
        migrations.AddIndex(
            model_name='assetwaitlist',
            index=models.Index(fields=['user', 'status'], name='assets_wait_user_status_idx'),
        ),
        migrations.AddIndex(
            model_name='assetwaitlist',
            index=models.Index(fields=['status', 'response_deadline'], name='assets_wait_deadline_idx'),
        ),
        migrations.AddIndex(
            model_name='assignmentrequesthistory',
            index=models.Index(fields=['request', 'action_date'], name='assets_hist_request_idx'),
        ),
        migrations.AddIndex(
            model_name='assignmentrequesthistory',
            index=models.Index(fields=['action'], name='assets_hist_action_idx'),
        ),
    ]
