from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers
from .models import Program, Enrollment, StudentProgramEnrolled, ProgramProgress, Certificate, ProgramInterest, ProgramIntake, HelpMeLead, IncompleteApplication, LeadAdminNote, PaymentPlanChangeRequest
from accounts.serializers import UserSerializer

PAYMENT_PLAN_LABELS = {
    'full': 'One-time Payment',
    'one-time payment': 'One-time Payment',
    'full payment': 'One-time Payment',
    '2 installments': '2 Installments',
    '2 instalments': '2 Installments',
    '2-installments': '2 Installments',
    'installment2': '2 Installments',
    '3 installments': '3 Installments',
    '3 instalments': '3 Installments',
    '3-installments': '3 Installments',
    'installment3': '3 Installments',
}


def normalize_payment_plan(value):
    key = (value or '').strip().lower()
    return PAYMENT_PLAN_LABELS.get(key)


def payment_plan_key(value):
    normalized = (value or '').strip().lower()
    if normalized in ('', 'full', 'one-time payment', 'full payment'):
        return 'full'
    if '3' in normalized:
        return 'installment3'
    if '2' in normalized:
        return 'installment2'
    return 'full'


def _round_to_nearest_500(value):
    return (Decimal(value) / Decimal('500')).quantize(Decimal('1'), rounding=ROUND_HALF_UP) * Decimal('500')


def calculate_fee_structure(base_amount, payment_plan):
    base = Decimal(str(base_amount or 0))
    plan = payment_plan_key(payment_plan)
    if plan == 'installment3':
        installment = _round_to_nearest_500((base * Decimal('1.20')) / Decimal('3'))
        return installment * Decimal('3'), installment
    if plan == 'installment2':
        installment = _round_to_nearest_500((base * Decimal('1.10')) / Decimal('2'))
        return installment * Decimal('2'), installment
    return base, None


class ProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = ['program_id', 'slug', 'name', 'price', 'original_price',
                  'status', 'coming_soon', 'sanity_id', 'created_at', 'updated_at']
        read_only_fields = ['program_id', 'slug', 'sanity_id', 'created_at', 'updated_at']


class EnrollmentSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    program_details = ProgramSerializer(source='program', read_only=True)

    class Meta:
        model = Enrollment
        fields = '__all__'
        read_only_fields = [
            'enrollment_id', 'enrollment_date', 'student_name', 'program_name',
            'discount_type', 'discount_value', 'discount_amount', 'discount_reason',
            'discount_granted_by', 'discount_granted_at',
        ]


class PaymentPlanChangeRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    student_email = serializers.EmailField(source='student.email', read_only=True)
    program_name = serializers.CharField(source='enrollment.program_name', read_only=True)
    enrollment_amount = serializers.DecimalField(source='enrollment.amount', max_digits=10, decimal_places=2, read_only=True)
    enrollment_balance = serializers.DecimalField(source='enrollment.balance', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = PaymentPlanChangeRequest
        fields = [
            'request_id', 'enrollment', 'student', 'student_name', 'student_email',
            'program_name', 'enrollment_amount', 'enrollment_balance',
            'current_payment_plan', 'current_installment_amount',
            'requested_payment_plan', 'requested_installment_amount', 'reason',
            'status', 'admin_notes', 'approved_payment_plan',
            'approved_installment_amount', 'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'request_id', 'student', 'student_name', 'student_email',
            'program_name', 'enrollment_amount', 'enrollment_balance',
            'current_payment_plan', 'current_installment_amount',
            'status', 'admin_notes', 'approved_payment_plan',
            'approved_installment_amount', 'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at',
        ]

    def validate_requested_payment_plan(self, value):
        normalized = normalize_payment_plan(value)
        if not normalized:
            raise serializers.ValidationError('Choose One-time Payment, 2 Installments, or 3 Installments')
        return normalized

    def validate_requested_installment_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Enter a valid installment amount')
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        enrollment = attrs.get('enrollment')
        user = getattr(request, 'user', None)

        if not enrollment:
            raise serializers.ValidationError({'enrollment': 'Enrollment is required'})

        if getattr(user, 'role', None) != 'admin' and enrollment.student_id != getattr(user, 'uid', None):
            raise serializers.ValidationError({'enrollment': 'You can only request changes for your own enrollment'})

        if PaymentPlanChangeRequest.objects.filter(enrollment=enrollment, status='pending').exists():
            raise serializers.ValidationError('There is already a pending payment plan change request for this enrollment')

        return attrs

    def create(self, validated_data):
        enrollment = validated_data['enrollment']
        validated_data['student'] = enrollment.student
        validated_data['current_payment_plan'] = enrollment.payment_plan
        validated_data['current_installment_amount'] = enrollment.installment_amount
        return super().create(validated_data)


class StudentProgramEnrolledSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProgramEnrolled
        fields = '__all__'
        read_only_fields = ['id']


class ProgramProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramProgress
        fields = '__all__'
        read_only_fields = ['id', 'updated_at']


class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = '__all__'
        read_only_fields = ['certificate_id', 'issued_date', 'certificate_number', 'verification_code', 'verification_url']


class SimpleProgramProgressSerializer(serializers.ModelSerializer):
    """Simplified version for student dashboard"""
    class Meta:
        model = ProgramProgress
        fields = ['program_name', 'completion_percentage', 'status', 'last_accessed_at', 'certificate_earned']


class EnrollStudentSerializer(serializers.Serializer):
    program_id = serializers.UUIDField()
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)


class ProgramInterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramInterest
        fields = ['id', 'program_slug', 'program_name', 'name', 'email', 'phone', 'message',
                  'lead_status', 'follow_up_completed', 'follow_up_completed_at', 'created_at']
        read_only_fields = ['id', 'created_at', 'follow_up_completed_at']


class HelpMeLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = HelpMeLead
        fields = ['id', 'name', 'email', 'phone', 'message',
                  'lead_status', 'follow_up_completed', 'follow_up_completed_at',
                  'assigned_program_slug', 'assigned_program_name',
                  'converted_to_pipeline', 'converted_at',
                  'created_at']
        read_only_fields = ['id', 'created_at', 'follow_up_completed_at', 'converted_at']


class IncompleteApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncompleteApplication
        fields = ['id', 'name', 'email', 'phone', 'program_slug', 'program_name', 'step_reached',
                  'lead_status', 'follow_up_completed', 'follow_up_completed_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'follow_up_completed_at']


class LeadAdminNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadAdminNote
        fields = [
            'id', 'lead_type', 'lead_id', 'stage', 'html', 'text',
            'created_by', 'created_by_name', 'created_by_email', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_by_email', 'created_at']

    def validate(self, attrs):
        lead_type = attrs.get('lead_type')
        lead_id = attrs.get('lead_id')
        model_by_type = {
            'program_interest': ProgramInterest,
            'help_me': HelpMeLead,
            'incomplete_application': IncompleteApplication,
        }
        model = model_by_type.get(lead_type)
        if not model:
            raise serializers.ValidationError({'lead_type': 'Choose a valid lead type'})
        if not model.objects.filter(id=lead_id).exists():
            raise serializers.ValidationError({'lead_id': 'Lead not found'})
        if not (attrs.get('html') or '').strip():
            raise serializers.ValidationError({'html': 'Note content is required'})
        return attrs


class ProgramIntakeSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)

    class Meta:
        model = ProgramIntake
        fields = [
            'id', 'program', 'program_name', 'start_date', 'end_date',
            'application_deadline', 'max_seats', 'seats_remaining',
            'status', 'mode', 'notes', 'source', 'cms_id', 'last_synced_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'source', 'cms_id', 'last_synced_at', 'created_at', 'updated_at']
