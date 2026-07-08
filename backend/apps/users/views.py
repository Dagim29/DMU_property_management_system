from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.contrib.auth import get_user_model
from apps.core.permissions import IsSuperAdmin
from apps.core.utils import log_action, get_client_ip
from .serializers import UserSerializer, UserCreateSerializer, ChangePasswordSerializer

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active', 'department']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            # Allow SUPER_ADMIN and MAINTENANCE_SUPERVISOR to create users
            from rest_framework.permissions import BasePermission
            
            class CanCreateUser(BasePermission):
                def has_permission(self, request, view):
                    return request.user.role in ['SUPER_ADMIN', 'MAINTENANCE_SUPERVISOR']
            
            return [CanCreateUser()]
        
        if self.action == 'destroy':
            return [IsSuperAdmin()]
        
        if self.action in ['update', 'partial_update']:
            # Allow users to update their own profile, or admins/supervisors to update others
            return [IsAuthenticated()]
        
        return super().get_permissions()
    
    def check_object_permissions(self, request, obj):
        """Check if user can modify this user object."""
        super().check_object_permissions(request, obj)
        
        # For update/partial_update
        if self.action in ['update', 'partial_update']:
            # Allow if it's the user's own profile
            if obj.id == request.user.id:
                return
            
            # Allow if user is SUPER_ADMIN
            if request.user.role == 'SUPER_ADMIN':
                return
            
            # Allow if user is MAINTENANCE_SUPERVISOR and target is a technician
            if request.user.role == 'MAINTENANCE_SUPERVISOR' and obj.role == 'MAINTENANCE_TECHNICIAN':
                return
            
            # Otherwise, deny
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You don't have permission to update this user.")
        
        # For destroy, only admins
        if self.action == 'destroy' and request.user.role != 'SUPER_ADMIN':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only administrators can delete users.")
    
    def perform_create(self, serializer):
        """Create user and log the action."""
        # If supervisor is creating a user, ensure it's a technician
        if self.request.user.role == 'MAINTENANCE_SUPERVISOR':
            if serializer.validated_data.get('role') != 'MAINTENANCE_TECHNICIAN':
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Supervisors can only create technician accounts.")
        
        user = serializer.save()
        log_action(
            user=self.request.user,
            action='CREATE',
            model_name='User',
            object_id=user.id,
            details={
                'username': user.username,
                'role': user.role,
                'email': user.email
            },
            ip_address=get_client_ip(self.request)
        )
    
    def perform_update(self, serializer):
        """Update user and log the action."""
        user = serializer.save()
        log_action(
            user=self.request.user,
            action='UPDATE',
            model_name='User',
            object_id=user.id,
            details={
                'username': user.username,
                'role': user.role,
                'updated_by': self.request.user.username
            },
            ip_address=get_client_ip(self.request)
        )
    
    def perform_destroy(self, instance):
        """Delete user and log the action."""
        log_action(
            user=self.request.user,
            action='DELETE',
            model_name='User',
            object_id=instance.id,
            details={
                'username': instance.username,
                'role': instance.role,
                'deleted_by': self.request.user.username
            },
            ip_address=get_client_ip(self.request)
        )
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        """Change user's password and set expiry."""
        user = self.get_object()
        
        # Only allow users to change their own password
        if user.id != request.user.id:
            return Response({'error': 'You can only change your own password'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if using old_password or current_password
        old_password = serializer.validated_data.get('old_password') or request.data.get('current_password')
        
        if not user.check_password(old_password):
            return Response({'error': 'Invalid current password'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        
        # BR-UM-05: Set password expiry based on role
        user.set_password_expiry()
        user.save()
        
        log_action(user, 'UPDATE', 'User', user.id, {
            'action': 'password_change',
            'password_expires_at': user.password_expires_at.isoformat() if user.password_expires_at else None,
            'expiry_days': user.get_password_expiry_days()
        }, get_client_ip(request))
        
        return Response({
            'message': 'Password changed successfully',
            'password_expires_in_days': user.get_password_expiry_days(),
            'password_expires_at': user.password_expires_at
        })
