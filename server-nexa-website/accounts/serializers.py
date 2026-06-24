from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import AppPermission, Role, AuditLog

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'


class AppPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppPermission
        fields = ['id', 'codename', 'name', 'resource', 'action']
        read_only_fields = ['id']


class RoleSerializer(serializers.ModelSerializer):
    permissions = AppPermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=AppPermission.objects.all(),
        write_only=True, source='permissions', required=False,
    )
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'slug', 'description', 'is_system', 'permissions', 'permission_ids', 'user_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'is_system', 'created_at', 'updated_at']

    def get_user_count(self, obj):
        return obj.users.filter(role='admin').count()

    def create(self, validated_data):
        perms = validated_data.pop('permissions', [])
        role = Role.objects.create(**validated_data)
        role.permissions.set(perms)
        return role

    def update(self, instance, validated_data):
        perms = validated_data.pop('permissions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if perms is not None:
            instance.permissions.set(perms)
        return instance


class StaffUserSerializer(serializers.ModelSerializer):
    staff_role = RoleSerializer(read_only=True)
    staff_role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), source='staff_role',
        allow_null=True, required=False, write_only=True,
    )
    individual_permissions = AppPermissionSerializer(many=True, read_only=True)
    individual_permission_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=AppPermission.objects.all(),
        source='individual_permissions', required=False, write_only=True,
    )
    effective_permissions = serializers.SerializerMethodField()
    invitation_accepted = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'uid', 'email', 'display_name', 'phone', 'photo_url',
            'role', 'status', 'created_at',
            'staff_role', 'staff_role_id',
            'individual_permissions', 'individual_permission_ids',
            'effective_permissions', 'invitation_accepted',
        ]
        read_only_fields = ['uid', 'email', 'display_name', 'role', 'created_at', 'effective_permissions', 'invitation_accepted']

    def get_effective_permissions(self, obj):
        return obj.get_effective_permissions()

    def get_invitation_accepted(self, obj):
        return obj.has_usable_password()

    def update(self, instance, validated_data):
        individual_perms = validated_data.pop('individual_permissions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if individual_perms is not None:
            instance.individual_permissions.set(individual_perms)
        return instance


class MyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['display_name', 'email', 'phone', 'photo_url']

    def validate_email(self, value):
        value = value.strip().lower()
        qs = User.objects.filter(email=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    # CamelCase aliases for frontend consistency
    feeBalance = serializers.DecimalField(source='fee_balance', max_digits=10, decimal_places=2, read_only=True)
    totalFeePaid = serializers.DecimalField(source='total_fee_paid', max_digits=10, decimal_places=2, read_only=True)
    displayName = serializers.CharField(source='display_name', read_only=True)
    idNumber = serializers.CharField(source='id_number', read_only=True, required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    effectivePermissions = serializers.SerializerMethodField()
    staffRole = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'uid', 'email', 'display_name', 'displayName', 'phone', 'photo_url',
            'role', 'status', 'fee_balance', 'feeBalance', 'total_fee_paid', 'totalFeePaid',
            'id_number', 'idNumber', 'created_at', 'createdAt', 'password',
            'effectivePermissions', 'staffRole',
        ]
        read_only_fields = [
            'uid', 'role', 'status', 'fee_balance', 'feeBalance',
            'total_fee_paid', 'totalFeePaid',
            'display_name', 'displayName', 'id_number', 'idNumber',
            'created_at', 'createdAt', 'effectivePermissions', 'staffRole',
        ]

    def get_effectivePermissions(self, obj):
        return obj.get_effective_permissions()

    def get_staffRole(self, obj):
        if obj.staff_role:
            return RoleSerializer(obj.staff_role).data
        return None

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AuditLogSerializer(serializers.ModelSerializer):
    performed_by = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'action_display', 'resource_type', 'resource_id', 'resource_summary', 'ip_address', 'created_at', 'performed_by']
        read_only_fields = fields

    def get_performed_by(self, obj):
        if obj.user:
            return {'uid': str(obj.user.uid), 'display_name': obj.user.display_name, 'email': obj.user.email}
        return None
