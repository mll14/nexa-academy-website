from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from zoneinfo import ZoneInfo
from django.test import TestCase, override_settings

EAT = ZoneInfo('Africa/Nairobi')

FAKE_SETTINGS = {
    'GOOGLE_SERVICE_ACCOUNT_JSON': '{}',
    'GCAL_ADMISSIONS_CALENDAR_ID': 'admissions@nexaacademy.co.ke',
    'GCAL_DELEGATE_EMAIL': 'admissions@nexaacademy.co.ke',
    'GCAL_SLOT_DURATION_MINUTES': 30,
    'GCAL_SLOT_START_HOUR': 10,
    'GCAL_SLOT_END_HOUR': 16,
}


def _make_freebusy_response(busy_periods):
    """Helper: build the freebusy API response dict."""
    return {
        'calendars': {
            'admissions@nexaacademy.co.ke': {'busy': busy_periods},
            'en.ke#holiday@group.v.calendar.google.com': {'busy': []},
        }
    }


class GetAvailableSlotsTest(TestCase):
    @patch('applications.gcal_service._get_calendar_service')
    @override_settings(**FAKE_SETTINGS)
    def test_returns_only_weekday_slots(self, mock_get_service):
        """Slots on Saturday and Sunday must never appear."""
        mock_service = MagicMock()
        mock_service.freebusy().query().execute.return_value = _make_freebusy_response([])
        mock_get_service.return_value = mock_service

        from applications.gcal_service import get_available_slots
        slots = get_available_slots(weeks_ahead=2)

        for iso in slots:
            dt = datetime.fromisoformat(iso)
            # weekday() 5 = Saturday, 6 = Sunday
            self.assertLess(dt.weekday(), 5, f"Weekend slot returned: {iso}")

    @patch('applications.gcal_service._get_calendar_service')
    @override_settings(**FAKE_SETTINGS)
    def test_busy_slots_excluded(self, mock_get_service):
        """A slot that overlaps a busy block must not be returned."""
        mock_service = MagicMock()
        # Make all of Monday the first full week busy
        busy_start = datetime(2026, 6, 1, 9, 0, tzinfo=EAT)
        busy_end = datetime(2026, 6, 1, 17, 0, tzinfo=EAT)
        mock_service.freebusy().query().execute.return_value = _make_freebusy_response([
            {'start': busy_start.isoformat(), 'end': busy_end.isoformat()},
        ])
        mock_get_service.return_value = mock_service

        from applications.gcal_service import get_available_slots
        slots = get_available_slots(weeks_ahead=2)

        for iso in slots:
            dt = datetime.fromisoformat(iso).astimezone(EAT)
            if dt.date() == busy_start.date():
                self.fail(f"Busy slot was returned: {iso}")

    @patch('applications.gcal_service._get_calendar_service')
    @override_settings(**FAKE_SETTINGS)
    def test_slots_within_configured_hours(self, mock_get_service):
        """All slots must start at or after start_hour and end by end_hour."""
        mock_service = MagicMock()
        mock_service.freebusy().query().execute.return_value = _make_freebusy_response([])
        mock_get_service.return_value = mock_service

        from applications.gcal_service import get_available_slots
        slots = get_available_slots(weeks_ahead=1)

        for iso in slots:
            dt = datetime.fromisoformat(iso).astimezone(EAT)
            self.assertGreaterEqual(dt.hour, 10, f"Slot too early: {iso}")
            # Last slot 15:30 ends at 16:00 — so slot.hour must be <= 15
            self.assertLessEqual(dt.hour, 15, f"Slot too late: {iso}")
            # Only :00 or :30 minutes
            self.assertIn(dt.minute, [0, 30], f"Unexpected minute: {iso}")

    @patch('applications.gcal_service._get_calendar_service')
    @override_settings(**FAKE_SETTINGS)
    def test_calendar_error_raises_calendar_service_error(self, mock_get_service):
        """An API error must raise CalendarServiceError, not bubble up raw."""
        mock_get_service.side_effect = Exception("Connection refused")

        from applications.gcal_service import get_available_slots, CalendarServiceError
        with self.assertRaises(CalendarServiceError):
            get_available_slots()


