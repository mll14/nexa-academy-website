from rest_framework import serializers
from .models import NewsletterSubscription, NewsletterCampaign

class NewsletterSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscription
        fields = '__all__'
        read_only_fields = ['subscription_id', 'subscribed_at', 'unsubscribed_at']


class SubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(required=False, allow_blank=True)
    source = serializers.ChoiceField(
        choices=NewsletterSubscription.SOURCE_CHOICES,
        required=False,
        default='website'
    )


class NewsletterCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterCampaign
        fields = '__all__'
        read_only_fields = ['campaign_id', 'status', 'sent_at', 'sent_count', 'failed_count', 'created_at', 'updated_at']