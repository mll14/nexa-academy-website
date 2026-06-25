import uuid
from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify

class Program(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('draft', 'Draft'),
        ('archived', 'Archived'),
    )

    program_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    coming_soon = models.BooleanField(default=False)
    sanity_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'programs'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['slug']),
        ]
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Enrollment(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('withdrawn', 'Withdrawn'),
    )

    enrollment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='enrollments'
    )
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='enrollments')
    student_name = models.CharField(max_length=255)
    program_name = models.CharField(max_length=255)
    enrollment_date = models.DateTimeField(default=timezone.now)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=10, decimal_places=2)
    payment_plan = models.CharField(max_length=100, blank=True)
    installment_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'enrollments'
        unique_together = ['student', 'program']
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['program']),
            models.Index(fields=['status']),
            models.Index(fields=['enrollment_date']),
        ]
        ordering = ['-enrollment_date']

    def save(self, *args, **kwargs):
        self.balance = self.amount - self.amount_paid
        if not self.student_name:
            self.student_name = self.student.display_name
        if not self.program_name:
            self.program_name = self.program.name
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student_name} - {self.program_name}"


class PaymentPlanChangeRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    request_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='payment_plan_requests')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_plan_requests',
    )
    current_payment_plan = models.CharField(max_length=100, blank=True)
    current_installment_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    requested_payment_plan = models.CharField(max_length=100)
    requested_installment_amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_notes = models.TextField(blank=True)
    approved_payment_plan = models.CharField(max_length=100, blank=True)
    approved_installment_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    reviewed_by = models.CharField(max_length=255, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_plan_change_requests'
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['enrollment']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.email} - {self.requested_payment_plan} ({self.status})"


class StudentProgramEnrolled(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('withdrawn', 'Withdrawn'),
    )
    
    APPLICATION_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='programs_enrolled'
    )
    program = models.ForeignKey(Program, on_delete=models.CASCADE)
    program_name = models.CharField(max_length=255)
    enrollment_date = models.DateTimeField(null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    application_status = models.CharField(max_length=20, choices=APPLICATION_STATUS_CHOICES, default='pending')
    progress = models.IntegerField(default=0)
    completion_percentage = models.IntegerField(default=0)

    class Meta:
        db_table = 'student_programs_enrolled'
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['program']),
            models.Index(fields=['status']),
        ]
        unique_together = ['student', 'program']

    def __str__(self):
        return f"{self.student.display_name} - {self.program_name}"


class ProgramProgress(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('withdrawn', 'Withdrawn'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='program_progress'
    )
    program = models.ForeignKey(Program, on_delete=models.CASCADE)
    program_name = models.CharField(max_length=255)
    enrollment_date = models.DateTimeField(null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    completion_percentage = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    total_hours_spent = models.IntegerField(default=0)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    
    # Store as JSON for flexibility
    modules = models.JSONField(default=dict, blank=True)
    assignments = models.JSONField(default=list, blank=True)
    quizzes = models.JSONField(default=list, blank=True)
    
    lessons_completed = models.IntegerField(default=0)
    lessons_total = models.IntegerField(default=0)
    tests_passed = models.IntegerField(default=0)
    certificate_earned = models.BooleanField(default=False)
    certificate_earned_at = models.DateTimeField(null=True, blank=True)
    certificate_url = models.URLField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'program_progress'
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['program']),
            models.Index(fields=['status']),
            models.Index(fields=['completion_percentage']),
        ]
        unique_together = ['student', 'program']
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.student.display_name} - {self.program_name} ({self.completion_percentage}%)"

    def save(self, *args, **kwargs):
        if not self.program_name and self.program:
            self.program_name = self.program.name
        super().save(*args, **kwargs)


