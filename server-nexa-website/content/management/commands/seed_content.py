"""
Management command: seed_content

Seeds Testimonials, FAQs, HomepageFeatures, and LegalDocument sections.
Uses update_or_create on natural keys — safe to re-run.

Usage:
    python manage.py seed_content
"""

import logging
from django.core.management.base import BaseCommand
from content.models import Testimonial, FAQ, HomepageFeature, LegalDocument

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Testimonials
# ---------------------------------------------------------------------------

TESTIMONIALS = [
    {
        'name': 'Amina Osei',
        'role': 'Software Engineer @ Andela',
        'quote': (
            'Nexa gave me the structured path I needed. The curriculum is practical, '
            'the mentors are accessible, and within six months I had my first dev role.'
        ),
        'rating': 5,
        'sort_order': 1,
    },
    {
        'name': 'Kevin Mwangi',
        'role': 'Cloud Engineer @ Safaricom',
        'quote': (
            'The Azure certification prep was exactly what I was looking for. '
            'Real labs, real scenarios, and a cohort that kept me accountable.'
        ),
        'rating': 5,
        'sort_order': 2,
    },
    {
        'name': 'Fatima Hassan',
        'role': 'Full-Stack Developer @ Andela',
        'quote': (
            'The projects are real-world and the mentors genuinely care. '
            'I shipped three portfolio projects before graduation and got hired because of them.'
        ),
        'rating': 5,
        'sort_order': 3,
    },
    {
        'name': 'James Kariuki',
        'role': 'DevOps Engineer @ Safaricom',
        'quote': (
            'Went from zero cloud knowledge to AZ-104 certified in four months. '
            'The hands-on labs and weekly check-ins made the difference.'
        ),
        'rating': 5,
        'sort_order': 4,
    },
    {
        'name': 'Grace Wanjiku',
        'role': 'React Developer',
        'quote': (
            'The React and Django curriculum is solid and up to date. '
            'I appreciated the focus on clean code and best practices from day one.'
        ),
        'rating': 5,
        'sort_order': 5,
    },
    {
        'name': 'David Omondi',
        'role': 'Backend Developer',
        'quote': (
            'Weekly mentor calls made all the difference. '
            'Whenever I was stuck, I had someone knowledgeable to turn to rather than spending days debugging alone.'
        ),
        'rating': 5,
        'sort_order': 6,
    },
    {
        'name': 'Sarah Njoroge',
        'role': 'Junior Developer',
        'quote': (
            'The admissions process was quick and the team was transparent at every step. '
            'I knew exactly what to expect and felt supported from day one.'
        ),
        'rating': 5,
        'sort_order': 7,
    },
]

# ---------------------------------------------------------------------------
# FAQs
# ---------------------------------------------------------------------------

