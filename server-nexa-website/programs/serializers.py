from rest_framework import serializers
from .models import Program, Enrollment, StudentProgramEnrolled, ProgramProgress, Certificate, ProgramInterest, ProgramIntake, HelpMeLead, IncompleteApplication, PaymentPlanChangeRequest
from accounts.serializers import UserSerializer

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
        read_only_fields = ['enrollment_id', 'enrollment_date', 'student_name', 'program_name']


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
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Choose a payment plan')
        return value

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
        fields = ['id', 'program_slug', 'program_name', 'name', 'email', 'phone', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']


class HelpMeLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = HelpMeLead
        fields = ['id', 'name', 'email', 'phone', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']


class IncompleteApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncompleteApplication
        fields = ['id', 'name', 'email', 'phone', 'program_slug', 'program_name', 'step_reached', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProgramIntakeSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)

    class Meta:
        model = ProgramIntake
        fields = [
            'id', 'program', 'program_name', 'start_date', 'end_date',
            'application_deadline', 'max_seats', 'seats_remaining',
            'status', 'notes', 'source', 'cms_id', 'last_synced_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'source', 'cms_id', 'last_synced_at', 'created_at', 'updated_at']
