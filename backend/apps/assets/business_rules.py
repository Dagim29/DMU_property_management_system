"""
Business rule enforcement for Asset Management (BR-AM-01 through BR-AM-07)
"""

from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta


def enforce_transfer_rules(asset, user):
    """
    BR-AM-02: Asset transfers require dual-approval (both departments)
    BR-AM-05: Assets under maintenance cannot be transferred
    """
    # BR-AM-05: Check if asset is under maintenance
    if asset.status == 'UNDER_MAINTENANCE':
        raise ValidationError(
            f"Asset {asset.asset_id} cannot be transferred while under maintenance. "
            "Please complete maintenance before initiating transfer."
        )
    
    # Check if asset is pending disposal
    if asset.status == 'PENDING_DISPOSAL':
        raise ValidationError(
            f"Asset {asset.asset_id} is pending disposal and cannot be transferred."
        )
    
    return True


def enforce_disposal_rules(asset, user):
    """
    BR-AM-03: Asset disposal requires committee review + property manager approval
    """
    # Check if user has permission to request disposal
    if user.role not in ['SUPER_ADMIN', 'PROPERTY_MANAGER']:
        raise ValidationError(
            "Only Property Managers and Administrators can request asset disposal."
        )
    
    # Check if asset is already pending disposal
    if asset.status == 'PENDING_DISPOSAL':
        raise ValidationError(
            f"Asset {asset.asset_id} is already pending disposal."
        )
    
    # Check if asset is under maintenance
    if asset.status == 'UNDER_MAINTENANCE':
        raise ValidationError(
            f"Asset {asset.asset_id} is under maintenance. Complete maintenance before disposal."
        )
    
    return True


def enforce_owner_permissions(asset, user, action='view'):
    """
    BR-AM-07: Owners have view-only access unless granted permissions
    """
    if user.role == 'OWNER':
        # Owners can only view assets assigned to them
        if action == 'view':
            if asset.assigned_to != user:
                raise ValidationError(
                    "You can only view assets assigned to you."
                )
        else:
            # Owners cannot modify, transfer, or delete assets
            raise ValidationError(
                "Owners have view-only access to assets. "
                "Contact a Property Manager for modifications."
            )
    
    return True


def check_registration_deadline(asset):
    """
    BR-AM-01: Assets >10,000 ETB must be registered within 7 days
    """
    if asset.is_high_value and asset.registration_deadline:
        if timezone.now().date() > asset.registration_deadline:
            return {
                'overdue': True,
                'days_overdue': (timezone.now().date() - asset.registration_deadline).days,
                'message': f"Registration deadline was {asset.registration_deadline}. "
                          f"Asset should have been registered within 7 days of purchase."
            }
        else:
            days_remaining = (asset.registration_deadline - timezone.now().date()).days
            return {
                'overdue': False,
                'days_remaining': days_remaining,
                'message': f"Registration deadline: {asset.registration_deadline} ({days_remaining} days remaining)"
            }
    
    return None


def check_verification_status(asset):
    """
    BR-AM-04: Annual physical verification with 14-day discrepancy reporting
    """
    if asset.next_verification_date:
        days_until = (asset.next_verification_date - timezone.now().date()).days
        
        if days_until < 0:
            return {
                'overdue': True,
                'days_overdue': abs(days_until),
                'message': f"Verification is overdue by {abs(days_until)} days. "
                          f"Last verification: {asset.last_verification_date or 'Never'}"
            }
        elif days_until <= 7:
            return {
                'overdue': False,
                'days_remaining': days_until,
                'message': f"Verification due in {days_until} days",
                'urgent': True
            }
        else:
            return {
                'overdue': False,
                'days_remaining': days_until,
                'message': f"Next verification: {asset.next_verification_date}",
                'urgent': False
            }
    
    return None


def validate_asset_id_format(asset_id):
    """
    BR-AM-06: Asset ID format: DMU-[Campus]-[Type]-[Number]
    """
    import re
    pattern = r'^DMU-[A-Z]+-[A-Z]{3}-\d{5}$'
    
    if not re.match(pattern, asset_id):
        raise ValidationError(
            f"Invalid asset ID format: {asset_id}. "
            "Expected format: DMU-[Campus]-[Type]-[Number] (e.g., DMU-MAIN-EQP-00001)"
        )
    
    return True


def get_asset_permissions(asset, user):
    """
    Get user permissions for an asset based on role and business rules.
    """
    permissions = {
        'can_view': False,
        'can_edit': False,
        'can_transfer': False,
        'can_delete': False,
        'can_dispose': False,
        'can_verify': False,
    }
    
    # Super Admin has all permissions
    if user.role == 'SUPER_ADMIN':
        return {key: True for key in permissions}
    
    # Property Manager permissions
    if user.role == 'PROPERTY_MANAGER':
        permissions['can_view'] = True
        permissions['can_edit'] = True
        permissions['can_transfer'] = asset.can_be_transferred()  # BR-AM-05
        permissions['can_delete'] = False  # Soft delete only
        permissions['can_dispose'] = True  # BR-AM-03
        permissions['can_verify'] = True  # BR-AM-04
    
    # Maintenance Supervisor permissions
    elif user.role == 'MAINTENANCE_SUPERVISOR':
        permissions['can_view'] = True
        permissions['can_edit'] = False
        permissions['can_transfer'] = False
        permissions['can_delete'] = False
        permissions['can_dispose'] = False
        permissions['can_verify'] = True  # BR-AM-04
    
    # Owner permissions (BR-AM-07)
    elif user.role == 'OWNER':
        permissions['can_view'] = asset.assigned_to == user
        permissions['can_edit'] = False
        permissions['can_transfer'] = False
        permissions['can_delete'] = False
        permissions['can_dispose'] = False
        permissions['can_verify'] = False
    
    return permissions
