from rest_framework import serializers
from .models import Analytics, MonthlyAnalytics

class AnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Analytics
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class MonthlyAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyAnalytics
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']