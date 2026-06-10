import json
from django.test import TestCase
from rest_framework.test import APIClient
from django.conf import settings
from content.models import Testimonial, FAQ, BlogPost, Announcement


class CmsSyncAuthTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        settings.SANITY_WEBHOOK_SECRET = 'test-secret'

    def test_missing_secret_returns_401(self):
        res = self.client.post('/api/cms/sync/', {}, content_type='application/json')
        self.assertEqual(res.status_code, 401)

    def test_wrong_secret_returns_401(self):
        res = self.client.post(
            '/api/cms/sync/',
            json.dumps({'_type': 'testimonial', '_id': 'x'}),
            content_type='application/json',
            HTTP_X_SANITY_WEBHOOK_SECRET='wrong',
        )
        self.assertEqual(res.status_code, 401)

    def test_correct_secret_returns_200(self):
        payload = {
            '_id': 'test-123', '_type': 'testimonial',
            'name': 'Jane', 'role': 'Dev', 'quote': 'Great!', 'rating': 5,
            'avatarUrl': '', 'isActive': True, 'sortOrder': 0,
        }
        res = self.client.post(
            '/api/cms/sync/',
            json.dumps(payload),
            content_type='application/json',
            HTTP_X_SANITY_WEBHOOK_SECRET='test-secret',
        )
        self.assertEqual(res.status_code, 200)

    def test_unknown_type_returns_200(self):
        res = self.client.post(
            '/api/cms/sync/',
            json.dumps({'_id': 'x', '_type': 'unknownType'}),
            content_type='application/json',
            HTTP_X_SANITY_WEBHOOK_SECRET='test-secret',
        )
        self.assertEqual(res.status_code, 200)


class CmsSyncTestimonialTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        settings.SANITY_WEBHOOK_SECRET = 'test-secret'
        self.headers = {'HTTP_X_SANITY_WEBHOOK_SECRET': 'test-secret'}

    def _post(self, payload):
        return self.client.post(
            '/api/cms/sync/',
            json.dumps(payload),
            content_type='application/json',
            **self.headers,
        )

    def test_create_testimonial(self):
        payload = {
            '_id': 'san-t1', '_type': 'testimonial',
            'name': 'Alice', 'role': 'Engineer', 'quote': 'Love it',
            'rating': 5, 'avatarUrl': '', 'isActive': True, 'sortOrder': 1,
        }
        self._post(payload)
        t = Testimonial.objects.get(sanity_id='san-t1')
        self.assertEqual(t.name, 'Alice')

    def test_update_testimonial(self):
        Testimonial.objects.create(sanity_id='san-t2', name='Old', role='', quote='q', rating=5)
        payload = {
            '_id': 'san-t2', '_type': 'testimonial',
            'name': 'New', 'role': '', 'quote': 'q',
            'rating': 5, 'avatarUrl': '', 'isActive': True, 'sortOrder': 0,
        }
        self._post(payload)
        self.assertEqual(Testimonial.objects.get(sanity_id='san-t2').name, 'New')

    def test_delete_testimonial(self):
        Testimonial.objects.create(sanity_id='san-t3', name='Del', role='', quote='q', rating=5)
        self._post({'_id': 'san-t3', '_type': 'testimonial', '_op': 'delete'})
        self.assertFalse(Testimonial.objects.filter(sanity_id='san-t3').exists())

    def test_create_blog_post(self):
        payload = {
            '_id': 'san-b1', '_type': 'blogPost',
            'title': 'Hello World', 'slug': {'current': 'hello-world'},
            'body': '<p>Hi</p>', 'author': 'Jane', 'coverImageUrl': '',
            'category': 'news', 'tags': [], 'publishedAt': None, 'isPublished': True,
        }
        self._post(payload)
        post = BlogPost.objects.get(sanity_id='san-b1')
        self.assertEqual(post.slug, 'hello-world')
        self.assertTrue(post.is_published)

    def test_create_announcement(self):
        payload = {
            '_id': 'san-a1', '_type': 'announcement',
            'title': 'Notice', 'body': 'Read me',
            'isActive': True, 'publishedAt': None,
        }
        self._post(payload)
        ann = Announcement.objects.get(sanity_id='san-a1')
        self.assertEqual(ann.title, 'Notice')
