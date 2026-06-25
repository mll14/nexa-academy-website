from .models import AuditLog


def create_audit_log(request, action: str, resource_type: str, resource_id: str, resource_summary: dict):
    """Create an audit log entry for a sensitive operation."""
    ip = (
        request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
        or request.META.get('REMOTE_ADDR')
        or None
    )
    AuditLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        resource_summary=resource_summary,
        ip_address=ip or None,
    )
