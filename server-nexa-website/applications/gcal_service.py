import json
import logging
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo

from django.conf import settings
from django.apps import apps

logger = logging.getLogger(__name__)

EAT = ZoneInfo('Africa/Nairobi')
def _kenya_holiday_dates(start_date: date, end_date: date) -> set:
    """
    Return a set of dates that are Kenyan public holidays between
    start_date and end_date (inclusive). Uses the `holidays` library
    as the authoritative source — no Google API access required.
    """
    try:
        import holidays as holidays_lib
        years = range(start_date.year, end_date.year + 1)
        ke = holidays_lib.Kenya(years=list(years))
        return {d for d in ke if start_date <= d <= end_date}
    except Exception as exc:
        logger.warning('_kenya_holiday_dates: holidays library unavailable — %s', exc)
        return set()


class CalendarServiceError(Exception):
    pass


def _get_calendar_service():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    SCOPES = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
    ]
    info = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=SCOPES,
    ).with_subject(settings.GCAL_DELEGATE_EMAIL)
    return build('calendar', 'v3', credentials=creds, cache_discovery=False)


def get_all_slots_with_status(weeks_ahead=2):
    """
    Return ALL working-hour slots for the next `weeks_ahead` weeks, each
    with an explicit status so the frontend can colour-code the grid:

      "available"  — free on all calendars, not a holiday, not blacked out
      "busy"       — has an existing event on the admissions calendar
      "holiday"    — Kenyan public holiday (whole day blocked)
      "blackout"   — admin-created blackout date in the DB

    Each item: {"time": ISO-8601 string (EAT), "status": str}

    Raises CalendarServiceError on any Google API failure.
    """
    try:
        service = _get_calendar_service()

        now = datetime.now(tz=EAT)
        # Start from today so same-day slots (that haven't passed) are included
        start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt = start_dt + timedelta(weeks=weeks_ahead)

        # ── Query freebusy for both calendars ──────────────────────────────
        body = {
            'timeMin': start_dt.isoformat(),
            'timeMax': end_dt.isoformat(),
            'items': [
                {'id': settings.GCAL_ADMISSIONS_CALENDAR_ID},
            ],
        }
        freebusy = service.freebusy().query(body=body).execute()

        def _parse_blocks(cal_id):
            cal_data = freebusy['calendars'].get(cal_id, {})
            # Log any errors returned by the API for this calendar
            for err in cal_data.get('errors', []):
                logger.warning('freebusy error for %s: %s', cal_id, err)
            blocks = []
            for period in cal_data.get('busy', []):
                b_start = datetime.fromisoformat(period['start'])
                b_end = datetime.fromisoformat(period['end'])
                if b_start.tzinfo is None:
                    b_start = b_start.replace(tzinfo=EAT)
                if b_end.tzinfo is None:
                    b_end = b_end.replace(tzinfo=EAT)
                blocks.append((b_start, b_end))
            return blocks

        busy_blocks = _parse_blocks(settings.GCAL_ADMISSIONS_CALENDAR_ID)

        # ── Authoritative Kenya public holidays from the `holidays` library ──
        kenya_holidays = _kenya_holiday_dates(start_dt.date(), end_dt.date())

        # ── Load admin blackout entries from DB (day-level and time-level) ──
        blackout_dates = set()   # full-day blocks
        blackout_times = []      # [(date, start_time, end_time), ...]
        try:
            interview_blackout_model = apps.get_model('applications', 'InterviewBlackout')
            for b in interview_blackout_model.objects.all():
                if b.start_time is None:
                    blackout_dates.add(b.date)
                else:
                    blackout_times.append((b.date, b.start_time, b.end_time))
        except LookupError:
            blackout_dates = set()
        except Exception as exc:
            logger.warning('Could not load blackout dates: %s', exc)

        # ── Generate every working slot and classify it ────────────────────
        slot_duration = timedelta(minutes=settings.GCAL_SLOT_DURATION_MINUTES)
        start_hour = settings.GCAL_SLOT_START_HOUR
        end_hour = settings.GCAL_SLOT_END_HOUR
        lunch_start_hour = settings.GCAL_LUNCH_START_HOUR
        lunch_end_hour = settings.GCAL_LUNCH_END_HOUR

        def _overlaps(slot_s, slot_e, blocks):
            return any(slot_s < b_end and slot_e > b_start for b_start, b_end in blocks)

        result = []
        current_day = start_dt.date()
        end_day = end_dt.date()

        while current_day < end_day:
            if current_day.weekday() < 5:  # Mon–Fri only
                # Classify at day level first
                is_blackout = current_day in blackout_dates

                day_start = datetime(current_day.year, current_day.month, current_day.day,
                                     start_hour, 0, tzinfo=EAT)
                day_end = datetime(current_day.year, current_day.month, current_day.day,
                                   end_hour, 0, tzinfo=EAT)

                # Kenya public holidays from local library (no Google holiday calendar dependency).
                is_holiday_day = current_day in kenya_holidays

                if is_holiday_day:
                    logger.debug('Holiday detected on %s', current_day)

                slot_start = day_start
                while slot_start + slot_duration <= day_end:
                    slot_end = slot_start + slot_duration

                    # Skip slots already in the past
                    if slot_start <= now:
                        slot_start += slot_duration
                        continue

                    # Skip lunch break entirely — don't add to result at all
                    if lunch_start_hour <= slot_start.hour < lunch_end_hour:
                        slot_start += slot_duration
                        continue

                    # Check time-level blackout
                    is_time_blackout = any(
                        b_date == current_day
                        and slot_start.time() >= b_start
                        and slot_start.time() < b_end
                        for b_date, b_start, b_end in blackout_times
                    )

                    if is_blackout or is_time_blackout:
                        slot_status = 'blackout'
                    elif is_holiday_day:
                        slot_status = 'holiday'
                    elif _overlaps(slot_start, slot_end, busy_blocks):
                        slot_status = 'busy'
                    else:
                        slot_status = 'available'

                    result.append({'time': slot_start.isoformat(), 'status': slot_status})
                    slot_start += slot_duration

            current_day += timedelta(days=1)

        return result

    except CalendarServiceError:
        raise
    except Exception as exc:
        logger.error('gcal_service.get_all_slots_with_status failed: %s', exc)
        raise CalendarServiceError(str(exc))


