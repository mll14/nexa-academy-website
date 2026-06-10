from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    # CamelCase aliases for frontend consistency
    feeBalance = serializers.DecimalField(source='fee_balance', max_digits=10, decimal_places=2, read_only=True)
    totalFeePaid = serializers.DecimalField(source='total_fee_paid', max_digits=10, decimal_places=2, read_only=True)
    displayName = serializers.CharField(source='display_name', read_only=True)
    idNumber = serializers.CharField(source='id_number', read_only=True, required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = User
        fields = ['uid', 'email', 'display_name', 'displayName', 'phone', 'photo_url', 
                 'role', 'status', 'fee_balance', 'feeBalance', 'total_fee_paid', 'totalFeePaid', 'id_number', 'idNumber', 
                 'created_at', 'createdAt', 'password']
        read_only_fields = ['uid', 'role', 'status', 'fee_balance', 'feeBalance', 
                           'total_fee_paid', 'totalFeePaid',
                           'display_name', 'displayName', 'id_number', 'idNumber', 
                           'created_at', 'createdAt']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user