FAQS = [
    # General
    {
        'question': 'What is Nexa Academy?',
        'answer': (
            'Nexa Academy is a Kenyan coding bootcamp that offers intensive, '
            'outcome-focused programs in Software Engineering and Cloud & AI. '
            'We combine mentor-led sessions, real-world projects, and career support '
            'to get you job-ready fast.'
        ),
        'category': 'general',
        'show_on_homepage': True,
        'sort_order': 1,
    },
    {
        'question': 'How long are the programs?',
        'answer': (
            'Our Software Engineering bootcamp runs for approximately 6 months. '
            'The Cloud & AI program is approximately 4 months. '
            'Both programs are structured around weekly cohort sessions with self-paced labs.'
        ),
        'category': 'general',
        'show_on_homepage': True,
        'sort_order': 2,
    },
    {
        'question': 'Are the programs online or in-person?',
        'answer': (
            'Programs are delivered online via live video sessions, making them accessible '
            'from anywhere in Kenya or the broader East Africa region. '
            'Recorded sessions are available for registered students.'
        ),
        'category': 'general',
        'show_on_homepage': False,
        'sort_order': 3,
    },
    {
        'question': 'What is the time commitment per week?',
        'answer': (
            'Expect to invest 15–20 hours per week — including live sessions, labs, '
            'project work, and self-study. The programs are designed for motivated learners '
            'who can balance study with other commitments.'
        ),
        'category': 'general',
        'show_on_homepage': False,
        'sort_order': 4,
    },
    {
        'question': 'Do I get a certificate upon completion?',
        'answer': (
            'Yes. Graduates who complete all modules and projects receive a Nexa Academy '
            'Certificate of Completion. Cloud & AI students also receive preparation and '
            'a voucher for official Microsoft Azure certification exams.'
        ),
        'category': 'general',
        'show_on_homepage': False,
        'sort_order': 5,
    },
    # Bootcamp / Software Engineering
    {
        'question': 'Do I need prior experience for the Software Engineering program?',
        'answer': (
            'No prior programming experience is required. The curriculum starts from the fundamentals '
            'and progresses to full-stack development with React and Django. '
            'A basic comfort with computers and a strong willingness to learn are sufficient.'
        ),
        'category': 'bootcamp',
        'show_on_homepage': True,
        'sort_order': 1,
    },
    {
        'question': 'What technologies will I learn in the Software Engineering program?',
        'answer': (
            'You will learn Python, Django REST Framework, React, JavaScript (ES6+), '
            'PostgreSQL, Git, REST APIs, and deployment fundamentals on cloud platforms. '
            'The curriculum is updated each cohort to reflect current industry demand.'
        ),
        'category': 'bootcamp',
        'show_on_homepage': False,
        'sort_order': 2,
    },
    {
        'question': 'Will I build real projects during the bootcamp?',
        'answer': (
            'Absolutely. You will build at least three portfolio-grade projects, including '
            'a personal project, a team collaboration project, and a capstone. '
            'These projects are designed to demonstrate job-ready skills to employers.'
        ),
        'category': 'bootcamp',
        'show_on_homepage': False,
        'sort_order': 3,
    },
    {
        'question': 'Is there a laptop requirement?',
        'answer': (
            'Yes. You need a laptop with at least 8 GB of RAM, a modern browser, and a stable '
            'internet connection. Windows, macOS, and Linux are all supported. '
            'We will guide you through environment setup at the start of the program.'
        ),
        'category': 'bootcamp',
        'show_on_homepage': False,
        'sort_order': 4,
    },
    # Cloud & AI
    {
        'question': 'What Azure certifications does the Cloud & AI program prepare for?',
        'answer': (
            'The program primarily prepares you for AZ-900 (Azure Fundamentals) and AZ-104 '
            '(Azure Administrator Associate). Advanced cohorts may also cover AI-900 (Azure AI Fundamentals). '
            'Exam vouchers are included in the program fee.'
        ),
        'category': 'cloud',
        'show_on_homepage': True,
        'sort_order': 1,
    },
    {
        'question': 'Do I need a technical background for the Cloud & AI program?',
        'answer': (
            'A basic understanding of IT concepts (networking, operating systems) is helpful but not mandatory. '
            'The AZ-900 module is beginner-friendly. Students with no background are welcome — '
            'we provide a pre-cohort primer to level everyone up.'
        ),
        'category': 'cloud',
        'show_on_homepage': False,
        'sort_order': 2,
    },
    {
        'question': 'Will I get hands-on lab access?',
        'answer': (
            'Yes. Every student receives access to Azure sandbox labs throughout the program. '
            'Labs are tied directly to each module so you practice what you learn immediately.'
        ),
        'category': 'cloud',
        'show_on_homepage': False,
        'sort_order': 3,
    },
    # Pricing & Payments
    {
        'question': 'How much do the programs cost?',
        'answer': (
            'Program fees vary by cohort and any early-bird promotions in effect. '
            'Current pricing is displayed on each program detail page. '
            'Contact us at info@nexaacademy.co.ke for the latest rates.'
        ),
        'category': 'pricing',
        'show_on_homepage': False,
        'sort_order': 1,
    },
    {
        'question': 'Are payment plans available?',
        'answer': (
            'Yes. We offer instalment payment plans to make the programs accessible. '
            'Typically you can split the fee into two or three payments across the duration of the cohort. '
            'Details are confirmed during the admissions process.'
        ),
        'category': 'pricing',
        'show_on_homepage': True,
        'sort_order': 2,
    },
    {
        'question': 'What payment methods do you accept?',
        'answer': (
            'We accept M-Pesa, debit/credit cards (via Paystack), and bank transfers. '
            'All payments are processed securely. Receipts are emailed automatically.'
        ),
        'category': 'pricing',
        'show_on_homepage': False,
        'sort_order': 3,
    },
    {
        'question': 'What is the refund policy?',
        'answer': (
            'A full refund is available if you withdraw before the cohort start date. '
            'After the cohort begins, a 50% refund is available within the first two weeks. '
            'No refunds are issued after two weeks of the cohort start. '
            'Please review the full refund policy in our Terms & Conditions.'
        ),
        'category': 'pricing',
        'show_on_homepage': False,
        'sort_order': 4,
    },
    # Admissions
    {
        'question': 'How does the admissions process work?',
        'answer': (
            'Submit your application via the Apply Now button on any program page. '
            'Our admissions team reviews your application within 3–5 business days. '
            'Shortlisted applicants are invited to a brief 30-minute interview. '
            'Successful candidates receive an offer letter and payment instructions.'
        ),
        'category': 'admissions',
        'show_on_homepage': True,
        'sort_order': 1,
    },
    {
        'question': 'What happens after I apply?',
        'answer': (
            'You will receive a confirmation email immediately. '
            'Our team reviews your application and updates you via email within 3–5 business days. '
            'You can also track your application status in your student dashboard.'
        ),
        'category': 'admissions',
        'show_on_homepage': False,
        'sort_order': 2,
    },
    {
        'question': 'How do I prepare for the admissions interview?',
        'answer': (
            'The interview is conversational — not a technical exam. '
            'We want to understand your motivation, availability, and learning goals. '
            'Being honest and specific about why you want to join is the best preparation.'
        ),
        'category': 'admissions',
        'show_on_homepage': False,
        'sort_order': 3,
    },
    {
        'question': 'Can I apply for the next intake if I miss the current one?',
        'answer': (
            'Yes. We run multiple cohorts per year. If you miss a deadline, '
            'your application is held on file and you are considered for the next intake. '
            'You can also re-apply through the website when the next intake opens.'
        ),
        'category': 'admissions',
        'show_on_homepage': False,
        'sort_order': 4,
    },
]