def get_available_slots(weeks_ahead=2):
    """
    Backward-compat wrapper — returns only the ISO strings for available slots.
    Prefer get_all_slots_with_status() for UI rendering.
    """
    return [s['time'] for s in get_all_slots_with_status(weeks_ahead) if s['status'] == 'available']


def create_interview_event(application, chosen_time):
    """
    Create a Google Calendar event with a Meet link.
    Returns {"event_id": str, "meet_url": str}.
    Raises CalendarServiceError on failure.
    """
    try:
        service = _get_calendar_service()

        if isinstance(chosen_time, str):
            start_dt = datetime.fromisoformat(chosen_time)
        else:
            start_dt = chosen_time
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=EAT)

        end_dt = start_dt + timedelta(minutes=settings.GCAL_SLOT_DURATION_MINUTES)

        event_body = {
            'summary': f'Nexa Academy Interview — {application.full_name}',
            'description': (
                f'Admissions interview for {application.program_name}.\n'
                f'Application ID: {application.id}'
            ),
            'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Africa/Nairobi'},
            'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Africa/Nairobi'},
            'attendees': [
                {'email': settings.GCAL_DELEGATE_EMAIL},
                {'email': application.email, 'displayName': application.full_name},
            ],
            'conferenceData': {
                'createRequest': {
                    'requestId': f'nexa-{application.id}',
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'},
                },
            },
            'colorId': '1',
        }

        event = service.events().insert(
            calendarId=settings.GCAL_ADMISSIONS_CALENDAR_ID,
            body=event_body,
            conferenceDataVersion=1,
            sendUpdates='all',
        ).execute()

        meet_url = ''
        for ep in event.get('conferenceData', {}).get('entryPoints', []):
            if ep.get('entryPointType') == 'video':
                meet_url = ep.get('uri', '')
                break

        return {'event_id': event['id'], 'meet_url': meet_url}

    except CalendarServiceError:
        raise
    except Exception as exc:
        logger.error('gcal_service.create_interview_event failed: %s', exc)
        raise CalendarServiceError(str(exc))


