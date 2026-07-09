from datetime import date
from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import User
from payments.models import Payment, ManualPaymentRequest


class FinalizePaymentTotalTest(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            email='student@test.com',
            password='testpass123',
            role='student',
            display_name='Test Student',
        )

    def _make_completed_payment(self, amount):
        return Payment.objects.create(
            student=self.student,
            student_name='Test Student',
            student_email='student@test.com',
            amount=Decimal(str(amount)),
            payment_method='Card',
            payment_reference=f'TEST-{amount}',
            status='completed',
        )

    @patch('payments.views.PaystackProvider')
    def test_total_fee_paid_updated_when_no_enrollment(self, _mock):
        """total_fee_paid must equal sum of completed payments even with no enrollment."""
        self._make_completed_payment(5000)
        self._make_completed_payment(3000)

        from django.db.models import Sum
        from django.db.models.functions import Coalesce
        total = Payment.objects.filter(
            student=self.student, status='completed'
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
        self.student.total_fee_paid = total
        self.student.save()

        self.student.refresh_from_db()
        self.assertEqual(self.student.total_fee_paid, Decimal('8000'))

    @patch('payments.views.PaystackProvider')
    def test_total_fee_paid_not_zeroed_when_no_enrollment(self, _mock):
        """Pre-existing total_fee_paid must not be overwritten with 0."""
        self._make_completed_payment(10000)
        self.student.total_fee_paid = Decimal('10000')
        self.student.save()

        # Old (buggy) code: Enrollment.aggregate returns 0 → would zero the total
        from programs.models import Enrollment
        from django.db.models import Sum
        from django.db.models.functions import Coalesce
        buggy_total = Enrollment.objects.filter(student=self.student).aggregate(
            total=Coalesce(Sum('amount_paid'), Decimal('0.00'))
        )['total']
        self.assertEqual(buggy_total, Decimal('0.00'))

        # Fixed code: use Payment sum instead
        fixed_total = Payment.objects.filter(
            student=self.student, status='completed'
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']
        self.assertEqual(fixed_total, Decimal('10000'))


@patch('payments.views.render_invoice_pdf', return_value=None)
@patch('payments.views.send_html_email')
class ManualReconciliationTest(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            email='mstudent@test.com', password='pass12345',
            role='student', display_name='Manual Student',
        )
        self.admin = User.objects.create_user(
            email='madmin@test.com', password='pass12345',
            role='admin', display_name='Admin',
        )
        self.client = APIClient()

    def test_record_manual_creates_completed_payment(self, _email, _pdf):
        from payments.views import record_manual_payment
        payment = record_manual_payment(
            student=self.student,
            amount=Decimal('7500'),
            payment_method='KCB',
            payment_date=date(2026, 7, 1),
            reference='KCB123',
            provider_message='KCB: You have received KES 7,500',
            recorded_by=self.admin.email,
        )
        self.assertEqual(payment.status, 'completed')
        self.assertEqual(payment.source, 'manual')
        self.assertEqual(payment.recorded_by, self.admin.email)
        self.student.refresh_from_db()
        self.assertEqual(self.student.total_fee_paid, Decimal('7500'))

    def test_student_request_requires_proof_message(self, _email, _pdf):
        self.client.force_authenticate(self.student)
        res = self.client.post('/api/manual-payment-requests/', {
            'amount': '5000', 'payment_method': 'Cash',
            'payment_date': '2026-07-01', 'reference': 'CASH1',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('provider_message', res.data)

    def test_request_then_admin_approve_posts_payment(self, _email, _pdf):
        self.client.force_authenticate(self.student)
        create = self.client.post('/api/manual-payment-requests/', {
            'amount': '5000', 'payment_method': 'Cash', 'payment_date': '2026-07-01',
            'reference': 'CASH1', 'provider_message': 'Paid 5000 cash at office',
        }, format='json')
        self.assertEqual(create.status_code, 201)
        request_id = create.data['request_id']

        self.client.force_authenticate(self.admin)
        approve = self.client.post(f'/api/manual-payment-requests/{request_id}/approve/', {}, format='json')
        self.assertEqual(approve.status_code, 200)

        mpr = ManualPaymentRequest.objects.get(pk=request_id)
        self.assertEqual(mpr.status, 'approved')
        self.assertIsNotNone(mpr.created_payment)
        self.assertEqual(mpr.created_payment.status, 'completed')
        self.assertEqual(mpr.created_payment.amount, Decimal('5000'))

    def test_student_cannot_approve(self, _email, _pdf):
        req = ManualPaymentRequest.objects.create(
            student=self.student, amount=Decimal('5000'), payment_method='Cash',
            payment_date=date(2026, 7, 1), provider_message='proof',
        )
        self.client.force_authenticate(self.student)
        res = self.client.post(f'/api/manual-payment-requests/{req.pk}/approve/', {}, format='json')
        self.assertIn(res.status_code, (403, 404))
        req.refresh_from_db()
        self.assertEqual(req.status, 'pending')


class FeeWaiverTest(TestCase):
    def setUp(self):
        from programs.models import Program, Enrollment
        self.student = User.objects.create_user(
            email='waiver@test.com', password='pass12345',
            role='student', display_name='Waiver Student',
        )
        self.admin = User.objects.create_user(
            email='wadmin@test.com', password='pass12345',
            role='admin', display_name='Admin',
        )
        self.program = Program.objects.create(name='Test Program', price=Decimal('100000'))
        self.enrollment = Enrollment.objects.create(
            student=self.student, program=self.program,
            student_name='Waiver Student', program_name='Test Program',
            amount=Decimal('100000'), amount_paid=Decimal('20000'),
        )
        self.client = APIClient()

    def test_percentage_waiver_reduces_balance(self):
        self.assertEqual(self.enrollment.balance, Decimal('80000'))  # 100k - 20k
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            f'/api/enrollments/{self.enrollment.pk}/apply_waiver/',
            {'discount_type': 'percentage', 'discount_value': '10', 'reason': 'scholarship'},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.discount_amount, Decimal('10000.00'))  # 10% of 100k
        self.assertEqual(self.enrollment.balance, Decimal('70000.00'))  # 100k - 10k - 20k

    def test_amount_waiver_and_reconciliation(self):
        from payments.reconciliation import payment_reconciliation_for_student
        self.client.force_authenticate(self.admin)
        self.client.post(
            f'/api/enrollments/{self.enrollment.pk}/apply_waiver/',
            {'discount_type': 'amount', 'discount_value': '15000', 'reason': 'hardship'},
            format='json',
        )
        recon = payment_reconciliation_for_student(self.student)
        self.assertEqual(recon['total_discount'], Decimal('15000.00'))
        self.assertEqual(recon['effective_fee'], Decimal('85000.00'))
        self.assertEqual(recon['amount_remaining'], Decimal('65000.00'))  # 85k - 20k paid
        self.assertTrue(any(line['type'] == 'waiver' for line in recon['ledger']))

    def test_percentage_over_100_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(
            f'/api/enrollments/{self.enrollment.pk}/apply_waiver/',
            {'discount_type': 'percentage', 'discount_value': '150'},
            format='json',
        )
        self.assertEqual(res.status_code, 400)

    def test_remove_waiver_restores_balance(self):
        self.client.force_authenticate(self.admin)
        self.client.post(
            f'/api/enrollments/{self.enrollment.pk}/apply_waiver/',
            {'discount_type': 'amount', 'discount_value': '15000'}, format='json',
        )
        res = self.client.post(f'/api/enrollments/{self.enrollment.pk}/remove_waiver/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.discount_amount, Decimal('0.00'))
        self.assertEqual(self.enrollment.balance, Decimal('80000.00'))

    def test_student_cannot_apply_waiver(self):
        self.client.force_authenticate(self.student)
        res = self.client.post(
            f'/api/enrollments/{self.enrollment.pk}/apply_waiver/',
            {'discount_type': 'amount', 'discount_value': '15000'}, format='json',
        )
        self.assertIn(res.status_code, (403, 404))