# ---------------------------------------------------------------------------
# Homepage Features
# ---------------------------------------------------------------------------

HOMEPAGE_FEATURES = [
    # Why Choose Nexa
    {
        'section': 'why_choose',
        'title': 'Industry-Relevant Curriculum',
        'description': (
            'Our programs are designed with input from industry partners to ensure '
            'you learn the exact skills employers are hiring for right now.'
        ),
        'icon_name': 'BookOpen',
        'sort_order': 1,
    },
    {
        'section': 'why_choose',
        'title': 'Flexible Learning',
        'description': (
            'Live sessions scheduled to fit working professionals and students. '
            'All recordings are available so you never miss a lesson.'
        ),
        'icon_name': 'Clock',
        'sort_order': 2,
    },
    {
        'section': 'why_choose',
        'title': 'Career Support',
        'description': (
            'From CV reviews to mock interviews and job board access, '
            'we support your transition into tech from day one.'
        ),
        'icon_name': 'Target',
        'sort_order': 3,
    },
    {
        'section': 'why_choose',
        'title': 'Mentor-Led Sessions',
        'description': (
            'Learn directly from practitioners working in tech. '
            'Weekly live sessions give you access to real-world expertise and direct Q&A.'
        ),
        'icon_name': 'Users',
        'sort_order': 4,
    },
    {
        'section': 'why_choose',
        'title': 'Portfolio Projects',
        'description': (
            'Ship production-quality projects that demonstrate your skills. '
            'Your portfolio is your proof of work when you enter the job market.'
        ),
        'icon_name': 'Code2',
        'sort_order': 5,
    },
    {
        'section': 'why_choose',
        'title': 'Job Placement Assistance',
        'description': (
            'We connect graduates with our hiring partner network '
            'and provide ongoing referral support after program completion.'
        ),
        'icon_name': 'Briefcase',
        'sort_order': 6,
    },
    # Learning Journey
    {
        'section': 'journey',
        'title': 'Build Foundation',
        'description': 'Start with fundamentals and build a strong base in your chosen track.',
        'icon_name': 'Route',
        'sort_order': 1,
    },
    {
        'section': 'journey',
        'title': 'Ship Real Projects',
        'description': 'Apply your skills with portfolio-grade projects that solve real problems.',
        'icon_name': 'Package',
        'sort_order': 2,
    },
    {
        'section': 'journey',
        'title': 'Launch Career',
        'description': 'Get career support, mentorship, and job placement assistance on graduation.',
        'icon_name': 'Rocket',
        'sort_order': 3,
    },
]

# ---------------------------------------------------------------------------
# Legal Documents
# ---------------------------------------------------------------------------

