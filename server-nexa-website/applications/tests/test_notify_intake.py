from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from applications.models import Application
from programs.models import Program, ProgramIntake


User = get_user_model()


class NotifyIntakeEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='notify-admin@test.com',
            password='pass',
            display_name='Notify Admin',
            role='admin',
        )
        self.student = User.objects.create_user(
            email='notify-student@test.com',
            password='pass',
            display_name='Notify Student',
        )
        self.program = Program.objects.create(
            slug='web-dev',
            name='Full-Stack Web Dev',
            status='active',
        )
        self.intake = ProgramIntake.objects.create(
            program=self.program,
            start_date=date(2026, 9, 1),
            application_deadline=date(2026, 8, 15),
            status='open',
        )
        self.app = Application.objects.create(
            user=self.student,
            full_name='Notify Student',
            email='notify-student@test.com',
            phone='0700000040',
            program='web-dev',
            program_name='Full-Stack Web Dev',
            status='approved',
            knowledge_description='Some knowledge',
        )

    @patch('applications.views.send_html_email')
    def test_notify_intake_assigns_start_date_and_moves_filter_bucket(self, mock_send_email):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f'/api/applications/{self.app.id}/notify_intake/',
            {'intake_id': str(self.intake.id)},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['sent'])
        self.assertEqual(response.data['application']['start_date'], '2026-09-01')
        self.app.refresh_from_db()
        self.assertEqual(self.app.start_date, date(2026, 9, 1))
        mock_send_email.assert_called_once()

        without_response = self.client.get('/api/applications/', {'intake_status': 'without'})
        with_response = self.client.get('/api/applications/', {'intake_status': 'with'})

        self.assertEqual(without_response.status_code, 200)
        self.assertEqual(with_response.status_code, 200)
        without_ids = {item['id'] for item in without_response.data['results']}
        with_ids = {item['id'] for item in with_response.data['results']}
        self.assertNotIn(str(self.app.id), without_ids)
        self.assertIn(str(self.app.id), with_ids)
