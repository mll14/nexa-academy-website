import uuid
from django.db import models
from django.utils import timezone


CATEGORY_CHOICES = [
    ('general', 'General'),
    ('bootcamp', 'Software Engineering'),
    ('cloud', 'Cloud & AI'),
    ('pricing', 'Pricing & Payments'),
    ('admissions', 'Admissions'),
]

SECTION_CHOICES = [
    ('why_choose', 'Why Choose Nexa'),
    ('journey', 'Learning Journey'),
]

DOC_TYPE_CHOICES = [
    ('privacy', 'Privacy Policy'),
    ('terms', 'Terms & Conditions'),
]


class Testimonial(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sanity_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=255, blank=True, help_text='e.g. "Software Engineer @ Andela"')
    quote = models.TextField()
    rating = models.PositiveSmallIntegerField(default=5)
    avatar_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'testimonials'
        ordering = ['sort_order', '-created_at']

    def __str__(self):
        return f"{self.name} — {self.role}"


class FAQ(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sanity_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    question = models.CharField(max_length=500)
    answer = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='general')
    show_on_homepage = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'faqs'
        ordering = ['category', 'sort_order']
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'

    def __str__(self):
        return self.question[:80]


class SiteSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    sanity_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    value = models.TextField()
    group = models.CharField(max_length=50, blank=True, help_text='hero, contact, cta')
    label = models.CharField(max_length=255, blank=True, help_text='Human-readable label')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'site_settings'
        ordering = ['group', 'key']

    def __str__(self):
        return f"{self.group}.{self.key}" if self.group else self.key


class HomepageFeature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sanity_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    section = models.CharField(max_length=20, choices=SECTION_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    icon_name = models.CharField(max_length=100, blank=True, help_text='Lucide icon name, e.g. BookOpen')
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'homepage_features'
        ordering = ['section', 'sort_order']

    def __str__(self):
        return f"[{self.section}] {self.title}"


class LegalDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sanity_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    doc_type = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES)
    section_id = models.CharField(max_length=100, help_text='e.g. item-1')
    title = models.CharField(max_length=255)
    content = models.TextField()
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'legal_documents'
        ordering = ['doc_type', 'sort_order']
        unique_together = ['doc_type', 'section_id']

    def __str__(self):
        return f"[{self.doc_type}] {self.title}"


class BlogPost(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sanity_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    body = models.TextField(blank=True, help_text='HTML converted from Sanity Portable Text')
    author = models.CharField(max_length=255, blank=True)
    cover_image_url = models.URLField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'blog_posts'
        ordering = ['-published_at']

    def __str__(self):
        return self.title


class Announcement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sanity_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-published_at']

    def __str__(self):
        return self.title


class PopupBanner(models.Model):
    TARGET_CHOICES = [
        ('all', 'All Pages'),
        ('home', 'Home Page'),
        ('programs', 'Programs'),
        ('blog', 'Blog'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sanity_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    cta_text = models.CharField(max_length=100, blank=True)
    cta_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=False)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    target_page = models.CharField(max_length=50, choices=TARGET_CHOICES, default='all')
    dismissible = models.BooleanField(default=True)
    priority = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'popup_banners'
        ordering = ['-priority', '-created_at']

    def __str__(self):
        return self.title


class SiteNavigation(models.Model):
    """Singleton — always use get_or_create(pk=1)."""
    items = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)
    sanity_id = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'site_navigation'

    def __str__(self):
        return 'Site Navigation'


class FooterConfig(models.Model):
    """Singleton — always use get_or_create(pk=1)."""
    columns = models.JSONField(default=list)
    social_links = models.JSONField(default=list)
    copyright_text = models.CharField(max_length=255, blank=True)
    tagline = models.CharField(max_length=500, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    sanity_id = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'footer_config'

    def __str__(self):
        return 'Footer Config'
