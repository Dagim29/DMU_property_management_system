import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('property_management')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Periodic tasks
app.conf.beat_schedule = {
    'check-sla-escalation': {
        'task': 'apps.maintenance.tasks.check_sla_escalation',
        'schedule': crontab(minute=0),  # Every hour
    },
    'create-preventive-work-orders': {
        'task': 'apps.maintenance.tasks.create_preventive_work_orders',
        'schedule': crontab(hour=6, minute=0),  # Daily at 6 AM
    },
}
