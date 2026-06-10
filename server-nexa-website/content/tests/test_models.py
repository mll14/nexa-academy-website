from django.test import TestCase
from content.models import BlogPost, Announcement


class BlogPostModelTest(TestCase):
    def test_create_blog_post(self):
        post = BlogPost.objects.create(
            title='Test Post',
            slug='test-post',
            body='<p>Hello</p>',
            is_published=True,
        )
        self.assertEqual(str(post), 'Test Post')
        self.assertTrue(post.is_published)

    def test_blog_post_default_not_published(self):
        post = BlogPost.objects.create(title='Draft', slug='draft')
        self.assertFalse(post.is_published)


class AnnouncementModelTest(TestCase):
    def test_create_announcement(self):
        ann = Announcement.objects.create(title='Notice', body='Important info')
        self.assertTrue(ann.is_active)
        self.assertEqual(str(ann), 'Notice')
