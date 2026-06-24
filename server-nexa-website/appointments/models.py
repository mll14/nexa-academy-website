import uuid
from django.db import models


class Appointment(models.Model):
    TYPE_CHOICES = (
        ('physical', 'Physical'),
        ('virtual', 'Virtual'),
    )
    HOST_CHOICES = (
        ('admissions_manager', 'Admissions Manager'),
        ('technical_mentor', 'Technical Mentor'),
    )
    STATUS_CHOICES = (
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    appointment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    host = models.CharField(max_length=30, choices=HOST_CHOICES)
    chosen_time = models.DateTimeField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    attendees = models.JSONField(default=list, blank=True)
    gcal_event_id = models.CharField(max_length=255, blank=True)
    meet_url = models.URLField(blank=True)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments'
        ordering = ['-chosen_time']
        indexes = [
            models.Index(fields=['status'], name='appts_status_idx'),
            models.Index(fields=['chosen_time'], name='appts_time_idx'),
            models.Index(fields=['email'], name='appts_email_idx'),
        ]

    def __str__(self):
        return f"{self.name} — {self.get_appointment_type_display()} with {self.get_host_display()}"
