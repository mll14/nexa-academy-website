import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = (
        ('M-Pesa', 'M-Pesa'),
        ('Card', 'Card'),
        ('Bank Transfer', 'Bank Transfer'),
    )
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )

    payment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    student_name = models.CharField(max_length=255)
    student_email = models.EmailField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='KES')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    payment_reference = models.CharField(max_length=255, blank=True)
    mobile_number = models.CharField(max_length=20, blank=True)
    transaction_id = models.CharField(max_length=255, blank=True)
    program = models.ForeignKey(
        'programs.Program',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments'
    )
    program_name = models.CharField(max_length=255, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    payment_date = models.DateTimeField(default=timezone.now)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    description = models.TextField(blank=True)
    invoice_url = models.URLField(blank=True)
    receipt_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['-payment_date']),
            models.Index(fields=['status']),
            models.Index(fields=['transaction_id']),
        ]
        ordering = ['-payment_date']

    def save(self, *args, **kwargs):
        if not self.student_name and self.student:
            self.student_name = self.student.display_name
        if not self.student_email and self.student:
            self.student_email = self.student.email
        if self.program and not self.program_name:
            self.program_name = self.program.program_name
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student_name} - {self.amount} {self.currency} ({self.status})"


class PaymentHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_history'
    )
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='history')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField()
    payment_method = models.CharField(max_length=50)
    reference = models.CharField(max_length=255)
    program = models.ForeignKey('programs.Program', on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=50, default='completed')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment_history'
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['-payment_date']),
        ]
        ordering = ['-payment_date']