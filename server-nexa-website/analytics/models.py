import uuid
from django.db import models
from django.utils import timezone

class Analytics(models.Model):
    PERIOD_CHOICES = (
        ('all-time', 'All Time'),
        ('monthly', 'Monthly'),
        ('daily', 'Daily'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric_name = models.CharField(max_length=255)
    metric_value = models.DecimalField(max_digits=15, decimal_places=2)
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    month_year = models.CharField(max_length=10, blank=True)  # "2026-02"
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'analytics'
        indexes = [
            models.Index(fields=['metric_name']),
            models.Index(fields=['period']),
            models.Index(fields=['month_year']),
        ]

    def __str__(self):
        return f"{self.metric_name} - {self.metric_value} ({self.period})"


class MonthlyAnalytics(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    month = models.CharField(max_length=10, unique=True)  # "2026-02"
    new_students = models.IntegerField(default=0)
    total_enrollments = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    completed_programs = models.IntegerField(default=0)
    certificates_issued = models.IntegerField(default=0)
    outstanding_dues = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    program_breakdown = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'monthly_analytics'
        indexes = [
            models.Index(fields=['month']),
        ]
        ordering = ['-month']

    def __str__(self):
        return f"Analytics for {self.month}"