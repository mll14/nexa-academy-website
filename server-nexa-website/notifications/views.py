from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import Notification
from .serializers import NotificationSerializer, CreateNotificationSerializer, CreateGroupNotificationSerializer
from accounts.permissions import IsAdminUser
from programs.models import Program

User = get_user_model()


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['type', 'read']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Notification.objects.all()
        return Notification.objects.filter(user=user)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_as_read()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(read=False).update(read=True)
        return Response({'success': True})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def create_for_user(self, request):
        """Admin endpoint to create notification for a user"""
        serializer = CreateNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = get_object_or_404(User, uid=serializer.validated_data['user_id'])

        notification = Notification.objects.create(
            user=user,
            type=serializer.validated_data['type'],
            title=serializer.validated_data['title'],
            message=serializer.validated_data['message'],
            link=serializer.validated_data.get('link', '')
        )

        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def create_for_group(self, request):
        """Admin endpoint to send a notification to all users in a group preset."""
        from applications.models import Application

        serializer = CreateGroupNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group = serializer.validated_data['group']

        qs = Application.objects.filter(user__isnull=False)

        if group == 'all':
            pass
        elif group in ('pending', 'approved', 'enrolled'):
            qs = qs.filter(status=group)
        elif group.startswith('program:'):
            slug = group[len('program:'):]
            qs = qs.filter(program=slug)

        user_ids = list(qs.values_list('user', flat=True).distinct())
        users = User.objects.filter(uid__in=user_ids)

        notifications = [
            Notification(
                user=user,
                type=serializer.validated_data['type'],
                title=serializer.validated_data['title'],
                message=serializer.validated_data['message'],
                link=serializer.validated_data.get('link', ''),
            )
            for user in users
        ]
        Notification.objects.bulk_create(notifications)

        return Response({'sent_count': len(notifications)}, status=status.HTTP_201_CREATED)


