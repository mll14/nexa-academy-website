import uuid
from django.db import models
from django.utils import timezone

class NewsletterSubscription(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    )
    
    SOURCE_CHOICES = (
        ('website', 'Website'),
        ('popup', 'Popup'),
        ('email', 'Email'),
        ('application', 'Application'),
    )

    subscription_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, blank=True)
    subscribed_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='website')
    unsubscribed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'newsletter_subscriptions'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['status']),
            models.Index(fields=['-subscribed_at']),
        ]
        ordering = ['-subscribed_at']

    def __str__(self):
        return f"{self.email} ({self.status})"

    def unsubscribe(self):
        self.status = 'inactive'
        self.unsubscribed_at = timezone.now()
        self.save()


class NewsletterCampaign(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('sent', 'Sent'),
    )

    campaign_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.CharField(max_length=255)
    preview_text = models.CharField(max_length=255, blank=True)
    html_body = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    sent_at = models.DateTimeField(null=True, blank=True)
    sent_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'newsletter_campaigns'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subject} ({self.status})"