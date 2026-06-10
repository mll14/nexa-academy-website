from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from content.models import BlogPost, Announcement


class BlogPostAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        BlogPost.objects.create(
            title='Published', slug='published',
            body='<p>Hello</p>', is_published=True,
            published_at=timezone.now(),
        )
        BlogPost.objects.create(
            title='Draft', slug='draft', is_published=False,
        )

    def test_list_returns_only_published(self):
        res = self.client.get('/api/content/blog/')
        self.assertEqual(res.status_code, 200)
        titles = [p['title'] for p in (res.data.get('results') or res.data)]
        self.assertIn('Published', titles)
        self.assertNotIn('Draft', titles)

    def test_detail_by_slug(self):
        res = self.client.get('/api/content/blog/published/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['slug'], 'published')

    def test_draft_not_accessible(self):
        res = self.client.get('/api/content/blog/draft/')
        self.assertEqual(res.status_code, 404)


class AnnouncementAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        Announcement.objects.create(title='Active', body='Read me', is_active=True)
        Announcement.objects.create(title='Inactive', body='Hidden', is_active=False)

    def test_list_returns_only_active(self):
        res = self.client.get('/api/content/announcements/')
        self.assertEqual(res.status_code, 200)
        titles = [a['title'] for a in (res.data.get('results') or res.data)]
        self.assertIn('Active', titles)
        self.assertNotIn('Inactive', titles)