class ChatView(APIView):
    """Simple chatbot endpoint for frontend widget.

    Accepts POST { message: str } and returns { reply: str }.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data or {}
        message = (data.get('message') or '').strip()
        if not message:
            return Response({'error': 'No message provided.'}, status=status.HTTP_400_BAD_REQUEST)
        reply = self.generate_reply(message)
        return Response({'reply': reply})

    def url(self, path: str) -> str:
        """Return a full URL using the configured FRONTEND_URL (prod or dev)."""
        from django.conf import settings
        base = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
        return f"{base}{path}"

    def generate_reply(self, message: str) -> str:
        text = message.lower()

        # ── Static knowledge from frontend data files ──────────────────────────
        SE = {
            'name': 'Software Engineering',
            'duration': '6 months',
            'price': 150000,
            'original_price': 175000,
            'discount': '14%',
            'seats': 24,
            'start_dates': ['11 May 2026'],
            'deadline': '4 May 2026',
            'level': 'Beginner to Advanced',
            'slug': 'software-engineering',
            'curriculum': [
                'Month 1 — Frontend Basics: CLI, Git/GitHub, HTML, CSS, Tailwind, JavaScript ES6',
                'Month 2 — React: Components, Hooks, Redux, API integration, Firebase/Supabase',
                'Month 3 — Python: Syntax, OOP, data structures, files and APIs',
                'Month 4 — Django: ORM, PostgreSQL, DRF, auth and permissions',
                'Month 5 — Full-Stack Integration: React ↔ Django, testing, performance',
                'Month 6 — Capstone & DevOps: Docker, CI/CD, cloud deployment',
            ],
            'tools': 'React, Python, Django, PostgreSQL, Azure, Docker, Git',
            'outcomes': [
                'Build responsive frontends with HTML, CSS, Tailwind, and JavaScript',
                'Develop React apps with Hooks, Redux, and API integrations',
                'Write backend services with Python and Django REST Framework',
                'Deploy full-stack applications with Docker and CI/CD workflows',
                'Ship a production-ready capstone for your portfolio',
            ],
            'faq': [
                ('Do I need prior experience?', 'No. We start from fundamentals. Complete beginners can succeed with dedication.'),
                ('What projects will I build?', '6+ projects: portfolio site, e-commerce catalog, blog API, social dashboard, chat app, and a capstone.'),
                ('Will I get a certificate?', 'Yes — a verified certificate from Nexa Academy on completion.'),
                ('What support is available?', 'Weekly 1:1 mentorship, community Discord, live Q&A sessions, and code reviews.'),
            ],
        }
        CLOUD = {
            'name': 'Cloud Computing Program',
            'duration': '3 months',
            'price': 120000,
            'original_price': 145000,
            'discount': '17%',
            'seats': 20,
            'start_dates': ['1 June 2026'],
            'deadline': '25 May 2026',
            'level': 'Advanced',
            'slug': 'cloud',
            'curriculum': [
                'Month 1 — Cloud Foundations & Azure Core: IaaS/PaaS/SaaS, networking, storage, RBAC, monitoring',
                'Month 2 — Data, Analytics & AI: Microsoft Fabric, Power BI, Azure OpenAI, prompt design',
                'Month 3 — Cloud + AI Engineering: CI/CD, testing, incident response, capstone & cert prep (AZ-104, DP-600)',
            ],
            'tools': 'Azure Portal, Microsoft Fabric, Power BI, Azure DevOps, GitHub Actions, KQL, Azure Sentinel',
            'outcomes': [
                'Provision and manage secure Azure cloud infrastructure',
                'Design analytics workflows with Microsoft Fabric and Power BI',
                'Apply Azure OpenAI in practical business workflows',
                'Implement CI/CD and monitoring for cloud and data services',
                'Prepare for AZ-104 and DP-600 certifications',
            ],
            'faq': [
                ('What background is required?', 'Basic IT and networking concepts are helpful. No prior cloud experience required.'),
                ('Will I get hands-on Azure experience?', 'Yes — lab-heavy with Azure credits, operational simulations, and deployment workflows.'),
                ('What certifications does it prepare for?', 'AZ-104 (Azure Administrator) and DP-600 (Fabric Analytics Engineer).'),
                ('Career paths?', 'Cloud Support Engineer, Azure Administrator, Fabric Analytics Engineer, Site Reliability Engineer.'),
            ],
        }
        PAYMENT_PLANS = (
            "Software Engineering (base KSh 150,000): "
            "one-time KSh 150,000 (saves KSh 30,000 vs 3-instalment) | "
            "2 instalments of KSh 82,500 each = KSh 165,000 total, 10% surcharge (saves KSh 15,000 vs 3-instalment) | "
            "3 instalments of KSh 60,000 each = KSh 180,000 total, 20% surcharge. "
            "Cloud Computing (base KSh 120,000): "
            "one-time KSh 120,000 (saves KSh 24,000 vs 3-instalment) | "
            "2 instalments of KSh 66,000 each = KSh 132,000 total, 10% surcharge (saves KSh 12,000 vs 3-instalment) | "
            "3 instalments of KSh 48,000 each = KSh 144,000 total, 20% surcharge. "
            "Minimum deposit KSh 10,000 to confirm enrolment."
        )
        GENERAL_FAQS = [
            ('What is Nexa Academy?', 'Nexa Academy is a tech education platform based in Kenya offering practical, project-based training in Software Engineering and Cloud Computing & AI.'),
            ('How long does the admission process take?', 'Applications are reviewed within 24–48 hours. Approved applicants receive payment instructions and onboarding details.'),
            ('Are certificates internationally recognized?', 'Yes — our certificates include verifiable digital credentials and align with practical industry expectations.'),
            ('What admission requirements are there?', 'Basic computer literacy for all programs. Programming knowledge is helpful for SE but not required. Basic IT concepts help for Cloud.'),
        ]

        # ── Also check live DB programs for real start dates ──────────────────
        db_programs = list(Program.objects.filter(status='active').order_by('-created_at')[:10])

        def db_program(keywords):
            for p in db_programs:
                name = (p.program_name or '').lower()
                if any(k in name or k in text for k in keywords):
                    return p
            return None

        db_se = db_program(['software engineering', 'software', 'engineering', 'fullstack', 'full stack', 'full-stack'])
        db_cloud = db_program(['cloud', 'azure', 'ai', 'data', 'power bi', 'fabric'])

        # ── Route helpers ─────────────────────────────────────────────────────
        programs_url = self.url('/programs')
        se_url = self.url(f"/programs/{SE['slug']}")
        cloud_url = self.url(f"/programs/{CLOUD['slug']}")
        apply_url = self.url('/apply')
        faq_url = self.url('/faq')

        # ── Intent matching ────────────────────────────────────────────────────

        # --- What programs do you offer ---
        if any(k in text for k in ['what programs', 'programs do you', 'courses', 'offer', 'available programs']):
            return (
                f"We offer two programs:\n\n"
                f"1. {SE['name']} ({SE['duration']}, {SE['level']}) — KSh {SE['price']:,}\n"
                f"   Next intake: {', '.join(SE['start_dates'])} | {se_url}\n\n"
                f"2. {CLOUD['name']} ({CLOUD['duration']}, {CLOUD['level']}) — KSh {CLOUD['price']:,}\n"
                f"   Next intake: {', '.join(CLOUD['start_dates'])} | {cloud_url}\n\n"
                f"View all programs: {programs_url}"
            )

        # --- Software Engineering details ---
        if any(k in text for k in ['software engineering', 'full stack', 'fullstack', 'web development', 'frontend', 'backend', 'react', 'django', 'python']):
            start = db_se.start_date.strftime('%-d %B %Y') if db_se and getattr(db_se, 'start_date', None) else SE['start_dates'][0]
            curriculum_summary = '\n'.join(f"   • {c}" for c in SE['curriculum'])
            return (
                f"{SE['name']} — {SE['duration']} | {SE['level']}\n\n"
                f"Price: KSh {SE['price']:,} (was KSh {SE['original_price']:,}, {SE['discount']} off)\n"
                f"Next intake: {start} | Application deadline: {SE['deadline']}\n"
                f"Tools: {SE['tools']}\n\n"
                f"Curriculum:\n{curriculum_summary}\n\n"
                f"Includes 1:1 mentorship, certificate, and job-readiness coaching.\n"
                f"Full details & apply: {se_url}"
            )

        # --- Cloud Computing details ---
        if any(k in text for k in ['cloud', 'azure', 'power bi', 'fabric', 'microsoft', 'az-104', 'dp-600', 'devops', 'ai program', 'cloud program']):
            start = db_cloud.start_date.strftime('%-d %B %Y') if db_cloud and getattr(db_cloud, 'start_date', None) else CLOUD['start_dates'][0]
            curriculum_summary = '\n'.join(f"   • {c}" for c in CLOUD['curriculum'])
            return (
                f"{CLOUD['name']} — {CLOUD['duration']} | {CLOUD['level']}\n\n"
                f"Price: KSh {CLOUD['price']:,} (was KSh {CLOUD['original_price']:,}, {CLOUD['discount']} off)\n"
                f"Next intake: {start} | Application deadline: {CLOUD['deadline']}\n"
                f"Tools: {CLOUD['tools']}\n\n"
                f"Curriculum:\n{curriculum_summary}\n\n"
                f"Includes 1:1 mentorship, certificate, and certification prep (AZ-104, DP-600).\n"
                f"Full details & apply: {cloud_url}"
            )

        # --- Pricing / fees / cost ---
        if any(k in text for k in ['price', 'cost', 'fee', 'how much', 'payment plan', 'installment', 'pay']):
            return (
                f"Program fees:\n\n"
                f"• {SE['name']}: KSh {SE['price']:,} one-time (was KSh {SE['original_price']:,})\n"
                f"• {CLOUD['name']}: KSh {CLOUD['price']:,} one-time (was KSh {CLOUD['original_price']:,})\n\n"
                f"Payment plans: {PAYMENT_PLANS}\n\n"
                f"More details: {faq_url}"
            )

        # --- Start dates / intake ---
        if any(k in text for k in ['start', 'intake', 'begin', 'when does', 'deadline', 'next cohort']):
            se_start = db_se.start_date.strftime('%-d %B %Y') if db_se and getattr(db_se, 'start_date', None) else SE['start_dates'][0]
            cloud_start = db_cloud.start_date.strftime('%-d %B %Y') if db_cloud and getattr(db_cloud, 'start_date', None) else CLOUD['start_dates'][0]
            return (
                f"Upcoming intakes:\n\n"
                f"• {SE['name']}: {se_start} (deadline {SE['deadline']})\n"
                f"• {CLOUD['name']}: {cloud_start} (deadline {CLOUD['deadline']})\n\n"
                f"Apply here: {apply_url}"
            )

        # --- Certificate ---
        if any(k in text for k in ['certificate', 'certification', 'certified', 'credential']):
            return (
                f"Yes! All programs include a verified certificate from Nexa Academy on successful completion. "
                f"Certificates include verifiable digital credentials and align with industry expectations. "
                f"The Cloud program also prepares you for AZ-104 and DP-600 certifications.\n\n"
                f"Learn more: {programs_url}"
            )

        # --- Job / career / placement ---
        if any(k in text for k in ['job', 'career', 'placement', 'employ', 'hire', 'work']):
            return (
                f"Both programs include job-readiness support: interview prep, CV coaching, and real project presentation practice. "
                f"The Software Engineering program targets Full Stack Developer roles; Cloud targets Cloud Engineer, Azure Admin, and Fabric Analytics roles.\n\n"
                f"View outcomes: {programs_url}"
            )

        # --- Apply / how to apply ---
        if any(k in text for k in ['apply', 'enroll', 'enrol', 'register', 'sign up', 'admission', 'how do i join']):
            return (
                f"To apply, fill in the application form here: {apply_url}\n\n"
                f"Applications are reviewed within 24–48 hours. Approved applicants receive payment instructions and onboarding details. "
                f"For help, contact info@nexaacademy.co.ke or call +254713067311."
            )

        # --- Contact ---
        if any(k in text for k in ['contact', 'phone', 'email', 'reach', 'talk to', 'speak']):
            return (
                f"You can reach us at:\n"
                f"Email: info@nexaacademy.co.ke\n"
                f"Phone: +254713067311\n\n"
                f"Or visit our contact page: {self.url('/contact')}"
            )

        # --- General FAQs ---
        for question_kw, answer in GENERAL_FAQS:
            if any(w in text for w in question_kw.lower().split()):
                return f"{answer}\n\nMore answers: {faq_url}"

        # --- SE-specific FAQs ---
        for question_kw, answer in SE['faq']:
            if any(w in text for w in question_kw.lower().split() if len(w) > 4):
                return f"{answer}\n\nMore: {se_url}"

        # --- Cloud-specific FAQs ---
        for question_kw, answer in CLOUD['faq']:
            if any(w in text for w in question_kw.lower().split() if len(w) > 4):
                return f"{answer}\n\nMore: {cloud_url}"

        # --- Fallback ---
        return (
            f"I can help with programs, fees, start dates, applying, and more. Try asking:\n\n"
            f'- "What programs do you offer?"\n'
            f'- "How much is Software Engineering?"\n'
            f'- "When is the next intake?"\n'
            f'- "How do I apply?"\n\n'
            f"Or browse: {programs_url} | Contact: info@nexaacademy.co.ke | +254713067311"
        )