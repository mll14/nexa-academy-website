"""
Tests for the account-management surface.

The focus is the Keycloak seam: password and email changes must reach Keycloak, because
writing them only into Django is a *silent* no-op for login. Every Keycloak call is mocked
— these tests must never touch a real server.
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.keycloak_admin import KeycloakAdminError
from accounts.models import Guardian, NotificationPreference
from accounts.serializers import mask_id_number

User = get_user_model()


class AccountTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='jane@example.com',
            password='OldPassw0rd!',
            display_name='Jane Doe',
            keycloak_sub='kc-123',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)


# ── Password ──────────────────────────────────────────────────────────────────

class ChangePasswordTests(AccountTestCase):
    def test_django_only_mode_uses_the_django_hash(self):
        with patch('accounts.keycloak_admin.is_configured', return_value=False):
            resp = self.client.post('/api/auth/change-password/', {
                'current_password': 'OldPassw0rd!',
                'new_password': 'BrandNewPass1!',
            }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('BrandNewPass1!'))

    @patch('accounts.keycloak_admin.set_password')
    @patch('accounts.keycloak_admin.verify_password', return_value=True)
    @patch('accounts.keycloak_admin.has_password_credential', return_value=True)
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_password_is_written_to_keycloak(self, _cfg, _has, _verify, mock_set):
        resp = self.client.post('/api/auth/change-password/', {
            'current_password': 'OldPassw0rd!',
            'new_password': 'BrandNewPass1!',
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        mock_set.assert_called_once()
        self.assertEqual(mock_set.call_args[0][1], 'BrandNewPass1!')
        # Django is kept in step so the two stores do not drift.
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('BrandNewPass1!'))

    @patch('accounts.keycloak_admin.set_password')
    @patch('accounts.keycloak_admin.verify_password', return_value=False)
    @patch('accounts.keycloak_admin.has_password_credential', return_value=True)
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_wrong_current_password_is_rejected_by_keycloak(self, _cfg, _has, _verify, mock_set):
        """The Django hash may be stale, so the current password is checked against Keycloak."""
        resp = self.client.post('/api/auth/change-password/', {
            'current_password': 'not-my-password',
            'new_password': 'BrandNewPass1!',
        }, format='json')

        self.assertEqual(resp.status_code, 400)
        mock_set.assert_not_called()

    @patch('accounts.keycloak_admin.set_password')
    @patch('accounts.keycloak_admin.verify_password')
    @patch('accounts.keycloak_admin.has_password_credential', return_value=False)
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_social_only_account_sets_a_first_password(self, _cfg, _has, mock_verify, mock_set):
        """A Google-only user has no current password — demanding one would always fail."""
        resp = self.client.post('/api/auth/change-password/', {
            'new_password': 'BrandNewPass1!',
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        mock_verify.assert_not_called()
        mock_set.assert_called_once()

    @patch('accounts.keycloak_admin.set_password', side_effect=KeycloakAdminError('boom'))
    @patch('accounts.keycloak_admin.verify_password', return_value=True)
    @patch('accounts.keycloak_admin.has_password_credential', return_value=True)
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_keycloak_failure_does_not_change_the_django_password(self, *_):
        """A success toast with an unchanged login is the exact bug this guards against."""
        resp = self.client.post('/api/auth/change-password/', {
            'current_password': 'OldPassw0rd!',
            'new_password': 'BrandNewPass1!',
        }, format='json')

        self.assertEqual(resp.status_code, 502)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('OldPassw0rd!'))


# ── Profile ───────────────────────────────────────────────────────────────────

class MyProfileTests(AccountTestCase):
    @patch('accounts.keycloak_admin.update_user')
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_email_change_syncs_username_to_keycloak(self, _cfg, mock_update):
        resp = self.client.patch('/api/auth/my-profile/',
                                 {'email': 'new@example.com'}, format='json')

        self.assertEqual(resp.status_code, 200)
        sent = mock_update.call_args.kwargs
        # Email is also the Keycloak username — both must move together.
        self.assertEqual(sent['email'], 'new@example.com')
        self.assertEqual(sent['username'], 'new@example.com')
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'new@example.com')

    @patch('accounts.keycloak_admin.update_user',
           side_effect=KeycloakAdminError('That email is already in use.'))
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_email_is_not_committed_when_keycloak_rejects_it(self, _cfg, _update):
        resp = self.client.patch('/api/auth/my-profile/',
                                 {'email': 'taken@example.com'}, format='json')

        self.assertEqual(resp.status_code, 502)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'jane@example.com')

    @patch('accounts.keycloak_admin.is_configured', return_value=False)
    def test_personal_and_address_fields_are_saved(self, _cfg):
        resp = self.client.patch('/api/auth/my-profile/', {
            'first_name': 'Jane',
            'middle_name': 'Wanjiru',
            'last_name': 'Doe',
            'date_of_birth': '2000-05-17',
            'gender': 'female',
            'nationality': 'Kenyan',
            'alt_phone': '+254700000000',
            'country': 'Kenya',
            'county': 'Nairobi',
            'city': 'Nairobi',
            'postal_address': 'P.O. Box 1–00100',
        }, format='json')

        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.county, 'Nairobi')
        self.assertEqual(str(self.user.date_of_birth), '2000-05-17')
        # display_name stays derived from the name parts.
        self.assertEqual(self.user.display_name, 'Jane Wanjiru Doe')

    @patch('accounts.keycloak_admin.is_configured', return_value=False)
    def test_future_date_of_birth_is_rejected(self, _cfg):
        resp = self.client.patch('/api/auth/my-profile/',
                                 {'date_of_birth': '2999-01-01'}, format='json')
        self.assertEqual(resp.status_code, 400)


class IdNumberMaskingTests(AccountTestCase):
    def test_mask_keeps_only_the_last_four(self):
        self.assertEqual(mask_id_number('12345678'), '••••5678')
        self.assertEqual(mask_id_number(''), '')

    def test_student_sees_a_masked_id_number(self):
        self.user.id_number = '33445566'
        self.user.save(update_fields=['id_number'])

        resp = self.client.get('/api/auth/profile/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['id_number'], '••••5566')

    def test_admin_sees_the_full_id_number(self):
        self.user.id_number = '33445566'
        self.user.role = 'admin'
        self.user.save(update_fields=['id_number', 'role'])

        resp = self.client.get('/api/auth/profile/')
        self.assertEqual(resp.data['id_number'], '33445566')


# ── Guardians ─────────────────────────────────────────────────────────────────

class GuardianTests(AccountTestCase):
    def test_create_and_list_own_guardians(self):
        resp = self.client.post('/api/auth/guardians/', {
            'full_name': 'Mary Wanjiru',
            'relationship': 'parent',
            'phone': '+254700111222',
            'is_primary': True,
            'is_bill_payer': True,
        }, format='json')

        self.assertEqual(resp.status_code, 201)
        listing = self.client.get('/api/auth/guardians/')
        self.assertEqual(len(listing.data), 1)
        self.assertEqual(listing.data[0]['relationship_display'], 'Parent')

    def test_guardian_requires_a_contact_method(self):
        resp = self.client.post('/api/auth/guardians/', {
            'full_name': 'No Contact',
            'relationship': 'parent',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_promoting_a_primary_demotes_the_previous_one(self):
        first = Guardian.objects.create(
            user=self.user, full_name='First', phone='+254700111222', is_primary=True,
        )
        resp = self.client.post('/api/auth/guardians/', {
            'full_name': 'Second',
            'relationship': 'guardian',
            'phone': '+254700333444',
            'is_primary': True,
        }, format='json')

        self.assertEqual(resp.status_code, 201)
        first.refresh_from_db()
        self.assertFalse(first.is_primary)

    def test_another_users_guardians_are_not_visible(self):
        other = User.objects.create_user(
            email='other@example.com', password='x', display_name='Other',
        )
        Guardian.objects.create(user=other, full_name='Hidden', phone='+254700999888')

        resp = self.client.get('/api/auth/guardians/')
        self.assertEqual(len(resp.data), 0)


# ── Notification preferences ──────────────────────────────────────────────────

class NotificationPreferenceTests(AccountTestCase):
    def test_defaults_are_created_on_first_read(self):
        self.assertFalse(NotificationPreference.objects.filter(user=self.user).exists())

        resp = self.client.get('/api/auth/notification-preferences/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['email_enabled'])
        self.assertTrue(resp.data['application_updates'])
        self.assertFalse(resp.data['newsletter'])
        self.assertTrue(NotificationPreference.objects.filter(user=self.user).exists())

    def test_partial_update_leaves_other_opt_ins_alone(self):
        self.client.get('/api/auth/notification-preferences/')  # create defaults
        resp = self.client.patch('/api/auth/notification-preferences/',
                                 {'newsletter': True}, format='json')

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['newsletter'])
        self.assertTrue(resp.data['application_updates'])

    def test_allows_respects_the_channel_switch(self):
        prefs = NotificationPreference.objects.create(user=self.user)
        self.assertTrue(prefs.allows('payment_updates', 'email'))

        prefs.email_enabled = False
        self.assertFalse(prefs.allows('payment_updates', 'email'))
        # A disabled channel silences a category that is otherwise switched on.
        self.assertTrue(prefs.payment_updates)


# ── Credentials probe ─────────────────────────────────────────────────────────

class AccountCredentialsTests(AccountTestCase):
    @patch('accounts.keycloak_admin.list_credentials',
           return_value=[{'type': 'password'}, {'type': 'otp'}])
    @patch('accounts.keycloak_admin.account_console_url', return_value='https://id/account')
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_reports_keycloak_credentials(self, *_):
        resp = self.client.get('/api/auth/account/credentials/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['has_password'])
        self.assertTrue(resp.data['keycloak_otp'])

    @patch('accounts.keycloak_admin.list_credentials', return_value=[])
    @patch('accounts.keycloak_admin.account_console_url', return_value='https://id/account')
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_social_only_account_reports_no_password(self, *_):
        resp = self.client.get('/api/auth/account/credentials/')
        self.assertFalse(resp.data['has_password'])

    @patch('accounts.keycloak_admin.list_credentials', side_effect=KeycloakAdminError('down'))
    @patch('accounts.keycloak_admin.account_console_url', return_value='')
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_keycloak_outage_does_not_break_the_security_tab(self, *_):
        resp = self.client.get('/api/auth/account/credentials/')
        self.assertEqual(resp.status_code, 200)


# ── Bill-payer guardian → payment communications ──────────────────────────────

class BillPayerGuardianTests(AccountTestCase):
    @patch('accounts.views.send_html_email')
    def test_adding_a_bill_payer_guardian_sends_them_the_payment_details(self, mock_email):
        resp = self.client.post('/api/auth/guardians/', {
            'full_name': 'Mary Wanjiru',
            'relationship': 'parent',
            'email': 'mary@example.com',
            'is_bill_payer': True,
        }, format='json')

        self.assertEqual(resp.status_code, 201)
        mock_email.assert_called_once()
        self.assertEqual(mock_email.call_args.kwargs['recipient_email'], 'mary@example.com')
        self.assertEqual(mock_email.call_args.kwargs['template_name'], 'guardian_bill_payer.html')

    @patch('accounts.views.send_html_email')
    def test_non_bill_payer_guardian_gets_no_intro(self, mock_email):
        resp = self.client.post('/api/auth/guardians/', {
            'full_name': 'Sibling',
            'relationship': 'sibling',
            'email': 'sib@example.com',
            'is_bill_payer': False,
        }, format='json')

        self.assertEqual(resp.status_code, 201)
        mock_email.assert_not_called()

    @patch('accounts.views.send_html_email')
    def test_promoting_to_bill_payer_sends_the_intro(self, mock_email):
        guardian = Guardian.objects.create(
            user=self.user, full_name='Mary', email='mary@example.com', is_bill_payer=False,
        )
        resp = self.client.patch(f'/api/auth/guardians/{guardian.id}/',
                                 {'is_bill_payer': True}, format='json')
        self.assertEqual(resp.status_code, 200)
        mock_email.assert_called_once()

    def test_bill_payer_emails_helper_only_returns_billing_guardians(self):
        Guardian.objects.create(user=self.user, full_name='Payer',
                                email='payer@example.com', is_bill_payer=True)
        Guardian.objects.create(user=self.user, full_name='Other',
                                email='other@example.com', is_bill_payer=False)
        Guardian.objects.create(user=self.user, full_name='No email',
                                phone='+254700000000', is_bill_payer=True)

        from payments.views import bill_payer_guardian_emails
        emails = bill_payer_guardian_emails(self.user)
        self.assertEqual(emails, ['payer@example.com'])


class AccountControlsTests(AccountTestCase):
    @patch('accounts.keycloak_admin.is_configured', return_value=False)
    def test_export_returns_account_data_as_download(self, _cfg):
        resp = self.client.get('/api/auth/account/export/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('attachment', resp['Content-Disposition'])
        self.assertEqual(resp.data['account']['email'], 'jane@example.com')
        self.assertIn('guardians', resp.data)

    @patch('accounts.keycloak_admin.set_enabled')
    @patch('accounts.keycloak_admin.verify_password', return_value=True)
    @patch('accounts.keycloak_admin.has_password_credential', return_value=True)
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_deactivate_disables_the_keycloak_account(self, _cfg, _has, _verify, mock_set):
        resp = self.client.post('/api/auth/account/deactivate/',
                                {'password': 'OldPassw0rd!'}, format='json')
        self.assertEqual(resp.status_code, 200)
        mock_set.assert_called_once_with(self.user, False)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertEqual(self.user.status, 'suspended')

    @patch('accounts.keycloak_admin.verify_password', return_value=False)
    @patch('accounts.keycloak_admin.has_password_credential', return_value=True)
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_deactivate_needs_the_right_password(self, _cfg, _has, _verify):
        resp = self.client.post('/api/auth/account/deactivate/',
                                {'password': 'wrong'}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    @patch('accounts.keycloak_admin.logout_all')
    @patch('accounts.keycloak_admin.set_enabled')
    @patch('accounts.keycloak_admin.verify_password', return_value=True)
    @patch('accounts.keycloak_admin.has_password_credential', return_value=True)
    @patch('accounts.keycloak_admin.is_configured', return_value=True)
    def test_delete_soft_deletes_and_keeps_the_row(self, _cfg, _has, _verify, _set, _logout):
        resp = self.client.delete('/api/auth/account/',
                                  {'password': 'OldPassw0rd!'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, 'deleted')
        self.assertFalse(self.user.is_active)


# ── Session revoke ownership (IDOR guard) ─────────────────────────────────────

class SessionRevokeSecurityTests(TestCase):
    """`DELETE /sessions/{id}` is realm-wide, so revoke must confirm ownership first."""

    def setUp(self):
        from accounts import keycloak_admin
        self.keycloak_admin = keycloak_admin

    @patch('accounts.keycloak_admin._request')
    @patch('accounts.keycloak_admin.list_sessions', return_value=[{'id': 'mine'}])
    def test_delete_session_refuses_a_foreign_session(self, _list, mock_request):
        from accounts.keycloak_admin import KeycloakSessionNotFound
        user = User.objects.create_user(email='a@example.com', password='x',
                                        display_name='A', keycloak_sub='kc-a')
        with self.assertRaises(KeycloakSessionNotFound):
            self.keycloak_admin.delete_session(user, 'someone-elses-session')
        # The realm-wide DELETE must never be issued for a session the user doesn't own.
        mock_request.assert_not_called()

    @patch('accounts.keycloak_admin._request')
    @patch('accounts.keycloak_admin.list_sessions', return_value=[{'id': 'mine'}])
    def test_delete_session_allows_an_owned_session(self, _list, mock_request):
        mock_request.return_value = type('R', (), {'status_code': 204})()
        user = User.objects.create_user(email='b@example.com', password='x',
                                        display_name='B', keycloak_sub='kc-b')
        self.keycloak_admin.delete_session(user, 'mine')
        mock_request.assert_called_once()
