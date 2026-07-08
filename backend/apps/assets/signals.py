from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.core.utils import log_action
from .models import Asset, AssetTransfer


@receiver(post_save, sender=Asset)
def log_asset_save(sender, instance, created, **kwargs):
    """Log asset creation and updates."""
    action = 'CREATE' if created else 'UPDATE'
    if hasattr(instance, '_request_user'):
        log_action(
            user=instance._request_user,
            action=action,
            model_name='Asset',
            object_id=instance.id,
            details={'asset_id': instance.asset_id, 'name': instance.name}
        )


@receiver(post_save, sender=AssetTransfer)
def log_asset_transfer(sender, instance, created, **kwargs):
    """Log asset transfers."""
    if created and hasattr(instance, '_request_user'):
        log_action(
            user=instance._request_user,
            action='TRANSFER',
            model_name='Asset',
            object_id=instance.asset.id,
            details={
                'asset_id': instance.asset.asset_id,
                'from': str(instance.from_room),
                'to': str(instance.to_room)
            }
        )


# Asset Event Creation Signals

@receiver(post_save, sender='assets.AssetCheckout')
def create_checkout_event(sender, instance, created, **kwargs):
    """Create event when asset is checked out or returned."""
    from .models import AssetEvent
    
    if created:
        # Checkout event
        AssetEvent.objects.create(
            asset=instance.asset,
            event_type='CHECKOUT',
            event_data={
                'checkout_id': instance.id,
                'checked_out_to': instance.checked_out_to.get_full_name() if instance.checked_out_to else None,
                'purpose': instance.purpose,
                'expected_return_date': instance.expected_return_date.isoformat() if instance.expected_return_date else None,
                'checkout_condition': instance.checkout_condition,
            },
            related_checkout=instance,
            actor=instance.checked_out_to,
            description=f"Asset checked out to {instance.checked_out_to.get_full_name() if instance.checked_out_to else 'Unknown'} for {instance.purpose}"
        )
    elif instance.is_returned and not AssetEvent.objects.filter(
        related_checkout=instance,
        event_type='RETURN'
    ).exists():
        # Return event (only create if not already exists)
        AssetEvent.objects.create(
            asset=instance.asset,
            event_type='RETURN',
            event_data={
                'checkout_id': instance.id,
                'checked_out_to': instance.checked_out_to.get_full_name() if instance.checked_out_to else None,
                'actual_return_date': instance.actual_return_date.isoformat() if instance.actual_return_date else None,
                'return_condition': instance.return_condition,
                'notes': instance.notes,
            },
            related_checkout=instance,
            actor=instance.checked_out_to,
            description=f"Asset returned by {instance.checked_out_to.get_full_name() if instance.checked_out_to else 'Unknown'}"
        )


@receiver(post_save, sender='maintenance.MaintenanceRequest')
def create_maintenance_event(sender, instance, created, **kwargs):
    """Create event when maintenance request is created or completed."""
    from .models import AssetEvent
    from apps.core.models import Notification
    from apps.users.models import User
    
    if created:
        # Maintenance request event
        AssetEvent.objects.create(
            asset=instance.asset,
            event_type='MAINTENANCE_REQUEST',
            event_data={
                'request_id': instance.request_id,
                'category': instance.category,
                'priority': instance.priority,
                'description': instance.description,
                'requested_by': instance.requested_by.get_full_name() if instance.requested_by else None,
            },
            related_maintenance=instance,
            actor=instance.requested_by,
            description=f"Maintenance request submitted: {instance.get_priority_display()} priority - {instance.get_category_display()}"
        )
        
        # Create notifications for supervisors
        supervisors = User.objects.filter(role='MAINTENANCE_SUPERVISOR', is_active=True)
        requester_name = instance.requested_by.get_full_name() if instance.requested_by else 'Unknown'
        
        for supervisor in supervisors:
            Notification.objects.create(
                user=supervisor,
                title='New Maintenance Request',
                message=f'{requester_name} submitted a {instance.get_priority_display()} priority maintenance request for {instance.asset.asset_id}',
                notification_type='INFO',
                link=f'/dashboard/supervisor/requests/assign/{instance.id}'
            )
    elif instance.status == 'COMPLETED' and not AssetEvent.objects.filter(
        related_maintenance=instance,
        event_type='MAINTENANCE_COMPLETE'
    ).exists():
        # Maintenance completion event (only create if not already exists)
        AssetEvent.objects.create(
            asset=instance.asset,
            event_type='MAINTENANCE_COMPLETE',
            event_data={
                'request_id': instance.request_id,
                'category': instance.category,
                'completed_by': instance.assigned_to.get_full_name() if instance.assigned_to else None,
                'completion_date': instance.updated_at.isoformat(),
            },
            related_maintenance=instance,
            actor=instance.assigned_to,
            description=f"Maintenance completed by {instance.assigned_to.get_full_name() if instance.assigned_to else 'Unknown'}"
        )


@receiver(post_save, sender=AssetTransfer)
def create_transfer_event(sender, instance, created, **kwargs):
    """Create event when asset is transferred."""
    from .models import AssetEvent
    
    if created:
        AssetEvent.objects.create(
            asset=instance.asset,
            event_type='TRANSFER',
            event_data={
                'transfer_id': instance.id,
                'from_room': str(instance.from_room) if instance.from_room else None,
                'to_room': str(instance.to_room) if instance.to_room else None,
                'transferred_by': instance.transferred_by.get_full_name() if instance.transferred_by else None,
                'reason': instance.reason,
                'approval_status': instance.approval_status,
                'transfer_type': instance.transfer_type,
            },
            related_transfer=instance,
            actor=instance.transferred_by,
            description=f"Asset transfer from {instance.from_room or 'Unknown'} to {instance.to_room or 'Unknown'}"
        )


@receiver(post_save, sender=Asset)
def create_condition_change_event(sender, instance, created, **kwargs):
    """Create event when asset status changes."""
    from .models import AssetEvent
    
    # Track status changes via custom attribute set in views
    if not created and hasattr(instance, '_old_status') and instance._old_status != instance.status:
        AssetEvent.objects.create(
            asset=instance,
            event_type='CONDITION_CHANGE',
            event_data={
                'old_status': instance._old_status,
                'new_status': instance.status,
                'changed_at': instance.updated_at.isoformat(),
            },
            actor=getattr(instance, '_request_user', None),
            description=f"Asset status changed from {instance._old_status} to {instance.status}"
        )


@receiver(post_save, sender=Asset)
def create_assignment_event(sender, instance, created, **kwargs):
    """Create event when asset is assigned to a user."""
    from .models import AssetEvent
    
    # Track assignment changes via custom attribute set in views
    if not created and hasattr(instance, '_old_assigned_to'):
        old_user = instance._old_assigned_to
        if old_user != instance.assigned_to:
            AssetEvent.objects.create(
                asset=instance,
                event_type='ASSIGNMENT',
                event_data={
                    'old_assigned_to': old_user.get_full_name() if old_user else None,
                    'new_assigned_to': instance.assigned_to.get_full_name() if instance.assigned_to else None,
                    'assigned_at': instance.updated_at.isoformat(),
                },
                actor=getattr(instance, '_request_user', None),
                description=f"Asset assigned to {instance.assigned_to.get_full_name() if instance.assigned_to else 'Unassigned'}"
            )
