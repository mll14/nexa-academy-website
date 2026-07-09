from rest_framework import serializers
from .models import Payment, PaymentHistory, ManualPaymentRequest

class PaymentSerializer(serializers.ModelSerializer):
    # Explicit student_uid so consumers can link directly to the student profile
    # without knowing that User.uid is the PK. student_id IS the uid UUID.
    student_uid = serializers.SerializerMethodField()

    def get_student_uid(self, obj):
        return str(obj.student_id) if obj.student_id else None

    class Meta:
        model = Payment
        fields = [
            'payment_id',
            'student',
            'student_uid',
            'student_name',
            'student_email',
            'amount',
            'payment_method',
            'payment_reference',
            'transaction_id',
            'program_name',
            'status',
            'source',
            'provider_message',
            'recorded_by',
            'description',
            'payment_date',
            'confirmed_at',
            'created_at',
        ]
        read_only_fields = ['payment_id', 'student_uid', 'source', 'recorded_by', 'created_at', 'confirmed_at']


class ManualPaymentEntrySerializer(serializers.Serializer):
    """Admin direct entry of an off-platform payment.

    The student is identified either directly by ``student_uid`` (enrolled-student
    page) or indirectly by ``application_id`` (application page), where the view
    resolves the applicant's account by FK or by email.
    """
    student_uid = serializers.UUIDField(required=False)
    application_id = serializers.UUIDField(required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHOD_CHOICES)
    payment_date = serializers.DateField(required=False)
    reference = serializers.CharField(required=False, allow_blank=True)
    provider_message = serializers.CharField(required=False, allow_blank=True)
    # A UUID from the enrolled-student page or a program slug from the application
    # page — the view hands both to resolve_program().
    program_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Enter a valid payment amount')
        return value

    def validate(self, attrs):
        if not attrs.get('student_uid') and not attrs.get('application_id'):
            raise serializers.ValidationError('Provide either student_uid or application_id.')
        return attrs


class ManualPaymentRequestSerializer(serializers.ModelSerializer):
    student_uid = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    program_id = serializers.UUIDField(source='program.program_id', required=False, allow_null=True, write_only=True)

    def get_student_uid(self, obj):
        return str(obj.student_id) if obj.student_id else None

    def get_student_name(self, obj):
        return obj.student.display_name if obj.student_id else ''

    def get_student_email(self, obj):
        return obj.student.email if obj.student_id else ''

    class Meta:
        model = ManualPaymentRequest
        fields = [
            'request_id',
            'student_uid',
            'student_name',
            'student_email',
            'program_id',
            'amount',
            'payment_method',
            'payment_date',
            'reference',
            'provider_message',
            'status',
            'admin_notes',
            'reviewed_by',
            'reviewed_at',
            'created_payment',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'request_id', 'student_uid', 'student_name', 'student_email',
            'status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'created_payment',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'provider_message': {'required': True, 'allow_blank': False},
            'amount': {'required': True},
            'payment_method': {'required': True},
            'payment_date': {'required': True},
            'reference': {'required': False, 'allow_blank': True},
        }

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Enter a valid payment amount')
        return value


class PaymentHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ProcessPaymentSerializer(serializers.Serializer):
    # Accept snake_case keys from frontend
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHOD_CHOICES)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    mobile_number = serializers.CharField(required=False, allow_blank=True)
    program_id = serializers.UUIDField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate_amount(self, value):
        try:
            if value <= 0:
                raise serializers.ValidationError("Enter a valid payment amount")
        except TypeError:
            raise serializers.ValidationError("Invalid amount")
        return value