from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from applications.models import Application

User = get_user_model()


class AvailableSlotsEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            email='student@test.com', password='pass', display_name='Test Student'
        )
        self.app = Application.objects.create(
            user=self.student,
            full_name='Test Student',
            email='student@test.com',
            phone='0700000000',
            program='web-dev',
            program_name='Full-Stack Web Dev',
            status='approved',
            knowledge_description='Some knowledge',
        )

    @patch('applications.gcal_service._get_calendar_service')
    @override_settings(**FAKE_SETTINGS)
    def test_approved_student_can_fetch_slots(self, mock_get_service):
        mock_service = MagicMock()
        mock_service.freebusy().query().execute.return_value = _make_freebusy_response([])
        mock_get_service.return_value = mock_service

        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/applications/{self.app.id}/available_slots/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('slots', response.data)
        self.assertIsInstance(response.data['slots'], list)

    def test_unauthenticated_user_is_rejected(self):
        response = self.client.get(f'/api/applications/{self.app.id}/available_slots/')
        self.assertEqual(response.status_code, 401)

    def test_pending_application_student_cannot_fetch_slots(self):
        self.app.status = 'pending'
        self.app.save()
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/applications/{self.app.id}/available_slots/')
        self.assertEqual(response.status_code, 400)


from applications.models import InterviewSlot


class ConfirmInterviewEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            email='confirm@test.com', password='pass', display_name='Confirm Student'
        )
        self.app = Application.objects.create(
            user=self.student,
            full_name='Confirm Student',
            email='confirm@test.com',
            phone='0700000001',
            program='web-dev',
            program_name='Full-Stack Web Dev',
            status='approved',
            knowledge_description='Some knowledge',
        )

    @patch('applications.gcal_service._get_calendar_service')
    @override_settings(**FAKE_SETTINGS)
    def test_confirm_creates_slot_and_updates_status(self, mock_get_service):
        mock_service = MagicMock()
        mock_service.events().insert().execute.return_value = {
            'id': 'test_event_123',
            'conferenceData': {
                'entryPoints': [{'entryPointType': 'video', 'uri': 'https://meet.google.com/abc-defg-hij'}]
            },
        }
        mock_get_service.return_value = mock_service

        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f'/api/applications/{self.app.id}/confirm_interview/',
            {'chosen_time': '2026-06-02T10:00:00+03:00'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.app.refresh_from_db()
        self.assertEqual(self.app.status, 'interview_scheduled')
        slot = InterviewSlot.objects.get(application=self.app)
        self.assertEqual(slot.gcal_event_id, 'test_event_123')
        self.assertEqual(slot.meet_url, 'https://meet.google.com/abc-defg-hij')

    @patch('applications.gcal_service._get_calendar_service')
    @override_settings(**FAKE_SETTINGS)
    def test_confirm_is_idempotent_if_already_scheduled(self, mock_get_service):
        InterviewSlot.objects.create(
            application=self.app,
            gcal_event_id='existing_event',
            meet_url='https://meet.google.com/existing',
            chosen_time=datetime(2026, 6, 1, 10, 0, tzinfo=EAT),
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f'/api/applications/{self.app.id}/confirm_interview/',
            {'chosen_time': '2026-06-02T10:00:00+03:00'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        mock_get_service.assert_not_called()


from django.utils import timezone as dj_timezone


class RescheduleInterviewEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            email='reschedule@test.com', password='pass', display_name='Reschedule Student'
        )
        self.app = Application.objects.create(
            user=self.student,
            full_name='Reschedule Student',
            email='reschedule@test.com',
            phone='0700000002',
            program='web-dev',
            program_name='Full-Stack Web Dev',
            status='interview_scheduled',
            knowledge_description='Some knowledge',
        )
        self.future_time = dj_timezone.now() + timedelta(days=3)
        self.slot = InterviewSlot.objects.create(
            application=self.app,
            gcal_event_id='existing_event_abc',
            meet_url='https://meet.google.com/existing',
            chosen_time=self.future_time,
        )

    @patch('applications.gcal_service._get_calendar_service')
    @override_settings(**FAKE_SETTINGS)
    def test_student_can_reschedule_when_more_than_24h_away(self, mock_get_service):
        mock_service = MagicMock()
        mock_service.events().patch().execute.return_value = {'id': 'existing_event_abc'}
        mock_get_service.return_value = mock_service

        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f'/api/applications/{self.app.id}/reschedule_interview/',
            {'chosen_time': '2026-06-05T14:00:00+03:00'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)

    def test_student_cannot_reschedule_within_24h(self):
        self.slot.chosen_time = dj_timezone.now() + timedelta(hours=12)
        self.slot.save()

        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f'/api/applications/{self.app.id}/reschedule_interview/',
            {'chosen_time': '2026-06-05T14:00:00+03:00'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('24 hours', response.data['error'])


class CancelInterviewEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@test.com', password='pass', display_name='Admin', role='admin'
        )
        self.student = User.objects.create_user(
            email='cancel@test.com', password='pass', display_name='Cancel Student'
        )
        self.app = Application.objects.create(
            user=self.student,
            full_name='Cancel Student',
            email='cancel@test.com',
            phone='0700000003',
            program='web-dev',
            program_name='Full-Stack Web Dev',
            status='interview_scheduled',
            knowledge_description='Some knowledge',
        )
        self.slot = InterviewSlot.objects.create(
            application=self.app,
            gcal_event_id='cancel_event_xyz',
            meet_url='https://meet.google.com/cancel',
            chosen_time=dj_timezone.now() + timedelta(days=2),
        )

    @patch('applications.gcal_service._get_calendar_service')
    @override_settings(**FAKE_SETTINGS)
    def test_admin_can_cancel_interview(self, mock_get_service):
        mock_service = MagicMock()
        mock_service.events().delete().execute.return_value = None
        mock_get_service.return_value = mock_service

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/applications/{self.app.id}/cancel_interview/')

        self.assertEqual(response.status_code, 200)
        self.app.refresh_from_db()
        self.assertEqual(self.app.status, 'approved')
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.gcal_event_id, '')
        self.assertEqual(self.slot.meet_url, '')
        self.assertIsNone(self.slot.chosen_time)

    def test_student_cannot_cancel_interview(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(f'/api/applications/{self.app.id}/cancel_interview/')
        self.assertEqual(response.status_code, 403)


CALENDAR_FAKE_SETTINGS = {
    'GOOGLE_SERVICE_ACCOUNT_JSON': '{}',
    'GCAL_ADMISSIONS_CALENDAR_ID': 'admissions@nexaacademy.co.ke',
    'GCAL_DELEGATE_EMAIL': 'admissions@nexaacademy.co.ke',
    'GCAL_SLOT_DURATION_MINUTES': 30,
    'GCAL_SLOT_START_HOUR': 10,
    'GCAL_SLOT_END_HOUR': 16,
}


class CalendarEventsViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin_cal@test.com', password='testpass', role='admin',
        )
        self.client.force_authenticate(user=self.admin)
        self.base_url = '/api/calendar/events/'
        from django.utils import timezone
        self.now = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        self.start = self.now.isoformat()
        self.end = (self.now + timedelta(days=7)).isoformat()

    def test_student_gets_403(self):
        student = User.objects.create_user(
            email='student_cal@test.com', password='p', role='student',
        )
        self.client.force_authenticate(user=student)
        res = self.client.get(self.base_url, {'start': self.start, 'end': self.end})
        self.assertEqual(res.status_code, 403)

    def test_missing_start_returns_400(self):
        res = self.client.get(self.base_url, {'end': self.end})
        self.assertEqual(res.status_code, 400)

    def test_missing_end_returns_400(self):
        res = self.client.get(self.base_url, {'start': self.start})
        self.assertEqual(res.status_code, 400)

    def test_range_over_3_months_returns_400(self):
        far_end = (self.now + timedelta(days=100)).isoformat()
        res = self.client.get(self.base_url, {'start': self.start, 'end': far_end})
        self.assertEqual(res.status_code, 400)

    @patch('applications.calendar_views.gcal_service._get_calendar_service')
    @override_settings(**CALENDAR_FAKE_SETTINGS)
    def test_returns_interview_events_in_range(self, mock_get_svc):
        mock_svc = MagicMock()
        mock_svc.events.return_value.list.return_value.execute.return_value = {'items': []}
        mock_get_svc.return_value = mock_svc
        app = Application.objects.create(
            full_name='Test Applicant', email='ta@test.com', phone='0700000000',
            program='se', program_name='Software Engineering',
            status='interview_scheduled',
        )
        chosen = self.now + timedelta(hours=10)
        InterviewSlot.objects.create(application=app, chosen_time=chosen)
        res = self.client.get(self.base_url, {'start': self.start, 'end': self.end})
        self.assertEqual(res.status_code, 200)
        interview_events = [e for e in res.data['events'] if e['type'] == 'interview']
        self.assertEqual(len(interview_events), 1)
        self.assertIn('Test Applicant', interview_events[0]['title'])
        self.assertEqual(interview_events[0]['meta']['application_id'], str(app.id))

    @patch('applications.calendar_views.gcal_service._get_calendar_service')
    @override_settings(**CALENDAR_FAKE_SETTINGS)
    def test_google_failure_returns_db_events_only(self, mock_get_svc):
        mock_get_svc.side_effect = Exception('Google API is down')
        res = self.client.get(self.base_url, {'start': self.start, 'end': self.end})
        self.assertEqual(res.status_code, 200)
        self.assertIn('events', res.data)

    @patch('applications.calendar_views.ProgramIntake.objects.filter')
    @patch('applications.calendar_views.gcal_service._get_calendar_service')
    @override_settings(**CALENDAR_FAKE_SETTINGS)
    def test_intake_source_failure_does_not_break_endpoint(self, mock_get_svc, mock_intake_filter):
        mock_intake_filter.side_effect = Exception('program_intakes schema mismatch')
        mock_svc = MagicMock()
        mock_svc.events.return_value.list.return_value.execute.return_value = {'items': []}
        mock_get_svc.return_value = mock_svc

        res = self.client.get(self.base_url, {'start': self.start, 'end': self.end})
        self.assertEqual(res.status_code, 200)
        self.assertIn('events', res.data)

    @patch('applications.calendar_views.gcal_service._get_calendar_service')
    @override_settings(**CALENDAR_FAKE_SETTINGS)
    def test_external_events_deduplicate_known_gcal_ids(self, mock_get_svc):
        app = Application.objects.create(
            full_name='John', email='j@t.com', phone='0700',
            program='se', program_name='SE', status='interview_scheduled',
        )
        chosen = self.now + timedelta(hours=9)
        InterviewSlot.objects.create(application=app, chosen_time=chosen, gcal_event_id='evt_abc')
        mock_svc = MagicMock()
        mock_svc.events.return_value.list.return_value.execute.return_value = {
            'items': [{
                'id': 'evt_abc',
                'summary': 'Interview — John',
                'start': {'dateTime': chosen.isoformat()},
                'end': {'dateTime': (chosen + timedelta(minutes=30)).isoformat()},
            }]
        }
        mock_get_svc.return_value = mock_svc
        res = self.client.get(self.base_url, {'start': self.start, 'end': self.end})
        self.assertEqual(res.status_code, 200)
        external = [e for e in res.data['events'] if e['type'] == 'external']
        self.assertEqual(len(external), 0)