def update_interview_event(event_id, new_time):
    """
    Patch start/end on an existing Calendar event.
    Returns the updated event dict.
    Raises CalendarServiceError on failure.
    """
    try:
        service = _get_calendar_service()

        if isinstance(new_time, str):
            start_dt = datetime.fromisoformat(new_time)
        else:
            start_dt = new_time
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=EAT)

        end_dt = start_dt + timedelta(minutes=settings.GCAL_SLOT_DURATION_MINUTES)

        patch_body = {
            'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Africa/Nairobi'},
            'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Africa/Nairobi'},
        }

        return service.events().patch(
            calendarId=settings.GCAL_ADMISSIONS_CALENDAR_ID,
            eventId=event_id,
            body=patch_body,
            sendUpdates='all',
        ).execute()

    except CalendarServiceError:
        raise
    except Exception as exc:
        logger.error('gcal_service.update_interview_event failed: %s', exc)
        raise CalendarServiceError(str(exc))


def cancel_interview_event(event_id):
    """
    Delete an event from Google Calendar.
    Raises CalendarServiceError on failure.
    """
    try:
        service = _get_calendar_service()
        service.events().delete(
            calendarId=settings.GCAL_ADMISSIONS_CALENDAR_ID,
            eventId=event_id,
            sendUpdates='all',
        ).execute()

    except CalendarServiceError:
        raise
    except Exception as exc:
        logger.error('gcal_service.cancel_interview_event failed: %s', exc)
        raise CalendarServiceError(str(exc))


def create_blackout_event(date, start_time=None, end_time=None, reason=''):
    """
    Create a blocking event on the admissions calendar.
    Pass start_time/end_time (time objects) for a partial-day block, or
    omit both for a full-day block.
    Returns the gcal_event_id string.
    """
    try:
        service = _get_calendar_service()
        summary = f'\U0001f6ab Blocked' + (f' — {reason}' if reason else '')

        if start_time is None:
            body = {
                'summary': summary,
                'start': {'date': date.isoformat()},
                'end': {'date': (date + timedelta(days=1)).isoformat()},
            }
        else:
            start_dt = datetime.combine(date, start_time).replace(tzinfo=EAT)
            end_dt = datetime.combine(date, end_time).replace(tzinfo=EAT)
            body = {
                'summary': summary,
                'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Africa/Nairobi'},
                'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Africa/Nairobi'},
            }

        created = service.events().insert(
            calendarId=settings.GCAL_ADMISSIONS_CALENDAR_ID,
            body=body,
        ).execute()
        return created['id']

    except CalendarServiceError:
        raise
    except Exception as exc:
        logger.error('gcal_service.create_blackout_event failed: %s', exc)
        raise CalendarServiceError(str(exc))


def delete_blackout_event(gcal_event_id):
    """Delete a blocking event from the admissions calendar."""
    try:
        service = _get_calendar_service()
        service.events().delete(
            calendarId=settings.GCAL_ADMISSIONS_CALENDAR_ID,
            eventId=gcal_event_id,
        ).execute()
    except CalendarServiceError:
        raise
    except Exception as exc:
        logger.warning('gcal_service.delete_blackout_event failed for %s: %s', gcal_event_id, exc)
        raise CalendarServiceError(str(exc))


