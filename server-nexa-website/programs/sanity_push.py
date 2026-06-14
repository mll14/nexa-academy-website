"""
Django → Sanity push.  Called from signals when a Program or ProgramIntake
is saved or deleted so that Sanity stays in sync with Django.

Requires settings: SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_TOKEN.
If any of those are missing the push is silently skipped (useful in local
dev where Sanity credentials are not configured).
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

_API_VERSION = 'v2021-10-21'


def _mutate(mutations: list) -> bool:
    project_id = getattr(settings, 'SANITY_PROJECT_ID', '')
    dataset = getattr(settings, 'SANITY_DATASET', 'production')
    token = getattr(settings, 'SANITY_API_TOKEN', '')

    if not project_id or not token:
        logger.debug('sanity_push: credentials not configured, skipping')
        return False

    url = f'https://{project_id}.api.sanity.io/{_API_VERSION}/data/mutate/{dataset}'
    body = json.dumps({'mutations': mutations}).encode()
    req = urllib.request.Request(
        url, data=body,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status == 200
    except urllib.error.HTTPError as exc:
        logger.error('sanity_push: HTTP %s — %s', exc.code, exc.read().decode('utf-8', errors='replace'))
    except Exception as exc:
        logger.error('sanity_push: %s', exc)
    return False


def push_program(program) -> None:
    if not program.sanity_id:
        new_id = f'program-{program.program_id}'
        type(program).objects.filter(pk=program.pk).update(sanity_id=new_id)
        program.sanity_id = new_id

    # Only push fields Django owns. Use createIfNotExists + patch so we don't
    # overwrite content fields (description, curriculum, etc.) managed in Sanity.
    patch_set = {
        '_type': 'program',
        'programName': program.name,
        'slug': {'_type': 'slug', 'current': program.slug or ''},
        'price': float(program.price) if program.price is not None else 0,
        'comingSoon': bool(program.coming_soon),
        'isActive': program.status == 'active',
    }
    if program.original_price is not None:
        patch_set['originalPrice'] = float(program.original_price)

    _mutate([
        {'createIfNotExists': {'_id': program.sanity_id, '_type': 'program'}},
        {'patch': {'id': program.sanity_id, 'set': patch_set}},
    ])


def delete_program(sanity_id: str) -> None:
    if sanity_id:
        _mutate([{'delete': {'id': sanity_id}}])


def push_intake(intake) -> None:
    if not intake.program.sanity_id:
        logger.warning('sanity_push.push_intake: program %s has no sanity_id, skipping', intake.program_id)
        return

    if not intake.sanity_id:
        new_id = f'intake-{intake.id}'
        type(intake).objects.filter(pk=intake.pk).update(sanity_id=new_id)
        intake.sanity_id = new_id

    doc = {
        '_id': intake.sanity_id,
        '_type': 'programIntake',
        'program': {'_type': 'reference', '_ref': intake.program.sanity_id},
        'startDate': str(intake.start_date) if intake.start_date else None,
        'status': intake.status,
        'notes': intake.notes or '',
    }
    if intake.end_date:
        doc['endDate'] = str(intake.end_date)
    if intake.application_deadline:
        doc['applicationDeadline'] = str(intake.application_deadline)
    if intake.max_seats is not None:
        doc['maxSeats'] = intake.max_seats
    if intake.seats_remaining is not None:
        doc['seatsRemaining'] = intake.seats_remaining

    _mutate([{'createOrReplace': doc}])


def delete_intake(sanity_id: str) -> None:
    if sanity_id:
        _mutate([{'delete': {'id': sanity_id}}])
