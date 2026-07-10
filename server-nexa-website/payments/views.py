from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Sum, Q
from django.db.models.functions import Coalesce
from django.conf import settings
from decimal import Decimal
from datetime import datetime
from ubuntu_labs.email_utils import send_html_email
from .models import Payment, PaymentHistory, ManualPaymentRequest
from .serializers import (
    PaymentSerializer,
    PaymentHistorySerializer,
    ProcessPaymentSerializer,
    ManualPaymentEntrySerializer,
    ManualPaymentRequestSerializer,
    IssueInvoiceSerializer,
)
from .reconciliation import payment_reconciliation_for_student, serialize_reconciliation
from .receipts import render_receipt_pdf
from .invoices import render_invoice_pdf
from programs.models import Program, Enrollment
from accounts.permissions import IsAdminUser, HasAppPermission
from notifications.models import Notification
from .paystack import PaystackProvider
import uuid
import hmac
import hashlib
import json
import logging
from applications.models import Application, ApplicationLog

logger = logging.getLogger(__name__)


def _admissions_notification_email():
    return getattr(settings, 'ADMISSIONS_NOTIFICATION_EMAIL', 'admissions@nexaacademy.co.ke')


def _admissions_portal_url(path=''):
    base = getattr(settings, 'ADMISSIONS_PORTAL_URL', '') or getattr(settings, 'FRONTEND_URL', '')
    base = base.rstrip('/')
    if not base:
        return ''
    return f"{base}{path}"


def _payment_application_for_student(student, program=None):
    qs = Application.objects.filter(Q(user=student) | Q(email__iexact=student.email))
    if program:
        program_filter = Q(program_name__iexact=program.name)
        program_slug = getattr(program, 'slug', '')
        if program_slug:
            program_filter |= Q(program__iexact=program_slug)
        qs = qs.filter(program_filter)
    return qs.order_by('-applied_at').first()


def _send_manager_deposit_notification(payment, amount=None, program=None, payment_type='deposit'):
    student = payment.student
    program = program or payment.program
    application = _payment_application_for_student(student, program=program)
    amount = amount if amount is not None else payment.amount
    recipient = _admissions_notification_email()
    send_html_email(
        subject=f"Deposit completed — {student.display_name or student.email}",
        template_name='manager_deposit_completed.html',
        context={
            'student_name': student.display_name or payment.student_name,
            'student_email': student.email or payment.student_email,
            'amount': f"KSh {Decimal(str(amount)):,.2f}",
            'reference': payment.payment_reference or str(payment.payment_id),
            'payment_method': payment.payment_method,
            'payment_type': payment_type,
            'program_name': (program.name if program else payment.program_name),
            'total_fee_paid': f"KSh {Decimal(str(student.total_fee_paid or 0)):,.2f}",
            'fee_balance': f"KSh {Decimal(str(student.fee_balance or 0)):,.2f}",
            'application': application,
            'application_url': _admissions_portal_url(f"/admin/applications/{application.id}") if application else '',
            'transactions_url': _admissions_portal_url('/admin/transactions'),
            'frontend_url': settings.FRONTEND_URL,
            'header_label': 'Payment Alert',
            'preview_text': f"Deposit completed by {student.display_name or student.email}",
        },
        recipient_email=recipient,
    )


class ReceiptPdfError(Exception):
    """The receipt PDF could not be rendered for a caller that requires it."""


class InvoicePdfError(Exception):
    """The invoice PDF could not be rendered."""


def _send_payment_receipt(payment, amount=None, program=None, payment_type='payment',
                          recipients=None, require_pdf=False):
    """Email the receipt (with PDF attached) to the student and admissions.

    ``recipients`` overrides the default student + admissions pair — a student
    re-sending their own receipt should not also notify admissions.

    ``require_pdf`` aborts before sending anything if the PDF fails to render. The
    automatic post-payment email leaves this off, because a broken render must never
    block a payment; an explicit "email the receipt" action turns it on, so nobody is
    told a receipt was sent when the attachment is missing.
    """
    student = payment.student
    program = program or payment.program
    amount = Decimal(str(amount if amount is not None else payment.amount))
    reconciliation = payment_reconciliation_for_student(student)
    pdf_bytes = render_receipt_pdf(
        payment, reconciliation, amount=amount, program=program, payment_type=payment_type,
    )
    if require_pdf and not pdf_bytes:
        raise ReceiptPdfError(f'receipt PDF render returned no bytes for payment {payment.payment_id}')
    receipt_attachments = (
        [(f"nexa-receipt-{str(payment.payment_id)[:8]}.pdf", pdf_bytes, 'application/pdf')]
        if pdf_bytes else None
    )
    context = {
        'display_name': student.display_name or payment.student_name,
        'student_name': student.display_name or payment.student_name,
        'student_email': student.email or payment.student_email,
        'amount': f"KSh {amount:,.2f}",
        'reference': payment.payment_reference or str(payment.payment_id),
        'payment_method': payment.payment_method,
        'payment_type': payment_type,
        'program_name': (program.name if program else payment.program_name),
        'total_fee_paid': f"KSh {Decimal(str(reconciliation['amount_paid'])):,.2f}",
        'balance': f"KSh {Decimal(str(reconciliation['amount_remaining'])):,.2f}",
        'fee_balance': f"KSh {Decimal(str(reconciliation['amount_remaining'])):,.2f}",
        'frontend_url': settings.FRONTEND_URL,
        'admissions_url': settings.ADMISSIONS_PORTAL_URL,
        'header_label': 'Payment Receipt',
        'preview_text': f"Payment receipt for {student.display_name or student.email}",
    }
    recipients = recipients or [student.email, _admissions_notification_email()]
    for recipient in dict.fromkeys(email for email in recipients if email):
        send_html_email(
            subject='Payment Receipt - Nexa Academy',
            template_name='payment_confirmation.html',
            context=context,
            recipient_email=recipient,
            attachments=receipt_attachments,
        )


