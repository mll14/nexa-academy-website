import base64
import hashlib
import hmac
import logging
import time

from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    Testimonial, FAQ, SiteSetting, HomepageFeature,
    LegalDocument, BlogPost, Announcement,
    PopupBanner, SiteNavigation, FooterConfig,
)

logger = logging.getLogger(__name__)


def _auth(request):
    """Verify Sanity's HMAC-SHA256 webhook signature.

    Sanity signs each request by sending:
        sanity-webhook-signature: t=<unix_ts>,v1=<base64_hmac>
    where the HMAC is SHA-256 over "<timestamp>.<raw_body>" keyed with the
    webhook secret configured in sanity.io/manage.

    In DEBUG mode with no secret configured, bypass auth for local dev.
    """
    secret = getattr(settings, 'SANITY_WEBHOOK_SECRET', '')
    if not secret:
        if settings.DEBUG:
            return True
        return False

    sig_header = request.headers.get('sanity-webhook-signature', '')
    if not sig_header:
        return False

    try:
        parts = dict(part.split('=', 1) for part in sig_header.split(','))
        timestamp = parts['t']
        v1 = parts['v1']
    except (KeyError, ValueError):
        return False

    # Reject requests older than 5 minutes to prevent replay attacks
    try:
        if abs(time.time() - int(timestamp)) > 300:
            logger.warning('cms_sync: webhook timestamp too old')
            return False
    except (ValueError, TypeError):
        return False

    message = timestamp.encode() + b'.' + request.body
    expected = base64.b64encode(
        hmac.new(secret.encode(), message, hashlib.sha256).digest()
    ).decode()

    return hmac.compare_digest(v1, expected)


def sync_testimonial(payload, delete=False):
    sid = payload['_id']
    if delete:
        Testimonial.objects.filter(sanity_id=sid).delete()
        return
    Testimonial.objects.update_or_create(
        sanity_id=sid,
        defaults={
            'name':       payload.get('name', ''),
            'role':       payload.get('role', ''),
            'quote':      payload.get('quote', ''),
            'rating':     int(payload.get('rating', 5)),
            'avatar_url': payload.get('avatarUrl', ''),
            'is_active':  bool(payload.get('isActive', True)),
            'sort_order': int(payload.get('sortOrder', 0)),
        },
    )


def sync_faq(payload, delete=False):
    sid = payload['_id']
    if delete:
        FAQ.objects.filter(sanity_id=sid).delete()
        return
    FAQ.objects.update_or_create(
        sanity_id=sid,
        defaults={
            'question':        payload.get('question', ''),
            'answer':          payload.get('answer', ''),
            'category':        payload.get('category', 'general'),
            'show_on_homepage': bool(payload.get('showOnHomepage', False)),
            'is_active':       bool(payload.get('isActive', True)),
            'sort_order':      int(payload.get('sortOrder', 0)),
        },
    )


def sync_homepage_feature(payload, delete=False):
    sid = payload['_id']
    if delete:
        HomepageFeature.objects.filter(sanity_id=sid).delete()
        return
    HomepageFeature.objects.update_or_create(
        sanity_id=sid,
        defaults={
            'section':     payload.get('section', 'why_choose'),
            'title':       payload.get('title', ''),
            'description': payload.get('description', ''),
            'icon_name':   payload.get('iconName', ''),
            'sort_order':  int(payload.get('sortOrder', 0)),
            'is_active':   bool(payload.get('isActive', True)),
        },
    )


def sync_legal_document(payload, delete=False):
    sid = payload['_id']
    if delete:
        LegalDocument.objects.filter(sanity_id=sid).delete()
        return
    LegalDocument.objects.update_or_create(
        sanity_id=sid,
        defaults={
            'doc_type':   payload.get('docType', 'privacy'),
            'section_id': payload.get('sectionId', sid),
            'title':      payload.get('title', ''),
            'content':    payload.get('content', ''),
            'sort_order': int(payload.get('sortOrder', 0)),
            'is_active':  bool(payload.get('isActive', True)),
        },
    )


