from django.test import TestCase
import hashlib
import hmac as _hmac
import json
import time

from rest_framework.test import APIClient as _APIClient
from django.test import override_settings

_WEBHOOK_SECRET = 'test-sanity-secret-xyz'
_SANITY_SETTINGS = {
    'SANITY_WEBHOOK_SECRET': _WEBHOOK_SECRET,
    'SANITY_PROJECT_ID': 'testproj',
    'SANITY_DATASET': 'test',
    'SANITY_API_TOKEN': 'test-token',
}


def _make_sig(body: str, secret: str = _WEBHOOK_SECRET, ts: int = None):
    """Return (header_value, timestamp) for a valid Sanity webhook signature."""
    if ts is None:
        ts = int(time.time())
    payload = f'{ts}.{body}'
    digest = _hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f't={ts},v1={digest}', ts


class SanityWebhookViewTest(TestCase):
    def setUp(self):
        self.client = _APIClient()
        self.url = '/api/sanity-webhook/'

    @override_settings(**_SANITY_SETTINGS)
    def test_missing_signature_returns_401(self):
        res = self.client.post(
            self.url, data='{"_type":"program"}', content_type='application/json',
        )
        self.assertEqual(res.status_code, 401)

    @override_settings(**_SANITY_SETTINGS)
    def test_bad_signature_returns_401(self):
        res = self.client.post(
            self.url, data='{"_type":"program"}', content_type='application/json',
            HTTP_SANITY_WEBHOOK_SIGNATURE='t=12345,v1=badhash',
        )
        self.assertEqual(res.status_code, 401)

    @override_settings(**_SANITY_SETTINGS)
    def test_replayed_signature_returns_401(self):
        body = '{"_type":"program"}'
        old_ts = int(time.time()) - 400
        sig, _ = _make_sig(body, ts=old_ts)
        res = self.client.post(
            self.url, data=body, content_type='application/json',
            HTTP_SANITY_WEBHOOK_SIGNATURE=sig,
        )
        self.assertEqual(res.status_code, 401)

    @override_settings(**_SANITY_SETTINGS)
    def test_unknown_type_returns_200(self):
        body = json.dumps({'_type': 'blogPost', '_id': 'abc'})
        sig, _ = _make_sig(body)
        res = self.client.post(
            self.url, data=body, content_type='application/json',
            HTTP_SANITY_WEBHOOK_SIGNATURE=sig,
        )
        self.assertEqual(res.status_code, 200)

    @override_settings(**_SANITY_SETTINGS)
    def test_program_appear_creates_program(self):
        from programs.models import Program
        body = json.dumps({
            '_type': 'program', '_id': 'sanity-p-1', '_transition': 'appear',
            'programName': 'Test Webhook SE',
            'slug': {'current': 'test-webhook-se-p1'},
            'level': 'Beginner', 'category': 'tech',
            'price': 150000, 'originalPrice': 180000,
            'durationWeeks': 16, 'durationMonths': 4,
            'isActive': True, 'comingSoon': False,
            'topics': [], 'outcomes': [], 'faq': [],
        })
        sig, _ = _make_sig(body)
        res = self.client.post(
            self.url, data=body, content_type='application/json',
            HTTP_SANITY_WEBHOOK_SIGNATURE=sig,
        )
        self.assertEqual(res.status_code, 200)
        p = Program.objects.get(sanity_id='sanity-p-1')
        self.assertEqual(p.program_name, 'Test Webhook SE')
        self.assertEqual(p.slug, 'test-webhook-se-p1')
        self.assertEqual(p.status, 'active')
        self.assertEqual(p.price, 150000)

    @override_settings(**_SANITY_SETTINGS)
    def test_program_update_updates_program(self):
        from programs.models import Program
        Program.objects.create(
            program_name='Old Name', sanity_id='sanity-p-2',
            slug='old-name', status='active', duration=16, price=100000,
        )
        body = json.dumps({
            '_type': 'program', '_id': 'sanity-p-2', '_transition': 'update',
            'programName': 'New Name',
            'slug': {'current': 'new-name'},
            'isActive': True, 'comingSoon': False,
            'topics': [], 'outcomes': [], 'faq': [],
        })
        sig, _ = _make_sig(body)
        self.client.post(
            self.url, data=body, content_type='application/json',
            HTTP_SANITY_WEBHOOK_SIGNATURE=sig,
        )
        p = Program.objects.get(sanity_id='sanity-p-2')
        self.assertEqual(p.program_name, 'New Name')

    @override_settings(**_SANITY_SETTINGS)
    def test_program_disappear_archives_program(self):
        from programs.models import Program
        Program.objects.create(
            program_name='Doomed', sanity_id='sanity-p-3',
            slug='doomed', status='active', duration=16, price=100000,
        )
        body = json.dumps({'_type': 'program', '_id': 'sanity-p-3', '_transition': 'disappear'})
        sig, _ = _make_sig(body)
        self.client.post(
            self.url, data=body, content_type='application/json',
            HTTP_SANITY_WEBHOOK_SIGNATURE=sig,
        )
        self.assertEqual(Program.objects.get(sanity_id='sanity-p-3').status, 'archived')

    @override_settings(**_SANITY_SETTINGS)
    def test_intake_appear_creates_intake_with_correct_fk(self):
        from programs.models import Program, ProgramIntake
        Program.objects.create(
            program_name='SE', sanity_id='prog-ref-1', slug='se', status='active',
            duration=16, price=100000,
        )
        body = json.dumps({
            '_type': 'programIntake', '_id': 'intake-1', '_transition': 'appear',
            'program': {'_ref': 'prog-ref-1'},
            'startDate': '2026-09-01', 'status': 'open',
            'maxSeats': 20, 'seatsRemaining': 20,
        })
        sig, _ = _make_sig(body)
        res = self.client.post(
            self.url, data=body, content_type='application/json',
            HTTP_SANITY_WEBHOOK_SIGNATURE=sig,
        )
        self.assertEqual(res.status_code, 200)
        intake = ProgramIntake.objects.get(sanity_id='intake-1')
        self.assertEqual(intake.program.sanity_id, 'prog-ref-1')
        self.assertEqual(str(intake.start_date), '2026-09-01')
        self.assertEqual(intake.source, 'cms')

    @override_settings(**_SANITY_SETTINGS)
    def test_intake_disappear_deletes_intake(self):
        from programs.models import Program, ProgramIntake
        p = Program.objects.create(
            program_name='SE', sanity_id='prog-ref-2', slug='se2', status='active',
            duration=16, price=100000,
        )
        ProgramIntake.objects.create(
            program=p, sanity_id='intake-del-1', start_date='2026-09-01', status='open',
        )
        body = json.dumps({
            '_type': 'programIntake', '_id': 'intake-del-1', '_transition': 'disappear',
        })
        sig, _ = _make_sig(body)
        self.client.post(
            self.url, data=body, content_type='application/json',
            HTTP_SANITY_WEBHOOK_SIGNATURE=sig,
        )
        self.assertFalse(ProgramIntake.objects.filter(sanity_id='intake-del-1').exists())

    @override_settings(**_SANITY_SETTINGS)
    def test_intake_unknown_program_returns_200_no_db_write(self):
        from programs.models import ProgramIntake
        body = json.dumps({
            '_type': 'programIntake', '_id': 'intake-bad', '_transition': 'appear',
            'program': {'_ref': 'nonexistent-sanity-id'},
            'startDate': '2026-09-01', 'status': 'open',
        })
        sig, _ = _make_sig(body)
        res = self.client.post(
            self.url, data=body, content_type='application/json',
            HTTP_SANITY_WEBHOOK_SIGNATURE=sig,
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(ProgramIntake.objects.filter(sanity_id='intake-bad').exists())
