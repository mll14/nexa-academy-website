from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Q
from django.db.models.functions import Coalesce
from django.conf import settings
from decimal import Decimal
from ubuntu_labs.email_utils import send_html_email
from .models import Payment, PaymentHistory
from .serializers import PaymentSerializer, PaymentHistorySerializer, ProcessPaymentSerializer
from programs.models import Program, Enrollment
from accounts.permissions import IsAdminUser
from notifications.models import Notification
from .paystack import PaystackProvider
import uuid
import logging
from applications.models import Application, ApplicationLog

logger = logging.getLogger(__name__)


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
                            enrollment, _ = Enrollment.objects.get_or_create(
                                student=request.user,
                                program=prog,
                                defaults={
                                    'student_name': request.user.display_name,
                                    'program_name': prog.program_name,
                                    'amount': prog.price,
                                    'amount_paid': Decimal('0.00'),
                                    'balance': prog.price,
                                    'status': 'active',
                                }
                            )
                            if enrollment.amount != prog.price:
                                enrollment.amount = prog.price
                                enrollment.program_name = prog.program_name
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

            # Recompute totals from DB — never use arithmetic
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
                    }
                )
                if enrollment.amount != program.price:
                    enrollment.amount = program.price
                    enrollment.program_name = program.name
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
                context = {
                    'display_name': student.display_name,
                    'amount': f"KSh {amount:,.2f}",
                    'reference': payment.payment_reference,
                    'frontend_url': settings.FRONTEND_URL,
                }
                send_html_email(
                    subject='Payment Confirmation - Nexa Academy',
                    template_name='payment_confirmation.html',
                    context=context,
                    recipient_email=student.email,
                )
            except Exception:
                pass

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

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
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
                        'program_name': prog.program_name,
                        'amount': prog.price,
                        'amount_paid': Decimal('0.00'),
                        'balance': prog.price,
                        'status': 'active',
                    }
                )
                if enrollment.amount != prog.price:
                    enrollment.amount = prog.price
                    enrollment.program_name = prog.program_name
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

        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
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

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
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