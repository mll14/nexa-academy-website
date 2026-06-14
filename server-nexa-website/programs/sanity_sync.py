import logging
import threading

from django.utils import timezone

from .models import Program, ProgramIntake

logger = logging.getLogger(__name__)

_local = threading.local()  # used by signals.py to detect in-progress syncs
_DISAPPEAR = 'disappear'


def _sync(fn, *args, **kwargs):
    """Run fn with the _local.active flag set so signals skip Sanity push-back."""
    _local.active = True
    try:
        fn(*args, **kwargs)
    finally:
        _local.active = False


def sync_program(payload: dict) -> None:
    _sync(_sync_program, payload)


def sync_intake(payload: dict) -> None:
    _sync(_sync_intake, payload)


def _sync_program(payload: dict) -> None:
    sanity_id = payload.get('_id', '')
    transition = payload.get('_transition', 'update')
    try:
        if transition == _DISAPPEAR:
            Program.objects.filter(sanity_id=sanity_id).update(status='archived')
            return
        Program.objects.update_or_create(
            sanity_id=sanity_id,
            defaults=_map_program(payload),
        )
    except Exception as exc:
        logger.error('sync_program failed sanity_id=%s: %s', sanity_id, exc)


def _sync_intake(payload: dict) -> None:
    sanity_id = payload.get('_id', '')
    transition = payload.get('_transition', 'update')
    try:
        if transition == _DISAPPEAR:
            ProgramIntake.objects.filter(sanity_id=sanity_id).delete()
            return
        program_ref = (payload.get('program') or {}).get('_ref', '')
        program = Program.objects.get(sanity_id=program_ref)
        ProgramIntake.objects.update_or_create(
            sanity_id=sanity_id,
            defaults=_map_intake(payload, program),
        )
    except Program.DoesNotExist:
        logger.error('sync_intake: no Program with sanity_id=%s (intake=%s)', program_ref, sanity_id)
    except Exception as exc:
        logger.error('sync_intake failed sanity_id=%s: %s', sanity_id, exc)


def _map_program(p: dict) -> dict:
    return {
        'name':           p.get('programName', ''),
        'slug':           (p.get('slug') or {}).get('current', ''),
        'price':          p.get('price') or 0,
        'original_price': p.get('originalPrice'),
        'coming_soon':    p.get('comingSoon', False),
        'status':         'active' if p.get('isActive', True) else 'draft',
    }


def _map_intake(i: dict, program: Program) -> dict:
    return {
        'program':              program,
        'start_date':           i.get('startDate'),
        'end_date':             i.get('endDate'),
        'application_deadline': i.get('applicationDeadline'),
        'max_seats':            i.get('maxSeats'),
        'seats_remaining':      i.get('seatsRemaining'),
        'status':               i.get('status', 'draft'),
        'notes':                i.get('notes', ''),
        'source':               'cms',
        'last_synced_at':       timezone.now(),
    }