LEGAL_DOCUMENTS = [
    # Privacy Policy
    {
        'doc_type': 'privacy',
        'section_id': 'item-1',
        'title': 'Data We Collect',
        'content': (
            'We collect information you provide when you apply to our programs, create an account, '
            'or contact us. This includes your name, email address, phone number, educational background, '
            'and payment information. We also collect usage data automatically when you interact with our '
            'website and student portal, such as pages visited, session duration, and device information.'
        ),
        'sort_order': 1,
    },
    {
        'doc_type': 'privacy',
        'section_id': 'item-2',
        'title': 'How We Use Your Data',
        'content': (
            'Your data is used to process your application, manage your enrollment, deliver program '
            'content, send important communications (such as interview invitations and payment receipts), '
            'and provide customer support. We may also use aggregate, anonymised data to improve our '
            'programs and website. We do not sell your personal data to third parties.'
        ),
        'sort_order': 2,
    },
    {
        'doc_type': 'privacy',
        'section_id': 'item-3',
        'title': 'Data Security',
        'content': (
            'We implement industry-standard technical and organisational measures to protect your data, '
            'including encrypted transmission (HTTPS), secure database storage, and access controls '
            'limiting which team members can view sensitive information. Despite these measures, no '
            'system is completely secure. Please notify us immediately at info@nexaacademy.co.ke '
            'if you suspect unauthorised access to your account.'
        ),
        'sort_order': 3,
    },
    {
        'doc_type': 'privacy',
        'section_id': 'item-4',
        'title': 'Cookies',
        'content': (
            'Our website uses essential cookies to maintain your session and preferences. '
            'We may also use analytics cookies (e.g., Google Analytics) to understand how visitors '
            'use our site. You can disable non-essential cookies through your browser settings at any time, '
            'though this may affect some site functionality.'
        ),
        'sort_order': 4,
    },
    {
        'doc_type': 'privacy',
        'section_id': 'item-5',
        'title': 'Third Parties',
        'content': (
            'We share your data with trusted third-party service providers only as necessary to operate '
            'our business — for example, Paystack for payment processing, Google for authentication and '
            'video conferencing, and email delivery providers. These partners are contractually obligated '
            'to handle your data securely and only for the purpose of providing services to Nexa Academy.'
        ),
        'sort_order': 5,
    },
    {
        'doc_type': 'privacy',
        'section_id': 'item-6',
        'title': 'Your Rights',
        'content': (
            'You have the right to access, correct, or delete your personal data at any time. '
            'You may also request that we restrict processing of your data or withdraw consent '
            'where processing is based on consent. To exercise any of these rights, email us at '
            'info@nexaacademy.co.ke. We will respond within 30 days.'
        ),
        'sort_order': 6,
    },
    # Terms & Conditions
    {
        'doc_type': 'terms',
        'section_id': 'item-1',
        'title': 'Acceptance of Terms',
        'content': (
            'By submitting an application or enrolling in any Nexa Academy program, you confirm that you '
            'have read, understood, and agree to be bound by these Terms & Conditions. '
            'If you do not agree, please do not proceed with enrollment. '
            'We reserve the right to update these terms at any time; continued enrollment constitutes '
            'acceptance of the revised terms.'
        ),
        'sort_order': 1,
    },
    {
        'doc_type': 'terms',
        'section_id': 'item-2',
        'title': 'Enrollment & Payment',
        'content': (
            'Enrollment is confirmed only upon receipt of the agreed program fee or first instalment '
            'payment. Places are offered in order of completed applications; submission of an application '
            'does not guarantee a place. Payment plans are available subject to agreement with the '
            'admissions team and must be completed before the final week of the program.'
        ),
        'sort_order': 2,
    },
    {
        'doc_type': 'terms',
        'section_id': 'item-3',
        'title': 'Refund Policy',
        'content': (
            'A full refund is available for withdrawals made before the cohort start date. '
            'Withdrawals within the first two weeks of the cohort are eligible for a 50% refund. '
            'No refunds are issued after two weeks from the cohort start date. '
            'Refund requests must be submitted in writing to admissions@nexaacademy.co.ke. '
            'Refunds are processed within 14 business days via the original payment method.'
        ),
        'sort_order': 3,
    },
    {
        'doc_type': 'terms',
        'section_id': 'item-4',
        'title': 'Student Conduct',
        'content': (
            'Students are expected to maintain professional and respectful conduct in all '
            'Nexa Academy spaces — including live sessions, community channels, and one-on-one '
            'interactions with staff and peers. Harassment, plagiarism, or sharing of course materials '
            'without permission are grounds for immediate removal from the program without refund. '
            'We are committed to maintaining a safe and inclusive learning environment for everyone.'
        ),
        'sort_order': 4,
    },
    {
        'doc_type': 'terms',
        'section_id': 'item-5',
        'title': 'Intellectual Property',
        'content': (
            'All curriculum materials, recorded sessions, assessments, and resources provided by '
            'Nexa Academy remain the intellectual property of Nexa Academy. '
            'Students may not reproduce, distribute, or commercially exploit these materials '
            'without written permission. Projects you create as part of the program belong to you; '
            'however, Nexa Academy retains the right to showcase student projects as portfolio examples '
            'with your consent.'
        ),
        'sort_order': 5,
    },
    {
        'doc_type': 'terms',
        'section_id': 'item-6',
        'title': 'Changes to Program',
        'content': (
            'Nexa Academy reserves the right to modify program content, schedule, or delivery format '
            'to maintain quality and relevance. In the event of significant changes, enrolled students '
            'will be notified with at least 14 days notice. If changes are material and unacceptable, '
            'a pro-rated refund may be requested within 7 days of the notification. '
            'These terms are governed by the laws of the Republic of Kenya.'
        ),
        'sort_order': 6,
    },
]


