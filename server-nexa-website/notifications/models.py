import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Notification(models.Model):
    TYPE_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('info', 'Information'),
        ('payment', 'Payment'),
        ('course', 'Course'),
    )

    notification_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    application = models.ForeignKey(
        'applications.Application',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    course_name = models.CharField(max_length=255, blank=True)
    link = models.CharField(max_length=255, blank=True, help_text="URL to redirect to")

    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', 'read']),
            models.Index(fields=['user', '-created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.title}"

    def mark_as_read(self):
        self.read = True
        self.save()