import json
import logging
from decimal import Decimal
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Sum, Count, Exists, OuterRef
from django.shortcuts import get_object_or_404
from .models import Program, Enrollment, StudentProgramEnrolled, ProgramProgress, Certificate, ProgramInterest, ProgramIntake, HelpMeLead, IncompleteApplication, LeadAdminNote, PaymentPlanChangeRequest, LEAD_STATUS_CHOICES
from .serializers import (
    ProgramSerializer, EnrollmentSerializer, StudentProgramEnrolledSerializer,
    ProgramProgressSerializer, CertificateSerializer, SimpleProgramProgressSerializer,
    EnrollStudentSerializer, ProgramInterestSerializer, ProgramIntakeSerializer,
    HelpMeLeadSerializer, IncompleteApplicationSerializer, LeadAdminNoteSerializer, PaymentPlanChangeRequestSerializer,
    calculate_fee_structure, normalize_payment_plan,
)
from accounts.permissions import IsAdminUser, HasAppPermission, IsSuperAdmin
from accounts.utils import create_audit_log
from django.conf import settings
from ubuntu_labs.email_utils import send_html_email
from ubuntu_labs.html_utils import clean_admin_note_html as _clean_admin_note_html
from accounts.models import User
from applications.models import Application, ApplicationLog
from notifications.models import Notification

logger = logging.getLogger(__name__)


def _admissions_notification_email():
    return getattr(settings, 'ADMISSIONS_NOTIFICATION_EMAIL', 'admissions@nexaacademy.co.ke')


def _admissions_portal_url(path=''):
    base = getattr(settings, 'ADMISSIONS_PORTAL_URL', '') or getattr(settings, 'FRONTEND_URL', '')
    base = base.rstrip('/')
    return f"{base}{path}" if base else path


def _admin_email_recipients():
    emails = list(User.objects.filter(role='admin').exclude(email='').values_list('email', flat=True))
    fallback = _admissions_notification_email()
    if fallback:
        emails.append(fallback)
    return list(dict.fromkeys(email for email in emails if email))


def _money(value):
    return f"KSh {Decimal(str(value or 0)):,.2f}"


LEAD_STATUS_VALUES = {value for value, _ in LEAD_STATUS_CHOICES}


def _set_lead_status(lead, lead_status):
    if lead_status not in LEAD_STATUS_VALUES:
        raise ValueError('Invalid lead_status')
    lead.lead_status = lead_status
    lead.follow_up_completed = lead_status == 'completed'
    lead.follow_up_completed_at = timezone.now() if lead.follow_up_completed else None


def _filter_lead_status(qs, request):
    lead_status = request.query_params.get('lead_status')
    if lead_status:
        if lead_status not in LEAD_STATUS_VALUES:
            return qs.none()
        return qs.filter(lead_status=lead_status)
    return qs