class Command(BaseCommand):
    help = 'Seeds Testimonials, FAQs, HomepageFeatures, and LegalDocuments. Safe to re-run.'

    def handle(self, *args, **options):
        self._seed_testimonials()
        self._seed_faqs()
        self._seed_features()
        self._seed_legal()
        self.stdout.write(self.style.SUCCESS('\nAll content seeded successfully.'))

    def _seed_testimonials(self):
        self.stdout.write('\n-- Testimonials --')
        for item in TESTIMONIALS:
            try:
                obj, created = Testimonial.objects.update_or_create(
                    name=item['name'],
                    defaults={
                        'role': item['role'],
                        'quote': item['quote'],
                        'rating': item['rating'],
                        'sort_order': item['sort_order'],
                        'is_active': True,
                    },
                )
                label = 'Created' if created else 'Updated'
                self.stdout.write(f"  {label}: {item['name']}")
            except Exception as exc:
                logger.error("seed_content: testimonial %s failed: %s", item['name'], exc)
                self.stdout.write(self.style.ERROR(f"  ERROR: {item['name']}: {exc}"))

    def _seed_faqs(self):
        self.stdout.write('\n-- FAQs --')
        for item in FAQS:
            try:
                obj, created = FAQ.objects.update_or_create(
                    question=item['question'],
                    defaults={
                        'answer': item['answer'],
                        'category': item['category'],
                        'show_on_homepage': item.get('show_on_homepage', False),
                        'sort_order': item.get('sort_order', 0),
                        'is_active': True,
                    },
                )
                label = 'Created' if created else 'Updated'
                self.stdout.write(f"  {label}: {item['question'][:60]}")
            except Exception as exc:
                logger.error("seed_content: FAQ '%s' failed: %s", item['question'][:40], exc)
                self.stdout.write(self.style.ERROR(f"  ERROR: {item['question'][:40]}: {exc}"))

    def _seed_features(self):
        self.stdout.write('\n-- Homepage Features --')
        for item in HOMEPAGE_FEATURES:
            try:
                obj, created = HomepageFeature.objects.update_or_create(
                    section=item['section'],
                    title=item['title'],
                    defaults={
                        'description': item['description'],
                        'icon_name': item['icon_name'],
                        'sort_order': item['sort_order'],
                        'is_active': True,
                    },
                )
                label = 'Created' if created else 'Updated'
                self.stdout.write(f"  {label}: [{item['section']}] {item['title']}")
            except Exception as exc:
                logger.error("seed_content: feature '%s' failed: %s", item['title'], exc)
                self.stdout.write(self.style.ERROR(f"  ERROR: {item['title']}: {exc}"))

    def _seed_legal(self):
        self.stdout.write('\n-- Legal Documents --')
        for item in LEGAL_DOCUMENTS:
            try:
                obj, created = LegalDocument.objects.update_or_create(
                    doc_type=item['doc_type'],
                    section_id=item['section_id'],
                    defaults={
                        'title': item['title'],
                        'content': item['content'],
                        'sort_order': item['sort_order'],
                        'is_active': True,
                    },
                )
                label = 'Created' if created else 'Updated'
                self.stdout.write(f"  {label}: [{item['doc_type']}] {item['title']}")
            except Exception as exc:
                logger.error(
                    "seed_content: legal %s/%s failed: %s",
                    item['doc_type'], item['section_id'], exc,
                )
                self.stdout.write(self.style.ERROR(f"  ERROR: {item['doc_type']}/{item['section_id']}: {exc}"))
