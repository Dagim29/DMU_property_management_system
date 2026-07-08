# Generated migration for CheckoutExtensionRequest model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('assets', '0008_add_disposal_enhanced_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='CheckoutExtensionRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('request_date', models.DateTimeField(auto_now_add=True)),
                ('current_return_date', models.DateField(help_text='Current expected return date')),
                ('requested_return_date', models.DateField(help_text='Requested new return date')),
                ('reason', models.TextField(help_text='Reason for extension request')),
                ('status', models.CharField(
                    choices=[('PENDING', 'Pending Review'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')],
                    default='PENDING',
                    max_length=20
                )),
                ('review_date', models.DateTimeField(blank=True, null=True)),
                ('review_notes', models.TextField(blank=True, help_text="Manager's notes on approval/rejection")),
                ('checkout', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='extension_requests',
                    to='assets.assetcheckout'
                )),
                ('requested_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='checkout_extension_requests',
                    to=settings.AUTH_USER_MODEL
                )),
                ('reviewed_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='reviewed_extension_requests',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'ordering': ['-request_date'],
            },
        ),
        migrations.AddIndex(
            model_name='checkoutextensionrequest',
            index=models.Index(fields=['checkout', 'status'], name='assets_chec_checkou_idx'),
        ),
        migrations.AddIndex(
            model_name='checkoutextensionrequest',
            index=models.Index(fields=['status'], name='assets_chec_status_idx'),
        ),
        migrations.AddIndex(
            model_name='checkoutextensionrequest',
            index=models.Index(fields=['requested_by'], name='assets_chec_request_idx'),
        ),
    ]
