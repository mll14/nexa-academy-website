from rest_framework import serializers
from .models import Payment, PaymentHistory

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
            'description',
            'payment_date',
            'confirmed_at',
            'created_at',
        ]
        read_only_fields = ['payment_id', 'student_uid', 'created_at', 'confirmed_at']


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