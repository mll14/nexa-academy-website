from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from notifications.serializers import CreateGroupNotificationSerializer

User = get_user_model()


# ── Serializer tests ──────────────────────────────────────────────────────────

class CreateGroupNotificationSerializerTest(TestCase):

    def _valid(self, group):
        data = {
            'group': group,
            'type': 'info',
            'title': 'Hello',
            'message': 'Test message',
        }
        s = CreateGroupNotificationSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)

    def _invalid(self, group):
        data = {
            'group': group,
            'type': 'info',
            'title': 'Hello',
            'message': 'Test message',
        }
        s = CreateGroupNotificationSerializer(data=data)
        self.assertFalse(s.is_valid())
        self.assertIn('group', s.errors)

    def test_accepts_all(self):
        self._valid('all')

    def test_accepts_pending(self):
        self._valid('pending')

    def test_accepts_approved(self):
        self._valid('approved')

    def test_accepts_enrolled(self):
        self._valid('enrolled')

    def test_accepts_program_slug(self):
        self._valid('program:software-engineering')

    def test_rejects_unknown_literal(self):
        self._invalid('reviewed')

    def test_rejects_bare_program(self):
        self._invalid('program:')

    def test_rejects_empty(self):
        self._invalid('')

    def test_link_optional(self):
        data = {
            'group': 'all',
            'type': 'info',
            'title': 'Hi',
            'message': 'Msg',
        }
        s = CreateGroupNotificationSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data.get('link', ''), '')


# ── View tests ────────────────────────────────────────────────────────────────

from applications.models import Application
from notifications.models import Notification


def make_admin():
    return User.objects.create_user(
        email='admin@test.com',
        password='pass',
        role='admin',
        display_name='Admin',
    )


def make_student(email='student@test.com'):
    return User.objects.create_user(
        email=email,
        password='pass',
        role='student',
        display_name=email.split('@')[0],
    )


def make_application(user, status='pending', program='software-engineering'):
    return Application.objects.create(
        user=user,
        full_name=user.email.split('@')[0],
        email=user.email,
        phone='0700000000',
        status=status,
        program=program,
    )


class CreateGroupNotificationViewTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.client.force_authenticate(user=self.admin)

        self.s1 = make_student('s1@test.com')
        self.s2 = make_student('s2@test.com')
        self.s3 = make_student('s3@test.com')

        make_application(self.s1, status='pending', program='software-engineering')
        make_application(self.s2, status='enrolled', program='software-engineering')
        make_application(self.s3, status='approved', program='cloud')

    def _post(self, payload):
        return self.client.post(
            '/api/notifications/create_for_group/',
            payload,
            format='json',
        )

    def test_group_all_creates_for_every_user(self):
        res = self._post({
            'group': 'all',
            'type': 'info',
            'title': 'All msg',
            'message': 'Hello everyone',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['sent_count'], 3)
        self.assertEqual(Notification.objects.count(), 3)

    def test_group_pending_only_pending_users(self):
        res = self._post({
            'group': 'pending',
            'type': 'info',
            'title': 'Pending msg',
            'message': 'Still pending',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['sent_count'], 1)
        notif = Notification.objects.get()
        self.assertEqual(notif.user, self.s1)

    def test_group_enrolled_only_enrolled_users(self):
        res = self._post({
            'group': 'enrolled',
            'type': 'info',
            'title': 'Enrolled',
            'message': 'Welcome',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['sent_count'], 1)
        self.assertEqual(Notification.objects.get().user, self.s2)

    def test_group_program_slug_filters_correctly(self):
        res = self._post({
            'group': 'program:cloud',
            'type': 'info',
            'title': 'Cloud msg',
            'message': 'Cloud students only',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['sent_count'], 1)
        self.assertEqual(Notification.objects.get().user, self.s3)

    def test_non_admin_gets_403(self):
        self.client.force_authenticate(user=self.s1)
        res = self._post({
            'group': 'all',
            'type': 'info',
            'title': 'X',
            'message': 'Y',
        })
        self.assertEqual(res.status_code, 403)

    def test_invalid_group_returns_400(self):
        res = self._post({
            'group': 'reviewed',
            'type': 'info',
            'title': 'X',
            'message': 'Y',
        })
        self.assertEqual(res.status_code, 400)

    def test_no_duplicate_per_user(self):
        make_application(self.s1, status='pending', program='cloud')
        res = self._post({
            'group': 'pending',
            'type': 'info',
            'title': 'Dedup',
            'message': 'Once only',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Notification.objects.filter(user=self.s1).count(), 1)

    def test_anonymous_apps_excluded(self):
        Application.objects.create(
            user=None,
            full_name='Anon',
            email='anon@x.com',
            phone='0700000001',
            status='pending',
            program='software-engineering',
        )
        res = self._post({
            'group': 'all',
            'type': 'info',
            'title': 'Anon test',
            'message': 'Should skip anon',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['sent_count'], 3)
