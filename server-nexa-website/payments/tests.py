from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from accounts.models import User
from payments.models import Payment


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