class Certificate(models.Model):
    STATUS_CHOICES = (
        ('issued', 'Issued'),
        ('revoked', 'Revoked'),
        ('pending', 'Pending'),
    )

    GRADE_CHOICES = (
        ('A', 'A'),
        ('B', 'B'),
        ('C', 'C'),
        ('D', 'D'),
        ('F', 'F'),
    )

    certificate_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='certificates'
    )
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='certificates')
    student_name = models.CharField(max_length=255)
    program_name = models.CharField(max_length=255)
    issued_date = models.DateTimeField(default=timezone.now)
    certificate_url = models.URLField(blank=True)
    certificate_number = models.CharField(max_length=50, unique=True)
    verification_code = models.CharField(max_length=255, blank=True)
    verification_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='issued')
    grade = models.CharField(max_length=2, choices=GRADE_CHOICES, blank=True)
    completion_percentage = models.IntegerField()
    instructor = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'certificates'
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['program']),
            models.Index(fields=['certificate_number']),
            models.Index(fields=['-issued_date']),
        ]
        ordering = ['-issued_date']

    def save(self, *args, **kwargs):
        if not self.student_name and self.student:
            self.student_name = self.student.display_name
        if not self.program_name and self.program:
            self.program_name = self.program.name
        if not self.certificate_number:
            year = self.issued_date.strftime('%Y')
            with transaction.atomic():
                last_cert = (
                    Certificate.objects
                    .select_for_update()
                    .filter(certificate_number__startswith=f'UBUNTULABS-{year}')
                    .order_by('-certificate_number')
                    .first()
                )
                new_num = (int(last_cert.certificate_number.split('-')[-1]) + 1) if last_cert else 1
            self.certificate_number = f'UBUNTULABS-{year}-{new_num:04d}'
        if not self.verification_code:
            import secrets
            self.verification_code = secrets.token_urlsafe(16)
        if not self.verification_url:
            self.verification_url = f"/verify/{self.verification_code}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.certificate_number} - {self.student_name}"


class HelpMeLead(models.Model):
    """Submitted by users who don't know which program to choose."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    message = models.TextField(blank=True)
    follow_up_completed = models.BooleanField(default=False)
    follow_up_completed_at = models.DateTimeField(null=True, blank=True)
    assigned_program_slug = models.CharField(max_length=255, blank=True)
    assigned_program_name = models.CharField(max_length=255, blank=True)
    converted_to_pipeline = models.BooleanField(default=False)
    converted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'help_me_leads'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.name or self.email} (help-me)"


class IncompleteApplication(models.Model):
    """Partial form submissions auto-saved when a user leaves the application mid-way."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    program_slug = models.CharField(max_length=100, blank=True)
    program_name = models.CharField(max_length=255, blank=True)
    step_reached = models.IntegerField(default=1)
    follow_up_completed = models.BooleanField(default=False)
    follow_up_completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'incomplete_applications'
        ordering = ['-updated_at']
        # one record per email+program combo — upserted on each draft save
        unique_together = [['email', 'program_slug']]
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['-updated_at']),
        ]

    def __str__(self):
        return f"{self.email} — step {self.step_reached}"


class ProgramInterest(models.Model):
    """Stores expressions of interest for upcoming programs."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program_slug = models.CharField(max_length=255, blank=True)
    program_name = models.CharField(max_length=255, blank=True)
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    message = models.TextField(blank=True)
    follow_up_completed = models.BooleanField(default=False)
    follow_up_completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'program_interests'
        indexes = [
            models.Index(fields=['program_slug']),
            models.Index(fields=['email']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"Interest: {self.email} -> {self.program_slug or self.program_name}"


class LeadAdminNote(models.Model):
    LEAD_TYPE_CHOICES = (
        ('program_interest', 'Program Interest'),
        ('help_me', 'Help Me Lead'),
        ('incomplete_application', 'Incomplete Application'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead_type = models.CharField(max_length=40, choices=LEAD_TYPE_CHOICES)
    lead_id = models.UUIDField()
    stage = models.CharField(max_length=80)
    html = models.TextField()
    text = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='lead_admin_notes',
    )
    created_by_name = models.CharField(max_length=255, blank=True)
    created_by_email = models.EmailField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'lead_admin_notes'
        indexes = [
            models.Index(fields=['lead_type', 'lead_id', '-created_at']),
            models.Index(fields=['created_by']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.lead_type}:{self.lead_id} note by {self.created_by_email or self.created_by_name}"


class ProgramIntake(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('draft', 'Draft'),
    )
    MODE_CHOICES = (
        ('full_time_hybrid', 'Full-time Hybrid'),
        ('full_time_remote', 'Full-time Remote'),
        ('part_time_hybrid', 'Part-time Hybrid'),
        ('part_time_remote', 'Part-time Remote'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sanity_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='intakes')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    application_deadline = models.DateField(null=True, blank=True)
    max_seats = models.IntegerField(null=True, blank=True)
    seats_remaining = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='full_time_hybrid')
    notes = models.CharField(max_length=500, blank=True)
    # CMS integration fields
    source = models.CharField(max_length=10, default='site')  # 'site' or 'cms'
    cms_id = models.CharField(max_length=255, blank=True, help_text='External CMS entry ID')
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'program_intakes'
        ordering = ['start_date']
        unique_together = ['program', 'start_date']

    def __str__(self):
        return f'{self.program.name} — {self.start_date}'
