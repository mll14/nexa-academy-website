from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """Allows access only to admin users (any staff_role, including super admin)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsStudentUser(permissions.BasePermission):
    """Allows access only to student users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'student')


class IsSuperAdmin(permissions.BasePermission):
    """Admin with no staff_role — has unrestricted access."""
    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated)
            and request.user.role == 'admin'
            and request.user.staff_role is None
        )


def HasAppPermission(codename: str):
    """Factory returning a permission class that checks a specific codename."""
    class _Permission(permissions.BasePermission):
        required_codename = codename

        def has_permission(self, request, view):
            return (
                bool(request.user and request.user.is_authenticated)
                and request.user.has_app_permission(self.required_codename)
            )

    _Permission.__name__ = f'HasAppPermission[{codename}]'
    return _Permission
