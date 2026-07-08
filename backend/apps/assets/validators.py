"""
Enhanced validators for asset assignment system.
Implements comprehensive date validation and business rules.
"""
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, timedelta


class AssignmentDateValidator:
    """
    Comprehensive date validation for asset assignments.
    Enforces business rules for assignment dates.
    """
    
    # Configuration
    MAX_TEMPORARY_DAYS = 180  # 6 months
    MAX_PROJECT_DAYS = 365  # 1 year
    MIN_NOTICE_DAYS = 1  # Minimum 1 day notice
    
    # Blackout periods (holidays, maintenance windows)
    BLACKOUT_DATES = [
        # Ethiopian holidays (example dates - adjust as needed)
        ('09-11', 'Ethiopian New Year'),
        ('09-27', 'Meskel'),
        ('01-07', 'Ethiopian Christmas'),
        ('01-19', 'Epiphany'),
        # Add more as needed
    ]
    
    @classmethod
    def validate_start_date(cls, start_date, assignment_type='TEMPORARY'):
        """
        Validate assignment start date.
        
        Rules:
        - Cannot be in the past
        - Must provide minimum notice period
        - Cannot fall on blackout dates
        """
        today = date.today()
        
        # Check not in past
        if start_date < today:
            raise ValidationError(
                'Start date cannot be in the past. '
                f'Today is {today.strftime("%B %d, %Y")}.'
            )
        
        # Check minimum notice period
        days_until_start = (start_date - today).days
        if days_until_start < cls.MIN_NOTICE_DAYS:
            raise ValidationError(
                f'Minimum {cls.MIN_NOTICE_DAYS} day notice required. '
                f'Please select a date at least {cls.MIN_NOTICE_DAYS} day(s) from today.'
            )
        
        # Check blackout dates
        date_str = start_date.strftime('%m-%d')
        for blackout_date, reason in cls.BLACKOUT_DATES:
            if date_str == blackout_date:
                raise ValidationError(
                    f'Cannot start assignment on {start_date.strftime("%B %d")} ({reason}). '
                    'Please select a different date.'
                )
        
        return True
    
    @classmethod
    def validate_end_date(cls, start_date, end_date, assignment_type='TEMPORARY'):
        """
        Validate assignment end date.
        
        Rules:
        - Must be after start date
        - Cannot exceed maximum duration for assignment type
        - Cannot fall on blackout dates
        """
        if not end_date:
            if assignment_type == 'TEMPORARY':
                raise ValidationError('End date is required for temporary assignments.')
            return True  # Permanent assignments don't need end date
        
        # Check end date is after start date
        if end_date <= start_date:
            raise ValidationError(
                'End date must be after start date. '
                f'Start: {start_date.strftime("%B %d, %Y")}, '
                f'End: {end_date.strftime("%B %d, %Y")}.'
            )
        
        # Check maximum duration
        duration_days = (end_date - start_date).days
        
        if assignment_type == 'TEMPORARY':
            if duration_days > cls.MAX_TEMPORARY_DAYS:
                raise ValidationError(
                    f'Temporary assignments cannot exceed {cls.MAX_TEMPORARY_DAYS} days ({cls.MAX_TEMPORARY_DAYS // 30} months). '
                    f'Requested duration: {duration_days} days. '
                    'Consider requesting a permanent assignment instead.'
                )
        elif assignment_type == 'PROJECT_BASED':
            if duration_days > cls.MAX_PROJECT_DAYS:
                raise ValidationError(
                    f'Project-based assignments cannot exceed {cls.MAX_PROJECT_DAYS} days (1 year). '
                    f'Requested duration: {duration_days} days.'
                )
        
        # Check blackout dates
        date_str = end_date.strftime('%m-%d')
        for blackout_date, reason in cls.BLACKOUT_DATES:
            if date_str == blackout_date:
                raise ValidationError(
                    f'Cannot end assignment on {end_date.strftime("%B %d")} ({reason}). '
                    'Please select a different date.'
                )
        
        return True
    
    @classmethod
    def validate_assignment_dates(cls, start_date, end_date, assignment_type='TEMPORARY'):
        """
        Validate both start and end dates together.
        Convenience method that calls both validators.
        """
        cls.validate_start_date(start_date, assignment_type)
        if end_date:
            cls.validate_end_date(start_date, end_date, assignment_type)
        return True


