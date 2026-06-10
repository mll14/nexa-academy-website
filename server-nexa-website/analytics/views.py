from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from django.utils import timezone
from .models import Analytics, MonthlyAnalytics
from .serializers import AnalyticsSerializer, MonthlyAnalyticsSerializer
from accounts.models import User
from applications.models import Application
from payments.models import Payment
from programs.models import Enrollment, Certificate, Program
from accounts.permissions import IsAdminUser


class AnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Analytics.objects.all()
    serializer_class = AnalyticsSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get dashboard statistics"""
        # Current month
        now = timezone.now()
        current_month = now.strftime('%Y-%m')

        # Calculate statistics
        total_students = User.objects.filter(role='student').count()
        active_students = User.objects.filter(role='student', status='active').count()
        
        total_applications = Application.objects.count()
        pending_applications = Application.objects.filter(status='pending').count()
        
        total_revenue = Payment.objects.filter(status='completed').aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        outstanding_balance = User.objects.filter(role='student').aggregate(
            total=Sum('fee_balance')
        )['total'] or 0
        
        total_enrollments = Enrollment.objects.count()
        active_enrollments = Enrollment.objects.filter(status='active').count()
        
        certificates_issued = Certificate.objects.count()

        # Get monthly data
        monthly = MonthlyAnalytics.objects.filter(month=current_month).first()
        
        stats = {
            'total_students': total_students,
            'active_students': active_students,
            'total_applications': total_applications,
            'pending_applications': pending_applications,
            'total_revenue': float(total_revenue),
            'outstanding_balance': float(outstanding_balance),
            'total_enrollments': total_enrollments,
            'active_enrollments': active_enrollments,
            'certificates_issued': certificates_issued,
            'current_month': current_month,
            'monthly_data': MonthlyAnalyticsSerializer(monthly).data if monthly else None
        }

        return Response(stats)

    @action(detail=False, methods=['get'])
    def refresh(self, request):
        """Refresh analytics data (admin only)"""
        from django.db import transaction
        
        with transaction.atomic():
            now = timezone.now()
            current_month = now.strftime('%Y-%m')
            
            # Calculate monthly stats
            monthly_stats = {
                'new_students': User.objects.filter(
                    role='student',
                    created_at__year=now.year,
                    created_at__month=now.month
                ).count(),
                'total_enrollments': Enrollment.objects.filter(
                    enrollment_date__year=now.year,
                    enrollment_date__month=now.month
                ).count(),
                'revenue': Payment.objects.filter(
                    status='completed',
                    payment_date__year=now.year,
                    payment_date__month=now.month
                ).aggregate(total=Sum('amount'))['total'] or 0,
                'completed_programs': Enrollment.objects.filter(
                    status='completed',
                    end_date__year=now.year,
                    end_date__month=now.month
                ).count(),
                'certificates_issued': Certificate.objects.filter(
                    issued_date__year=now.year,
                    issued_date__month=now.month
                ).count(),
                'outstanding_dues': User.objects.filter(role='student').aggregate(
                    total=Sum('fee_balance')
                )['total'] or 0,
            }

            # Update or create monthly analytics
            monthly, created = MonthlyAnalytics.objects.update_or_create(
                month=current_month,
                defaults=monthly_stats
            )

            # Update individual metrics
            metrics = [
                ('total_students', User.objects.filter(role='student').count(), 'all-time'),
                ('active_students', User.objects.filter(role='student', status='active').count(), 'all-time'),
                ('total_revenue', Payment.objects.filter(status='completed').aggregate(Sum('amount'))['total'] or 0, 'all-time'),
                ('total_enrollments', Enrollment.objects.count(), 'all-time'),
                ('certificates_issued', Certificate.objects.count(), 'all-time'),
            ]

            for metric_name, metric_value, period in metrics:
                Analytics.objects.update_or_create(
                    metric_name=metric_name,
                    period=period,
                    defaults={'metric_value': metric_value}
                )

        return Response({
            'success': True,
            'message': 'Analytics refreshed',
            'monthly': MonthlyAnalyticsSerializer(monthly).data
        })

    @action(detail=False, methods=['get'])
    def program_breakdown(self, request):
        """Get program enrollment and revenue breakdown"""
        breakdown = []
        programs = Program.objects.filter(status='active')
        
        for program in programs:
            enrollments = Enrollment.objects.filter(program=program)
            revenue = Payment.objects.filter(
                program=program,
                status='completed'
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            breakdown.append({
                'program_id': str(program.program_id),
                'program_name': program.program_name,
                'enrollments': enrollments.count(),
                'active_enrollments': enrollments.filter(status='active').count(),
                'completed_enrollments': enrollments.filter(status='completed').count(),
                'revenue': float(revenue),
                'price': float(program.price)
            })
        
        return Response(breakdown)


from rest_framework.views import APIView
import os
import requests


class ExternalSearchView(APIView):
    """Proxy endpoint to perform a simple web search (Bing) and return top results.

    Provide `BING_SEARCH_KEY` (or `BING_API_KEY`) in the environment to enable. If not configured,
    the endpoint returns 501 so the frontend knows web fallback isn't available.
    """

    permission_classes = []

    def get(self, request):
        q = request.query_params.get('q')
        if not q:
            return Response({'error': 'missing query (q) parameter'}, status=400)

        api_key = os.environ.get('BING_SEARCH_KEY') or os.environ.get('BING_API_KEY')
        if not api_key:
            return Response({'error': 'search provider not configured'}, status=501)

        endpoint = 'https://api.bing.microsoft.com/v7.0/search'
        try:
            resp = requests.get(endpoint, headers={'Ocp-Apim-Subscription-Key': api_key}, params={'q': q, 'mkt': 'en-US', 'count': 5}, timeout=8)
        except requests.RequestException as exc:
            return Response({'error': 'search failed', 'detail': str(exc)}, status=502)

        if resp.status_code != 200:
            return Response({'error': 'search failed', 'status': resp.status_code}, status=502)

        data = resp.json()
        web = data.get('webPages', {}).get('value', [])
        results = []
        for item in web[:5]:
            results.append({'title': item.get('name'), 'url': item.get('url'), 'snippet': item.get('snippet')})

        return Response({'results': results})