_CATEGORY_PREFIXES = {
    'interview_follow_up': '\U0001f393 Follow-up',
    'lead_follow_up': '\U0001f4cb Lead',
    'personal': '\U0001f464 Personal',
    'meeting': '\U0001f4c5 Meeting',
    'other': '\U0001f4cc',
}


def _build_custom_event_body(title, date, category, description,
                             all_day, start_time, end_time, attendees=None):
    """Build a GCal event body dict (without conference data)."""
    prefix = _CATEGORY_PREFIXES.get(category, '\U0001f4cc')
    summary = f'{prefix} {title}'
    attendee_list = [{'email': e} for e in (attendees or []) if e]

    if all_day or start_time is None:
        body = {
            'summary': summary,
            'description': description,
            'start': {'date': date.isoformat()},
            'end': {'date': (date + timedelta(days=1)).isoformat()},
        }
    else:
        start_dt = datetime.combine(date, start_time).replace(tzinfo=EAT)
        end_dt = datetime.combine(date, end_time).replace(tzinfo=EAT)
        body = {
            'summary': summary,
            'description': description,
            'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Africa/Nairobi'},
            'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Africa/Nairobi'},
        }

    if attendee_list:
        body['attendees'] = attendee_list

    return body


def create_custom_event(title, date, category='other', description='',
                        all_day=False, start_time=None, end_time=None,
                        with_meet=False, attendees=None):
    """
    Create a custom event on the admissions Google Calendar.
    Returns {'event_id': str, 'meet_url': str}.
    Google Meet is only attached to timed (non-all-day) events.
    """
    try:
        service = _get_calendar_service()
        body = _build_custom_event_body(title, date, category, description,
                                        all_day, start_time, end_time, attendees)

        add_meet = with_meet and not (all_day or start_time is None)
        if add_meet:
            import uuid as _uuid
            body['conferenceData'] = {
                'createRequest': {
                    'requestId': f'custom-{_uuid.uuid4().hex[:12]}',
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'},
                },
            }

        created = service.events().insert(
            calendarId=settings.GCAL_ADMISSIONS_CALENDAR_ID,
            body=body,
            conferenceDataVersion=1 if add_meet else 0,
            sendUpdates='all' if attendees else 'none',
        ).execute()

        meet_url = ''
        if add_meet:
            for ep in created.get('conferenceData', {}).get('entryPoints', []):
                if ep.get('entryPointType') == 'video':
                    meet_url = ep.get('uri', '')
                    break

        return {'event_id': created['id'], 'meet_url': meet_url}

    except CalendarServiceError:
        raise
    except Exception as exc:
        logger.error('gcal_service.create_custom_event failed: %s', exc)
        raise CalendarServiceError(str(exc))


def update_custom_event(gcal_event_id, title, date, category='other', description='',
                        all_day=False, start_time=None, end_time=None, attendees=None):
    """Update an existing custom calendar event. Meet link is preserved if already set."""
    try:
        service = _get_calendar_service()
        body = _build_custom_event_body(title, date, category, description,
                                        all_day, start_time, end_time, attendees)

        service.events().update(
            calendarId=settings.GCAL_ADMISSIONS_CALENDAR_ID,
            eventId=gcal_event_id,
            body=body,
        ).execute()

    except CalendarServiceError:
        raise
    except Exception as exc:
        logger.error('gcal_service.update_custom_event failed for %s: %s', gcal_event_id, exc)
        raise CalendarServiceError(str(exc))


def delete_custom_event(gcal_event_id):
    """Delete a custom calendar event."""
    try:
        service = _get_calendar_service()
        service.events().delete(
            calendarId=settings.GCAL_ADMISSIONS_CALENDAR_ID,
            eventId=gcal_event_id,
        ).execute()
    except CalendarServiceError:
        raise
    except Exception as exc:
        logger.warning('gcal_service.delete_custom_event failed for %s: %s', gcal_event_id, exc)
        raise CalendarServiceError(str(exc))