def sync_site_setting(payload, delete=False):
    sid = payload['_id']
    if delete:
        SiteSetting.objects.filter(sanity_id=sid).delete()
        return
    key = payload.get('key', '')
    if not key:
        return
    SiteSetting.objects.update_or_create(
        sanity_id=sid,
        defaults={
            'key':   key,
            'value': payload.get('value', ''),
            'group': payload.get('group', ''),
            'label': payload.get('label', ''),
        },
    )


def sync_blog_post(payload, delete=False):
    sid = payload['_id']
    if delete:
        BlogPost.objects.filter(sanity_id=sid).delete()
        return
    BlogPost.objects.update_or_create(
        sanity_id=sid,
        defaults={
            'title':           payload.get('title', ''),
            'slug':            (payload.get('slug') or {}).get('current', ''),
            'body':            payload.get('body', ''),
            'author':          payload.get('author', ''),
            'cover_image_url': payload.get('coverImageUrl', ''),
            'category':        payload.get('category', ''),
            'tags':            payload.get('tags', []),
            'published_at':    payload.get('publishedAt') or None,
            'is_published':    bool(payload.get('isPublished', False)),
        },
    )


def sync_announcement(payload, delete=False):
    sid = payload['_id']
    if delete:
        Announcement.objects.filter(sanity_id=sid).delete()
        return
    Announcement.objects.update_or_create(
        sanity_id=sid,
        defaults={
            'title':        payload.get('title', ''),
            'body':         payload.get('body', ''),
            'is_active':    bool(payload.get('isActive', True)),
            'published_at': payload.get('publishedAt') or None,
        },
    )


def sync_program(payload, delete=False):
    from programs.models import Program
    sid = payload['_id']
    if delete:
        # Deliberately soft-delete: unlink from Sanity rather than removing the row.
        # Program rows must not be hard-deleted while Application and Enrollment FK
        # records reference them. Admins can archive the program via the admin panel.
        Program.objects.filter(sanity_id=sid).update(sanity_id=None)
        return
    slug = (payload.get('slug') or {}).get('current', '')
    Program.objects.update_or_create(
        sanity_id=sid,
        defaults={
            'program_name':     payload.get('programName', ''),
            'description':      payload.get('description', ''),
            'subtitle':         payload.get('subtitle', ''),
            'slug':             slug,
            'price':            payload.get('price', 0),
            'original_price':   payload.get('originalPrice') or None,
            'duration':         int(payload.get('durationWeeks', 0)),
            'duration_months':  payload.get('durationMonths') or None,
            'level':            payload.get('level', 'Beginner'),
            'category':         payload.get('category', ''),
            'instructor':       payload.get('instructor', ''),
            'instructor_email': payload.get('instructorEmail', ''),
            'image':            payload.get('imageUrl', ''),
            'icon':             payload.get('iconUrl', ''),
            'topics':           payload.get('topics', []),
            'curriculum':       payload.get('curriculum', []),
            'features':         payload.get('features', []),
            'outcomes':         payload.get('outcomes', []),
            'faq':              payload.get('faq', []),
            'coming_soon':      bool(payload.get('comingSoon', False)),
            'status':           'active' if payload.get('isActive', True) else 'draft',
        },
    )


