import logging
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminUser
from . import gcal_service
from .models import Application, InterviewSlot
from programs.models import ProgramIntake

logger = logging.getLogger(__name__)


class CalendarEventsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        start_str = request.query_params.get('start')
        end_str = request.query_params.get('end')

        if not start_str or not end_str:
            return Response({'error': 'start and end query params are required'}, status=400)

        try:
            from datetime import datetime, timezone as dt_tz

            def _parse_iso(value):
                # Support UTC "Z" suffix across Python versions.
                if isinstance(value, str) and value.endswith('Z'):
                    value = value[:-1] + '+00:00'
                return datetime.fromisoformat(value).astimezone(dt_tz.utc)

            start_dt = _parse_iso(start_str)
            end_dt = _parse_iso(end_str)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid date format. Use ISO 8601.'}, status=400)

        if end_dt <= start_dt:
            return Response({'error': 'end must be after start.'}, status=400)

        if (end_dt - start_dt).days > 92:
            return Response({'error': 'Date range cannot exceed 3 months.'}, status=400)

        cache_key = f'gcal_events:{start_str}|{end_str}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response({'events': cached})

        events = []
        events.extend(self._collect_source('interview', self._interview_events, start_dt, end_dt))
        events.extend(self._collect_source('intake', self._intake_events, start_dt, end_dt))
        events.extend(self._collect_source('blackout', self._blackout_events, start_dt, end_dt))
        events.extend(self._collect_source('custom', self._custom_events, start_dt, end_dt))
        events.extend(self._collect_source('external', self._external_events, start_dt, end_dt))
        events.sort(key=lambda e: e['start'])

        cache.set(cache_key, events, 300)
        return Response({'events': events})

    def _collect_source(self, name, source_fn, start_dt, end_dt):
        """
        Keep endpoint resilient if one event source fails (e.g., stale prod schema).
        """
        try:
            return source_fn(start_dt, end_dt)
        except Exception as exc:
            logger.error('CalendarEventsView: %s source failed: %s', name, exc)
            return []

    def _interview_events(self, start_dt, end_dt):
        slots = (
            InterviewSlot.objects
            .filter(chosen_time__range=(start_dt, end_dt))
            .select_related('application')
        )
        result = []
        for slot in slots:
            app = slot.application
            result.append({
                'id': str(slot.id),
                'type': 'interview',
                'title': f'{app.full_name} — {app.program_name}',
                'start': slot.chosen_time.isoformat(),
                'end': (slot.chosen_time + timedelta(minutes=30)).isoformat(),
                'all_day': False,
                'meta': {
                    'application_id': str(app.id),
                    'meet_url': slot.meet_url or slot.zoom_link or '',
                    'status': app.status,
                },
            })
        return result

    def _intake_events(self, start_dt, end_dt):
        start_date = start_dt.date()
        end_date = end_dt.date()
        intakes = (
            ProgramIntake.objects
            .filter(start_date__lte=end_date)
            .filter(Q(end_date__isnull=True) | Q(end_date__gte=start_date))
            .select_related('program')
        )
        result = []
        for intake in intakes:
            result.append({
                'id': str(intake.id),
                'type': 'intake',
                'title': f'{intake.program.program_name} — Cohort',
                'start': intake.start_date.isoformat(),
                'end': (intake.end_date or intake.start_date).isoformat(),
                'all_day': True,
                'meta': {
                    'program_id': str(intake.program.program_id),
                    'intake_id': str(intake.id),
                    'seats_remaining': intake.seats_remaining,
                },
            })
        return result

    def _blackout_events(self, start_dt, end_dt):
        from .models import InterviewBlackout
        from datetime import datetime as dt_cls
        from zoneinfo import ZoneInfo
        EAT = ZoneInfo('Africa/Nairobi')

        blackouts = InterviewBlackout.objects.filter(
            date__range=(start_dt.date(), end_dt.date())
        )
        result = []
        for b in blackouts:
            label = f'\U0001f6ab Blocked' + (f' — {b.reason}' if b.reason else '')
            if b.start_time is None:
                result.append({
                    'id': f'blackout-{b.id}',
                    'type': 'blackout',
                    'title': label,
                    'start': b.date.isoformat(),
                    'end': b.date.isoformat(),
                    'all_day': True,
                    'meta': {'blackout_id': b.id, 'reason': b.reason},
                })
            else:
                start_eat = dt_cls.combine(b.date, b.start_time).replace(tzinfo=EAT)
                end_eat = dt_cls.combine(b.date, b.end_time).replace(tzinfo=EAT)
                result.append({
                    'id': f'blackout-{b.id}',
                    'type': 'blackout',
                    'title': label,
                    'start': start_eat.isoformat(),
                    'end': end_eat.isoformat(),
                    'all_day': False,
                    'meta': {'blackout_id': b.id, 'reason': b.reason},
                })
        return result

    def _custom_events(self, start_dt, end_dt):
        from .models import CustomCalendarEvent
        from datetime import datetime as dt_cls
        from zoneinfo import ZoneInfo
        EAT = ZoneInfo('Africa/Nairobi')

        CATEGORY_COLORS = {
            'interview_follow_up': 'blue',
            'lead_follow_up': 'green',
            'personal': 'purple',
            'meeting': 'orange',
            'other': 'gray',
        }

        evs = CustomCalendarEvent.objects.filter(date__range=(start_dt.date(), end_dt.date()))
        result = []
        for ev in evs:
            if ev.all_day or ev.start_time is None:
                result.append({
                    'id': f'custom-{ev.id}',
                    'type': 'custom',
                    'title': ev.title,
                    'start': ev.date.isoformat(),
                    'end': ev.date.isoformat(),
                    'all_day': True,
                    'meta': {
                        'custom_event_id': str(ev.id),
                        'category': ev.category,
                        'color': CATEGORY_COLORS.get(ev.category, 'gray'),
                        'description': ev.description,
                    },
                })
            else:
                s = dt_cls.combine(ev.date, ev.start_time).replace(tzinfo=EAT)
                e = dt_cls.combine(ev.date, ev.end_time).replace(tzinfo=EAT)
                result.append({
                    'id': f'custom-{ev.id}',
                    'type': 'custom',
                    'title': ev.title,
                    'start': s.isoformat(),
                    'end': e.isoformat(),
                    'all_day': False,
                    'meta': {
                        'custom_event_id': str(ev.id),
                        'category': ev.category,
                        'color': CATEGORY_COLORS.get(ev.category, 'gray'),
                        'description': ev.description,
                    },
                })
        return result

    def _external_events(self, start_dt, end_dt):
        from .models import InterviewBlackout, CustomCalendarEvent
        known_gcal_ids = set(
            InterviewSlot.objects
            .filter(gcal_event_id__gt='')
            .values_list('gcal_event_id', flat=True)
        )
        known_gcal_ids |= set(
            InterviewBlackout.objects
            .filter(gcal_event_id__gt='')
            .values_list('gcal_event_id', flat=True)
        )
        known_gcal_ids |= set(
            CustomCalendarEvent.objects
            .filter(gcal_event_id__gt='')
            .values_list('gcal_event_id', flat=True)
        )
        try:
            service = gcal_service._get_calendar_service()
            calendar_id = getattr(
                settings, 'GCAL_ADMISSIONS_CALENDAR_ID', 'admissions@nexaacademy.co.ke'
            )
            items = (
                service.events()
                .list(
                    calendarId=calendar_id,
                    timeMin=start_dt.isoformat(),
                    timeMax=end_dt.isoformat(),
                    singleEvents=True,
                    orderBy='startTime',
                )
                .execute()
                .get('items', [])
            )
            result = []
            for ev in items:
                if ev['id'] in known_gcal_ids:
                    continue
                ev_start = ev.get('start', {})
                ev_end = ev.get('end', {})
                all_day = 'date' in ev_start and 'dateTime' not in ev_start
                result.append({
                    'id': ev['id'],
                    'type': 'external',
                    'title': ev.get('summary', 'No title'),
                    'start': ev_start.get('dateTime') or ev_start.get('date', ''),
                    'end': ev_end.get('dateTime') or ev_end.get('date', ''),
                    'all_day': all_day,
                    'meta': {
                        'gcal_event_id': ev['id'],
                        'gcal_link': ev.get('htmlLink', ''),
                        'description': ev.get('description', ''),
                    },
                })
            return result
        except Exception as exc:
            logger.error('CalendarEventsView: Google Calendar fetch failed: %s', exc)
            return []
