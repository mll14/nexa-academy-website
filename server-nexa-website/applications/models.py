import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Application(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('reviewed', 'Reviewed'),
        ('not_reached', 'Not Responding'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('interview_scheduled', 'Interview Scheduled'),
        ('interview_completed', 'Interview Completed'),
        ('achieved', 'Achieved'),
        ('enrolled', 'Enrolled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='applications'
    )
    
    # Applicant info
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    # Free-text program slug (frontend sends dynamic slugs). Use program_name for human readable name.
    program = models.CharField(max_length=100, blank=True)
    program_name = models.CharField(max_length=255, blank=True)
    # New fields: whether applicant has basic knowledge of chosen subject
    has_basic_knowledge = models.BooleanField(default=False)
    knowledge_description = models.TextField(blank=True)
    estimated_fees = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_plan = models.CharField(max_length=100, blank=True)
    start_date = models.DateField(null=True, blank=True)
    message = models.TextField(blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    previous_status = models.CharField(max_length=20, blank=True)
    
    # Metadata
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status_updated_at = models.DateTimeField(null=True, blank=True)
    email_sent = models.BooleanField(default=False)
    recaptcha_verified = models.BooleanField(default=True)
    processed = models.BooleanField(default=False)
    source = models.CharField(max_length=50, default='website')
    month_year = models.CharField(max_length=10, blank=True)  # "2026-02"
    
    # Admin fields
    admin_notes = models.TextField(blank=True)
    processed_by = models.CharField(max_length=255, blank=True)
    
    class Meta:
        db_table = 'applications'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['applied_at']),
            models.Index(fields=['status', 'applied_at']),
            models.Index(fields=['program']),
            models.Index(fields=['email']),
        ]
        ordering = ['-applied_at']
    
    def __str__(self):
        return f"{self.full_name} - {self.program} ({self.status})"
    
    def save(self, *args, **kwargs):
        if not self.month_year:
            dt = self.applied_at or timezone.now()
            self.month_year = dt.strftime('%Y-%m')
        super().save(*args, **kwargs)


class ApplicationLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='logs')
    previous_status = models.CharField(max_length=50)
    new_status = models.CharField(max_length=50)
    changed_by = models.CharField(max_length=255)
    changed_at = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)
    applicant_email = models.EmailField()
    applicant_name = models.CharField(max_length=255)
    
    class Meta:
        db_table = 'application_logs'
        indexes = [
            models.Index(fields=['application']),
            models.Index(fields=['changed_at']),
        ]
        ordering = ['-changed_at']
    
    def __str__(self):
        return f"{self.applicant_name}: {self.previous_status} → {self.new_status}"


class ApplicationAdminNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='admin_note_logs')
    stage = models.CharField(max_length=50)
    html = models.TextField()
    text = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='application_admin_notes',
    )
    created_by_name = models.CharField(max_length=255, blank=True)
    created_by_email = models.EmailField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'application_admin_notes'
        indexes = [
            models.Index(fields=['application', '-created_at']),
            models.Index(fields=['created_by']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.application.full_name} note by {self.created_by_email or self.created_by_name}"


class InterviewSlot(models.Model):
    INTERVIEW_TYPE_CHOICES = (
        ('online', 'Online'),
        ('physical', 'Physical'),
    )

    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='interview_slot')
    proposed_times = models.JSONField(default=list)   # list of ISO datetime strings
    chosen_time = models.DateTimeField(null=True, blank=True)
    interview_type = models.CharField(max_length=20, choices=INTERVIEW_TYPE_CHOICES, default='online')
    zoom_link = models.URLField(blank=True)
    gcal_event_id = models.CharField(max_length=255, blank=True)
    meet_url = models.URLField(blank=True)
    # Columns that exist in the DB from a previous migration; kept optional.
    student_gmail = models.CharField(max_length=255, blank=True, default='')
    extra_guests = models.JSONField(default=list, blank=True)
    admin_approved = models.BooleanField(default=False)
    completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True, help_text="When the interview slot was booked by the applicant.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_slots'


class InterviewBlackout(models.Model):
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)  # null = full-day block
    end_time = models.TimeField(null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True)
    gcal_event_id = models.CharField(max_length=255, blank=True)
    created_by = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_blackouts'
        ordering = ['date', 'start_time']


class CustomCalendarEvent(models.Model):
    CATEGORY_CHOICES = (
        ('interview_follow_up', 'Interview Follow-up'),
        ('lead_follow_up', 'Lead Follow-up'),
        ('personal', 'Personal'),
        ('meeting', 'Meeting'),
        ('other', 'Other'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    all_day = models.BooleanField(default=False)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    description = models.TextField(blank=True)
    with_meet = models.BooleanField(default=False)
    meet_url = models.URLField(blank=True)
    attendees = models.JSONField(default=list, blank=True)  # list of email strings
    gcal_event_id = models.CharField(max_length=255, blank=True)
    created_by = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'custom_calendar_events'
        ordering = ['date', 'start_time']


class DraftApplication(models.Model):
    """Stores partial application data so we can send reminder emails to users who didn't finish."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    program = models.CharField(max_length=100, blank=True)
    step_reached = models.IntegerField(default=1)
    completed = models.BooleanField(default=False)
    reminder_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'draft_applications'
        indexes = [
            models.Index(fields=['email'], name='draft_email_idx'),
            models.Index(fields=['completed', 'reminder_sent', 'created_at'], name='draft_reminder_idx'),
        ]

    def __str__(self):
        return f"Draft: {self.email} (step {self.step_reached})"