def sync_program_intake(payload, delete=False):
    from programs.models import Program, ProgramIntake
    sid = payload['_id']
    if delete:
        ProgramIntake.objects.filter(sanity_id=sid).delete()
        return
    # Prefer lookup by sanity_id (stable), fall back to name match (fragile but
    # preserves backward compat with payloads that only send programName).
    program_sanity_id = payload.get('programSanityId', '')
    program_name = payload.get('programName', '')
    if program_sanity_id:
        program = Program.objects.filter(sanity_id=program_sanity_id).first()
    else:
        program = Program.objects.filter(program_name__iexact=program_name).first()
        if program:
            logger.debug('cms_sync: programIntake %s matched program by name %r (no programSanityId in payload)', sid, program_name)
    if not program:
        logger.warning('cms_sync: programIntake %s — program not found (programSanityId=%r, name=%r)', sid, program_sanity_id, program_name)
        return
    ProgramIntake.objects.update_or_create(
        sanity_id=sid,
        defaults={
            'program':              program,
            'start_date':           payload.get('startDate'),
            'end_date':             payload.get('endDate') or None,
            'application_deadline': payload.get('applicationDeadline') or None,
            'max_seats':            payload.get('maxSeats') or None,
            'seats_remaining':      payload.get('seatsRemaining') or None,
            'status':               payload.get('status', 'draft'),
            'notes':                payload.get('notes', ''),
            'source':               'cms',
            'last_synced_at':       timezone.now(),
        },
    )


def sync_popup_banner(payload, delete=False):
    sanity_id = payload['_id']
    if delete:
        PopupBanner.objects.filter(sanity_id=sanity_id).delete()
        return
    PopupBanner.objects.update_or_create(
        sanity_id=sanity_id,
        defaults={
            'title':       payload.get('title', ''),
            'body':        payload.get('body', ''),
            'cta_text':    payload.get('ctaText', ''),
            'cta_url':     payload.get('ctaUrl', ''),
            'is_active':   bool(payload.get('isActive', False)),
            'start_date':  payload.get('startDate') or None,
            'end_date':    payload.get('endDate') or None,
            'target_page': payload.get('targetPage', 'all'),
            'dismissible': bool(payload.get('dismissible', True)),
            'priority':    int(payload.get('priority') or 0),
        },
    )


def sync_navigation(payload, delete=False):
    if delete:
        return  # never delete the singleton
    nav, _ = SiteNavigation.objects.get_or_create(pk=1)
    nav.items = payload.get('items', [])
    nav.sanity_id = payload.get('_id', '')
    nav.save()


def sync_footer(payload, delete=False):
    if delete:
        return  # never delete the singleton
    footer, _ = FooterConfig.objects.get_or_create(pk=1)
    footer.columns = payload.get('columns', [])
    footer.social_links = payload.get('socialLinks', [])
    footer.copyright_text = payload.get('copyrightText', '')
    footer.tagline = payload.get('tagline', '')
    footer.sanity_id = payload.get('_id', '')
    footer.save()


_HANDLERS = {
    'testimonial':     sync_testimonial,
    'faq':             sync_faq,
    'homepageFeature': sync_homepage_feature,
    'legalDocument':   sync_legal_document,
    'siteSetting':     sync_site_setting,
    'blogPost':        sync_blog_post,
    'announcement':    sync_announcement,
    'program':         sync_program,
    'programIntake':   sync_program_intake,
    'popupBanner':     sync_popup_banner,
    'navigation':      sync_navigation,
    'footer':          sync_footer,
}


class CmsSyncView(APIView):
    """
    POST /api/cms/sync/
    Single unified Sanity webhook receiver.
    Authenticated via X-Sanity-Webhook-Secret header.
    Always returns 200 for valid tokens, even for unrecognised _type values.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not _auth(request):
            return Response({'error': 'Unauthorised'}, status=401)

        payload = request.data
        _type = payload.get('_type', '')
        _op = payload.get('_op', 'createOrUpdate')

        handler = _HANDLERS.get(_type)
        if not handler:
            logger.debug('cms_sync: unrecognised _type=%r — ignoring', _type)
            return Response({'status': 'ignored', '_type': _type})

        try:
            handler(payload, delete=(_op == 'delete'))
            logger.info('cms_sync: synced _type=%s _id=%s op=%s', _type, payload.get('_id'), _op)
            return Response({'status': 'ok', '_type': _type})
        except Exception as exc:
            logger.error('cms_sync: failed _type=%s _id=%s: %s', _type, payload.get('_id'), exc, exc_info=True)
            return Response({'error': str(exc)}, status=500)
