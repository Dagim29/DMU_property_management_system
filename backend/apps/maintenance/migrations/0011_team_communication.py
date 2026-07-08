# Generated migration for team communication models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('maintenance', '0009_add_work_order_messages'),
    ]

    operations = [
        migrations.CreateModel(
            name='TeamMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('message_type', models.CharField(choices=[('DIRECT', 'Direct Message'), ('BROADCAST', 'Broadcast'), ('ANNOUNCEMENT', 'Announcement')], default='DIRECT', max_length=20)),
                ('priority', models.CharField(choices=[('LOW', 'Low'), ('NORMAL', 'Normal'), ('HIGH', 'High'), ('URGENT', 'Urgent')], default='NORMAL', max_length=10)),
                ('subject', models.CharField(blank=True, max_length=200)),
                ('message', models.TextField()),
                ('attachment', models.FileField(blank=True, null=True, upload_to='team_messages/%Y/%m/')),
                ('is_read', models.BooleanField(default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('is_deleted_by_sender', models.BooleanField(default=False)),
                ('is_deleted_by_recipient', models.BooleanField(default=False)),
                ('recipient', models.ForeignKey(blank=True, help_text='Null for broadcast messages', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='received_team_messages', to=settings.AUTH_USER_MODEL)),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_team_messages', to=settings.AUTH_USER_MODEL)),
                ('work_order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='team_messages', to='maintenance.workorder')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='TeamConversation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_message_at', models.DateTimeField(auto_now=True)),
                ('unread_count_p1', models.IntegerField(default=0)),
                ('unread_count_p2', models.IntegerField(default=0)),
                ('last_message', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='maintenance.teammessage')),
                ('participant_1', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversations_as_p1', to=settings.AUTH_USER_MODEL)),
                ('participant_2', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversations_as_p2', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-last_message_at'],
                'unique_together': {('participant_1', 'participant_2')},
            },
        ),
        migrations.CreateModel(
            name='TeamAnnouncement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('title', models.CharField(max_length=200)),
                ('content', models.TextField()),
                ('category', models.CharField(choices=[('GENERAL', 'General'), ('SAFETY', 'Safety Alert'), ('POLICY', 'Policy Update'), ('SCHEDULE', 'Schedule Change'), ('TRAINING', 'Training'), ('MAINTENANCE', 'Maintenance Update')], default='GENERAL', max_length=20)),
                ('priority', models.CharField(choices=[('LOW', 'Low'), ('NORMAL', 'Normal'), ('HIGH', 'High'), ('URGENT', 'Urgent')], default='NORMAL', max_length=10)),
                ('target_all_technicians', models.BooleanField(default=True)),
                ('attachment', models.FileField(blank=True, null=True, upload_to='announcements/%Y/%m/')),
                ('is_pinned', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('view_count', models.IntegerField(default=0)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='team_announcements', to=settings.AUTH_USER_MODEL)),
                ('target_specific_users', models.ManyToManyField(blank=True, related_name='targeted_announcements', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-is_pinned', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AnnouncementRead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('announcement', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reads', to='maintenance.teamannouncement')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='announcement_reads', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('announcement', 'user')},
            },
        ),
        migrations.AddIndex(
            model_name='teammessage',
            index=models.Index(fields=['sender', 'recipient', '-created_at'], name='maintenance_sender_idx'),
        ),
        migrations.AddIndex(
            model_name='teammessage',
            index=models.Index(fields=['recipient', 'is_read'], name='maintenance_recipie_idx'),
        ),
        migrations.AddIndex(
            model_name='teammessage',
            index=models.Index(fields=['message_type', '-created_at'], name='maintenance_message_idx'),
        ),
        migrations.AddIndex(
            model_name='teamconversation',
            index=models.Index(fields=['participant_1', '-last_message_at'], name='maintenance_partici_idx'),
        ),
        migrations.AddIndex(
            model_name='teamconversation',
            index=models.Index(fields=['participant_2', '-last_message_at'], name='maintenance_partici_idx2'),
        ),
        migrations.AddIndex(
            model_name='teamannouncement',
            index=models.Index(fields=['-is_pinned', '-created_at'], name='maintenance_is_pinn_idx'),
        ),
        migrations.AddIndex(
            model_name='teamannouncement',
            index=models.Index(fields=['is_active', '-created_at'], name='maintenance_is_acti_idx'),
        ),
        migrations.AddIndex(
            model_name='announcementread',
            index=models.Index(fields=['user', '-created_at'], name='maintenance_user_id_idx'),
        ),
    ]
