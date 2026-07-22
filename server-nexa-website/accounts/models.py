import uuid
from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


class AppPermission(models.Model):
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    resource = models.CharField(max_length=50)
    action = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'app_permissions'
        ordering = ['resource', 'action']

    def __str__(self):
        return f"{self.codename} — {self.name}"


class Role(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.CharField(max_length=500, blank=True)
    is_system = models.BooleanField(default=False)
    permissions = models.ManyToManyField(AppPermission, blank=True, related_name='roles')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'roles'
        ordering = ['name']

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('admin', 'Admin'),
    )

    STATUS_CHOICES = (
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('graduated', 'Graduated'),
        ('deleted', 'Deleted'),
    )

    GENDER_CHOICES = (
        ('female', 'Female'),
        ('male', 'Male'),
        ('other', 'Other'),
        ('undisclosed', 'Prefer not to say'),
    )

    uid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=255)
    photo_url = models.URLField(max_length=2000, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    id_number = models.CharField(max_length=50, blank=True)

    # Structured name. `display_name` remains the canonical string used across the app and
    # is derived from these on save. Keeping real name parts lets us map firstName/lastName
    # to Keycloak directly instead of guessing with split_name().
    first_name = models.CharField(max_length=100, blank=True)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)

    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True)
    nationality = models.CharField(max_length=100, blank=True)
    alt_phone = models.CharField(max_length=20, blank=True)

    # Address
    country = models.CharField(max_length=100, blank=True)
    county = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_address = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    batch_year = models.IntegerField(null=True, blank=True)
    fee_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_fee_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    # staff_role=None means super admin (unrestricted). A non-null role restricts to that role's permissions.
    staff_role = models.ForeignKey(
        Role, null=True, blank=True, on_delete=models.SET_NULL, related_name='users'
    )
    # Extra permissions granted directly to this user on top of their role
    individual_permissions = models.ManyToManyField(
        AppPermission, blank=True, related_name='users'
    )

    google_linked = models.BooleanField(default=False)

    # Links this Django user to its Keycloak identity (the token `sub`). Null until the
    # user is migrated/created in Keycloak. Keycloak owns authentication; this row stays
    # the system of record for business data and the RBAC (staff_role/permissions).
    keycloak_sub = models.CharField(
        max_length=255, unique=True, null=True, blank=True, db_index=True
    )

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)

    # Django required fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['display_name']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.display_name} ({self.email})"

    def save(self, *args, **kwargs):
        if self.role == 'admin':
            self.is_staff = True
        # Keep display_name derived from the name parts once they are filled in. Users who
        # predate the split (name parts blank) keep whatever display_name they already had.
        composed = ' '.join(
            p for p in (self.first_name, self.middle_name, self.last_name) if p
        ).strip()
        if composed:
            self.display_name = composed
        if 'update_fields' in kwargs and kwargs['update_fields'] is not None:
            fields = set(kwargs['update_fields'])
            if fields & {'first_name', 'middle_name', 'last_name'}:
                fields.add('display_name')
            if self.role == 'admin':
                fields.add('is_staff')
            kwargs['update_fields'] = fields
        super().save(*args, **kwargs)

    @property
    def age(self):
        """Age in whole years, or None when date_of_birth is unset."""
        if not self.date_of_birth:
            return None
        today = timezone.localdate()
        return (
            today.year - self.date_of_birth.year
            - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
        )

    def has_app_permission(self, codename: str) -> bool:
        if not self.is_authenticated or self.role != 'admin':
            return False
        if self.staff_role is None:
            return True  # super admin — unrestricted
        return (
            self.staff_role.permissions.filter(codename=codename).exists()
            or self.individual_permissions.filter(codename=codename).exists()
        )

    def get_effective_permissions(self) -> list:
        if self.role != 'admin':
            return []
        if self.staff_role is None:
            return list(AppPermission.objects.values_list('codename', flat=True))
        perms = set(self.staff_role.permissions.values_list('codename', flat=True))
        perms.update(self.individual_permissions.values_list('codename', flat=True))
        return list(perms)


class LoginSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='login_sessions'
    )
    # Tracks the latest refresh token JTI for this session (updated on each rotation)
    refresh_jti = models.CharField(max_length=255, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    is_revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'login_sessions'
        ordering = ['-created_at']

    def __str__(self):
        return f"Session({self.user.email}, {'revoked' if self.is_revoked else 'active'})"


class Guardian(models.Model):
    """
    A parent/guardian or emergency contact for a student.

    Optional by design — Nexa's applicants are mostly adults, so this matters for the
    younger intake (~18) where the guardian is often also the one paying the fees.
    """
    RELATIONSHIP_CHOICES = (
        ('parent', 'Parent'),
        ('guardian', 'Guardian'),
        ('sibling', 'Sibling'),
        ('spouse', 'Spouse'),
        ('sponsor', 'Sponsor'),
        ('other', 'Other'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='guardians'
    )
    full_name = models.CharField(max_length=255)
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES, default='parent')
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    occupation = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=False)
    is_emergency_contact = models.BooleanField(default=False)
    # A guardian who settles the student's fees — the payments side reads this to know who
    # invoices and receipts should address.
    is_bill_payer = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'guardians'
        ordering = ['-is_primary', 'full_name']

    def __str__(self):
        return f"{self.full_name} ({self.get_relationship_display()}) — {self.user.email}"


class NotificationPreference(models.Model):
    """Per-user opt-ins for outbound messaging. One row per user, created on first read."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preference'
    )

    # Channels — a disabled channel suppresses every category on that channel.
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    in_app_enabled = models.BooleanField(default=True)

    # Categories
    application_updates = models.BooleanField(default=True)
    interview_reminders = models.BooleanField(default=True)
    payment_updates = models.BooleanField(default=True)
    program_announcements = models.BooleanField(default=True)
    newsletter = models.BooleanField(default=False)
    # Security alerts (new sign-in, password change) are intentionally not opt-out.

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_preferences'

    def __str__(self):
        return f"Notification prefs — {self.user.email}"

    def allows(self, category: str, channel: str = 'email') -> bool:
        """Whether a given category may be sent on a given channel."""
        channel_on = {
            'email': self.email_enabled,
            'sms': self.sms_enabled,
            'in_app': self.in_app_enabled,
        }.get(channel, False)
        return bool(channel_on and getattr(self, category, False))


class TwoFADevice(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='two_fa_device'
    )
    secret = models.CharField(max_length=64)
    enabled = models.BooleanField(default=False)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'two_fa_devices'

    def __str__(self):
        return f"2FA({'on' if self.enabled else 'off'}) — {self.user.email}"


class AuditLog(models.Model):
    ACTION_CHOICES = (
        # Applications
        ('update_application_status', 'Updated Application Status'),
        ('delete_application', 'Deleted Application'),
        ('add_application_note', 'Added Application Note'),
        ('propose_interview_times', 'Proposed Interview Times'),
        ('schedule_interview', 'Scheduled Interview'),
        ('reschedule_interview', 'Rescheduled Interview'),
        ('complete_interview', 'Completed Interview'),
        ('cancel_interview', 'Cancelled Interview'),
        # Leads
        ('delete_lead_program_interest', 'Deleted Program Interest Lead'),
        ('delete_lead_help_me', 'Deleted Help Me Lead'),
        ('delete_lead_incomplete', 'Deleted Incomplete Lead'),
        # Staff management
        ('invite_staff', 'Invited Staff User'),
        ('update_staff', 'Updated Staff User'),
        ('remove_staff', 'Removed Staff User'),
        # Role management
        ('create_role', 'Created Role'),
        ('update_role', 'Updated Role'),
        ('delete_role', 'Deleted Role'),
        # Account security
        ('change_password', 'Changed Password'),
        ('change_email', 'Changed Email Address'),
        ('enable_2fa', 'Enabled Two-Factor Authentication'),
        ('disable_2fa', 'Disabled Two-Factor Authentication'),
        ('logout_all_sessions', 'Signed Out All Sessions'),
        # Account lifecycle
        ('deactivate_account', 'Deactivated Account'),
        ('export_account', 'Exported Account Data'),
        ('delete_account', 'Deleted Account'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='audit_logs'
    )
    action = models.CharField(max_length=60, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=100)
    resource_summary = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} by {self.user} at {self.created_at}"
