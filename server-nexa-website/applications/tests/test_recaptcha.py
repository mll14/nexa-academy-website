from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient


class ApplicationCreateRecaptchaTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def payload(self, email='applicant@test.com', **extra):
        data = {
            'full_name': 'Test Applicant',
            'email': email,
            'phone': '0700000000',
            'program': 'web-dev',
            'program_name': 'Full-Stack Web Dev',
            'has_basic_knowledge': True,
            'knowledge_description': 'I know HTML basics',
            'payment_plan': 'full',
            'source': 'website',
        }
        data.update(extra)
        return data

    @patch('applications.views.send_html_email')
    @patch('applications.views._verify_recaptcha')
    @override_settings(RECAPTCHA_SECRET_KEY='secret', RECAPTCHA_ENFORCE=True)
    def test_create_accepts_camel_case_recaptcha_token(self, mock_verify, mock_send_email):
        mock_verify.return_value = (
            True,
            {'success': True, 'score': 0.9, 'action': 'application_submit'},
            '',
        )

        response = self.client.post(
            '/api/applications/',
            self.payload(recaptchaToken='camel-token'),
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(mock_verify.call_args.args[0], 'camel-token')

    @patch('applications.views.send_html_email')
    @patch('applications.views._verify_recaptcha')
    @override_settings(RECAPTCHA_SECRET_KEY='secret', RECAPTCHA_ENFORCE=True)
    def test_create_accepts_google_recaptcha_response_field(self, mock_verify, mock_send_email):
        mock_verify.return_value = (
            True,
            {'success': True, 'score': 0.9, 'action': 'application_submit'},
            '',
        )

        response = self.client.post(
            '/api/applications/',
            self.payload(email='google-field@test.com', **{'g-recaptcha-response': 'google-token'}),
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(mock_verify.call_args.args[0], 'google-token')

    @patch('applications.views.send_html_email')
    @patch('applications.views._verify_recaptcha')
    @override_settings(RECAPTCHA_SECRET_KEY='secret', RECAPTCHA_ENFORCE=True)
    def test_create_accepts_recaptcha_header(self, mock_verify, mock_send_email):
        mock_verify.return_value = (
            True,
            {'success': True, 'score': 0.9, 'action': 'application_submit'},
            '',
        )

        response = self.client.post(
            '/api/applications/',
            self.payload(email='header-token@test.com'),
            format='json',
            HTTP_X_RECAPTCHA_TOKEN='header-token',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(mock_verify.call_args.args[0], 'header-token')

    @patch('applications.views.send_html_email')
    @override_settings(RECAPTCHA_SECRET_KEY='secret', RECAPTCHA_ENFORCE=True)
    def test_create_rejects_stringified_empty_recaptcha_token(self, mock_send_email):
        response = self.client.post(
            '/api/applications/',
            self.payload(email='missing-token@test.com', recaptchaToken='undefined'),
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'reCAPTCHA verification failed (missing-input-response)')
