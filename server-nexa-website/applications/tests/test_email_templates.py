from django.test import TestCase
from django.template.loader import render_to_string
from unittest.mock import patch

BASE_CTX = {
    'full_name': 'Test User',
    'program_name': 'Full-Stack Web Dev',
    'frontend_url': 'https://nexaacademy.co.ke',
    'start_date': None,
    'estimated_fees': None,
}


class EmailTemplateRenderTests(TestCase):
    """Each template must render without error and contain key content."""

    def _render(self, template, extra=None):
        ctx = {**BASE_CTX, **(extra or {})}
        return render_to_string(f'emails/{template}', ctx)

    def test_base_contains_logo(self):
        html = self._render('base_email.html')
        self.assertIn('nexa-academy-small-logo.png', html)
        self.assertIn('Admissions', html)

    def test_application_received(self):
        html = self._render('application_received.html')
        self.assertIn('solid first step', html)
        self.assertIn('Test User', html)

    def test_application_reviewed(self):
        html = self._render('application_reviewed.html')
        self.assertIn('final stage', html)

    def test_application_approved_with_details(self):
        html = self._render('application_approved.html', {
            'start_date': 'March 3, 2025', 'estimated_fees': '85000'
        })
        self.assertIn("You've been approved", html)
        self.assertIn('March 3, 2025', html)
        self.assertIn('KSh 85000', html)

    def test_application_approved_without_details(self):
        html = self._render('application_approved.html')
        self.assertNotIn('Program Details', html)

    def test_application_rejected(self):
        html = self._render('application_rejected.html')
        self.assertIn('close the door permanently', html)
        self.assertIn('We wish you all the best', html)

    def test_interview_scheduled(self):
        html = self._render('interview_scheduled.html', {
            'chosen_time': 'Wednesday, 19 Feb at 10:00 AM EAT',
            'meet_url': 'https://meet.google.com/test',
        })
        self.assertIn('conversation, not a test', html)
        self.assertIn('meet.google.com', html)

    def test_interview_rescheduled(self):
        html = self._render('interview_rescheduled.html', {
            'chosen_time': 'Friday, 21 Feb at 02:00 PM EAT',
            'meet_url': 'https://meet.google.com/test',
        })
        self.assertIn('same link', html)
        self.assertIn('appreciate your flexibility', html)

    def test_interview_completed(self):
        html = self._render('interview_completed.html')
        self.assertIn('Great talking with you', html)
        self.assertIn('business days', html)

    def test_enrolled(self):
        html = self._render('enrolled.html')
        self.assertIn('Welcome to Nexa Academy', html)
        self.assertIn('officially enrolled', html)
        self.assertIn('Go to Student Portal', html)


class EmailSendOnStatusChangeTests(TestCase):
    """views.update_status() must send the right template for each status."""

    def setUp(self):
        from accounts.models import User
        from applications.models import Application
        self.admin = User.objects.create_user(
            email='admin@test.com', password='pass'
        )
        self.admin.role = 'admin'
        self.admin.save()
        self.application = Application.objects.create(
            full_name='Test User',
            email='applicant@test.com',
            program_name='Full-Stack Web Dev',
            status='pending',
        )

    def _change_status(self, new_status):
        """Trigger update_status and return the send_html_email mock."""
        self.client.force_login(self.admin)
        with patch('applications.views.send_html_email') as mock_send:
            self.client.patch(
                f'/api/applications/{self.application.pk}/update_status/',
                data={'status': new_status},
                content_type='application/json',
            )
            return mock_send

    def test_reviewed_sends_correct_template(self):
        mock = self._change_status('reviewed')
        mock.assert_called_once()
        kwargs = mock.call_args.kwargs
        self.assertEqual(kwargs['template_name'], 'application_reviewed.html')
        self.assertIn('reviewed', kwargs['subject'].lower())

    def test_approved_sends_correct_template(self):
        mock = self._change_status('approved')
        mock.assert_called_once()
        kwargs = mock.call_args.kwargs
        self.assertEqual(kwargs['template_name'], 'application_approved.html')
        self.assertIn('approved', kwargs['subject'].lower())

    def test_rejected_sends_correct_template(self):
        mock = self._change_status('rejected')
        mock.assert_called_once()
        kwargs = mock.call_args.kwargs
        self.assertEqual(kwargs['template_name'], 'application_rejected.html')

    def test_interview_completed_sends_email(self):
        self.application.status = 'interview_scheduled'
        self.application.save()
        mock = self._change_status('interview_completed')
        mock.assert_called_once()
        kwargs = mock.call_args.kwargs
        self.assertEqual(kwargs['template_name'], 'interview_completed.html')
        self.assertIn('Test User', kwargs['subject'])

    def test_enrolled_sends_email(self):
        self.application.status = 'interview_completed'
        self.application.save()
        mock = self._change_status('enrolled')
        mock.assert_called_once()
        kwargs = mock.call_args.kwargs
        self.assertEqual(kwargs['template_name'], 'enrolled.html')
        self.assertIn('Welcome', kwargs['subject'])

    def test_pending_status_sends_no_email(self):
        mock = self._change_status('pending')
        mock.assert_not_called()