class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'slug']
    search_fields = ['name']
    ordering_fields = ['created_at', 'name', 'price']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        if self.action == 'destroy':
            return [IsSuperAdmin()]
        return [HasAppPermission('programs.manage')()]

    def retrieve(self, request, *args, **kwargs):
        program = self.get_object()
        serializer = self.get_serializer(program)
        data = serializer.data
        
        # Add enrollment count
        data['enrollment_count'] = Enrollment.objects.filter(program=program).count()
        
        return Response(data)


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.select_related('student', 'program')
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'program']
    search_fields = ['student_name', 'student__email', 'student__display_name']
    ordering_fields = ['enrollment_date', 'start_date', 'student_name', 'amount']
    ordering = ['-enrollment_date']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Enrollment.objects.select_related('student', 'program').all()
        return Enrollment.objects.select_related('student', 'program').filter(student=user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        stats = queryset.aggregate(
            total=Count('enrollment_id'),
            active=Count('enrollment_id', filter=Q(status='active')),
            completed=Count('enrollment_id', filter=Q(status='completed')),
            withdrawn=Count('enrollment_id', filter=Q(status='withdrawn')),
            total_revenue=Sum('amount_paid'),
            total_outstanding=Sum('balance'),
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['stats'] = {
                'total': stats['total'] or 0,
                'active': stats['active'] or 0,
                'completed': stats['completed'] or 0,
                'withdrawn': stats['withdrawn'] or 0,
                'total_revenue': float(stats['total_revenue'] or 0),
                'total_outstanding': float(stats['total_outstanding'] or 0),
            }
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[HasAppPermission('transactions.manage')])
    def apply_waiver(self, request, pk=None):
        """Grant a manually-agreed fee waiver (percentage or fixed amount) on an enrollment."""
        enrollment = self.get_object()
        discount_type = (request.data.get('discount_type') or '').strip()
        reason = (request.data.get('reason') or '').strip()

        if discount_type not in ('percentage', 'amount'):
            return Response({'error': 'discount_type must be "percentage" or "amount"'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            value = Decimal(str(request.data.get('discount_value')))
        except (TypeError, ValueError, ArithmeticError):
            return Response({'error': 'Enter a valid discount_value'}, status=status.HTTP_400_BAD_REQUEST)
        if value <= 0:
            return Response({'error': 'discount_value must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)
        if discount_type == 'percentage' and value > 100:
            return Response({'error': 'A percentage waiver cannot exceed 100%'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            enrollment.discount_type = discount_type
            enrollment.discount_value = value
            enrollment.discount_reason = reason
            enrollment.discount_granted_by = request.user.email
            enrollment.discount_granted_at = timezone.now()
            enrollment.save()  # recomputes discount_amount + balance

            from payments.views import _recalculate_student_totals
            if enrollment.student:
                _recalculate_student_totals(enrollment.student)
                try:
                    Notification.objects.create(
                        user=enrollment.student,
                        type='payment',
                        title='Fee Waiver Applied',
                        message=f"A fee waiver of KSh {enrollment.discount_amount:,.2f} was applied to your {enrollment.program_name} fees. New balance: KSh {enrollment.balance:,.2f}.",
                        link='/student/dashboard',
                    )
                except Exception:
                    logger.exception('Failed to notify student about waiver on enrollment %s', enrollment.enrollment_id)

        return Response(self.get_serializer(enrollment).data)

    @action(detail=True, methods=['post'], permission_classes=[HasAppPermission('transactions.manage')])
    def remove_waiver(self, request, pk=None):
        """Remove any fee waiver from an enrollment and restore the full balance."""
        enrollment = self.get_object()
        with transaction.atomic():
            enrollment.discount_type = ''
            enrollment.discount_value = None
            enrollment.discount_reason = ''
            enrollment.discount_granted_by = ''
            enrollment.discount_granted_at = None
            enrollment.save()  # discount_amount resets to 0, balance restored

            from payments.views import _recalculate_student_totals
            if enrollment.student:
                _recalculate_student_totals(enrollment.student)

        return Response(self.get_serializer(enrollment).data)

    @action(detail=False, methods=['post'], permission_classes=[HasAppPermission('students.manage')])
    def manual_enroll(self, request):
        """
        Manually add a student to the pipeline.

        Creates a user account (if none exists), an Application at
        interview_completed status, and initialises a Paystack deposit payment.
        Returns Paystack credentials so the admin can pay inline; if they skip
        the student stays at interview_completed and can pay the deposit from
        their own dashboard.  A password-setup email is sent in both cases.
        """
        import uuid as _uuid
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from urllib.parse import urlencode
        from django.utils.dateparse import parse_date
        from payments.models import Payment
        from payments.paystack import PaystackProvider

        student_id = request.data.get('student_id')
        student_name = request.data.get('student_name', '').strip()
        student_email = request.data.get('student_email', '').strip().lower()
        phone = request.data.get('phone', '').strip()
        program_id = request.data.get('program_id')
        payment_plan_raw = request.data.get('payment_plan', '').strip()
        start_date_raw = request.data.get('start_date', '').strip()

        if not program_id:
            return Response({'error': 'program_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        if not student_id and not (student_name and student_email):
            return Response(
                {'error': 'Provide either student_id or both student_name and student_email'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not student_id and not phone:
            return Response({'error': 'phone is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            program = Program.objects.get(program_id=program_id)
        except Program.DoesNotExist:
            return Response({'error': 'Program not found'}, status=status.HTTP_404_NOT_FOUND)

        if program.price is None:
            return Response(
                {'error': 'This program has no price set. Please update the program before enrolling.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_plan = ''
        if payment_plan_raw:
            normalized_plan = normalize_payment_plan(payment_plan_raw) or ''
            if not normalized_plan:
                return Response(
                    {'error': 'Invalid payment plan. Use One-time Payment, 2 Installments, or 3 Installments.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        start_date = parse_date(start_date_raw) if start_date_raw else None

        # 1. Resolve or create student account
        is_new_account = False
        if student_id:
            try:
                student = User.objects.get(uid=student_id)
            except User.DoesNotExist:
                return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            student = User.objects.filter(email__iexact=student_email).first()
            if student is None:
                student = User.objects.create_user(
                    email=student_email,
                    display_name=student_name,
                    password=None,
                    role='student',
                )
                is_new_account = True

        # 2. Create (or reuse) application at interview_completed
        existing_app = Application.objects.filter(
            Q(user=student) | Q(email__iexact=student.email),
            program_name__iexact=program.name,
            status__in=['interview_completed', 'enrolled'],
        ).first()
        effective_plan = normalized_plan or (existing_app.payment_plan if existing_app else '')
        fee_amount, installment_amount = calculate_fee_structure(program.price, effective_plan)

        with transaction.atomic():
            if existing_app is None:
                application = Application.objects.create(
                    user=student,
                    full_name=student.display_name,
                    email=student.email,
                    phone=phone or getattr(student, 'phone', '') or '',
                    program=program.slug,
                    program_name=program.name,
                    estimated_fees=fee_amount,
                    payment_plan=normalized_plan,
                    start_date=start_date,
                    status='interview_completed',
                    status_updated_at=timezone.now(),
                    source='admin_manual',
                )
                ApplicationLog.objects.create(
                    application=application,
                    previous_status='',
                    new_status='interview_completed',
                    changed_by=str(request.user.uid),
                    notes='Manually added by admin via enrollment form',
                    applicant_email=student.email,
                    applicant_name=student.display_name,
                )
            else:
                application = existing_app
                update_fields = []
                if application.estimated_fees != fee_amount:
                    application.estimated_fees = fee_amount
                    update_fields.append('estimated_fees')
                if normalized_plan and application.payment_plan != normalized_plan:
                    application.payment_plan = normalized_plan
                    update_fields.append('payment_plan')
                if start_date and not application.start_date:
                    application.start_date = start_date
                    update_fields.append('start_date')
                if update_fields:
                    application.save(update_fields=update_fields)

            enrollment, _ = Enrollment.objects.get_or_create(
                student=student,
                program=program,
                defaults={
                    'student_name': student.display_name,
                    'program_name': program.name,
                    'amount': fee_amount,
                    'amount_paid': Decimal('0.00'),
                    'balance': fee_amount,
                    'status': 'active',
                    'payment_plan': normalized_plan,
                    'installment_amount': installment_amount,
                }
            )
            effective_plan = normalized_plan or enrollment.payment_plan or application.payment_plan or ''
            fee_amount, installment_amount = calculate_fee_structure(program.price, effective_plan)
            enrollment_update_fields = []
            application_update_fields = []
            if effective_plan and application.payment_plan != effective_plan:
                application.payment_plan = effective_plan
                application_update_fields.append('payment_plan')
            if application.estimated_fees != fee_amount:
                application.estimated_fees = fee_amount
                application_update_fields.append('estimated_fees')
            if application_update_fields:
                application.save(update_fields=list(dict.fromkeys(application_update_fields)))
            if enrollment.amount != fee_amount:
                enrollment.amount = fee_amount
                enrollment.balance = Decimal(enrollment.amount or 0) - Decimal(enrollment.amount_paid or 0)
                enrollment_update_fields.extend(['amount', 'balance'])
            if enrollment.program_name != program.name:
                enrollment.program_name = program.name
                enrollment_update_fields.append('program_name')
            if effective_plan and enrollment.payment_plan != effective_plan:
                enrollment.payment_plan = effective_plan
                enrollment_update_fields.append('payment_plan')
            if enrollment.installment_amount != installment_amount:
                enrollment.installment_amount = installment_amount
                enrollment_update_fields.append('installment_amount')
            if start_date and not enrollment.start_date:
                enrollment.start_date = start_date
                enrollment_update_fields.append('start_date')
            if enrollment_update_fields:
                enrollment.save(update_fields=list(dict.fromkeys(enrollment_update_fields)))

        # 3. Optionally initialise Paystack deposit transaction
        # deposit_amount is optional — if omitted the student stays at
        # interview_completed until a deposit is paid from their dashboard.
        raw_deposit = request.data.get('deposit_amount')
        skip_payment = raw_deposit is None or str(raw_deposit).strip() == '' or str(raw_deposit).strip() == '0'
        if not skip_payment:
            try:
                DEPOSIT_AMOUNT = Decimal(str(raw_deposit))
                if DEPOSIT_AMOUNT <= 0:
                    raise ValueError
            except (ValueError, Exception):
                return Response({'error': 'deposit_amount must be a positive number'}, status=status.HTTP_400_BAD_REQUEST)
        # Save phone to User model if provided and not already set
        if phone and not getattr(student, 'phone', ''):
            student.phone = phone
            student.save(update_fields=['phone'])

        if skip_payment:
            try:
                admissions_url = getattr(settings, 'ADMISSIONS_PORTAL_URL', 'https://admissions.nexaacademy.co.ke')
                token = PasswordResetTokenGenerator().make_token(student)
                qs = urlencode({'uid': str(student.uid), 'token': token, 'name': student.display_name})
                setup_url = f"{admissions_url}/accept-invite?{qs}"
                send_html_email(
                    subject=f"You've been added to {program.name} — Nexa Academy",
                    template_name='enrolled_account_setup.html',
                    context={
                        'display_name': student.display_name,
                        'program_name': program.name,
                        'payment_plan': effective_plan,
                        'total_fee': f"{float(fee_amount):,.0f}",
                        'setup_url': setup_url,
                    },
                    recipient_email=student.email,
                )
            except Exception:
                logger.exception('Failed to send setup email to %s', student.email)
            return Response({
                'student_uid': str(student.uid),
                'student_email': student.email,
                'application_id': str(application.id),
                'enrollment_id': str(enrollment.enrollment_id),
                'is_new_account': is_new_account,
            }, status=status.HTTP_201_CREATED)
        reference = f"NEXA-{_uuid.uuid4().hex[:10].upper()}"
        admissions_base = getattr(settings, 'ADMISSIONS_PORTAL_URL', settings.FRONTEND_URL).rstrip('/')

        payment_init_data: dict = {}
        try:
            paystack = PaystackProvider()
            ps_response = paystack.initialize_transaction(
                email=student.email,
                amount=DEPOSIT_AMOUNT,
                reference=reference,
                callback_url=f"{admissions_base}/admin/enrolled",
                metadata={
                    'admin_initiated': True,
                    'admin_uid': str(request.user.uid),
                    'program_id': str(program_id),
                    'payment_type': 'deposit',
                },
            )
            if ps_response.get('status'):
                ps_data = ps_response.get('data') or {}
                payment_record = Payment.objects.create(
                    student=student,
                    student_name=student.display_name,
                    student_email=student.email,
                    amount=DEPOSIT_AMOUNT,
                    payment_method='Card',
                    payment_reference=reference,
                    status='pending',
                    description=f'Deposit for {program.name}',
                    program=program,
                    program_name=program.name,
                )
                payment_init_data = {
                    'payment_id': str(payment_record.payment_id),
                    'reference': reference,
                    'access_code': ps_data.get('access_code', ''),
                    'authorization_url': ps_data.get('authorization_url', ''),
                    'public_key': getattr(settings, 'PAYSTACK_PUBLIC_KEY', ''),
                    'student_email': student.email,
                    'amount': str(DEPOSIT_AMOUNT),
                }
            else:
                logger.warning('Paystack init failed during manual_enroll for %s: %s', student.email, ps_response)
        except Exception:
            logger.exception('Paystack init exception during manual_enroll for %s', student.email)

        # 4. Send password-setup email (always, both new and existing accounts)
        try:
            admissions_url = getattr(settings, 'ADMISSIONS_PORTAL_URL', 'https://admissions.nexaacademy.co.ke')
            token = PasswordResetTokenGenerator().make_token(student)
            qs = urlencode({'uid': str(student.uid), 'token': token, 'name': student.display_name})
            setup_url = f"{admissions_url}/accept-invite?{qs}"
            send_html_email(
                subject=f"You've been added to {program.name} — Nexa Academy",
                template_name='enrolled_account_setup.html',
                context={
                    'display_name': student.display_name,
                    'program_name': program.name,
                    'payment_plan': effective_plan,
                    'total_fee': f"{float(fee_amount):,.0f}",
                    'setup_url': setup_url,
                },
                recipient_email=student.email,
            )
        except Exception:
            logger.exception('Failed to send setup email to %s', student.email)

        return Response({
            'student_uid': str(student.uid),
            'student_email': student.email,
            'application_id': str(application.id),
            'enrollment_id': str(enrollment.enrollment_id),
            'is_new_account': is_new_account,
            **payment_init_data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request):

        """Enroll current student in a program"""
        serializer = EnrollStudentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        program_id = serializer.validated_data['program_id']
        
        try:
            program = Program.objects.get(program_id=program_id, status='active')
        except Program.DoesNotExist:
            return Response(
                {'error': 'Program not found or not active'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if already enrolled
        if Enrollment.objects.filter(student=request.user, program=program).exists():
            return Response(
                {'error': 'Already enrolled in this program'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Create enrollment
            enrollment = Enrollment.objects.create(
                student=request.user,
                program=program,
                student_name=request.user.display_name,
                program_name=program.name,
                start_date=serializer.validated_data.get('start_date'),
                end_date=serializer.validated_data.get('end_date'),
                amount=serializer.validated_data['amount'],
                amount_paid=0,
                balance=serializer.validated_data['amount']
            )

            # Update student_programs_enrolled
            StudentProgramEnrolled.objects.create(
                student=request.user,
                program=program,
                program_name=program.name,
                enrollment_date=enrollment.enrollment_date,
                start_date=enrollment.start_date,
                end_date=enrollment.end_date,
                status='active'
            )

            # Initialize program progress
            ProgramProgress.objects.create(
                student=request.user,
                program=program,
                program_name=program.name,
                enrollment_date=enrollment.enrollment_date,
                start_date=enrollment.start_date,
                end_date=enrollment.end_date,
                lessons_total=0
            )

        return Response(
            EnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], permission_classes=[HasAppPermission('students.manage')])
    def backfill_enrolled_status(self, request):
        """
        Promote interview_completed applications to enrolled for any student
        whose total completed payments reach KSh 10,000. Useful for students
        who paid a deposit but whose application status was not updated.
        """
        from django.db.models import Q, Sum
        from django.db.models.functions import Coalesce
        from applications.models import Application, ApplicationLog
        from payments.models import Payment

        THRESHOLD = Decimal('10000')
        promoted = []
        errors = []

        for enrollment in Enrollment.objects.select_related('student', 'program').iterator():
            student = enrollment.student
            program = enrollment.program
            if student is None or program is None:
                continue

            total_paid = Payment.objects.filter(
                student=student, status='completed',
            ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']

            if total_paid < THRESHOLD:
                continue

            apps_qs = Application.objects.filter(
                Q(user=student) | Q(email__iexact=student.email),
                status='interview_completed',
                program_name__iexact=program.name,
            )

            for app in apps_qs:
                try:
                    with transaction.atomic():
                        app.status = 'enrolled'
                        app.status_updated_at = timezone.now()
                        app.save(update_fields=['status', 'status_updated_at'])
                        ApplicationLog.objects.create(
                            application=app,
                            previous_status='interview_completed',
                            new_status='enrolled',
                            changed_by=str(request.user.uid),
                            notes='Backfill: deposit threshold met; status corrected by admin',
                            applicant_email=app.email,
                            applicant_name=app.full_name,
                        )
                    promoted.append({'application_id': str(app.id), 'student': app.email})
                except Exception as e:
                    errors.append({'application_id': str(app.id), 'error': str(e)})
                    logger.error('backfill_enrolled_status failed for app %s: %s', app.id, e, exc_info=True)

        return Response({'promoted': len(promoted), 'fixed': promoted, 'errors': errors})


class PaymentPlanChangeRequestViewSet(viewsets.ModelViewSet):
    queryset = PaymentPlanChangeRequest.objects.select_related('student', 'enrollment', 'enrollment__program')
    serializer_class = PaymentPlanChangeRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'enrollment']
    search_fields = ['student__display_name', 'student__email', 'enrollment__program_name', 'requested_payment_plan']
    ordering_fields = ['created_at', 'reviewed_at']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy', 'approve', 'reject'):
            return [HasAppPermission('transactions.manage')()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if getattr(user, 'role', None) == 'admin':
            return qs
        return qs.filter(student=user)

    def _email_context(self, change_request, **extra):
        enrollment = change_request.enrollment
        student = change_request.student
        context = {
            'student_name': student.display_name or student.email,
            'student_email': student.email,
            'program_name': enrollment.program_name,
            'current_payment_plan': change_request.current_payment_plan or 'Standard plan',
            'current_installment_amount': _money(change_request.current_installment_amount) if change_request.current_installment_amount else '',
            'requested_payment_plan': change_request.requested_payment_plan,
            'requested_installment_amount': _money(change_request.requested_installment_amount),
            'approved_payment_plan': change_request.approved_payment_plan,
            'approved_installment_amount': _money(change_request.approved_installment_amount) if change_request.approved_installment_amount else '',
            'admin_notes': change_request.admin_notes,
            'reason': change_request.reason,
            'status': change_request.status,
            'request_url': _admissions_portal_url('/admin/payment-plans'),
            'student_dashboard_url': _admissions_portal_url('/student/payments'),
            'frontend_url': getattr(settings, 'FRONTEND_URL', ''),
            'admissions_url': getattr(settings, 'ADMISSIONS_PORTAL_URL', ''),
        }
        context.update(extra)
        return context

    def _send_request_emails(self, change_request):
        student_context = self._email_context(
            change_request,
            header_label='Payment Plan',
            preview_text=f"Your {change_request.requested_payment_plan} request was sent to admissions.",
        )
        send_html_email(
            subject='Payment plan request received - Nexa Academy',
            template_name='payment_plan_request_received.html',
            context=student_context,
            recipient_email=change_request.student.email,
        )

        admin_context = self._email_context(
            change_request,
            header_label='Payment Plan Request',
            preview_text=f"{change_request.student.display_name or change_request.student.email} requested {change_request.requested_payment_plan}.",
        )
        for email in _admin_email_recipients():
            send_html_email(
                subject=f"Payment plan request - {change_request.student.display_name or change_request.student.email}",
                template_name='manager_payment_plan_request.html',
                context=admin_context,
                recipient_email=email,
            )

    def _send_decision_emails(self, change_request):
        approved = change_request.status == 'approved'
        decision = 'approved' if approved else 'rejected'
        student_context = self._email_context(
            change_request,
            decision=decision,
            header_label='Payment Plan',
            preview_text=f"Your payment plan request was {decision}.",
        )
        send_html_email(
            subject=f"Payment plan request {decision} - Nexa Academy",
            template_name='payment_plan_request_decision.html',
            context=student_context,
            recipient_email=change_request.student.email,
        )

        admin_context = self._email_context(
            change_request,
            decision=decision,
            header_label='Payment Plan Decision',
            preview_text=f"Payment plan request {decision} for {change_request.student.display_name or change_request.student.email}.",
        )
        for email in _admin_email_recipients():
            send_html_email(
                subject=f"Payment plan request {decision} - {change_request.student.display_name or change_request.student.email}",
                template_name='manager_payment_plan_decision.html',
                context=admin_context,
                recipient_email=email,
            )

    def perform_create(self, serializer):
        change_request = serializer.save()
        try:
            admins = User.objects.filter(role='admin')
            for admin in admins:
                Notification.objects.create(
                    user=admin,
                    type='payment',
                    title='Payment Plan Change Requested',
                    message=f"{change_request.student.display_name} requested {change_request.requested_payment_plan} payments of KSh {change_request.requested_installment_amount:,.2f}.",
                    link='/admin/payment-plans',
                )
        except Exception:
            logger.exception('Failed to notify admins about payment plan change request %s', change_request.request_id)
        try:
            self._send_request_emails(change_request)
        except Exception:
            logger.exception('Failed to send payment plan request emails %s', change_request.request_id)

    def _sync_application_payment_plan(self, enrollment, payment_plan):
        Application.objects.filter(
            user=enrollment.student,
            program_name__iexact=enrollment.program_name,
        ).update(payment_plan=payment_plan)

    @action(detail=True, methods=['post'], permission_classes=[HasAppPermission('transactions.manage')])
    def approve(self, request, pk=None):
        change_request = self.get_object()
        if change_request.status != 'pending':
            return Response({'error': 'Only pending requests can be approved'}, status=status.HTTP_400_BAD_REQUEST)

        approved_plan_raw = request.data.get('payment_plan') or change_request.requested_payment_plan
        approved_plan = normalize_payment_plan(approved_plan_raw)
        approved_amount = request.data.get('installment_amount') or change_request.requested_installment_amount
        admin_notes = request.data.get('admin_notes', '').strip()

        if not approved_plan:
            return Response({'error': 'Choose One-time Payment, 2 Installments, or 3 Installments'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            approved_amount = Decimal(str(approved_amount))
        except Exception:
            return Response({'error': 'Enter a valid installment_amount'}, status=status.HTTP_400_BAD_REQUEST)
        if approved_amount <= 0:
            return Response({'error': 'installment_amount must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            enrollment = change_request.enrollment
            enrollment.payment_plan = approved_plan
            enrollment.installment_amount = approved_amount
            enrollment.save(update_fields=['payment_plan', 'installment_amount'])

            change_request.status = 'approved'
            change_request.admin_notes = admin_notes
            change_request.approved_payment_plan = approved_plan
            change_request.approved_installment_amount = approved_amount
            change_request.reviewed_by = request.user.email
            change_request.reviewed_at = timezone.now()
            change_request.save()

            self._sync_application_payment_plan(enrollment, approved_plan)

            Notification.objects.create(
                user=change_request.student,
                type='payment',
                title='Payment Plan Approved',
                message=f"Your payment plan was updated to {approved_plan}. Recommended installment: KSh {approved_amount:,.2f}.",
                link='/student/dashboard',
            )

        try:
            self._send_decision_emails(change_request)
        except Exception:
            logger.exception('Failed to send approved payment plan request emails %s', change_request.request_id)

        return Response(self.get_serializer(change_request).data)

    @action(detail=True, methods=['post'], permission_classes=[HasAppPermission('transactions.manage')])
    def reject(self, request, pk=None):
        change_request = self.get_object()
        if change_request.status != 'pending':
            return Response({'error': 'Only pending requests can be rejected'}, status=status.HTTP_400_BAD_REQUEST)

        admin_notes = request.data.get('admin_notes', '').strip()
        change_request.status = 'rejected'
        change_request.admin_notes = admin_notes
        change_request.reviewed_by = request.user.email
        change_request.reviewed_at = timezone.now()
        change_request.save()

        try:
            Notification.objects.create(
                user=change_request.student,
                type='payment',
                title='Payment Plan Request Rejected',
                message=admin_notes or 'Your payment plan change request was not approved. Contact admissions for more details.',
                link='/student/dashboard',
            )
        except Exception:
            logger.exception('Failed to notify student about rejected payment plan request %s', change_request.request_id)

        try:
            self._send_decision_emails(change_request)
        except Exception:
            logger.exception('Failed to send rejected payment plan request emails %s', change_request.request_id)

        return Response(self.get_serializer(change_request).data)


class LeadAdminNoteViewSet(viewsets.ModelViewSet):
    serializer_class = LeadAdminNoteSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [HasAppPermission('leads.view')()]
        return [HasAppPermission('leads.manage')()]
    http_method_names = ['get', 'post', 'head', 'options']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = LeadAdminNote.objects.select_related('created_by')
        lead_type = self.request.query_params.get('lead_type')
        lead_id = self.request.query_params.get('lead_id')
        if lead_type:
            qs = qs.filter(lead_type=lead_type)
        if lead_id:
            qs = qs.filter(lead_id=lead_id)
        return qs

    def perform_create(self, serializer):
        html = _clean_admin_note_html(serializer.validated_data.get('html', ''))
        serializer.save(
            html=html,
            created_by=self.request.user,
            created_by_name=getattr(self.request.user, 'display_name', '') or self.request.user.email,
            created_by_email=self.request.user.email,
        )


class ProgramProgressViewSet(viewsets.ModelViewSet):
    queryset = ProgramProgress.objects.all()
    serializer_class = ProgramProgressSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'program']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return ProgramProgress.objects.all()
        return ProgramProgress.objects.filter(student=user)

    @action(detail=True, methods=['post'])
    def update_lesson(self, request, pk=None):
        """Update lesson completion"""
        progress = self.get_object()
        lesson_data = request.data
        
        # Update lessons completed
        progress.lessons_completed += 1
        progress.completion_percentage = int(
            (progress.lessons_completed / progress.lessons_total) * 100
        ) if progress.lessons_total > 0 else 0
        progress.last_accessed_at = timezone.now()
        
        # Update modules data
        if 'module_id' in lesson_data:
            if 'modules' not in progress.modules:
                progress.modules = {}
            module_id = str(lesson_data['module_id'])
            if module_id not in progress.modules:
                progress.modules[module_id] = {
                    'completed_lessons': [],
                    'completion_percentage': 0
                }
            if lesson_data.get('lesson_id'):
                if lesson_data['lesson_id'] not in progress.modules[module_id]['completed_lessons']:
                    progress.modules[module_id]['completed_lessons'].append(lesson_data['lesson_id'])
        
        progress.save()

        # Check if program completed
        if progress.completion_percentage >= 100 and not progress.certificate_earned:
            # Auto-generate certificate logic could go here
            pass

        return Response(SimpleProgramProgressSerializer(progress).data)

    @action(detail=True, methods=['post'])
    def update_quiz_score(self, request, pk=None):
        """Update quiz score"""
        progress = self.get_object()
        quiz_data = request.data
        
        # Add to quizzes list
        if 'quizzes' not in progress.quizzes:
            progress.quizzes = []
        
        progress.quizzes.append({
            'quiz_id': str(quiz_data.get('quiz_id')),
            'name': quiz_data.get('name'),
            'score': quiz_data.get('score'),
            'max_score': quiz_data.get('max_score', 100),
            'passed': quiz_data.get('passed', False),
            'completed_at': timezone.now().isoformat()
        })
        
        if quiz_data.get('passed'):
            progress.tests_passed += 1
        
        progress.save()
        return Response(SimpleProgramProgressSerializer(progress).data)


class CertificateViewSet(viewsets.ModelViewSet):
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'program']
    search_fields = ['certificate_number', 'student_name']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Certificate.objects.all()
        return Certificate.objects.filter(student=user)

    @action(detail=False, methods=['get'])
    def verify(self, request):
        """Verify a certificate by code"""
        code = request.query_params.get('code')
        if not code:
            return Response(
                {'error': 'Verification code required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            certificate = Certificate.objects.get(verification_code=code)
            serializer = self.get_serializer(certificate)
            return Response({
                'valid': True,
                'certificate': serializer.data
            })
        except Certificate.DoesNotExist:
            return Response({
                'valid': False,
                'message': 'Certificate not found'
            })

    @action(detail=True, methods=['post'], permission_classes=[HasAppPermission('students.manage')])
    def generate_for_student(self, request, pk=None):
        """Generate certificate for a student (admin only)"""
        try:
            progress = ProgramProgress.objects.get(id=pk)
        except ProgramProgress.DoesNotExist:
            return Response(
                {'error': 'Program progress not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if progress.certificate_earned:
            return Response(
                {'error': 'Certificate already earned'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if progress.completion_percentage < 100:
            return Response(
                {'error': 'Program not completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            certificate = Certificate.objects.create(
                student=progress.student,
                program=progress.program,
                student_name=progress.student.display_name,
                program_name=progress.program_name,
                completion_percentage=progress.completion_percentage,
                grade=request.data.get('grade', 'A'),
                instructor=request.data.get('instructor', '')
            )

            progress.certificate_earned = True
            progress.certificate_earned_at = timezone.now()
            progress.certificate_url = certificate.certificate_url
            progress.save()

        return Response(CertificateSerializer(certificate).data)


class ProgramIntakeViewSet(viewsets.ModelViewSet):
    """
    Public GET — list open intakes for a program (filter by ?program=<uuid>).
    Admin POST/PATCH/DELETE — manage intakes.
    """
    serializer_class = ProgramIntakeSerializer

    def get_queryset(self):
        qs = ProgramIntake.objects.select_related('program').all()
        program_id = self.request.query_params.get('program')
        if program_id:
            qs = qs.filter(program_id=program_id)
        program_slug = self.request.query_params.get('program_slug')
        if program_slug:
            qs = qs.filter(program__slug=program_slug)
        program_name = self.request.query_params.get('program_name')
        if program_name:
            qs = qs.filter(program__name__iexact=program_name)
        user = self.request.user
        is_admin = user.is_authenticated and getattr(user, 'role', None) == 'admin'
        if not is_admin:
            qs = qs.filter(status='open')
        return qs.order_by('start_date')

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        if self.action == 'destroy':
            return [IsSuperAdmin()]
        return [HasAppPermission('programs.manage')()]

    def perform_create(self, serializer):
        serializer.save(source='site')


class CMSIntakeSyncView(APIView):
    """
    POST /api/cms/intakes/sync/
    Unauthenticated — validated by X-CMS-Token header.

    Accepts a normalized payload that any CMS can map to:
    {
        "cms_id": "entry-xyz",
        "program_name": "Software Engineering",
        "start_date": "2026-09-01",
        "end_date": "2027-03-01",
        "application_deadline": "2026-08-25",
        "max_seats": 20,
        "seats_remaining": 20,
        "status": "open",
        "notes": "",
        "action": "publish"   // publish | unpublish | delete
    }

    Returns 200 for valid token (even if no action taken).
    Returns 401 for invalid/missing token.
    Returns 400 for bad payload.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        expected_token = getattr(settings, 'CMS_WEBHOOK_TOKEN', '')
        if expected_token:
            token = request.headers.get('X-CMS-Token', '')
            if token != expected_token:
                return Response({'error': 'Unauthorised'}, status=401)

        try:
            data = request.data
        except Exception:
            return Response({'error': 'Invalid JSON'}, status=400)

        cms_id = (data.get('cms_id') or '').strip()
        action = (data.get('action') or 'publish').strip()
        program_name = (data.get('program_name') or '').strip()
        start_date = data.get('start_date')

        if not cms_id:
            return Response({'error': 'cms_id is required'}, status=400)
        if not start_date:
            return Response({'error': 'start_date is required'}, status=400)

        # Resolve program
        program = None
        if program_name:
            program = Program.objects.filter(name__iexact=program_name).first()
            if not program:
                program = Program.objects.filter(name__icontains=program_name).first()
        if not program:
            return Response({'error': f'Program not found: {program_name}'}, status=400)

        if action == 'delete':
            deleted, _ = ProgramIntake.objects.filter(cms_id=cms_id).delete()
            logger.info('CMS webhook: deleted %d intake(s) for cms_id=%s', deleted, cms_id)
            return Response({'status': 'deleted', 'count': deleted})

        status_map = {'publish': 'open', 'unpublish': 'closed'}
        intake_status = status_map.get(action, data.get('status', 'open'))

        defaults = {
            'program': program,
            'start_date': start_date,
            'end_date': data.get('end_date') or None,
            'application_deadline': data.get('application_deadline') or None,
            'max_seats': data.get('max_seats') or None,
            'seats_remaining': data.get('seats_remaining') or None,
            'status': intake_status,
            'mode': data.get('mode', 'full_time_hybrid'),
            'notes': data.get('notes', ''),
            'source': 'cms',
            'last_synced_at': timezone.now(),
        }

        intake, created = ProgramIntake.objects.update_or_create(
            cms_id=cms_id,
            defaults=defaults,
        )
        logger.info(
            'CMS webhook: %s intake %s for program %s',
            'created' if created else 'updated', intake.id, program.name,
        )
        return Response({
            'status': 'created' if created else 'updated',
            'intake_id': str(intake.id),
        })


class ProgramInterestCreate(APIView):
    # allow anonymous submissions; explicitly disable authentication for this endpoint
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        email = data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        pi = ProgramInterest.objects.create(
            program_slug=data.get('program_slug', '')[:255],
            program_name=data.get('program_name', '')[:255],
            name=data.get('name', '')[:255],
            email=email,
            phone=data.get('phone', '')[:30],
            message=data.get('message', '')
        )

        serializer = ProgramInterestSerializer(pi)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProgramInterestListView(APIView):
    """Admin-only endpoint: list, filter, and count program interest submissions."""
    permission_classes = [HasAppPermission('leads.view')]

    def get(self, request):
        qs = ProgramInterest.objects.all().order_by('-created_at')

        program_slug = request.query_params.get('program_slug')
        if program_slug:
            qs = qs.filter(program_slug=program_slug)

        qs = _filter_lead_status(qs, request)

        follow_up_completed = request.query_params.get('follow_up_completed')
        if follow_up_completed is not None:
            qs = qs.filter(follow_up_completed=follow_up_completed.lower() in ('true', '1'))

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(email__icontains=search) |
                Q(name__icontains=search) |
                Q(program_name__icontains=search)
            )

        # Pagination
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(50, max(1, int(request.query_params.get('page_size', 20))))
        except (ValueError, TypeError):
            page = 1
            page_size = 20

        total = qs.count()
        start = (page - 1) * page_size
        items = qs[start:start + page_size]

        # Per-program counts (for stats strip)
        program_counts = list(
            ProgramInterest.objects.values('program_slug', 'program_name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        serializer = ProgramInterestSerializer(items, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': serializer.data,
            'program_counts': program_counts,
        })


class ProgramInterestDetailView(APIView):
    """Admin-only endpoint: retrieve or mark follow-up on one program interest submission."""
    permission_classes = [HasAppPermission('leads.manage')]

    def get(self, request, pk):
        interest = get_object_or_404(ProgramInterest, pk=pk)
        return Response(ProgramInterestSerializer(interest).data)

    def patch(self, request, pk):
        interest = get_object_or_404(ProgramInterest, pk=pk)
        action = request.data.get('action')
        if action == 'complete':
            _set_lead_status(interest, 'completed')
        elif action == 'revert':
            _set_lead_status(interest, 'new')
        elif action == 'set_status':
            try:
                _set_lead_status(interest, request.data.get('lead_status'))
            except ValueError:
                return Response({'error': 'Invalid lead_status'}, status=400)
        else:
            return Response({'error': 'action must be "complete", "revert", or "set_status"'}, status=400)
        interest.save(update_fields=['lead_status', 'follow_up_completed', 'follow_up_completed_at'])
        return Response(ProgramInterestSerializer(interest).data)

    def delete(self, request, pk):
        if not request.user.has_app_permission('leads.manage'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        interest = get_object_or_404(ProgramInterest, pk=pk)
        create_audit_log(
            request=request,
            action='delete_lead_program_interest',
            resource_type='program_interest',
            resource_id=str(interest.id),
            resource_summary={'name': interest.name, 'email': interest.email, 'program_name': interest.program_name},
        )
        interest.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProgramInterestNotifyView(APIView):
    """Admin: send an intake-open notification email to ProgramInterest submitters."""
    permission_classes = [HasAppPermission('leads.manage')]

    def post(self, request):
        program_slug = request.data.get('program_slug', '').strip()
        program_name = request.data.get('program_name', '').strip()
        start_date   = request.data.get('start_date', '').strip()
        deadline     = request.data.get('deadline', '').strip()
        apply_url    = request.data.get('apply_url', '').strip()
        ids          = request.data.get('ids')  # optional list of UUIDs

        if not start_date:
            return Response({'error': 'start_date is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not program_slug and not ids:
            return Response({'error': 'program_slug or ids is required'}, status=status.HTTP_400_BAD_REQUEST)

        qs = ProgramInterest.objects.all()
        if ids:
            qs = qs.filter(id__in=ids)
        elif program_slug:
            qs = qs.filter(program_slug=program_slug)

        if not apply_url:
            if program_slug:
                apply_url = f"{settings.FRONTEND_URL}/apply?program={program_slug}"
            else:
                apply_url = f"{settings.FRONTEND_URL}/apply"

        sent = 0
        failed = 0
        for interest in qs:
            try:
                context = {
                    'name': interest.name or 'there',
                    'program_name': program_name or interest.program_name or program_slug,
                    'start_date': start_date,
                    'deadline': deadline,
                    'apply_url': apply_url,
                    'frontend_url': settings.FRONTEND_URL,
                }
                send_html_email(
                    subject=f"Applications are now open — {context['program_name']} | Nexa Academy",
                    template_name='intake_open_notification.html',
                    context=context,
                    recipient_email=interest.email,
                )
                sent += 1
            except Exception as e:
                logger.error('ProgramInterestNotify: failed to email %s: %s', interest.email, e)
                failed += 1

        return Response({'sent': sent, 'failed': failed})


class HelpMeLeadView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        lead = HelpMeLead.objects.create(
            name=request.data.get('name', '')[:255],
            email=email,
            phone=request.data.get('phone', '')[:30],
            message=request.data.get('message', ''),
        )
        return Response(HelpMeLeadSerializer(lead).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        if not (request.user and request.user.is_authenticated and request.user.role == 'admin'):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        qs = HelpMeLead.objects.all()
        qs = _filter_lead_status(qs, request)
        follow_up_completed = request.query_params.get('follow_up_completed')
        if follow_up_completed is not None:
            qs = qs.filter(follow_up_completed=follow_up_completed.lower() in ('true', '1'))
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(name__icontains=search))
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(50, max(1, int(request.query_params.get('page_size', 20))))
        except (ValueError, TypeError):
            page, page_size = 1, 20
        total = qs.count()
        items = qs[(page - 1) * page_size: page * page_size]
        return Response({'count': total, 'results': HelpMeLeadSerializer(items, many=True).data})


class HelpMeLeadDetailView(APIView):
    permission_classes = [HasAppPermission('leads.manage')]

    def get(self, request, pk):
        lead = get_object_or_404(HelpMeLead, pk=pk)
        return Response(HelpMeLeadSerializer(lead).data)

    def patch(self, request, pk):
        lead = get_object_or_404(HelpMeLead, pk=pk)
        action = request.data.get('action')
        if action == 'complete':
            _set_lead_status(lead, 'completed')
            lead.save(update_fields=['lead_status', 'follow_up_completed', 'follow_up_completed_at'])
        elif action == 'revert':
            _set_lead_status(lead, 'new')
            lead.save(update_fields=['lead_status', 'follow_up_completed', 'follow_up_completed_at'])
        elif action == 'set_status':
            try:
                _set_lead_status(lead, request.data.get('lead_status'))
            except ValueError:
                return Response({'error': 'Invalid lead_status'}, status=400)
            lead.save(update_fields=['lead_status', 'follow_up_completed', 'follow_up_completed_at'])
        elif action == 'convert_to_pipeline':
            program_slug = request.data.get('program_slug', '').strip()
            program_name = request.data.get('program_name', '').strip()
            if not program_slug and not program_name:
                return Response({'error': 'program_slug or program_name is required'}, status=400)
            lead.assigned_program_slug = program_slug
            lead.assigned_program_name = program_name
            lead.converted_to_pipeline = True
            lead.converted_at = timezone.now()
            _set_lead_status(lead, 'completed')
            lead.save(update_fields=[
                'assigned_program_slug', 'assigned_program_name',
                'converted_to_pipeline', 'converted_at',
                'lead_status', 'follow_up_completed', 'follow_up_completed_at',
            ])
            apply_url = f"{getattr(settings, 'FRONTEND_URL', '')}/apply?program={program_slug}"
            try:
                send_html_email(
                    subject=f"You're in the {program_name} application pipeline — Nexa Academy",
                    template_name='help_me_pipeline.html',
                    context={
                        'name': lead.name or 'there',
                        'program_name': program_name,
                        'program_slug': program_slug,
                        'apply_url': apply_url,
                        'frontend_url': getattr(settings, 'FRONTEND_URL', ''),
                    },
                    recipient_email=lead.email,
                )
            except Exception:
                logger.exception('Failed to send pipeline email to %s', lead.email)
        else:
            return Response({'error': 'action must be "complete", "revert", or "convert_to_pipeline"'}, status=400)
        return Response(HelpMeLeadSerializer(lead).data)

    def delete(self, request, pk):
        if not request.user.has_app_permission('leads.manage'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        lead = get_object_or_404(HelpMeLead, pk=pk)
        create_audit_log(
            request=request,
            action='delete_lead_help_me',
            resource_type='help_me_lead',
            resource_id=str(lead.id),
            resource_summary={'name': lead.name, 'email': lead.email},
        )
        lead.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IncompleteApplicationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        program_slug = request.data.get('program_slug', '')[:100]
        obj, _ = IncompleteApplication.objects.update_or_create(
            email=email,
            program_slug=program_slug,
            defaults={
                'name': request.data.get('name', '')[:255],
                'phone': request.data.get('phone', '')[:30],
                'program_name': request.data.get('program_name', '')[:255],
                'step_reached': request.data.get('step_reached', 1),
            },
        )
        return Response(IncompleteApplicationSerializer(obj).data, status=status.HTTP_200_OK)

    def get(self, request):
        if not (request.user and request.user.is_authenticated and request.user.role == 'admin'):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        from applications.models import Application

        qs = IncompleteApplication.objects.annotate(
            has_submitted=Exists(
                Application.objects.filter(
                    email__iexact=OuterRef('email'),
                )
            )
        ).filter(has_submitted=False)

        qs = _filter_lead_status(qs, request)

        follow_up_completed = request.query_params.get('follow_up_completed')
        if follow_up_completed is not None:
            qs = qs.filter(follow_up_completed=follow_up_completed.lower() in ('true', '1'))

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(name__icontains=search) | Q(program_name__icontains=search))

        ordering = request.query_params.get('ordering', '-updated_at')
        if ordering in ('updated_at', '-updated_at', 'name', '-name', 'created_at', '-created_at'):
            qs = qs.order_by(ordering)

        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(50, max(1, int(request.query_params.get('page_size', 20))))
        except (ValueError, TypeError):
            page, page_size = 1, 20
        total = qs.count()
        items = qs[(page - 1) * page_size: page * page_size]
        return Response({'count': total, 'results': IncompleteApplicationSerializer(items, many=True).data})


class IncompleteApplicationDetailView(APIView):
    permission_classes = [HasAppPermission('leads.manage')]

    def get(self, request, pk):
        from applications.models import Application

        qs = IncompleteApplication.objects.annotate(
            has_submitted=Exists(
                Application.objects.filter(
                    email__iexact=OuterRef('email'),
                )
            )
        ).filter(has_submitted=False)
        incomplete = get_object_or_404(qs, pk=pk)
        return Response(IncompleteApplicationSerializer(incomplete).data)

    def patch(self, request, pk):
        incomplete = get_object_or_404(IncompleteApplication, pk=pk)
        action = request.data.get('action')
        if action == 'complete':
            _set_lead_status(incomplete, 'completed')
        elif action == 'revert':
            _set_lead_status(incomplete, 'new')
        elif action == 'set_status':
            try:
                _set_lead_status(incomplete, request.data.get('lead_status'))
            except ValueError:
                return Response({'error': 'Invalid lead_status'}, status=400)
        else:
            return Response({'error': 'action must be "complete", "revert", or "set_status"'}, status=400)
        incomplete.save(update_fields=['lead_status', 'follow_up_completed', 'follow_up_completed_at'])
        return Response(IncompleteApplicationSerializer(incomplete).data)

    def delete(self, request, pk):
        if not request.user.has_app_permission('leads.manage'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        incomplete = get_object_or_404(IncompleteApplication, pk=pk)
        create_audit_log(
            request=request,
            action='delete_lead_incomplete',
            resource_type='incomplete_application',
            resource_id=str(incomplete.id),
            resource_summary={'name': incomplete.name, 'email': incomplete.email, 'program_slug': incomplete.program_slug},
        )
        incomplete.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# A lightweight Django view that accepts anonymous POSTs and is CSRF-exempt.
# This bypasses DRF authentication/permission machinery and any global
# DEFAULT_PERMISSION_CLASSES which may otherwise block anonymous clients.
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json


@csrf_exempt
def program_interest_create(request):
    print('program_interest_create called', request.method)
    # log minimal headers to help diagnose 401s
    auth_hdr = request.META.get('HTTP_AUTHORIZATION')
    origin = request.META.get('HTTP_ORIGIN')
    print('AUTH_HEADER:', bool(auth_hdr), 'ORIGIN:', origin)
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8') or '{}')
    except Exception:
        payload = request.POST.dict()

    email = payload.get('email')
    if not email:
        return JsonResponse({'error': 'Email is required'}, status=400)

    pi = ProgramInterest.objects.create(
        program_slug=str(payload.get('program_slug', ''))[:255],
        program_name=str(payload.get('program_name', ''))[:255],
        name=str(payload.get('name', ''))[:255],
        email=email,
        phone=str(payload.get('phone', ''))[:30],
        message=str(payload.get('message', '')),
    )

    serializer = ProgramInterestSerializer(pi)
    return JsonResponse(serializer.data, status=201, safe=False)
