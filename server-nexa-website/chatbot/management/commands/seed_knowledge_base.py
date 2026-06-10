"""
Management command: seed_knowledge_base

Seeds the KnowledgeBase table with initial content from the old hardcoded STATIC_PAGES.
Safe to run multiple times — uses update_or_create on slug.

Usage: python manage.py seed_knowledge_base
"""

from django.core.management.base import BaseCommand


SEED_ENTRIES = [
    {
        "title": "About Nexa Academy",
        "slug": "about-nexa-academy",
        "category": "general",
        "source_url": "/",
        "content": (
            "Nexa Academy is a tech training institute based in Nairobi, Kenya. "
            "We run programs in Software Engineering (Full-Stack Development) and Cloud Computing and AI. "
            "All programs are delivered live online with weekly 1-on-1 mentorship, a completion certificate, "
            "and job placement assistance. "
            "Located at 10th Floor, JKUAT Towers, CBD Nairobi — opposite Jamia Mosque. "
            "Email: info@nexaacademy.co.ke. Phone: +254713067311. "
            "Apply at /apply."
        ),
    },
    {
        "title": "FAQ — Prerequisites and Experience",
        "slug": "faq-prerequisites",
        "category": "faq",
        "source_url": "/faq",
        "content": (
            "Do I need prior experience?\n"
            "No prior coding experience is required for Software Engineering. "
            "Basic IT literacy is helpful but not required for Cloud Computing and AI. "
            "Both programs are designed to take you from beginner to job-ready."
        ),
    },
    {
        "title": "FAQ — Class Format",
        "slug": "faq-class-format",
        "category": "faq",
        "source_url": "/faq",
        "content": (
            "Are classes online?\n"
            "Yes. All sessions are live online. Recordings are available for review. "
            "You can participate from anywhere with a stable internet connection."
        ),
    },
    {
        "title": "FAQ — Certificate",
        "slug": "faq-certificate",
        "category": "faq",
        "source_url": "/faq",
        "content": (
            "Do I get a certificate?\n"
            "Yes, upon successful completion and final assessments. "
            "Certificates include verifiable digital credentials."
        ),
    },
    {
        "title": "FAQ — Payment Plans",
        "slug": "faq-payment-plans",
        "category": "faq",
        "source_url": "/faq",
        "content": (
            "What payment plans are available?\n"
            "Three payment options are available:\n"
            "1. One-time full payment — no surcharge (best value).\n"
            "2. Two instalments — 10% surcharge added to the base price.\n"
            "3. Three instalments — 20% surcharge added to the base price.\n"
            "A minimum deposit of KSh 10,000 is required to confirm enrolment after approval. "
            "Exact prices depend on the program. See /faq for the current breakdown."
        ),
    },
    {
        "title": "FAQ — Admissions Timeline",
        "slug": "faq-admissions-timeline",
        "category": "admissions",
        "source_url": "/faq",
        "content": (
            "How long does the admissions process take?\n"
            "Application review: under 2 hours.\n"
            "Admissions follow-up: under 24 hours.\n"
            "Final enrolment: 24 to 48 hours.\n"
            "A minimum deposit of KSh 10,000 is required to secure your place after approval."
        ),
    },
    {
        "title": "FAQ — Refund Policy",
        "slug": "faq-refund-policy",
        "category": "policy",
        "source_url": "/faq",
        "content": (
            "Can I get a refund?\n"
            "Refund requests made before the program start date are eligible for a 50% refund of fees paid. "
            "No refunds are issued after the program commences. "
            "Submit requests in writing to info@nexaacademy.co.ke."
        ),
    },
    {
        "title": "FAQ — Job Placement",
        "slug": "faq-job-placement",
        "category": "faq",
        "source_url": "/faq",
        "content": (
            "Is there job placement support?\n"
            "Yes — all programs include job placement assistance: CV review, interview preparation, "
            "and recruiter connections at no extra cost."
        ),
    },
    {
        "title": "FAQ — Projects",
        "slug": "faq-projects",
        "category": "faq",
        "source_url": "/faq",
        "content": (
            "How many projects will I build?\n"
            "Software Engineering students build 6 or more portfolio projects over the 6-month program. "
            "All programs include hands-on labs and real-world exercises."
        ),
    },
    {
        "title": "FAQ — Azure Certifications",
        "slug": "faq-azure-certifications",
        "category": "faq",
        "source_url": "/faq",
        "content": (
            "Does the Cloud program support Azure certifications?\n"
            "Yes — the Cloud Computing and AI curriculum supports the AZ-104 (Azure Administrator) "
            "and DP-600 (Fabric Analytics Engineer) certification paths."
        ),
    },
    {
        "title": "Contact Information",
        "slug": "contact-information",
        "category": "contact",
        "source_url": "/contact",
        "content": (
            "Contact Nexa Academy.\n"
            "Email: info@nexaacademy.co.ke.\n"
            "Phone: +254713067311.\n"
            "Location: 10th Floor, JKUAT Towers, CBD Nairobi — opposite Jamia Mosque.\n"
            "Use the contact form at /contact to send a direct message to the admissions team."
        ),
    },
    {
        "title": "How to Apply",
        "slug": "how-to-apply",
        "category": "admissions",
        "source_url": "/apply",
        "content": (
            "How to apply to Nexa Academy:\n"
            "1. Visit /apply and fill in the online application form.\n"
            "2. Choose your program: Software Engineering or Cloud Computing and AI.\n"
            "3. Provide your full name, email, phone number, and background.\n"
            "4. Submit the form — you receive a confirmation email immediately.\n\n"
            "A minimum deposit of KSh 10,000 is required to secure your place after approval. "
            "For help: info@nexaacademy.co.ke or +254713067311."
        ),
    },
    {
        "title": "Mentorship and Support",
        "slug": "mentorship-support",
        "category": "general",
        "source_url": "/programs",
        "content": (
            "All Nexa Academy students receive weekly 1-on-1 mentorship from an industry mentor throughout the program. "
            "Mentors provide guidance, code reviews, and career advice. "
            "All programs also include job placement support: CV review, interview preparation, and recruiter connections."
        ),
    },
    {
        "title": "Class Format — Online and Live",
        "slug": "class-format",
        "category": "general",
        "source_url": "/programs",
        "content": (
            "All Nexa Academy classes are live online. Sessions are recorded for review. "
            "You can participate from anywhere with a stable internet connection. "
            "There are no in-person requirements."
        ),
    },
    {
        "title": "Terms and Conditions",
        "slug": "terms-conditions",
        "category": "policy",
        "source_url": "/terms",
        "content": (
            "Nexa Academy Terms and Conditions.\n"
            "Enrolment is confirmed only after receipt of the required deposit or full payment.\n"
            "Refund policy: 50% refund of fees paid if requested before the program start date. "
            "No refunds after the program commences.\n"
            "Student conduct: harassment, plagiarism, and sharing of proprietary materials are prohibited.\n"
            "All course materials remain Nexa Academy intellectual property.\n"
            "These terms may be updated; continued use constitutes acceptance. "
            "Full terms at /terms."
        ),
    },
    {
        "title": "Privacy Policy",
        "slug": "privacy-policy",
        "category": "policy",
        "source_url": "/privacy",
        "content": (
            "Nexa Academy Privacy Policy.\n"
            "We collect only the personal data needed to process your application and deliver our programs.\n"
            "Your data is never sold to third parties.\n"
            "We use secure servers and industry-standard encryption.\n"
            "You may request access to or deletion of your data by emailing info@nexaacademy.co.ke.\n"
            "Full policy at /privacy."
        ),
    },
    {
        "title": "Student Login and Account",
        "slug": "student-login",
        "category": "general",
        "source_url": "/student-login",
        "content": (
            "Student login and sign-up for Nexa Academy.\n"
            "Existing students sign in with their email and password at /student-login.\n"
            "New applicants can create an account from the sign-up tab.\n"
            "After logging in you are taken to your student dashboard at /student-dashboard.\n"
            "Password reset is available from the login page.\n"
            "For account issues contact info@nexaacademy.co.ke."
        ),
    },
]


class Command(BaseCommand):
    help = "Seed the KnowledgeBase table with initial content. Safe to re-run."

    def handle(self, *args, **options):
        from chatbot.models import KnowledgeBase

        created_count = 0
        updated_count = 0
        for entry in SEED_ENTRIES:
            obj, created = KnowledgeBase.objects.update_or_create(
                slug=entry["slug"],
                defaults={
                    "title": entry["title"],
                    "category": entry["category"],
                    "source_url": entry.get("source_url", ""),
                    "content": entry["content"],
                    "is_active": True,
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done — {created_count} created, {updated_count} updated. "
                f"Total: {KnowledgeBase.objects.count()} entries."
            )
        )
