import logging
from datetime import timedelta
from zoneinfo import ZoneInfo
from django.conf import settings
from applications.gcal_service import _get_calendar_service, CalendarServiceError

logger = logging.getLogger(__name__)
EAT = ZoneInfo('Africa/Nairobi')

HOST_LABELS = {
    'admissions_manager': 'Admissions Manager',
    'technical_mentor': 'Technical Mentor',
}


def create_appointment_event(appointment):
    """
    Create a Google Calendar event.
    Virtual → generates a Meet link.
    Physical → adds the office address as location.
    Returns {"event_id": str, "meet_url": str}.
    """
    try:
        service = _get_calendar_service()

        start_dt = appointment.chosen_time
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=EAT)
        end_dt = start_dt + timedelta(minutes=settings.GCAL_SLOT_DURATION_MINUTES)

        host_label = HOST_LABELS.get(appointment.host, appointment.host)

        event_body = {
            'summary': f'Nexa Appointment — {appointment.name} ({appointment.get_appointment_type_display()})',
            'description': (
                f'Host: {host_label}\n'
                f'Type: {appointment.get_appointment_type_display()}\n'
                f'Reason: {appointment.reason}\n'
                f'Contact: {appointment.email} | {appointment.phone}'
            ),
            'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Africa/Nairobi'},
            'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Africa/Nairobi'},
            'attendees': [
                {'email': settings.GCAL_DELEGATE_EMAIL},
                {'email': appointment.email, 'displayName': appointment.name},
                *[{'email': e} for e in (appointment.attendees or []) if e and e != appointment.email],
            ],
            'colorId': '3',
        }

        if appointment.appointment_type == 'virtual':
            event_body['conferenceData'] = {
                'createRequest': {
                    'requestId': f'nexa-apt-{appointment.id}',
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'},
                },
            }
        else:
            event_body['location'] = getattr(
                settings, 'NEXA_OFFICE_LOCATION', '10th Floor, JKUAT Towers, CBD Nairobi'
            )

        insert_kwargs = {
            'calendarId': settings.GCAL_ADMISSIONS_CALENDAR_ID,
            'body': event_body,
            'sendUpdates': 'all',
        }
        if appointment.appointment_type == 'virtual':
            insert_kwargs['conferenceDataVersion'] = 1

        event = service.events().insert(**insert_kwargs).execute()

        meet_url = ''
        for ep in event.get('conferenceData', {}).get('entryPoints', []):
            if ep.get('entryPointType') == 'video':
                meet_url = ep.get('uri', '')
                break

        return {'event_id': event['id'], 'meet_url': meet_url}

    except CalendarServiceError:
        raise
    except Exception as exc:
        logger.error('appointments.gcal_service.create_appointment_event failed: %s', exc)
        raise CalendarServiceError(str(exc))


def cancel_appointment_event(event_id):
    """Delete an appointment event from Google Calendar."""
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
        logger.error('appointments.gcal_service.cancel_appointment_event failed: %s', exc)
        raise CalendarServiceError(str(exc))
