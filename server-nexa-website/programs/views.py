import json
import logging
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
from .models import Program, Enrollment, StudentProgramEnrolled, ProgramProgress, Certificate, ProgramInterest, ProgramIntake
from .serializers import (
    ProgramSerializer, EnrollmentSerializer, StudentProgramEnrolledSerializer,
    ProgramProgressSerializer, CertificateSerializer, SimpleProgramProgressSerializer,
    EnrollStudentSerializer, ProgramInterestSerializer, ProgramIntakeSerializer,
)
from accounts.permissions import IsAdminUser
from django.conf import settings
from ubuntu_labs.email_utils import send_html_email
from accounts.models import User

logger = logging.getLogger(__name__)



class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'level', 'category', 'slug', 'coming_soon']
    search_fields = ['program_name', 'description', 'instructor']
    ordering_fields = ['created_at', 'program_name', 'price', 'duration']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated, IsAdminUser]
        return [permission() for permission in permission_classes]

    def retrieve(self, request, *args, **kwargs):
        program = self.get_object()
        serializer = self.get_serializer(program)
        data = serializer.data
        
        # Add enrollment count
        data['enrollment_count'] = Enrollment.objects.filter(program=program).count()
        
        return Response(data)


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'program']
    ordering_fields = ['enrollment_date', 'start_date']
    ordering = ['-enrollment_date']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Enrollment.objects.all()
        return Enrollment.objects.filter(student=user)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def manual_enroll(self, request):
        """Manually enroll a student (Admin only)"""
        student_id = request.data.get('student_id')
        program_id = request.data.get('program_id')
        amount = request.data.get('amount')
        amount_paid = request.data.get('amount_paid', 0)
        
        if not student_id or not program_id or amount is None:
            return Response(
                {'error': 'student_id, program_id, and amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            student = User.objects.get(uid=student_id)
            program = Program.objects.get(program_id=program_id)
        except (User.DoesNotExist, Program.DoesNotExist):
            return Response(
                {'error': 'Student or Program not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if Enrollment.objects.filter(student=student, program=program).exists():
            return Response(
                {'error': 'Student is already enrolled in this program'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            enrollment = Enrollment.objects.create(
                student=student,
                program=program,
                student_name=student.display_name,
                program_name=program.program_name,
                amount=amount,
                amount_paid=amount_paid,
                balance=float(amount) - float(amount_paid),
                status='active'
            )
            
            # Update student_programs_enrolled
            StudentProgramEnrolled.objects.create(
                student=student,
                program=program,
                program_name=program.program_name,
                enrollment_date=enrollment.enrollment_date,
                status='active'
            )

            # Initialize progress
            ProgramProgress.objects.create(
                student=student,
                program=program,
                program_name=program.program_name,
                enrollment_date=enrollment.enrollment_date,
                lessons_total=program.total_lessons
            )
            
            program.current_enrolled += 1
            program.save()

            # Send manual enrollment email
            try:
                send_html_email(
                    subject=f"Enrollment Confirmed - {program.program_name}",
                    template_name='welcome_student.html',
                    context={
                        'display_name': student.display_name,
                        'program_name': program.program_name,
                        'amount': amount,
                        'amount_paid': amount_paid,
                        'balance': enrollment.balance,
                        'frontend_url': settings.FRONTEND_URL,
                    },
                    recipient_email=student.email,
                )
            except Exception:
                pass

        return Response(EnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request):

        """Enroll current student in a program"""
        serializer = EnrollStudentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        program_id = serializer.validated_data['program_id']
        
        try:
            program = Program.objects.get(program_id=program_id, status='active')
        except Program.DoesNotExist:
            return Response(
                {'error': 'Program not found or not active'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if already enrolled
        if Enrollment.objects.filter(student=request.user, program=program).exists():
            return Response(
                {'error': 'Already enrolled in this program'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Create enrollment
            enrollment = Enrollment.objects.create(
                student=request.user,
                program=program,
                student_name=request.user.display_name,
                program_name=program.program_name,
                start_date=serializer.validated_data.get('start_date'),
                end_date=serializer.validated_data.get('end_date'),
                amount=serializer.validated_data['amount'],
                amount_paid=0,
                balance=serializer.validated_data['amount']
            )

            # Update student_programs_enrolled
            StudentProgramEnrolled.objects.create(
                student=request.user,
                program=program,
                program_name=program.program_name,
                enrollment_date=enrollment.enrollment_date,
                start_date=enrollment.start_date,
                end_date=enrollment.end_date,
                status='active'
            )

            # Initialize program progress
            ProgramProgress.objects.create(
                student=request.user,
                program=program,
                program_name=program.program_name,
                enrollment_date=enrollment.enrollment_date,
                start_date=enrollment.start_date,
                end_date=enrollment.end_date,
                lessons_total=program.total_lessons
            )

            # Update program enrollment count
            program.current_enrolled += 1
            program.save()

        return Response(
            EnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED
        )


class ProgramProgressViewSet(viewsets.ModelViewSet):
    queryset = ProgramProgress.objects.all()
    serializer_class = ProgramProgressSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'program']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return ProgramProgress.objects.all()
        return ProgramProgress.objects.filter(student=user)

    @action(detail=True, methods=['post'])
    def update_lesson(self, request, pk=None):
        """Update lesson completion"""
        progress = self.get_object()
        lesson_data = request.data
        
        # Update lessons completed
        progress.lessons_completed += 1
        progress.completion_percentage = int(
            (progress.lessons_completed / progress.lessons_total) * 100
        ) if progress.lessons_total > 0 else 0
        progress.last_accessed_at = timezone.now()
        
        # Update modules data
        if 'module_id' in lesson_data:
            if 'modules' not in progress.modules:
                progress.modules = {}
            module_id = str(lesson_data['module_id'])
            if module_id not in progress.modules:
                progress.modules[module_id] = {
                    'completed_lessons': [],
                    'completion_percentage': 0
                }
            if lesson_data.get('lesson_id'):
                if lesson_data['lesson_id'] not in progress.modules[module_id]['completed_lessons']:
                    progress.modules[module_id]['completed_lessons'].append(lesson_data['lesson_id'])
        
        progress.save()

        # Check if program completed
        if progress.completion_percentage >= 100 and not progress.certificate_earned:
            # Auto-generate certificate logic could go here
            pass

        return Response(SimpleProgramProgressSerializer(progress).data)

    @action(detail=True, methods=['post'])
    def update_quiz_score(self, request, pk=None):
        """Update quiz score"""
        progress = self.get_object()
        quiz_data = request.data
        
        # Add to quizzes list
        if 'quizzes' not in progress.quizzes:
            progress.quizzes = []
        
        progress.quizzes.append({
            'quiz_id': str(quiz_data.get('quiz_id')),
            'name': quiz_data.get('name'),
            'score': quiz_data.get('score'),
            'max_score': quiz_data.get('max_score', 100),
            'passed': quiz_data.get('passed', False),
            'completed_at': timezone.now().isoformat()
        })
        
        if quiz_data.get('passed'):
            progress.tests_passed += 1
        
        progress.save()
        return Response(SimpleProgramProgressSerializer(progress).data)


class CertificateViewSet(viewsets.ModelViewSet):
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'program']
    search_fields = ['certificate_number', 'student_name']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Certificate.objects.all()
        return Certificate.objects.filter(student=user)

    @action(detail=False, methods=['get'])
    def verify(self, request):
        """Verify a certificate by code"""
        code = request.query_params.get('code')
        if not code:
            return Response(
                {'error': 'Verification code required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            certificate = Certificate.objects.get(verification_code=code)
            serializer = self.get_serializer(certificate)
            return Response({
                'valid': True,
                'certificate': serializer.data
            })
        except Certificate.DoesNotExist:
            return Response({
                'valid': False,
                'message': 'Certificate not found'
            })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def generate_for_student(self, request, pk=None):
        """Generate certificate for a student (admin only)"""
        try:
            progress = ProgramProgress.objects.get(id=pk)
        except ProgramProgress.DoesNotExist:
            return Response(
                {'error': 'Program progress not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if progress.certificate_earned:
            return Response(
                {'error': 'Certificate already earned'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if progress.completion_percentage < 100:
            return Response(
                {'error': 'Program not completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            certificate = Certificate.objects.create(
                student=progress.student,
                program=progress.program,
                student_name=progress.student.display_name,
                program_name=progress.program_name,
                completion_percentage=progress.completion_percentage,
                grade=request.data.get('grade', 'A'),
                instructor=request.data.get('instructor', progress.program.instructor)
            )

            progress.certificate_earned = True
            progress.certificate_earned_at = timezone.now()
            progress.certificate_url = certificate.certificate_url
            progress.save()

        return Response(CertificateSerializer(certificate).data)


class ProgramIntakeViewSet(viewsets.ModelViewSet):
    """
    Public GET — list open intakes for a program (filter by ?program=<uuid>).
    Admin POST/PATCH/DELETE — manage intakes.
    """
    serializer_class = ProgramIntakeSerializer

    def get_queryset(self):
        qs = ProgramIntake.objects.select_related('program').all()
        program_id = self.request.query_params.get('program')
        if program_id:
            qs = qs.filter(program_id=program_id)
        program_name = self.request.query_params.get('program_name')
        if program_name:
            qs = qs.filter(program__program_name__iexact=program_name)
        user = self.request.user
        is_admin = user.is_authenticated and getattr(user, 'role', None) == 'admin'
        if not is_admin:
            qs = qs.filter(status='open')
        return qs.order_by('start_date')

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(source='site')


class CMSIntakeSyncView(APIView):
    """
    POST /api/cms/intakes/sync/
    Unauthenticated — validated by X-CMS-Token header.

    Accepts a normalized payload that any CMS can map to:
    {
        "cms_id": "entry-xyz",
        "program_name": "Software Engineering",
        "start_date": "2026-09-01",
        "end_date": "2027-03-01",
        "application_deadline": "2026-08-25",
        "max_seats": 20,
        "seats_remaining": 20,
        "status": "open",
        "notes": "",
        "action": "publish"   // publish | unpublish | delete
    }

    Returns 200 for valid token (even if no action taken).
    Returns 401 for invalid/missing token.
    Returns 400 for bad payload.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        expected_token = getattr(settings, 'CMS_WEBHOOK_TOKEN', '')
        if expected_token:
            token = request.headers.get('X-CMS-Token', '')
            if token != expected_token:
                return Response({'error': 'Unauthorised'}, status=401)

        try:
            data = request.data
        except Exception:
            return Response({'error': 'Invalid JSON'}, status=400)

        cms_id = (data.get('cms_id') or '').strip()
        action = (data.get('action') or 'publish').strip()
        program_name = (data.get('program_name') or '').strip()
        start_date = data.get('start_date')

        if not cms_id:
            return Response({'error': 'cms_id is required'}, status=400)
        if not start_date:
            return Response({'error': 'start_date is required'}, status=400)

        # Resolve program
        program = None
        if program_name:
            program = Program.objects.filter(program_name__iexact=program_name).first()
            if not program:
                program = Program.objects.filter(program_name__icontains=program_name).first()
        if not program:
            return Response({'error': f'Program not found: {program_name}'}, status=400)

        if action == 'delete':
            deleted, _ = ProgramIntake.objects.filter(cms_id=cms_id).delete()
            logger.info('CMS webhook: deleted %d intake(s) for cms_id=%s', deleted, cms_id)
            return Response({'status': 'deleted', 'count': deleted})

        status_map = {'publish': 'open', 'unpublish': 'closed'}
        intake_status = status_map.get(action, data.get('status', 'open'))

        defaults = {
            'program': program,
            'start_date': start_date,
            'end_date': data.get('end_date') or None,
            'application_deadline': data.get('application_deadline') or None,
            'max_seats': data.get('max_seats') or None,
            'seats_remaining': data.get('seats_remaining') or None,
            'status': intake_status,
            'notes': data.get('notes', ''),
            'source': 'cms',
            'last_synced_at': timezone.now(),
        }

        intake, created = ProgramIntake.objects.update_or_create(
            cms_id=cms_id,
            defaults=defaults,
        )
        logger.info(
            'CMS webhook: %s intake %s for program %s',
            'created' if created else 'updated', intake.id, program.program_name,
        )
        return Response({
            'status': 'created' if created else 'updated',
            'intake_id': str(intake.id),
        })


class ProgramInterestCreate(APIView):
    # allow anonymous submissions; explicitly disable authentication for this endpoint
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        email = data.get('email')
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        pi = ProgramInterest.objects.create(
            program_slug=data.get('program_slug', '')[:255],
            program_name=data.get('program_name', '')[:255],
            name=data.get('name', '')[:255],
            email=email,
            message=data.get('message', '')
        )

        serializer = ProgramInterestSerializer(pi)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProgramInterestListView(APIView):
    """Admin-only endpoint: list, filter, and count program interest submissions."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = ProgramInterest.objects.all().order_by('-created_at')

        program_slug = request.query_params.get('program_slug')
        if program_slug:
            qs = qs.filter(program_slug=program_slug)

        search = request.query_params.get('search', '').strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(email__icontains=search) |
                Q(name__icontains=search) |
                Q(program_name__icontains=search)
            )

        # Pagination
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            page_size = min(50, max(1, int(request.query_params.get('page_size', 20))))
        except (ValueError, TypeError):
            page = 1
            page_size = 20

        total = qs.count()
        start = (page - 1) * page_size
        items = qs[start:start + page_size]

        # Per-program counts (for stats strip)
        from django.db.models import Count
        program_counts = list(
            ProgramInterest.objects.values('program_slug', 'program_name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        serializer = ProgramInterestSerializer(items, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': serializer.data,
            'program_counts': program_counts,
        })


# A lightweight Django view that accepts anonymous POSTs and is CSRF-exempt.
# This bypasses DRF authentication/permission machinery and any global
# DEFAULT_PERMISSION_CLASSES which may otherwise block anonymous clients.
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json


@csrf_exempt
def program_interest_create(request):
    print('program_interest_create called', request.method)
    # log minimal headers to help diagnose 401s
    auth_hdr = request.META.get('HTTP_AUTHORIZATION')
    origin = request.META.get('HTTP_ORIGIN')
    print('AUTH_HEADER:', bool(auth_hdr), 'ORIGIN:', origin)
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)

    try:
        payload = json.loads(request.body.decode('utf-8') or '{}')
    except Exception:
        payload = request.POST.dict()

    email = payload.get('email')
    if not email:
        return JsonResponse({'error': 'Email is required'}, status=400)

    pi = ProgramInterest.objects.create(
        program_slug=str(payload.get('program_slug', ''))[:255],
        program_name=str(payload.get('program_name', ''))[:255],
        name=str(payload.get('name', ''))[:255],
        email=email,
        message=str(payload.get('message', '')),
    )

    serializer = ProgramInterestSerializer(pi)
    return JsonResponse(serializer.data, status=201, safe=False)