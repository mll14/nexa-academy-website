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
    )

    uid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=255)
    photo_url = models.URLField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    id_number = models.CharField(max_length=50, blank=True)
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
        super().save(*args, **kwargs)

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
