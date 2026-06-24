from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from ubuntu_labs.pagination import StandardResultsSetPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone
from django.core.cache import cache
from html import escape
from html.parser import HTMLParser
from .models import Application, ApplicationAdminNote, ApplicationLog, DraftApplication, InterviewBlackout, CustomCalendarEvent
from .serializers import ApplicationAdminNoteSerializer, ApplicationSerializer, ApplicationCreateSerializer, InterviewSlotSerializer, InterviewBlackoutSerializer, CustomCalendarEventSerializer
from .models import InterviewSlot
from accounts.permissions import IsAdminUser
from django.conf import settings
from ubuntu_labs.email_utils import send_html_email
from notifications.models import Notification
import requests as http_req
import uuid
import logging
import re
from urllib.parse import urlparse
from accounts.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator


logger = logging.getLogger(__name__)


_NOTE_ALLOWED_TAGS = frozenset({
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'ul', 'ol', 'li', 'blockquote', 'a',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'pre', 'code',
})
_NOTE_ALLOWED_ATTRS = {'a': {'href', 'title'}}
_SAFE_HREF_SCHEMES = frozenset({'http', 'https', 'mailto', ''})


class _AdminNoteHTMLCleaner(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.parts = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in {'script', 'style'}:
            self.skip_depth += 1
            return
        if self.skip_depth or tag not in _NOTE_ALLOWED_TAGS:
            return

        cleaned_attrs = []
        for name, value in attrs:
            name = name.lower()
            if name not in _NOTE_ALLOWED_ATTRS.get(tag, set()) or value is None:
                continue
            if name == 'href':
                # Strip control characters before parsing to prevent scheme-bypass via \x00 etc.
                normalized = re.sub(r'[\x00-\x20]+', '', value)
                scheme = urlparse(normalized).scheme.lower()
                if scheme not in _SAFE_HREF_SCHEMES:
                    continue
            cleaned_attrs.append(f'{name}="{escape(value, quote=True)}"')

        suffix = f" {' '.join(cleaned_attrs)}" if cleaned_attrs else ''
        self.parts.append(f'<{tag}{suffix}>')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in {'script', 'style'} and self.skip_depth:
            self.skip_depth -= 1
            return
        if self.skip_depth or tag not in _NOTE_ALLOWED_TAGS or tag == 'br':
            return
        self.parts.append(f'</{tag}>')

    def handle_data(self, data):
        if not self.skip_depth:
            self.parts.append(escape(data))

    def handle_entityref(self, name):
        if not self.skip_depth:
            self.parts.append(f'&{name};')

    def handle_charref(self, name):
        if not self.skip_depth:
            self.parts.append(f'&#{name};')


def _clean_admin_note_html(html):
    if not html:
        return ''
    cleaner = _AdminNoteHTMLCleaner()
    cleaner.feed(html)
    cleaner.close()
    return ''.join(cleaner.parts)


def _admissions_notification_email():
    return getattr(settings, 'ADMISSIONS_NOTIFICATION_EMAIL', 'admissions@nexaacademy.co.ke')


def _admissions_portal_url(path=''):
    base = getattr(settings, 'ADMISSIONS_PORTAL_URL', '') or getattr(settings, 'FRONTEND_URL', '')
    base = base.rstrip('/')
    if not base:
        return ''
    return f"{base}{path}"


def _format_currency(value):
    if value in (None, ''):
        return ''
    try:
        return f"KSh {value:,.2f}"
    except (TypeError, ValueError):
        return str(value)


def _send_manager_application_notification(application, intake_mode=''):
    recipient = _admissions_notification_email()
    send_html_email(
        subject=f"New application submitted — {application.full_name}",
        template_name='manager_application_received.html',
        context={
            'application': application,
            'full_name': application.full_name,
            'email': application.email,
            'phone': application.phone,
            'program_name': application.program_name or application.program,
            'start_date': application.start_date,
            'intake_mode': intake_mode,
            'estimated_fees': _format_currency(application.estimated_fees),
            'payment_plan': application.payment_plan,
            'message': application.message,
            'source': application.source,
            'application_url': _admissions_portal_url(f"/admin/applications/{application.id}"),
            'frontend_url': settings.FRONTEND_URL,
            'header_label': 'Admissions Alert',
            'preview_text': f"New application from {application.full_name}",
        },
        recipient_email=recipient,
    )


def _send_manager_interview_notification(application, chosen_time, meet_url=''):
    recipient = _admissions_notification_email()
    send_html_email(
        subject=f"Interview scheduled — {application.full_name}",
        template_name='manager_interview_scheduled.html',
        context={
            'application': application,
            'full_name': application.full_name,
            'email': application.email,
            'phone': application.phone,
            'program_name': application.program_name or application.program,
            'chosen_time': chosen_time,
            'meet_url': meet_url,
            'application_url': _admissions_portal_url(f"/admin/applications/{application.id}"),
            'calendar_url': _admissions_portal_url('/admin/interviews'),
            'frontend_url': settings.FRONTEND_URL,
            'header_label': 'Interview Alert',
            'preview_text': f"{application.full_name} scheduled an interview",
        },
        recipient_email=recipient,
    )


def _verify_recaptcha(token: str, remote_ip: str = "", expected_action: str = ""):
    """Verify reCAPTCHA token with Google.

    Returns a tuple: (is_valid: bool, response_json: dict, error_message: str).
    If RECAPTCHA_SECRET_KEY is not set, verification is skipped and treated as valid.
    """
    secret = getattr(settings, "RECAPTCHA_SECRET_KEY", "")
    min_score = float(getattr(settings, "RECAPTCHA_MIN_SCORE", 0.5))
    expected_action = expected_action or getattr(
        settings,
        "RECAPTCHA_V3_ACTION",
        "",
    )
    if not secret:
        return True, {"skipped": True, "reason": "missing_secret"}, ""
    if not token:
        return False, {"success": False, "error-codes": ["missing-input-response"]}, "missing_token"
    try:
        payload = {"secret": secret, "response": token}
        if remote_ip:
            payload["remoteip"] = remote_ip

        resp = http_req.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data=payload,
            timeout=5,
        )
        data = resp.json()
        if not bool(data.get("success", False)):
            return False, data, ""

        if expected_action and data.get("action") != expected_action:
            data.setdefault("error-codes", [])
            if "action-mismatch" not in data["error-codes"]:
                data["error-codes"].append("action-mismatch")
            return False, data, "action_mismatch"

        score = data.get("score")
        try:
            score_value = float(score)
        except (TypeError, ValueError):
            score_value = 0.0

        if score_value < min_score:
            data.setdefault("error-codes", [])
            if "low-score" not in data["error-codes"]:
                data["error-codes"].append("low-score")
            return False, data, "low_score"

        return True, data, ""
    except Exception as exc:
        return False, {}, str(exc)


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'program', 'email_sent']
    search_fields = ['full_name', 'email', 'phone']
    ordering_fields = ['applied_at', 'updated_at', 'full_name']
    ordering = ['-applied_at']
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        user = self.request.user
        # Unauthenticated requests (e.g. AllowAny create) have no meaningful queryset
        if not user or not user.is_authenticated:
            return Application.objects.none()
        # Admins see everything
        if getattr(user, 'role', None) == 'admin':
            qs = Application.objects.all()
            intake_status = self.request.query_params.get('intake_status')
            if intake_status == 'with':
                return qs.filter(start_date__isnull=False)
            if intake_status == 'without':
                return qs.filter(start_date__isnull=True)
            return qs
        # Students only see their own applications (matched by FK or email)
        return Application.objects.filter(
            Q(user=user) | Q(email__iexact=user.email)
        )

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [AllowAny]
        elif self.action in ['update', 'partial_update', 'destroy', 'cancel_interview']:
            permission_classes = [IsAuthenticated, IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ApplicationCreateSerializer
        return ApplicationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Verify reCAPTCHA token if secret is configured
        recaptcha_verified = True
        recaptcha_token = str(
            request.data.get("recaptcha_token")
            or request.data.get("recaptchaToken")
            or ""
        ).strip()
        recaptcha_enforce = getattr(
            settings,
            "RECAPTCHA_ENFORCE",
            not getattr(settings, "DEBUG", False),
        )

        if getattr(settings, "RECAPTCHA_SECRET_KEY", ""):
            is_valid_recaptcha, recaptcha_data, recaptcha_err = _verify_recaptcha(
                recaptcha_token,
                remote_ip=request.META.get("REMOTE_ADDR", ""),
                expected_action=getattr(settings, "RECAPTCHA_V3_ACTION", "application_submit"),
            )
            if not is_valid_recaptcha:
                recaptcha_verified = False
                logger.warning(
                    "reCAPTCHA verification failed: codes=%s hostname=%s action=%s err=%s token_prefix=%s",
                    recaptcha_data.get("error-codes", []),
                    recaptcha_data.get("hostname"),
                    recaptcha_data.get("action"),
                    recaptcha_err,
                    (recaptcha_token or "")[:20],
                )

                codes = recaptcha_data.get("error-codes", []) or []
                if codes:
                    body = {"error": f"reCAPTCHA verification failed ({', '.join(codes)})"}
                else:
                    body = {"error": "reCAPTCHA verification failed"}
                if getattr(settings, "DEBUG", False):
                    body["recaptcha_debug"] = {
                        "error_codes": codes,
                        "hostname": recaptcha_data.get("hostname"),
                        "challenge_ts": recaptcha_data.get("challenge_ts"),
                        "score": recaptcha_data.get("score"),
                        "action": recaptcha_data.get("action"),
                        "exception": recaptcha_err or None,
                    }

                if recaptcha_enforce:
                    return Response(body, status=status.HTTP_400_BAD_REQUEST)

                logger.warning(
                    "reCAPTCHA fail-open enabled (DEBUG). Allowing application create despite verification failure."
                )

        # If user is authenticated, link to their account. Otherwise try to auto-create or find a user by email.
        if request.user.is_authenticated:
            application = serializer.save(
                user=request.user,
                recaptcha_verified=recaptcha_verified,
            )
        else:
            email = serializer.validated_data.get("email")
            full_name = serializer.validated_data.get("full_name") or serializer.validated_data.get("fullName") or "Applicant"
            phone = serializer.validated_data.get("phone", "")
            user = None
            user_created = False
            if email:
                user = User.objects.filter(email__iexact=email).first()
            if not user:
                try:
                    random_password = uuid.uuid4().hex[:12]
                    user = User.objects.create_user(
                        email=email,
                        password=random_password,
                        display_name=full_name,
                        phone=phone,
                    )
                    user_created = True
                except Exception:
                    user = None

            if user:
                application = serializer.save(
                    user=user,
                    recaptcha_verified=recaptcha_verified,
                )
            else:
                # fallback: save without user
                application = serializer.save(
                    recaptcha_verified=recaptcha_verified,
                )
        
        # Create log entry
        ApplicationLog.objects.create(
            application=application,
            previous_status='',
            new_status='pending',
            changed_by='system',
            notes='Application submitted',
            applicant_email=application.email,
            applicant_name=application.full_name
        )

        # Mark any draft as completed so reminder email is not sent
        try:
            DraftApplication.objects.filter(email__iexact=application.email).update(completed=True)
        except Exception:
            pass

        # Remove incomplete application record now that a full submission exists
        try:
            from programs.models import IncompleteApplication
            IncompleteApplication.objects.filter(
                email__iexact=application.email,
            ).delete()
        except Exception:
            pass

        # Create an in-app notification for the applicant if we have a linked user
        try:
            if application.user:
                Notification.objects.create(
                    user=application.user,
                    type='pending',
                    title='Application Received',
                    message=f"We have received your application for {application.program_name}. Our admissions team will review it and get back to you.",
                    application=application,
                    course_name=application.program_name,
                    link='/student-dashboard/' + str(application.user.uid)
                )
        except Exception:
            pass
        
        # Send confirmation email
        try:
            intake_mode = ''
            try:
                from programs.models import ProgramIntake
                _intake = ProgramIntake.objects.filter(
                    program__name__iexact=application.program_name,
                    start_date=application.start_date,
                ).first()
                if _intake:
                    intake_mode = _intake.get_mode_display()
            except Exception:
                pass
            context = {
                'full_name': application.full_name,
                'program_name': application.program_name,
                'start_date': application.start_date,
                'intake_mode': intake_mode,
                'estimated_fees': application.estimated_fees,
                'frontend_url': settings.FRONTEND_URL,
            }
            send_html_email(
                subject=f"We've received your application, {application.full_name}",
                template_name='application_received.html',
                context=context,
                recipient_email=application.email,
            )
            application.email_sent = True
            application.save(update_fields=['email_sent'])
        except Exception as exc:
            logger.error('application_received email failed for %s: %s', application.email, exc)

        try:
            _send_manager_application_notification(application, intake_mode=intake_mode)
        except Exception as exc:
            logger.error('manager application notification failed for %s: %s', application.email, exc)
        
        # Send account-setup email only for brand-new accounts so the applicant
        # can set a password via the admissions portal. Uses the same token
        # mechanism as ForgotPasswordView — email ownership is verified before
        # the token can be used.
        if user_created and user:
            try:
                token = PasswordResetTokenGenerator().make_token(user)
                setup_url = (
                    f"{getattr(settings, 'ADMISSIONS_PORTAL_URL', 'https://admissions.nexaacademy.co.ke')}"
                    f"/reset-password?uid={user.uid}&token={token}"
                )
                send_html_email(
                    subject='Set up your Nexa Academy account',
                    template_name='account_setup.html',
                    context={'display_name': full_name, 'setup_url': setup_url},
                    recipient_email=email,
                )
            except Exception as exc:
                logger.error('account_setup email failed for %s: %s', email, exc)

        return Response(ApplicationSerializer(application).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsAdminUser])
    def update_status(self, request, pk=None):
        application = self.get_object()
        new_status = request.data.get('status')
        notes = request.data.get('notes', '')
        
        if new_status not in dict(Application.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        previous_status = application.status
        application.status = new_status
        application.status_updated_at = timezone.now()
        application.processed_by = request.user.email
        if notes:
            application.admin_notes = notes
        application.save()
        
        # Create log entry
        ApplicationLog.objects.create(
            application=application,
            previous_status=previous_status,
            new_status=new_status,
            changed_by=request.user.email,
            notes=notes,
            applicant_email=application.email,
            applicant_name=application.full_name
        )
        
        # Send status update email to student
        try:
            email_configs = {
                'reviewed': {
                    'template': 'application_reviewed.html',
                    'subject': f"Your Nexa Academy application has been reviewed",
                },
                'approved': {
                    'template': 'application_approved.html',
                    'subject': f"Congratulations, {application.full_name} — you've been approved",
                },
                'rejected': {
                    'template': 'application_rejected.html',
                    'subject': f"An update on your Nexa Academy application",
                },
                'interview_completed': {
                    'template': 'interview_completed.html',
                    'subject': f"Thanks for interviewing with us, {application.full_name}",
                },
                'enrolled': {
                    'template': 'enrolled.html',
                    'subject': f"Welcome to Nexa Academy, {application.full_name} — you're in!",
                },
            }
            cfg = email_configs.get(new_status)
            if cfg:
                context = {
                    'full_name': application.full_name,
                    'program_name': application.program_name,
                    'frontend_url': settings.FRONTEND_URL,
                    'admissions_url': settings.ADMISSIONS_PORTAL_URL,
                    'start_date': application.start_date,
                    'estimated_fees': application.estimated_fees,
                }
                send_html_email(
                    subject=cfg['subject'],
                    template_name=cfg['template'],
                    context=context,
                    recipient_email=application.email,
                )
            # Create in-app notification if user is linked
            if application.user:
                Notification.objects.create(
                    user=application.user,
                    type=new_status,
                    title=f"Application {new_status.capitalize()}",
                    message=f"Your application for {application.program_name} has been {new_status}.",
                    application=application,
                    link='/student-dashboard/' + str(application.user.uid)
                )
        except Exception:
            pass

        
        return Response(ApplicationSerializer(application).data)

    @action(detail=True, methods=['post'])
    def choose_interview_time(self, request, pk=None):
        application = self.get_object()
        slot = getattr(application, 'interview_slot', None)
        chosen = request.data.get('chosen_time')
        if not chosen:
            return Response({'error': 'chosen_time is required'}, status=400)
        if not slot:
            return Response({'error': 'No interview slot found for this application.'}, status=400)
        # Ensure the requester is the application owner (student) or an admin.
        # Allow matching by linked user.uid, or by email if the application wasn't linked to a user.
        user = request.user
        is_owner = False
        if hasattr(user, 'uid') and application.user and user.uid == application.user.uid:
            is_owner = True
        # fallback: allow if the authenticated user's email matches the application email
        if not is_owner and hasattr(user, 'email') and application.email and user.email.lower() == application.email.lower():
            is_owner = True

        if not is_owner and not getattr(user, 'is_staff', False):
            return Response({'error': 'Permission denied'}, status=403)

        # Save chosen time
        slot.chosen_time = chosen
        slot.save()

        previous_status = application.status
        application.status = 'interview_scheduled'
        application.status_updated_at = timezone.now()
        application.save()

        # Create application log
        try:
            ApplicationLog.objects.create(
                application=application,
                previous_status=previous_status,
                new_status='interview_scheduled',
                changed_by=user.email if hasattr(user, 'email') else 'student',
                notes=f'Chosen time: {chosen}',
                applicant_email=application.email,
                applicant_name=application.full_name,
            )
        except Exception:
            pass

        # Notify student
        try:
            if application.user:
                Notification.objects.create(
                    user=application.user,
                    type='info',
                    title='Interview Confirmed',
                    message=f'Your interview is confirmed for {chosen}.',
                    application=application,
                )
        except Exception:
            pass

        try:
            _send_manager_interview_notification(application, chosen)
        except Exception as exc:
            logger.error('manager interview notification failed for %s: %s', application.email, exc)

        # Notify admins
        try:
            admins = User.objects.filter(role='admin')
            for admin in admins:
                Notification.objects.create(
                    user=admin,
                    type='info',
                    title='Interview Time Selected',
                    message=f"{application.full_name} has chosen their interview time: {chosen}.",
                    application=application,
                )
        except Exception:
            pass

        return Response({'status': 'scheduled', 'chosen_time': chosen})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def propose_interview_times(self, request, pk=None):
        """Admin action: propose interview times for the applicant."""
        application = self.get_object()
        data = request.data
        times = data.get('proposed_times') or data.get('proposedTimes')
        zoom_link = data.get('zoom_link') or data.get('zoomLink') or ''
        if not times or not isinstance(times, list):
            return Response({'error': 'proposed_times (list) is required'}, status=400)

        slot, created = InterviewSlot.objects.get_or_create(application=application)
        slot.proposed_times = times
        slot.zoom_link = zoom_link
        slot.admin_approved = True
        slot.save()

        # Only transition to 'approved' if not already at or past interview_scheduled.
        # This prevents accidentally resetting a confirmed interview's status.
        if application.status not in ('interview_scheduled', 'interview_completed', 'enrolled'):
            previous_status = application.status
            application.status = 'approved'
            application.status_updated_at = timezone.now()
            application.save()

            try:
                ApplicationLog.objects.create(
                    application=application,
                    previous_status=previous_status,
                    new_status='approved',
                    changed_by=request.user.email if hasattr(request.user, 'email') else 'admin',
                    notes=f'Proposed interview times: {times}',
                    applicant_email=application.email,
                    applicant_name=application.full_name,
                )
            except Exception:
                pass

        # Notify student
        try:
            if application.user:
                Notification.objects.create(
                    user=application.user,
                    type='info',
                    title='Interview Times Available',
                    message='Interview times are available — please choose your preferred slot in your student dashboard.',
                    application=application,
                )
        except Exception:
            pass

        # Email student that slots are ready to pick
        try:
            send_html_email(
                subject=f"Action required: choose your interview time — {application.program_name}",
                template_name='interview_slots_available.html',
                context={
                    'full_name': application.full_name,
                    'program_name': application.program_name,
                    'frontend_url': settings.FRONTEND_URL,
                    'admissions_url': settings.ADMISSIONS_PORTAL_URL,
                },
                recipient_email=application.email,
            )
        except Exception:
            pass

        return Response(InterviewSlotSerializer(slot).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def complete_interview(self, request, pk=None):
        """Admin marks the interview complete and approves the result."""
        application = self.get_object()
        slot = getattr(application, 'interview_slot', None)
        if not slot:
            return Response({'error': 'No interview slot found.'}, status=400)

        slot.completed = True
        slot.admin_approved = True
        slot.save()

        previous_status = application.status
        application.status = 'interview_completed'
        application.status_updated_at = timezone.now()
        application.save()

        # Log
        try:
            ApplicationLog.objects.create(
                application=application,
                previous_status=previous_status,
                new_status='interview_completed',
                changed_by=request.user.email if hasattr(request.user, 'email') else 'admin',
                notes='Interview marked complete by admin',
                applicant_email=application.email,
                applicant_name=application.full_name,
            )
        except Exception:
            pass

        # Notify student
        try:
            if application.user:
                Notification.objects.create(
                    user=application.user,
                    type='success',
                    title='Interview Passed',
                    message='Congratulations! Your interview was successful. You may now proceed to enrollment and payment.',
                    application=application,
                )
        except Exception:
            pass

        return Response({'status': 'completed'})

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def get_interview_slot(self, request, pk=None):
        application = self.get_object()
        # Only allow applicant or admins
        user = request.user
        if not (getattr(user, 'is_staff', False) or (application.user and getattr(user, 'uid', None) == getattr(application.user, 'uid', None))):
            return Response({'error': 'Permission denied'}, status=403)

        slot = getattr(application, 'interview_slot', None)
        if not slot:
            return Response({'error': 'No interview slot found.'}, status=404)

        return Response(InterviewSlotSerializer(slot).data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def available_slots(self, request, pk=None):
        application = self.get_object()
        user = request.user
        is_admin = getattr(user, 'role', None) == 'admin'
        is_owner = (
            (application.user and hasattr(user, 'uid') and user.uid == application.user.uid)
            or (hasattr(user, 'email') and application.email and user.email.lower() == application.email.lower())
        )
        if not is_admin and not is_owner:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        # Students may fetch slots for 'approved' (initial booking) or
        # 'interview_scheduled' (reschedule). Admins can always fetch.
        if not is_admin and application.status not in ('approved', 'interview_scheduled'):
            return Response({'error': 'Application is not in approved status'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f'gcal_slots_v2_{application.id}'
        slot_data = cache.get(cache_key)
        if slot_data is None:
            try:
                from .gcal_service import get_all_slots_with_status, CalendarServiceError
                slot_data = get_all_slots_with_status()
                cache.set(cache_key, slot_data, 300)
            except Exception as exc:
                logger.warning('available_slots: calendar unavailable — %s', exc)
                return Response(
                    {'error': 'Calendar unavailable, please try again'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        # slots      — full list with status for grid rendering
        # available  — ISO strings only, for backward compat
        available = [s['time'] for s in slot_data if s['status'] == 'available']
        return Response({'slots': slot_data, 'available': available})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def confirm_interview(self, request, pk=None):
        application = self.get_object()
        user = request.user
        is_admin = getattr(user, 'role', None) == 'admin'
        is_owner = (
            (application.user and hasattr(user, 'uid') and user.uid == application.user.uid)
            or (hasattr(user, 'email') and application.email and user.email.lower() == application.email.lower())
        )
        if not is_admin and not is_owner:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if not is_admin and application.status != 'approved':
            return Response(
                {'error': 'Application is not in approved status'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chosen_time = request.data.get('chosen_time')
        if not chosen_time:
            return Response({'error': 'chosen_time is required'}, status=status.HTTP_400_BAD_REQUEST)

        existing_slot = getattr(application, 'interview_slot', None)
        if existing_slot and existing_slot.gcal_event_id:
            if application.status == 'interview_scheduled':
                # Already scheduled — delegate to reschedule so the admin doesn't get a dead end
                return self.reschedule_interview(request, pk=pk)
            # Status was incorrectly reset (e.g. by propose_interview_times) even though a
            # calendar event already exists. Restore the status without creating a duplicate event.
            application.status = 'interview_scheduled'
            application.status_updated_at = timezone.now()
            application.save()
            ApplicationLog.objects.create(
                application=application,
                previous_status=application.status,
                new_status='interview_scheduled',
                changed_by=user.email if hasattr(user, 'email') else 'system',
                notes='Status restored to interview_scheduled (was incorrectly reset)',
                applicant_email=application.email,
                applicant_name=application.full_name,
            )
            return Response(InterviewSlotSerializer(existing_slot).data)

        from .gcal_service import create_interview_event, CalendarServiceError
        try:
            result = create_interview_event(application, chosen_time)
        except CalendarServiceError:
            return Response(
                {'error': 'Calendar unavailable, please try again'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        from datetime import datetime as dt_cls
        from zoneinfo import ZoneInfo
        eat = ZoneInfo('Africa/Nairobi')
        chosen_dt = dt_cls.fromisoformat(chosen_time) if isinstance(chosen_time, str) else chosen_time
        if chosen_dt.tzinfo is None:
            chosen_dt = chosen_dt.replace(tzinfo=eat)

        slot, _ = InterviewSlot.objects.get_or_create(application=application)
        slot.gcal_event_id = result['event_id']
        slot.meet_url = result['meet_url']
        slot.chosen_time = chosen_dt
        slot.confirmed_at = timezone.now()
        slot.admin_approved = True
        slot.save()

        previous_status = application.status
        application.status = 'interview_scheduled'
        application.status_updated_at = timezone.now()
        application.save()

        ApplicationLog.objects.create(
            application=application,
            previous_status=previous_status,
            new_status='interview_scheduled',
            changed_by=user.email if hasattr(user, 'email') else 'system',
            notes=f'Interview confirmed for {chosen_time}. Meet: {result["meet_url"]}',
            applicant_email=application.email,
            applicant_name=application.full_name,
        )

        try:
            formatted_time = chosen_dt.astimezone(eat).strftime('%A, %d %B %Y at %I:%M %p EAT')
            send_html_email(
                subject=f"Your Interview is Confirmed — {application.program_name}",
                template_name='interview_scheduled.html',
                context={
                    'full_name': application.full_name,
                    'program_name': application.program_name,
                    'chosen_time': formatted_time,
                    'meet_url': result['meet_url'],
                    'frontend_url': settings.FRONTEND_URL,
                },
                recipient_email=application.email,
            )
        except Exception:
            pass

        try:
            _send_manager_interview_notification(
                application,
                formatted_time if 'formatted_time' in locals() else chosen_time,
                result['meet_url'],
            )
        except Exception as exc:
            logger.error('manager interview notification failed for %s: %s', application.email, exc)

        try:
            if application.user:
                Notification.objects.create(
                    user=application.user,
                    type='info',
                    title='Interview Scheduled',
                    message='Your interview is confirmed. Check your email for the Google Meet link.',
                    application=application,
                )
        except Exception:
            pass

        return Response(InterviewSlotSerializer(slot).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reschedule_interview(self, request, pk=None):
        application = self.get_object()
        user = request.user
        is_admin = getattr(user, 'role', None) == 'admin'
        is_owner = (
            (application.user and hasattr(user, 'uid') and user.uid == application.user.uid)
            or (hasattr(user, 'email') and application.email and user.email.lower() == application.email.lower())
        )
        if not is_admin and not is_owner:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        slot = getattr(application, 'interview_slot', None)
        if not slot or not slot.gcal_event_id:
            return Response({'error': 'No scheduled interview found'}, status=status.HTTP_400_BAD_REQUEST)

        if not is_admin and slot.chosen_time:
            hours_until = (slot.chosen_time - timezone.now()).total_seconds() / 3600
            if hours_until < 24:
                return Response(
                    {'error': 'Cannot reschedule within 24 hours of the interview'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        new_time = request.data.get('chosen_time')
        if not new_time:
            return Response({'error': 'chosen_time is required'}, status=status.HTTP_400_BAD_REQUEST)

        from .gcal_service import update_interview_event, CalendarServiceError
        try:
            update_interview_event(slot.gcal_event_id, new_time)
        except CalendarServiceError:
            return Response(
                {'error': 'Calendar unavailable, please try again'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        from datetime import datetime as dt_cls
        from zoneinfo import ZoneInfo
        eat = ZoneInfo('Africa/Nairobi')
        new_dt = dt_cls.fromisoformat(new_time) if isinstance(new_time, str) else new_time
        if new_dt.tzinfo is None:
            new_dt = new_dt.replace(tzinfo=eat)

        old_time = slot.chosen_time
        slot.chosen_time = new_dt
        slot.confirmed_at = timezone.now()
        slot.save()

        # Ensure status is interview_scheduled — also auto-heals if it was incorrectly reset.
        previous_status = application.status
        if application.status != 'interview_scheduled':
            application.status = 'interview_scheduled'
            application.status_updated_at = timezone.now()
            application.save()

        ApplicationLog.objects.create(
            application=application,
            previous_status=previous_status,
            new_status='interview_scheduled',
            changed_by=user.email if hasattr(user, 'email') else 'system',
            notes=f'Rescheduled from {old_time} to {new_time}',
            applicant_email=application.email,
            applicant_name=application.full_name,
        )

        try:
            formatted_time = new_dt.astimezone(eat).strftime('%A, %d %B %Y at %I:%M %p EAT')
            send_html_email(
                subject=f"Interview Rescheduled — {application.program_name}",
                template_name='interview_rescheduled.html',
                context={
                    'full_name': application.full_name,
                    'program_name': application.program_name,
                    'chosen_time': formatted_time,
                    'meet_url': slot.meet_url,
                    'frontend_url': settings.FRONTEND_URL,
                },
                recipient_email=application.email,
            )
        except Exception:
            pass

        try:
            _send_manager_interview_notification(
                application,
                formatted_time if 'formatted_time' in locals() else new_time,
                slot.meet_url,
            )
        except Exception as exc:
            logger.error('manager interview notification failed for %s: %s', application.email, exc)

        return Response(InterviewSlotSerializer(slot).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def cancel_interview(self, request, pk=None):
        application = self.get_object()
        slot = getattr(application, 'interview_slot', None)
        if not slot or not slot.gcal_event_id:
            return Response({'error': 'No scheduled interview found'}, status=status.HTTP_400_BAD_REQUEST)

        from .gcal_service import cancel_interview_event, CalendarServiceError
        try:
            cancel_interview_event(slot.gcal_event_id)
        except CalendarServiceError:
            return Response(
                {'error': 'Calendar unavailable, please try again'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        slot.gcal_event_id = ''
        slot.meet_url = ''
        slot.chosen_time = None
        slot.admin_approved = False
        slot.save()

        previous_status = application.status
        application.status = 'approved'
        application.status_updated_at = timezone.now()
        application.save()

        ApplicationLog.objects.create(
            application=application,
            previous_status=previous_status,
            new_status='approved',
            changed_by=request.user.email if hasattr(request.user, 'email') else 'admin',
            notes='Interview cancelled by admin',
            applicant_email=application.email,
            applicant_name=application.full_name,
        )

        try:
            if application.user:
                Notification.objects.create(
                    user=application.user,
                    type='info',
                    title='Interview Cancelled',
                    message='Your interview has been cancelled. Please contact admissions to reschedule.',
                    application=application,
                )
        except Exception:
            pass

        try:
            send_html_email(
                subject=f"Your interview has been cancelled — {application.program_name}",
                template_name='interview_cancelled.html',
                context={
                    'full_name': application.full_name,
                    'program_name': application.program_name,
                    'frontend_url': settings.FRONTEND_URL,
                    'admissions_url': settings.ADMISSIONS_PORTAL_URL,
                },
                recipient_email=application.email,
            )
        except Exception:
            pass

        return Response({'status': 'cancelled'})

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_interview_details(self, request, pk=None):
        application = self.get_object()
        user = request.user
        is_admin = getattr(user, 'role', None) == 'admin'
        is_owner = (
            (application.user and hasattr(user, 'uid') and user.uid == application.user.uid)
            or (hasattr(user, 'email') and application.email and user.email.lower() == application.email.lower())
        )
        if not is_admin and not is_owner:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        slot = getattr(application, 'interview_slot', None)
        if not slot or not slot.gcal_event_id:
            return Response({'error': 'No scheduled interview found'}, status=status.HTTP_400_BAD_REQUEST)

        extra_guests = request.data.get('extra_guests')
        if extra_guests is not None:
            if not isinstance(extra_guests, list):
                return Response({'error': 'extra_guests must be a list of email strings'}, status=status.HTTP_400_BAD_REQUEST)

            from .gcal_service import update_interview_event_attendees, CalendarServiceError
            try:
                update_interview_event_attendees(slot.gcal_event_id, extra_guests, application)
            except CalendarServiceError:
                return Response({'error': 'Calendar unavailable, please try again'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            slot.extra_guests = extra_guests
            slot.save(update_fields=['extra_guests'])

            try:
                from zoneinfo import ZoneInfo
                eat = ZoneInfo('Africa/Nairobi')
                formatted_time = slot.chosen_time.astimezone(eat).strftime('%A, %d %B %Y at %I:%M %p EAT') if slot.chosen_time else ''
                send_html_email(
                    subject=f"Interview Update — {application.program_name}",
                    template_name='interview_attendees_updated.html',
                    context={
                        'full_name': application.full_name,
                        'program_name': application.program_name,
                        'extra_guests': extra_guests,
                        'meet_url': slot.meet_url or slot.zoom_link,
                        'chosen_time': formatted_time,
                        'frontend_url': settings.FRONTEND_URL,
                    },
                    recipient_email=application.email,
                )
            except Exception as exc:
                logger.error('interview_attendees_updated email failed for %s: %s', application.email, exc)

        return Response(InterviewSlotSerializer(slot).data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsAdminUser])
    def stats(self, request):
        total = Application.objects.count()
        pending = Application.objects.filter(status='pending').count()
        approved = Application.objects.filter(status='approved').count()
        rejected = Application.objects.filter(status='rejected').count()
        interview_scheduled = Application.objects.filter(status='interview_scheduled').count()
        interview_completed = Application.objects.filter(status='interview_completed').count()
        enrolled = Application.objects.filter(status='enrolled').count()

        return Response({
            'total': total,
            'pending': pending,
            'approved': approved,
            'rejected': rejected,
            'interview_scheduled': interview_scheduled,
            'interview_completed': interview_completed,
            'enrolled': enrolled,
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def notify_intake(self, request, pk=None):
        """Send a next-intake notification email to the applicant."""
        application = self.get_object()

        intake_id = request.data.get('intake_id')
        start_date = request.data.get('start_date', '').strip()
        deadline = request.data.get('deadline', '').strip()

        if intake_id:
            try:
                from programs.models import ProgramIntake
                intake = ProgramIntake.objects.get(id=intake_id)
                start_date = intake.start_date.strftime('%B %d, %Y')
                deadline = (
                    intake.application_deadline.strftime('%B %d, %Y')
                    if intake.application_deadline else ''
                )
            except ProgramIntake.DoesNotExist:
                return Response({'error': 'Intake not found'}, status=status.HTTP_400_BAD_REQUEST)

        if not start_date:
            return Response({'error': 'start_date is required'}, status=status.HTTP_400_BAD_REQUEST)

        first_name = (application.full_name or '').split()[0] or 'there'
        apply_url = f"{settings.FRONTEND_URL}/apply?program={application.program}"

        try:
            send_html_email(
                subject=f"New cohort open — {application.program_name} | Nexa Academy",
                template_name='intake_open_notification.html',
                context={
                    'name': first_name,
                    'program_name': application.program_name,
                    'start_date': start_date,
                    'deadline': deadline,
                    'apply_url': apply_url,
                    'frontend_url': settings.FRONTEND_URL,
                },
                recipient_email=application.email,
            )
        except Exception as exc:
            logger.error('notify_intake failed for %s: %s', application.email, exc)
            return Response({'error': 'Failed to send email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'sent': True})


class ApplicationAdminNoteViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationAdminNoteSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    http_method_names = ['get', 'post', 'head', 'options']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = ApplicationAdminNote.objects.select_related('application', 'created_by')
        application_id = self.request.query_params.get('application')
        if application_id:
            qs = qs.filter(application_id=application_id)
        return qs

    def perform_create(self, serializer):
        application = serializer.validated_data['application']
        html = _clean_admin_note_html(serializer.validated_data.get('html', ''))
        serializer.save(
            html=html,
            stage=serializer.validated_data.get('stage') or application.status,
            created_by=self.request.user,
            created_by_name=getattr(self.request.user, 'display_name', '') or self.request.user.email,
            created_by_email=self.request.user.email,
        )


class AdminFollowUpEmailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        to = (request.data.get('to') or '').strip()
        subject = (request.data.get('subject') or '').strip()
        message = (request.data.get('message') or '').strip()
        name = (request.data.get('name') or '').strip()

        if not to or not subject or not message:
            return Response(
                {'error': 'to, subject, and message are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            send_html_email(
                subject=subject,
                template_name='admin_follow_up.html',
                context={
                    'name': name,
                    'subject': subject,
                    'message': message,
                    'frontend_url': settings.FRONTEND_URL,
                    'header_label': 'Admissions',
                    'preview_text': subject,
                },
                recipient_email=to,
            )
            return Response({'sent': True})
        except Exception as e:
            logger.error('Failed to send follow-up email to %s: %s', to, e)
            return Response({'error': 'Failed to send email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DraftApplicationViewSet(viewsets.ViewSet):
    """Upsert a draft application by email. Called from the frontend when the user enters their email."""
    permission_classes = [AllowAny]

    def create(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'error': 'email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            step_reached = int(request.data.get('step_reached') or 1)
        except (TypeError, ValueError):
            step_reached = 1

        draft, _ = DraftApplication.objects.update_or_create(
            email=email,
            defaults={
                'full_name': (request.data.get('full_name') or '').strip()[:255],
                'program': (request.data.get('program') or '').strip()[:100],
                'step_reached': step_reached,
            },
        )
        return Response({'id': str(draft.id), 'email': draft.email}, status=status.HTTP_201_CREATED)


class InterviewBlackoutViewSet(viewsets.ModelViewSet):
    """Admin-only CRUD for blocked interview times/days."""
    permission_classes = [IsAdminUser]
    serializer_class = InterviewBlackoutSerializer

    def get_queryset(self):
        return InterviewBlackout.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        created_by = getattr(user, 'email', str(user))

        gcal_event_id = ''
        try:
            from .gcal_service import create_blackout_event, CalendarServiceError
            gcal_event_id = create_blackout_event(
                date=serializer.validated_data['date'],
                start_time=serializer.validated_data.get('start_time'),
                end_time=serializer.validated_data.get('end_time'),
                reason=serializer.validated_data.get('reason', ''),
            )
        except Exception as exc:
            logger.warning('Could not create GCal blackout event: %s', exc)

        # Clear slot caches so the block is reflected immediately
        from django.core.cache import cache as _cache
        _cache.clear()

        serializer.save(created_by=created_by, gcal_event_id=gcal_event_id)

    def perform_destroy(self, instance):
        if instance.gcal_event_id:
            try:
                from .gcal_service import delete_blackout_event, CalendarServiceError
                delete_blackout_event(instance.gcal_event_id)
            except Exception as exc:
                logger.warning('Could not delete GCal blackout event %s: %s', instance.gcal_event_id, exc)

        from django.core.cache import cache as _cache
        _cache.clear()

        instance.delete()


class CustomCalendarEventViewSet(viewsets.ModelViewSet):
    """Admin CRUD for custom calendar events (follow-ups, meetings, personal, etc.)."""
    permission_classes = [IsAdminUser]
    serializer_class = CustomCalendarEventSerializer

    def get_queryset(self):
        qs = CustomCalendarEvent.objects.all()
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def _sync_to_gcal(self, instance, created=False):
        try:
            from .gcal_service import create_custom_event, update_custom_event
            if created or not instance.gcal_event_id:
                result = create_custom_event(
                    title=instance.title,
                    date=instance.date,
                    category=instance.category,
                    description=instance.description,
                    all_day=instance.all_day,
                    start_time=instance.start_time,
                    end_time=instance.end_time,
                    with_meet=instance.with_meet,
                    attendees=instance.attendees or [],
                )
                instance.gcal_event_id = result['event_id']
                instance.meet_url = result['meet_url']
                instance.save(update_fields=['gcal_event_id', 'meet_url'])
            else:
                update_custom_event(
                    gcal_event_id=instance.gcal_event_id,
                    title=instance.title,
                    date=instance.date,
                    category=instance.category,
                    description=instance.description,
                    all_day=instance.all_day,
                    start_time=instance.start_time,
                    end_time=instance.end_time,
                    attendees=instance.attendees or [],
                )
        except Exception as exc:
            logger.warning('CustomCalendarEvent GCal sync failed: %s', exc)

    def perform_create(self, serializer):
        instance = serializer.save(
            created_by=getattr(self.request.user, 'email', str(self.request.user))
        )
        self._sync_to_gcal(instance, created=True)
        cache.delete_pattern('gcal_events:*') if hasattr(cache, 'delete_pattern') else cache.clear()

    def perform_update(self, serializer):
        instance = serializer.save()
        self._sync_to_gcal(instance, created=False)
        cache.delete_pattern('gcal_events:*') if hasattr(cache, 'delete_pattern') else cache.clear()

    def perform_destroy(self, instance):
        if instance.gcal_event_id:
            try:
                from .gcal_service import delete_custom_event
                delete_custom_event(instance.gcal_event_id)
            except Exception as exc:
                logger.warning('CustomCalendarEvent GCal delete failed: %s', exc)
        cache.clear()
        instance.delete()