def _resolve_payment_student(data, action='this action'):
    """Resolve the payer from ``student_uid`` or ``application_id``.

    Returns ``(student, application, error_response)``. The application page has no
    account uid, and an applicant may have applied before holding an account, so fall
    back to matching the account by email.
    """
    from accounts.models import User

    if data.get('student_uid'):
        student = User.objects.filter(uid=data['student_uid']).first()
        if not student:
            return None, None, Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
        return student, None, None

    application = Application.objects.filter(id=data['application_id']).first()
    if not application:
        return None, None, Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    student = application.user or User.objects.filter(email__iexact=application.email).first()
    if not student:
        return None, application, Response(
            {'error': f"{application.full_name} has no student account yet. "
                      f"Create their account before {action}."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return student, application, None


def _send_invoice_email(payment, reconciliation, recipient_email):
    """Render the invoice PDF and email it. Raises InvoicePdfError if the render fails.

    Unlike the receipt, an invoice has no value without its PDF — it exists to state an
    amount due — so a failed render aborts before anything is sent.
    """
    pdf_bytes = render_invoice_pdf(payment, reconciliation, amount=payment.amount)
    if not pdf_bytes:
        raise InvoicePdfError(f'invoice PDF render returned no bytes for payment {payment.payment_id}')

    student = payment.student
    due_date = timezone.localtime(payment.due_date) if payment.due_date else None
    context = {
        'display_name': student.display_name or payment.student_name,
        'student_name': student.display_name or payment.student_name,
        'student_email': recipient_email,
        'amount': f"KSh {Decimal(str(payment.amount)):,.2f}",
        'reference': payment.payment_reference or str(payment.payment_id),
        'program_name': payment.program_name or (payment.program.name if payment.program else ''),
        'description': payment.description or 'Programme fee instalment',
        'due_date': due_date.strftime('%d %B %Y') if due_date else '',
        'balance': f"KSh {Decimal(str(reconciliation.get('amount_remaining') or 0)):,.2f}",
        'frontend_url': settings.FRONTEND_URL,
        'admissions_url': settings.ADMISSIONS_PORTAL_URL,
        'header_label': 'Invoice',
        'preview_text': f"Invoice for {payment.amount} from Nexa Academy",
    }
    send_html_email(
        subject=f"Invoice {str(payment.payment_id).split('-')[0].upper()} - Nexa Academy",
        template_name='invoice_issued.html',
        context=context,
        recipient_email=recipient_email,
        attachments=[(f"nexa-invoice-{str(payment.payment_id)[:8]}.pdf", pdf_bytes, 'application/pdf')],
    )


def _recalculate_student_totals(student):
    """Recompute total_fee_paid and fee_balance from DB and save."""
    student.total_fee_paid = Payment.objects.filter(
        student=student, status='completed'
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
    student.fee_balance = Enrollment.objects.filter(student=student).aggregate(
        bal=Coalesce(Sum('balance'), Decimal('0.00'))
    )['bal']
    student.save()


def resolve_program(program_identifier):
    if not program_identifier:
        return None

    try:
        return Program.objects.filter(program_id=uuid.UUID(str(program_identifier))).first()
    except (ValueError, TypeError):
        program_slug = str(program_identifier).strip().lower()
        program = Program.objects.filter(slug__iexact=program_slug).first()
        if program:
            return program
        # Legacy aliases predating Program.slug.
        if program_slug in ('software-engineering', 'fullstack', 'software_engineering'):
            return (
                Program.objects.filter(name__icontains='Software Engineering').first()
                or Program.objects.filter(name__icontains='Full Stack').first()
            )
        if program_slug in ('cloud', 'cloud-computing', 'cloud_computing'):
            return Program.objects.filter(name__icontains='Cloud').first()
    return None


def _maybe_enroll_application(student, program=None, notes='Enrollment confirmed after initial deposit'):
    """
    Promote interview_completed applications to enrolled once total completed
    payments for the student reach KSh 10,000.

    Matches applications by user FK OR email so it works regardless of how
    the application was originally submitted.
    """
    try:
        total_paid = Payment.objects.filter(
            student=student,
            status='completed',
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00'))
        )['total']

        logger.info(
            'Enrollment check for student=%s email=%s total_paid=%s',
            student.pk, student.email, total_paid,
        )

        if total_paid < Decimal('10000'):
            return

        # Match by user FK or by email (covers applications submitted before account creation)
        qs = Application.objects.filter(
            Q(user=student) | Q(email__iexact=student.email),
            status='interview_completed',
        )
        if program:
            qs = qs.filter(program_name__iexact=program.name)

        count = qs.count()
        logger.info('Found %d interview_completed application(s) to enroll', count)

        for app in qs:
            try:
                with transaction.atomic():
                    prev = app.status
                    app.status = 'enrolled'
                    app.status_updated_at = timezone.now()
                    app.save()
                    ApplicationLog.objects.create(
                        application=app,
                        previous_status=prev,
                        new_status='enrolled',
                        changed_by='system',
                        notes=notes,
                        applicant_email=app.email,
                        applicant_name=app.full_name,
                    )
                logger.info('Application %s marked enrolled', app.id)
            except Exception as e:
                logger.error('Failed to enroll application %s: %s', app.id, e, exc_info=True)

    except Exception as e:
        logger.error('Failed to mark application enrolled: %s', e, exc_info=True)


def record_manual_payment(
    student,
    amount,
    payment_method,
    payment_date=None,
    reference='',
    provider_message='',
    program=None,
    recorded_by='',
    description='',
    payment_type='manual',
):
    """Post an off-platform payment as a completed Payment and reconcile it.

    Shared by the admin direct-entry action and the approval of a student
    ManualPaymentRequest. Mirrors the confirm() flow: create the Payment, update the
    enrollment, recompute student totals, promote the application, write history +
    notification, and email the receipt (with PDF) + manager alert.
    """
    amount = Decimal(str(amount))

    # Payment.payment_date is a DateTimeField; requests carry a plain date. Normalise
    # to a timezone-aware datetime (EAT) so no naive datetime is ever stored.
    if payment_date is None:
        payment_dt = timezone.now()
    elif isinstance(payment_date, datetime):
        payment_dt = payment_date if timezone.is_aware(payment_date) else timezone.make_aware(payment_date)
    else:  # a date
        payment_dt = timezone.make_aware(datetime.combine(payment_date, datetime.min.time()))

    with transaction.atomic():
        payment = Payment.objects.create(
            student=student,
            student_name=student.display_name,
            student_email=student.email,
            amount=amount,
            payment_method=payment_method,
            payment_reference=reference or f"MANUAL-{uuid.uuid4().hex[:8].upper()}",
            status='completed',
            source='manual',
            provider_message=provider_message or '',
            recorded_by=recorded_by or '',
            confirmed_at=timezone.now(),
            payment_date=payment_dt,
            description=description or 'Manually reconciled payment',
            program=program,
            program_name=program.name if program else '',
        )

        if program:
            enrollment, _ = Enrollment.objects.get_or_create(
                student=student,
                program=program,
                defaults={
                    'student_name': student.display_name,
                    'program_name': program.name,
                    'amount': program.price,
                    'amount_paid': Decimal('0.00'),
                    'balance': program.price,
                    'status': 'active',
                },
            )
            if enrollment.amount != program.price:
                enrollment.amount = program.price
                enrollment.program_name = program.name
            enrollment.amount_paid = Decimal(enrollment.amount_paid or 0) + amount
            enrollment.balance = enrollment.amount - enrollment.amount_paid
            enrollment.save()

        _recalculate_student_totals(student)
        _maybe_enroll_application(student, program=program)

        PaymentHistory.objects.create(
            student=student,
            payment=payment,
            amount=amount,
            payment_date=payment.payment_date,
            payment_method=payment_method,
            reference=payment.payment_reference,
            status='completed',
        )

        try:
            Notification.objects.create(
                user=student,
                type='payment',
                title='Payment Recorded',
                message=f"A payment of KSh {amount:,.2f} ({payment_method}) was recorded on your account.",
                link=f"/student-dashboard/{student.uid}",
            )
        except Exception:
            pass

    try:
        _send_payment_receipt(payment, amount=amount, program=program, payment_type=payment_type)
    except Exception as exc:
        logger.error('payment receipt email failed for manual payment %s: %s', payment.payment_id, exc)

    try:
        _send_manager_deposit_notification(payment, amount=amount, program=program, payment_type=payment_type)
    except Exception as exc:
        logger.error('manager notification failed for manual payment %s: %s', payment.payment_id, exc)

    return payment


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_method', 'program']
    search_fields = ['student_name', 'student_email', 'transaction_id']
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-payment_date']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Payment.objects.all()
        return Payment.objects.filter(student=user)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        successful_statuses = ['completed', 'paid', 'success']
        totals = queryset.aggregate(
            total_count=Count('payment_id'),
            completed_count=Count('payment_id', filter=Q(status__in=successful_statuses)),
            pending_count=Count('payment_id', filter=Q(status='pending')),
            total_revenue=Coalesce(
                Sum('amount', filter=Q(status__in=successful_statuses)),
                Decimal('0.00'),
            ),
        )
        return Response(totals)

    @action(detail=False, methods=['get'])
    def reconciliation(self, request):
        student = request.user
        student_id = request.query_params.get('student')
        if student_id and getattr(request.user, 'role', None) == 'admin':
            from accounts.models import User
            student = User.objects.filter(uid=student_id).first()
            if not student:
                return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_reconciliation(payment_reconciliation_for_student(student)))

    @action(detail=False, methods=['post'])
    def initialize_payment(self, request):
        """Initialize a Paystack payment"""
        student = request.user

        # Only students who have passed their interview may pay
        if getattr(student, 'role', None) != 'admin':
            eligible = Application.objects.filter(
                Q(user=student) | Q(email__iexact=student.email),
                status__in=['interview_completed', 'enrolled'],
            ).exists()
            if not eligible:
                return Response(
                    {'error': 'Payment is only available after your interview has been completed. Please complete the application process first.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        amount = request.data.get('amount')
        program_id = request.data.get('program_id')
        email = request.data.get('email', request.user.email)
        program = resolve_program(program_id)

        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create a unique reference
        reference = f"NEXA-{uuid.uuid4().hex[:10].upper()}"
        
        # Metadata for Paystack
        metadata = {
            'student_id': str(request.user.uid),
            'program_id': program_id,
            'payment_type': request.data.get('payment_type', 'deposit')
        }
        
        paystack = PaystackProvider()
        frontend_base_url = settings.FRONTEND_URL.rstrip('/')
        response = paystack.initialize_transaction(
            email=email,
            amount=amount,
            reference=reference,
            callback_url=f"{frontend_base_url}/enrollment",
            metadata=metadata
        )
        
        if response.get('status'):
            # Create a pending payment record
            Payment.objects.create(
                student=request.user,
                student_name=request.user.display_name,
                student_email=request.user.email,
                amount=amount,
                payment_method='Card',  # Paystack handles various methods, but let's label as Card/Online
                payment_reference=reference,
                status='pending',
                description=f"Payment for program {program.name if program else program_id}",
                program=program,
                program_name=program.name if program else ''
            )
            # Return the paystack initialization payload plus public key for inline popup
            data = response.get('data') or {}
            data['public_key'] = settings.PAYSTACK_PUBLIC_KEY
            return Response(data)
        else:
            # If Paystack reports the integration is closed (common in test accounts or misconfigured keys)
            # allow a DEBUG-mode local fallback that creates and finalizes the payment so development can continue.
            msg = response.get('message', '') or ''
            if settings.DEBUG and 'Integration has been closed' in msg:
                # Create and immediately mark payment as completed for local testing
                try:
                    with transaction.atomic():
                        payment = Payment.objects.create(
                            student=request.user,
                            student_name=request.user.display_name,
                            student_email=request.user.email,
                            amount=amount,
                            payment_method='Card',
                            payment_reference=reference,
                            status='completed',
                            confirmed_at=timezone.now(),
                            description=f"(SIMULATED) Payment for program {program.name if program else program_id}",
                            program=program,
                            program_name=program.name if program else ''
                        )

                        # Update or create enrollment
                        prog = payment.program or resolve_program(program_id)
                        enrollment = None
                        if prog:
                            sim_student = payment.student
                            sim_app_payment_plan = (
                                Application.objects.filter(
                                    Q(user=sim_student) | Q(email__iexact=sim_student.email),
                                    program_name__iexact=prog.name,
                                )
                                .exclude(payment_plan='')
                                .order_by('-applied_at')
                                .values_list('payment_plan', flat=True)
                                .first() or ''
                            )
                            enrollment, _ = Enrollment.objects.get_or_create(
                                student=request.user,
                                program=prog,
                                defaults={
                                    'student_name': request.user.display_name,
                                    'program_name': prog.name,
                                    'amount': prog.price,
                                    'amount_paid': Decimal('0.00'),
                                    'balance': prog.price,
                                    'status': 'active',
                                    'payment_plan': sim_app_payment_plan,
                                }
                            )
                            if enrollment.amount != prog.price:
                                enrollment.amount = prog.price
                                enrollment.program_name = prog.name
                            if not enrollment.payment_plan and sim_app_payment_plan:
                                enrollment.payment_plan = sim_app_payment_plan
                            enrollment.amount_paid = Decimal(enrollment.amount_paid or 0) + Decimal(str(amount))
                            enrollment.balance = enrollment.amount - enrollment.amount_paid
                            enrollment.save()

                        # Update student totals from completed payments (not enrollment
                        # aggregates — those return 0 when no enrollment exists and would
                        # erase a real total_fee_paid).
                        student = payment.student
                        student.total_fee_paid = Payment.objects.filter(
                            student=student, status='completed'
                        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
                        student.fee_balance = Enrollment.objects.filter(student=student).aggregate(
                            bal=Coalesce(Sum('balance'), Decimal('0.00'))
                        )['bal']
                        student.save()

                        _maybe_enroll_application(
                            student, program=prog,
                            notes='Enrollment confirmed after initial deposit (simulated)',
                        )

                        # Payment history
                        PaymentHistory.objects.create(
                            student=student,
                            payment=payment,
                            amount=Decimal(str(amount)),
                            payment_date=payment.payment_date,
                            payment_method='Simulated',
                            reference=reference,
                            status='completed'
                        )

                        # Notification
                        Notification.objects.create(
                            user=student,
                            type='payment',
                            title='Payment (Simulated) Successful',
                            message=f"(SIMULATED) Your payment of KSh {Decimal(str(amount)):,.2f} was recorded successfully.",
                            link=f"/student-dashboard/{student.uid}"
                        )

                        try:
                            _send_payment_receipt(
                                payment,
                                amount=Decimal(str(amount)),
                                program=prog,
                                payment_type='deposit',
                            )
                            _send_manager_deposit_notification(
                                payment,
                                amount=Decimal(str(amount)),
                                program=prog,
                                payment_type='deposit',
                            )
                        except Exception as exc:
                            logger.error('manager deposit notification failed for payment %s: %s', payment.payment_id, exc)

                        # Return simulated success payload
                        return Response({
                            'status': 'success',
                            'simulated': True,
                            'payment': PaymentSerializer(payment).data,
                        })
                except Exception:
                    return Response({'error': 'Failed to simulate payment'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response(
                {'error': response.get('message', 'Failed to initialize payment')},
                status=status.HTTP_400_BAD_REQUEST
            )
        

    @action(detail=False, methods=['post'])
    def verify_payment(self, request):
        """Verify a Paystack payment"""
        reference = request.data.get('reference')
        if not reference:
            return Response({'error': 'Reference is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        paystack = PaystackProvider()
        response = paystack.verify_transaction(reference)
        
        if response.get('status') and response['data']['status'] == 'success':
            data = response['data']
            payment_type = (data.get('metadata') or {}).get('payment_type', 'deposit')

            try:
                payment = Payment.objects.get(payment_reference=reference)
            except Payment.DoesNotExist:
                return Response({'error': 'Payment record not found'}, status=status.HTTP_404_NOT_FOUND)

            try:
                payment = self._finalize_successful_payment(payment, data, data.get('amount', 0))
            except Exception as e:
                logger.error('verify_payment: finalize failed for ref %s: %s', reference, e, exc_info=True)
                return Response(
                    {'error': 'Payment successful on Paystack but failed to update locally. Contact support.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            student = payment.student
            program = payment.program
            return Response({
                'status': 'success',
                'payment': PaymentSerializer(payment).data,
                'student_uid': str(student.uid),
                'fee_balance': student.fee_balance,
                'total_fee_paid': student.total_fee_paid,
                'program_id': str(program.program_id) if program else None,
                'payment_type': payment_type,
            })
        else:
            return Response({'error': 'Payment verification failed'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def process(self, request):

        """Process a new payment"""
        serializer = ProcessPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            # Create payment record
            payment = Payment.objects.create(
                student=request.user,
                student_name=request.user.display_name,
                student_email=request.user.email,
                amount=serializer.validated_data['amount'],
                payment_method=serializer.validated_data['payment_method'],
                mobile_number=serializer.validated_data.get('mobile_number', ''),
                description=serializer.validated_data.get('description', ''),
                status='processing'
            )

            # Add to payment history
            PaymentHistory.objects.create(
                student=request.user,
                payment=payment,
                amount=payment.amount,
                payment_date=payment.payment_date,
                payment_method=payment.payment_method,
                reference=payment.payment_reference or f"PAY-{payment.payment_id}",
                status='processing'
            )

            # TODO: Integrate with actual payment gateway
            # For now, simulate successful payment
            payment.status = 'completed'
            payment.confirmed_at = timezone.now()
            payment.save()

            # If payment is for a specific program, update enrollment
            program_id = serializer.validated_data.get('program_id')
            if program_id:
                try:
                    enrollment = Enrollment.objects.get(
                        student=request.user,
                        program_id=program_id
                    )
                    enrollment.amount_paid += payment.amount
                    enrollment.balance = enrollment.amount - enrollment.amount_paid
                    enrollment.save()
                    payment.program_id = program_id
                    payment.save()
                except Enrollment.DoesNotExist:
                    pass

            # Recompute totals from DB after any enrollment adjustment.
            _recalculate_student_totals(request.user)

            # Create in-app notification confirming payment and showing remaining balance
            try:
                Notification.objects.create(
                    user=request.user,
                    type='payment',
                    title='Payment Received',
                    message=f"KSh {payment.amount:,.0f} received. Balance: KSh {request.user.fee_balance:,.0f}.",
                    link=f"/student-dashboard/{request.user.uid}"
                )
            except Exception:
                pass

            try:
                _send_manager_deposit_notification(payment, amount=payment.amount, program=payment.program)
            except Exception as exc:
                logger.error('manager deposit notification failed for payment %s: %s', payment.payment_id, exc)

            try:
                _send_payment_receipt(payment, amount=payment.amount, program=payment.program)
            except Exception as exc:
                logger.error('payment receipt email failed for payment %s: %s', payment.payment_id, exc)

        return Response(PaymentSerializer(payment).data)

    def _finalize_successful_payment(self, payment, paystack_data, amount_kobo):
        """
        Shared helper: mark a payment completed and run enrollment/balance/notification logic.
        paystack_data: the 'data' dict from Paystack's verify response.
        amount_kobo: the raw amount integer from Paystack (in kobo).
        """
        amount = Decimal(str(amount_kobo)) / Decimal('100')
        metadata = paystack_data.get('metadata', {})
        program_identifier = metadata.get('program_id')

        with transaction.atomic():
            if payment.status == 'completed':
                student = payment.student
                return payment

            student = payment.student
            payment.status = 'completed'
            payment.confirmed_at = timezone.now()
            payment.transaction_id = paystack_data.get('gateway_response', '')
            payment.save()

            program = payment.program or resolve_program(program_identifier)
            if program and not payment.program:
                payment.program = program
                payment.program_name = program.name
                payment.save(update_fields=['program', 'program_name'])

            if program:
                app_payment_plan = (
                    Application.objects.filter(
                        Q(user=student) | Q(email__iexact=student.email),
                        program_name__iexact=program.name,
                    )
                    .exclude(payment_plan='')
                    .order_by('-applied_at')
                    .values_list('payment_plan', flat=True)
                    .first() or ''
                )
                enrollment, _ = Enrollment.objects.get_or_create(
                    student=student,
                    program=program,
                    defaults={
                        'student_name': student.display_name,
                        'program_name': program.name,
                        'amount': program.price,
                        'amount_paid': Decimal('0.00'),
                        'balance': program.price,
                        'status': 'active',
                        'payment_plan': app_payment_plan,
                    }
                )
                if enrollment.amount != program.price:
                    enrollment.amount = program.price
                    enrollment.program_name = program.name
                if not enrollment.payment_plan and app_payment_plan:
                    enrollment.payment_plan = app_payment_plan
                enrollment.amount_paid = Decimal(enrollment.amount_paid or 0) + amount
                enrollment.balance = enrollment.amount - enrollment.amount_paid
                enrollment.save()

            # Compute totals from completed payments (not enrollment aggregates —
            # those return 0 when no enrollment exists and would erase a real total).
            student.total_fee_paid = Payment.objects.filter(
                student=student, status='completed'
            ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
            student.fee_balance = Enrollment.objects.filter(student=student).aggregate(
                bal=Coalesce(Sum('balance'), Decimal('0.00'))
            )['bal']
            student.save()

            _maybe_enroll_application(student, program=program)

            PaymentHistory.objects.create(
                student=student,
                payment=payment,
                amount=amount,
                payment_date=payment.payment_date,
                payment_method='Paystack',
                reference=payment.payment_reference,
                status='completed'
            )

            Notification.objects.create(
                user=student,
                type='payment',
                title='Payment Successful',
                message=f"Your payment of KSh {amount:,.2f} was received successfully.",
                link=f"/student-dashboard/{student.uid}"
            )

            try:
                _send_payment_receipt(
                    payment,
                    amount=amount,
                    program=program,
                    payment_type=metadata.get('payment_type', 'payment'),
                )
            except Exception as exc:
                logger.error('payment receipt email failed for payment %s: %s', payment.payment_id, exc)

            try:
                _send_manager_deposit_notification(
                    payment,
                    amount=amount,
                    program=program,
                    payment_type=metadata.get('payment_type', 'deposit'),
                )
            except Exception as exc:
                logger.error('manager deposit notification failed for payment %s: %s', payment.payment_id, exc)

        return payment

    @action(detail=True, methods=['post'])
    def check_status(self, request, pk=None):
        """
        Check a payment's status against Paystack and update the record.
        Students can check their own payments; admins can check any payment.
        """
        payment = self.get_object()

        if payment.status in ('completed', 'refunded'):
            return Response(PaymentSerializer(payment).data)

        if not payment.payment_reference:
            return Response(
                {'error': 'No payment reference on record — cannot verify with Paystack.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            paystack = PaystackProvider()
            response = paystack.verify_transaction(payment.payment_reference)
        except Exception as e:
            logger.error('check_status: Paystack call failed for payment %s: %s', pk, e, exc_info=True)
            return Response(
                {'error': 'Failed to reach payment provider. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        data = response.get('data') or {}
        paystack_status = data.get('status', '')

        if paystack_status == 'success':
            try:
                payment = self._finalize_successful_payment(payment, data, data.get('amount', 0))
            except Exception as e:
                logger.error('check_status: finalize failed for payment %s: %s', pk, e, exc_info=True)
                return Response(
                    {'error': 'Payment was successful on Paystack but failed to update locally. Contact support.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        elif paystack_status in ('failed', 'abandoned'):
            payment.status = 'failed'
            payment.save(update_fields=['status', 'updated_at'])
            logger.info('check_status: marked payment %s as failed (Paystack: %s)', pk, paystack_status)

        return Response({
            'paystack_status': paystack_status,
            'payment': PaymentSerializer(payment).data,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, HasAppPermission('transactions.manage')])
    def check_all_pending(self, request):
        """
        Admin: sweep all pending payments with a reference and update their status from Paystack.
        """
        pending = Payment.objects.filter(status='pending').exclude(payment_reference='')
        paystack = PaystackProvider()

        results = {'completed': [], 'failed': [], 'still_pending': [], 'errors': []}

        for payment in pending:
            try:
                response = paystack.verify_transaction(payment.payment_reference)
                data = response.get('data') or {}
                ps_status = data.get('status', '')

                if ps_status == 'success':
                    self._finalize_successful_payment(payment, data, data.get('amount', 0))
                    results['completed'].append(payment.payment_reference)
                elif ps_status in ('failed', 'abandoned'):
                    payment.status = 'failed'
                    payment.save(update_fields=['status', 'updated_at'])
                    results['failed'].append(payment.payment_reference)
                else:
                    results['still_pending'].append(payment.payment_reference)
            except Exception as e:
                logger.error('check_all_pending: error on payment %s: %s', payment.payment_id, e, exc_info=True)
                results['errors'].append({'reference': payment.payment_reference, 'error': str(e)})

        return Response({
            'checked': pending.count(),
            **results,
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, HasAppPermission('transactions.manage')])
    def confirm(self, request, pk=None):
        """Admin confirms a payment"""
        payment = self.get_object()

        if payment.status == 'completed':
            return Response(
                {'error': 'Payment already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            payment.status = 'completed'
            payment.confirmed_at = timezone.now()
            payment.save()

            student = payment.student
            prog = payment.program

            # Update enrollment if this payment is tied to a program
            if prog:
                enrollment, _ = Enrollment.objects.get_or_create(
                    student=student,
                    program=prog,
                    defaults={
                        'student_name': student.display_name,
                        'program_name': prog.name,
                        'amount': prog.price,
                        'amount_paid': Decimal('0.00'),
                        'balance': prog.price,
                        'status': 'active',
                    }
                )
                if enrollment.amount != prog.price:
                    enrollment.amount = prog.price
                    enrollment.program_name = prog.name
                enrollment.amount_paid = Decimal(enrollment.amount_paid or 0) + payment.amount
                enrollment.balance = enrollment.amount - enrollment.amount_paid
                enrollment.save()

            # Recompute totals from DB — never use arithmetic
            _recalculate_student_totals(student)

            PaymentHistory.objects.create(
                student=student,
                payment=payment,
                amount=payment.amount,
                payment_date=payment.payment_date,
                payment_method=payment.payment_method,
                reference=payment.payment_reference or str(payment.payment_id),
                status='completed'
            )

            _maybe_enroll_application(student, program=prog)

            try:
                Notification.objects.create(
                    user=student,
                    type='payment',
                    title='Payment Confirmed',
                    message=f"Your payment of KSh {payment.amount:,.2f} has been confirmed.",
                    link=f"/student-dashboard/{student.uid}",
                )
            except Exception:
                pass

            try:
                _send_payment_receipt(payment, amount=payment.amount, program=prog)
            except Exception as exc:
                logger.error('payment receipt email failed for payment %s: %s', payment.payment_id, exc)

            try:
                _send_manager_deposit_notification(payment, amount=payment.amount, program=prog)
            except Exception as exc:
                logger.error('manager deposit notification failed for payment %s: %s', payment.payment_id, exc)

        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, HasAppPermission('transactions.manage')])
    def refund(self, request, pk=None):
        """Admin processes a refund"""
        payment = self.get_object()

        if payment.status == 'refunded':
            return Response(
                {'error': 'Payment already refunded'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            payment.status = 'refunded'
            payment.save()

            student = payment.student
            prog = payment.program

            # Reverse enrollment amount_paid if applicable
            if prog:
                try:
                    enrollment = Enrollment.objects.get(student=student, program=prog)
                    enrollment.amount_paid = max(
                        Decimal('0.00'),
                        Decimal(enrollment.amount_paid or 0) - payment.amount,
                    )
                    enrollment.balance = enrollment.amount - enrollment.amount_paid
                    enrollment.save()
                except Enrollment.DoesNotExist:
                    pass

            # Recompute totals from DB — payment is now 'refunded' so excluded from sum
            _recalculate_student_totals(student)

        return Response(PaymentSerializer(payment).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, HasAppPermission('transactions.manage')])
    def backfill_enrollments(self, request):
        """
        Admin action: retroactively enroll all students who have paid >= KSh 10,000
        but whose application is still at interview_completed.
        """
        from django.db.models import Sum, Q
        from django.db.models.functions import Coalesce
        from accounts.models import User

        THRESHOLD = Decimal('10000')

        students_qs = (
            User.objects.filter(payments__status='completed')
            .annotate(
                total_paid=Coalesce(
                    Sum('payments__amount', filter=Q(payments__status='completed')),
                    Decimal('0.00'),
                )
            )
            .filter(total_paid__gte=THRESHOLD)
            .distinct()
        )

        enrolled = []
        errors = []

        for student in students_qs:
            apps = Application.objects.filter(
                Q(user=student) | Q(email__iexact=student.email),
                status='interview_completed',
            )
            for app in apps:
                try:
                    with transaction.atomic():
                        prev = app.status
                        app.status = 'enrolled'
                        app.status_updated_at = timezone.now()
                        app.save()
                        ApplicationLog.objects.create(
                            application=app,
                            previous_status=prev,
                            new_status='enrolled',
                            changed_by=request.user.email,
                            notes='Retroactive enrollment: deposit of KSh 10,000 was already paid',
                            applicant_email=app.email,
                            applicant_name=app.full_name,
                        )
                    enrolled.append({'application_id': str(app.id), 'student': app.email})
                    logger.info('Backfill enrolled application %s for %s', app.id, app.email)
                except Exception as e:
                    errors.append({'application_id': str(app.id), 'error': str(e)})
                    logger.error('Backfill failed for application %s: %s', app.id, e, exc_info=True)

        return Response({
            'enrolled': enrolled,
            'enrolled_count': len(enrolled),
            'errors': errors,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, HasAppPermission('transactions.manage')])
    def admin_send_payment_link(self, request):
        """
        Admin initiates a Paystack payment link for a specific student and emails it to them.
        Body: { student_uid, amount, description?, program_id? }
        """
        from accounts.models import User

        student_uid = (request.data.get('student_uid') or '').strip()
        amount = request.data.get('amount')
        description = (request.data.get('description') or '').strip()
        program_id = request.data.get('program_id')

        if not student_uid:
            return Response({'error': 'student_uid is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not amount:
            return Response({'error': 'amount is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = User.objects.get(uid=student_uid)
        except User.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        program = resolve_program(program_id)
        reference = f"NEXA-{uuid.uuid4().hex[:10].upper()}"

        admissions_base = getattr(settings, 'ADMISSIONS_PORTAL_URL', settings.FRONTEND_URL).rstrip('/')

        paystack = PaystackProvider()
        ps_response = paystack.initialize_transaction(
            email=student.email,
            amount=amount,
            reference=reference,
            callback_url=f"{admissions_base}/student/dashboard",
            metadata={
                'admin_initiated': True,
                'admin_uid': str(request.user.uid),
                'program_id': str(program_id) if program_id else '',
                'payment_type': 'admin_payment',
            },
        )

        if not ps_response.get('status'):
            logger.error('Paystack init failed for admin payment link: %s', ps_response)
            return Response(
                {'error': ps_response.get('message', 'Payment initialization failed')},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        ps_data = ps_response.get('data') or {}
        authorization_url = ps_data.get('authorization_url', '')

        payment = Payment.objects.create(
            student=student,
            student_name=student.display_name,
            student_email=student.email,
            amount=amount,
            payment_method='Card',
            payment_reference=reference,
            status='pending',
            description=description or 'Payment request from Nexa Academy admissions',
            program=program,
            program_name=program.name if program else '',
        )

        logger.info('Admin payment initialized for %s (ref: %s)', student.email, reference)

        return Response({
            'payment_id': str(payment.payment_id),
            'reference': reference,
            'access_code': ps_data.get('access_code', ''),
            'authorization_url': authorization_url,
            'public_key': getattr(settings, 'PAYSTACK_PUBLIC_KEY', ''),
            'student_email': student.email,
            'amount': str(amount),
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, HasAppPermission('transactions.manage')])
    def record_manual(self, request):
        """
        Admin: record a payment made outside the LMS (KCB transfer, cash, etc.).
        Body: { student_uid | application_id, amount, payment_method, payment_date?,
                reference?, provider_message?, program_id?, description? }
        """
        serializer = ManualPaymentEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        student, application, error = _resolve_payment_student(data, action='recording a payment')
        if error:
            return error

        program = resolve_program(data.get('program_id'))
        if not program and application:
            program = resolve_program(application.program)

        payment = record_manual_payment(
            student=student,
            amount=data['amount'],
            payment_method=data['payment_method'],
            payment_date=data.get('payment_date'),
            reference=data.get('reference', ''),
            provider_message=data.get('provider_message', ''),
            program=program,
            recorded_by=request.user.email,
            description=data.get('description', ''),
            payment_type='manual',
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, HasAppPermission('transactions.manage')])
    def issue_invoice(self, request):
        """
        Admin: invoice a student for an amount they owe (an instalment under their plan).

        Body: { student_uid | application_id, amount, due_date?, description?, email?,
                program_id? }

        Records the invoice as a pending Payment so it shows up in transactions and can
        be settled through the normal Paystack or manual-reconciliation flows, then
        emails the student a PDF invoice.
        """
        serializer = IssueInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        student, application, error = _resolve_payment_student(data, action='issuing an invoice')
        if error:
            return error

        program = resolve_program(data.get('program_id'))
        if not program and application:
            program = resolve_program(application.program)

        recipient_email = (data.get('email') or '').strip() or student.email
        if not recipient_email:
            return Response(
                {'error': 'This student has no email address to send the invoice to.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        due_date = data.get('due_date')
        due_dt = timezone.make_aware(datetime.combine(due_date, datetime.min.time())) if due_date else None

        payment = Payment.objects.create(
            student=student,
            student_name=student.display_name,
            student_email=student.email,
            amount=data['amount'],
            payment_method='Bank Transfer',
            payment_reference=f"INV-{uuid.uuid4().hex[:8].upper()}",
            status='pending',
            source='manual',
            recorded_by=request.user.email,
            due_date=due_dt,
            description=data.get('description', '') or 'Programme fee instalment',
            program=program,
            program_name=program.name if program else '',
        )

        reconciliation = payment_reconciliation_for_student(student)
        try:
            _send_invoice_email(payment, reconciliation, recipient_email)
        except InvoicePdfError as exc:
            # No invoice without its PDF — drop the pending row rather than leave a
            # phantom charge the student was never told about.
            logger.error('invoice PDF unavailable, rolling back payment %s: %s', payment.payment_id, exc)
            payment.delete()
            return Response(
                {'error': 'The invoice PDF could not be generated, so no invoice was issued.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as exc:
            logger.error('invoice email failed, rolling back payment %s: %s', payment.payment_id, exc, exc_info=True)
            payment.delete()
            return Response(
                {'error': 'Could not email the invoice. No invoice was issued.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            Notification.objects.create(
                user=student,
                type='payment',
                title='New Invoice',
                message=f"You have been invoiced KSh {Decimal(str(payment.amount)):,.2f}"
                        + (f", due {due_dt:%d %b %Y}." if due_dt else "."),
                link='/student/payments',
            )
        except Exception:
            logger.exception('Failed to notify student about invoice %s', payment.payment_id)

        logger.info('Invoice %s issued to %s by %s', payment.payment_id, recipient_email, request.user.email)
        return Response(
            {**PaymentSerializer(payment).data, 'emailed_to': recipient_email},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def send_receipt(self, request, pk=None):
        """Re-send the PDF receipt for a completed payment.

        Admins send to the student and admissions; a student re-sending their own
        receipt only emails themselves. ``get_queryset`` already scopes non-admins
        to their own payments, so this can only ever target a payment they own.
        """
        payment = self.get_object()

        if payment.status != 'completed':
            return Response(
                {'error': 'A receipt can only be sent for a completed payment.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not payment.student or not payment.student.email:
            return Response(
                {'error': 'This payment has no student email to send the receipt to.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_admin = getattr(request.user, 'role', None) == 'admin'
        recipients = None if is_admin else [payment.student.email]

        try:
            _send_payment_receipt(
                payment,
                amount=payment.amount,
                program=payment.program,
                payment_type='manual' if payment.source == 'manual' else 'payment',
                recipients=recipients,
                require_pdf=True,
            )
        except ReceiptPdfError as exc:
            logger.error('receipt PDF unavailable for payment %s: %s', payment.payment_id, exc)
            return Response(
                {'error': 'The receipt PDF could not be generated, so no email was sent.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as exc:
            logger.error('receipt resend failed for payment %s: %s', payment.payment_id, exc, exc_info=True)
            return Response(
                {'error': 'Could not send the receipt email. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        logger.info('Receipt for payment %s re-sent by %s', payment.payment_id, request.user.email)
        return Response({
            'detail': f'Receipt emailed to {payment.student.email}.',
            'recipients': recipients or [payment.student.email, _admissions_notification_email()],
        })


class ManualPaymentRequestViewSet(viewsets.ModelViewSet):
    queryset = ManualPaymentRequest.objects.select_related('student', 'program')
    serializer_class = ManualPaymentRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['student__display_name', 'student__email', 'reference']
    ordering_fields = ['created_at', 'reviewed_at']
    ordering = ['-created_at']
    http_method_names = ['get', 'post', 'head', 'options']

    def get_permissions(self):
        if self.action in ('approve', 'reject'):
            return [IsAuthenticated(), HasAppPermission('transactions.manage')()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        if getattr(self.request.user, 'role', None) == 'admin':
            return qs
        return qs.filter(student=self.request.user)

    def _email_context(self, manual_request, **extra):
        student = manual_request.student
        context = {
            'student_name': student.display_name or student.email,
            'student_email': student.email,
            'amount': f"KSh {Decimal(str(manual_request.amount)):,.2f}",
            'payment_method': manual_request.get_payment_method_display(),
            'payment_date': manual_request.payment_date,
            'reference': manual_request.reference,
            'provider_message': manual_request.provider_message,
            'program_name': manual_request.program.name if manual_request.program else '',
            'status': manual_request.status,
            'admin_notes': manual_request.admin_notes,
            'request_url': _admissions_portal_url('/admin/payments?tab=manual-requests'),
            'student_dashboard_url': _admissions_portal_url('/student/payments'),
            'frontend_url': getattr(settings, 'FRONTEND_URL', ''),
            'admissions_url': getattr(settings, 'ADMISSIONS_PORTAL_URL', ''),
        }
        context.update(extra)
        return context

    def perform_create(self, serializer):
        program = None
        program_data = serializer.validated_data.pop('program', None)
        if program_data and program_data.get('program_id'):
            program = resolve_program(program_data['program_id'])
        manual_request = serializer.save(student=self.request.user, program=program)

        try:
            from accounts.models import User
            for admin in User.objects.filter(role='admin'):
                Notification.objects.create(
                    user=admin,
                    type='payment',
                    title='Manual Reconciliation Requested',
                    message=f"{manual_request.student.display_name or manual_request.student.email} requested reconciliation of KSh {manual_request.amount:,.2f} ({manual_request.get_payment_method_display()}).",
                    link='/admin/payments?tab=manual-requests',
                )
        except Exception:
            logger.exception('Failed to notify admins about manual payment request %s', manual_request.request_id)

        try:
            send_html_email(
                subject='Manual reconciliation request received - Nexa Academy',
                template_name='manual_reconciliation_received.html',
                context=self._email_context(
                    manual_request,
                    header_label='Manual Reconciliation',
                    preview_text='We received your manual reconciliation request.',
                ),
                recipient_email=manual_request.student.email,
            )
            send_html_email(
                subject=f"Manual reconciliation request - {manual_request.student.display_name or manual_request.student.email}",
                template_name='manager_manual_reconciliation_request.html',
                context=self._email_context(
                    manual_request,
                    header_label='Manual Reconciliation Request',
                    preview_text=f"{manual_request.student.display_name or manual_request.student.email} submitted proof of an off-platform payment.",
                ),
                recipient_email=_admissions_notification_email(),
            )
        except Exception:
            logger.exception('Failed to send manual payment request emails %s', manual_request.request_id)

    def _send_decision_email(self, manual_request):
        decision = manual_request.status
        try:
            send_html_email(
                subject=f"Manual reconciliation request {decision} - Nexa Academy",
                template_name='manual_reconciliation_decision.html',
                context=self._email_context(
                    manual_request,
                    decision=decision,
                    header_label='Manual Reconciliation',
                    preview_text=f"Your manual reconciliation request was {decision}.",
                ),
                recipient_email=manual_request.student.email,
            )
        except Exception:
            logger.exception('Failed to send manual payment decision email %s', manual_request.request_id)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, HasAppPermission('transactions.manage')])
    def approve(self, request, pk=None):
        manual_request = self.get_object()
        if manual_request.status != 'pending':
            return Response({'error': 'Only pending requests can be approved'}, status=status.HTTP_400_BAD_REQUEST)

        admin_notes = request.data.get('admin_notes', '').strip()
        payment = record_manual_payment(
            student=manual_request.student,
            amount=manual_request.amount,
            payment_method=manual_request.payment_method,
            payment_date=manual_request.payment_date,
            reference=manual_request.reference,
            provider_message=manual_request.provider_message,
            program=manual_request.program,
            recorded_by=request.user.email,
            description='Approved manual reconciliation request',
            payment_type='manual',
        )

        manual_request.status = 'approved'
        manual_request.admin_notes = admin_notes
        manual_request.reviewed_by = request.user.email
        manual_request.reviewed_at = timezone.now()
        manual_request.created_payment = payment
        manual_request.save()

        try:
            Notification.objects.create(
                user=manual_request.student,
                type='payment',
                title='Manual Reconciliation Approved',
                message=f"Your payment of KSh {manual_request.amount:,.2f} was approved and applied to your account.",
                link='/student/dashboard',
            )
        except Exception:
            logger.exception('Failed to notify student about approved manual request %s', manual_request.request_id)

        self._send_decision_email(manual_request)
        return Response(self.get_serializer(manual_request).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, HasAppPermission('transactions.manage')])
    def reject(self, request, pk=None):
        manual_request = self.get_object()
        if manual_request.status != 'pending':
            return Response({'error': 'Only pending requests can be rejected'}, status=status.HTTP_400_BAD_REQUEST)

        manual_request.status = 'rejected'
        manual_request.admin_notes = request.data.get('admin_notes', '').strip()
        manual_request.reviewed_by = request.user.email
        manual_request.reviewed_at = timezone.now()
        manual_request.save()

        try:
            Notification.objects.create(
                user=manual_request.student,
                type='payment',
                title='Manual Reconciliation Rejected',
                message=manual_request.admin_notes or 'Your manual reconciliation request was not approved. Contact admissions for details.',
                link='/student/dashboard',
            )
        except Exception:
            logger.exception('Failed to notify student about rejected manual request %s', manual_request.request_id)

        self._send_decision_email(manual_request)
        return Response(self.get_serializer(manual_request).data)


class PaystackWebhookView(APIView):
    """
    Receive Paystack webhook events so payments confirm themselves the moment the
    money clears — the student no longer has to sit through (or retry) client-side
    verification, and payments made outside the popup (e.g. a resumed transaction)
    still reconcile.

    Paystack signs every payload with HMAC-SHA512 over the raw body using our
    secret key; anything that doesn't match is rejected. Authentic events always
    get a 2xx (even ones we intentionally ignore) so Paystack stops retrying, but
    transient processing failures return 5xx so Paystack retries later.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        secret = getattr(settings, 'PAYSTACK_SECRET_KEY', '') or ''
        if not secret:
            logger.error('paystack webhook: PAYSTACK_SECRET_KEY not configured')
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        raw_body = request.body
        signature = request.META.get('HTTP_X_PAYSTACK_SIGNATURE', '')
        expected = hmac.new(secret.encode('utf-8'), raw_body, hashlib.sha512).hexdigest()
        if not signature or not hmac.compare_digest(expected, signature):
            logger.warning('paystack webhook: invalid or missing signature')
            return Response({'error': 'invalid signature'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            event = json.loads(raw_body.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return Response({'error': 'invalid payload'}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event.get('event', '')
        data = event.get('data') or {}
        reference = data.get('reference')

        # Only a successful charge affects a balance. Acknowledge everything else
        # so Paystack does not keep retrying events we intentionally ignore.
        if event_type != 'charge.success' or not reference:
            return Response({'status': 'ignored'}, status=status.HTTP_200_OK)

        try:
            payment = Payment.objects.get(payment_reference=reference)
        except Payment.DoesNotExist:
            logger.warning('paystack webhook: no payment for reference %s', reference)
            return Response({'status': 'unmatched'}, status=status.HTTP_200_OK)

        if payment.status == 'completed':
            return Response({'status': 'already_completed'}, status=status.HTTP_200_OK)

        try:
            PaymentViewSet()._finalize_successful_payment(payment, data, data.get('amount', 0))
        except Exception as exc:
            logger.error('paystack webhook: finalize failed for ref %s: %s', reference, exc, exc_info=True)
            return Response({'error': 'processing failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'status': 'ok'}, status=status.HTTP_200_OK)