class ConditionDocumentationValidator:
    """
    Validator for asset condition documentation.
    Ensures proper documentation at handover and return.
    """
    
    MIN_PHOTOS_HANDOVER = 2
    MIN_PHOTOS_RETURN = 2
    MAX_PHOTOS = 10
    
    REQUIRED_CONDITION_NOTES = [
        'POOR',
        'DAMAGED',
        'FAIR'  # Require explanation for fair condition
    ]
    
    @classmethod
    def validate_handover_documentation(cls, condition, condition_notes='', photos=None):
        """
        Validate handover documentation.
        
        Rules:
        - Condition must be specified
        - Photos required (minimum 2)
        - Notes required for poor/damaged/fair condition
        """
        if not condition:
            raise ValidationError('Asset condition must be documented at handover.')
        
        # Check photos
        photo_count = len(photos) if photos else 0
        if photo_count < cls.MIN_PHOTOS_HANDOVER:
            raise ValidationError(
                f'Minimum {cls.MIN_PHOTOS_HANDOVER} photos required at handover. '
                f'Current: {photo_count} photos. '
                'Please take photos from different angles showing asset condition.'
            )
        
        if photo_count > cls.MAX_PHOTOS:
            raise ValidationError(
                f'Maximum {cls.MAX_PHOTOS} photos allowed. '
                f'Current: {photo_count} photos.'
            )
        
        # Check condition notes
        if condition in cls.REQUIRED_CONDITION_NOTES:
            if not condition_notes or len(condition_notes.strip()) < 10:
                raise ValidationError(
                    f'Detailed condition notes required for {condition} condition. '
                    'Please describe any damage, wear, or issues in detail (minimum 10 characters).'
                )
        
        return True
    
    @classmethod
    def validate_return_documentation(cls, condition, condition_notes='', photos=None, 
                                     handover_condition=None):
        """
        Validate return documentation.
        
        Rules:
        - Condition must be specified
        - Photos required (minimum 2)
        - Notes required if condition worsened
        - Notes required for poor/damaged condition
        """
        if not condition:
            raise ValidationError('Asset condition must be documented at return.')
        
        # Check photos
        photo_count = len(photos) if photos else 0
        if photo_count < cls.MIN_PHOTOS_RETURN:
            raise ValidationError(
                f'Minimum {cls.MIN_PHOTOS_RETURN} photos required at return. '
                f'Current: {photo_count} photos. '
                'Please document current asset condition.'
            )
        
        if photo_count > cls.MAX_PHOTOS:
            raise ValidationError(
                f'Maximum {cls.MAX_PHOTOS} photos allowed. '
                f'Current: {photo_count} photos.'
            )
        
        # Check if condition worsened
        if handover_condition:
            condition_hierarchy = {
                'EXCELLENT': 5,
                'GOOD': 4,
                'FAIR': 3,
                'POOR': 2,
                'DAMAGED': 1
            }
            
            handover_level = condition_hierarchy.get(handover_condition, 0)
            return_level = condition_hierarchy.get(condition, 0)
            
            if return_level < handover_level:
                if not condition_notes or len(condition_notes.strip()) < 20:
                    raise ValidationError(
                        f'Asset condition worsened from {handover_condition} to {condition}. '
                        'Detailed explanation required (minimum 20 characters). '
                        'Please describe what happened and any damage incurred.'
                    )
        
        # Check condition notes for poor/damaged
        if condition in cls.REQUIRED_CONDITION_NOTES:
            if not condition_notes or len(condition_notes.strip()) < 10:
                raise ValidationError(
                    f'Detailed condition notes required for {condition} condition. '
                    'Please describe the issues in detail (minimum 10 characters).'
                )
        
        return True


def validate_extension_request(assignment, requested_end_date, reason=''):
    """
    Validate assignment extension request.
    
    Rules:
    - Assignment must be active
    - New end date must be after current end date
    - Extension cannot exceed 90 days
    - Reason required for extensions > 30 days
    - Cannot extend if already overdue
    """
    if assignment.status != 'ACTIVE':
        raise ValidationError('Can only request extension for active assignments.')
    
    if assignment.is_overdue:
        raise ValidationError(
            f'Cannot request extension for overdue assignment. '
            f'Asset is overdue by {assignment.overdue_days} days. '
            'Please return the asset immediately.'
        )
    
    current_end_date = assignment.assignment_end_date
    if requested_end_date <= current_end_date:
        raise ValidationError(
            'New end date must be after current end date. '
            f'Current: {current_end_date.strftime("%B %d, %Y")}, '
            f'Requested: {requested_end_date.strftime("%B %d, %Y")}.'
        )
    
    # Check maximum extension
    extension_days = (requested_end_date - current_end_date).days
    if extension_days > 90:
        raise ValidationError(
            f'Extension cannot exceed 90 days. '
            f'Requested: {extension_days} days. '
            'Please submit a new assignment request instead.'
        )
    
    # Require reason for long extensions
    if extension_days > 30:
        if not reason or len(reason.strip()) < 20:
            raise ValidationError(
                f'Detailed reason required for {extension_days}-day extension. '
                'Please explain why you need this extended period (minimum 20 characters).'
            )
    
    return True
