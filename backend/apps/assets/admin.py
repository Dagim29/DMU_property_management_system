"""
Django admin configuration for Assets app
"""
from django.contrib import admin
from .models import Asset
from .assignment_models import AssetAssignmentRequest, AssetWaitlist, AssignmentRequestHistory
from .extension_models import AssignmentExtensionRequest


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ['asset_id', 'name', 'asset_type', 'status', 'assigned_to', 'campus']
    list_filter = ['status', 'asset_type', 'campus']
    search_fields = ['asset_id', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(AssetAssignmentRequest)
class AssetAssignmentRequestAdmin(admin.ModelAdmin):
    list_display = ['request_id', 'asset', 'requested_by', 'status', 'priority', 'request_date']
    list_filter = ['status', 'priority', 'assignment_type', 'is_overdue']
    search_fields = ['request_id', 'asset__asset_id', 'requested_by__username']
    readonly_fields = ['request_id', 'created_at', 'updated_at', 'is_overdue', 'overdue_days']
    date_hierarchy = 'request_date'


@admin.register(AssetWaitlist)
class AssetWaitlistAdmin(admin.ModelAdmin):
    list_display = ['asset', 'user', 'position', 'status', 'added_date']
    list_filter = ['status']
    search_fields = ['asset__asset_id', 'user__username']
    readonly_fields = ['added_date']


@admin.register(AssignmentRequestHistory)
class AssignmentRequestHistoryAdmin(admin.ModelAdmin):
    list_display = ['request', 'action', 'performed_by', 'action_date']
    list_filter = ['action']
    search_fields = ['request__request_id', 'performed_by__username']
    readonly_fields = ['action_date']
    date_hierarchy = 'action_date'


@admin.register(AssignmentExtensionRequest)
class AssignmentExtensionRequestAdmin(admin.ModelAdmin):
    list_display = ['extension_id', 'assignment', 'requested_by', 'status', 'extension_days', 'request_date']
    list_filter = ['status']
    search_fields = ['extension_id', 'assignment__request_id', 'requested_by__username']
    readonly_fields = ['extension_id', 'created_at', 'updated_at', 'extension_days']
    date_hierarchy = 'request_date'
