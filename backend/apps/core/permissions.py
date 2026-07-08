from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """Allow access only to super admins."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'SUPER_ADMIN'


class IsPropertyManager(permissions.BasePermission):
    """Allow access to property managers and super admins."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['PROPERTY_MANAGER', 'SUPER_ADMIN']


class IsMaintenanceSupervisor(permissions.BasePermission):
    """Allow access to maintenance supervisors and super admins."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['MAINTENANCE_SUPERVISOR', 'SUPER_ADMIN']


class IsMaintenanceTechnician(permissions.BasePermission):
    """Allow access to maintenance technicians and supervisors."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            'MAINTENANCE_TECHNICIAN', 'MAINTENANCE_SUPERVISOR', 'SUPER_ADMIN'
        ]


class IsOwnerOrPropertyManager(permissions.BasePermission):
    """Allow owners to create requests, property managers to manage."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            'OWNER', 'PROPERTY_MANAGER', 'SUPER_ADMIN'
        ]
