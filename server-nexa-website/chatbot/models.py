from django.db import models


class KnowledgeBase(models.Model):
    CATEGORY_CHOICES = [
        ('program', 'Program Info'),
        ('faq', 'FAQ'),
        ('policy', 'Policy'),
        ('contact', 'Contact'),
        ('admissions', 'Admissions'),
        ('general', 'General'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    content = models.TextField(
        help_text='Plain text. Indexed by the AI chatbot — write clearly and factually.'
    )
    source_url = models.CharField(
        max_length=500, blank=True,
        help_text='Relative URL for citation, e.g. /faq',
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Inactive entries are excluded from the chatbot index.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'knowledge_base'
        ordering = ['category', 'title']
        verbose_name = 'Knowledge Base Entry'
        verbose_name_plural = 'Knowledge Base'

    def __str__(self):
        return f'[{self.get_category_display()}] {self.title}'
