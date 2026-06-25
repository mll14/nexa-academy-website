# Nexa Academy — API Server

> REST API backend for the Nexa Academy platform. Built with Django 6, Django REST Framework, and PostgreSQL.

**Live:** [api.nexaacademy.co.ke](https://api.nexaacademy.co.ke)  
**API Docs:** [api.nexaacademy.co.ke/api/docs/](https://api.nexaacademy.co.ke/api/docs/)

---

## Overview

This Django application is the single backend for the landing page, admissions portal, and any future Nexa Academy clients. It handles:

- User accounts with role-based access (admin / student)
- The full application → interview → enrolment workflow
- Program and intake management (with optional Google Calendar sync)
- Paystack payment processing
- In-app notifications
- Newsletter subscriptions
- Gemini-powered RAG chatbot
- Contact form submissions
- Analytics tracking

---

## Tech Stack

| Library | Purpose |
|---|---|
| Django 6.0 | Web framework |
| Django REST Framework 3.16 | REST API layer |
| PostgreSQL | Primary database (via `dj-database-url`) |
| `djangorestframework-simplejwt` | JWT auth — 7-day access / 30-day refresh tokens |
| `python-decouple` | Environment variable management |
| Whitenoise | Static file serving |
| `drf-spectacular` | OpenAPI 3 schema + Swagger UI at `/api/docs/` |
| Paystack | Payment processing |
| Google Calendar API | Interview slot suggestions, Meet link generation |
| Gemini | RAG chatbot via `aiassistant` / `chatbot` apps |

---

## Django Apps

| App | Responsibility |
|---|---|
| `accounts` | Custom `User` model (UUID PK as `uid`), roles, 2FA, Google OAuth, login sessions, staff roles & permissions |
| `applications` | Application submissions, status workflow, `InterviewSlot`, blackout days |
| `programs` | `Program` model, `ProgramIntake`, enrolments, certificates |
| `payments` | Paystack integration, payment plans, transaction ledger |
| `notifications` | In-app notification creation and read/unread tracking |
| `newsletter` | Email subscription management |
| `analytics` | Usage event tracking |
| `contacts` | Contact form message storage |
| `chatbot` | Gemini-powered RAG admissions chatbot |
| `aiassistant` | AI retrieval endpoints |

---

## Project Structure

```
server-nexa-website/
├── accounts/
│   ├── models.py           # Custom User model, StaffRole, LoginSession, TwoFADevice
│   ├── views.py            # Auth endpoints (login, refresh, 2FA, Google OAuth, profile)
│   ├── serializers.py
│   ├── permissions.py      # IsAdminUser permission class
│   ├── authentication.py   # Custom JWT authentication backend
│   └── migrations/
├── applications/
│   ├── models.py           # Application, ApplicationLog, InterviewSlot, InterviewBlackout
│   ├── views.py            # Application CRUD + status actions + interview endpoints
│   └── gcal_service.py     # Google Calendar integration (slots, events, Meet links)
├── programs/
│   ├── models.py           # Program, ProgramIntake, Enrolment, Certificate
│   ├── views.py
│   └── signals.py          # Sanity → Calendar two-way sync on intake save/delete
├── payments/
├── notifications/
├── newsletter/
├── contacts/
├── chatbot/
├── aiassistant/
├── ubuntu_labs/            # Django project settings package
│   ├── settings.py
│   ├── urls.py
│   ├── middleware.py
│   └── html_utils.py
└── templates/
    └── emails/             # HTML email templates
```

---

## Getting Started

### Prerequisites
- Python 3.12+
- PostgreSQL 15+

### Installation

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Core
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://user:password@localhost:5432/nexa

# JWT
ACCESS_TOKEN_LIFETIME_DAYS=7
REFRESH_TOKEN_LIFETIME_DAYS=30

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=admissions@nexaacademy.co.ke
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=Nexa Academy <admissions@nexaacademy.co.ke>

# Frontend URLs (used in email links)
PORTAL_URL=https://portal.nexaacademy.co.ke
SITE_URL=https://nexaacademy.co.ke

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# Paystack
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...

# Google Calendar (optional — for interview slot features)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GCAL_ADMISSIONS_CALENDAR_ID=admissions@nexaacademy.co.ke
GCAL_WEBHOOK_TOKEN=your-random-secret
GCAL_SLOT_DURATION_MINUTES=30
GCAL_SLOT_START_HOUR=9
GCAL_SLOT_END_HOUR=17
GCAL_SLOT_COUNT=6

# Gemini (chatbot)
GEMINI_API_KEY=your-gemini-key
```

### Database Setup

```bash
python manage.py migrate
python manage.py createsuperuser
```

### Run Development Server

```bash
python manage.py runserver    # http://localhost:8000
# API docs: http://localhost:8000/api/docs/
```

---

## Key API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login/` | Email + password login |
| `POST` | `/api/auth/token/refresh/` | Refresh access token |
| `POST` | `/api/auth/google/` | Google OAuth login |
| `POST` | `/api/auth/2fa/verify/` | Complete 2FA login |
| `GET` | `/api/auth/profile/` | Get current user profile |
| `POST` | `/api/auth/logout/` | Revoke refresh token |

### Applications
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/applications/` | List (paginated) or create |
| `GET/PATCH` | `/api/applications/{id}/` | Retrieve or update |
| `POST` | `/api/applications/{id}/propose_interview_times/` | Admin sets interview slots |
| `POST` | `/api/applications/{id}/choose_interview_time/` | Student confirms slot |
| `GET` | `/api/applications/{id}/available_slots/` | Admin — calendar-aware free slots |
| `POST` | `/api/applications/{id}/confirm_interview/` | Admin — creates Calendar event + Meet link |

### Programs & Intakes
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/programs/` | List programs |
| `GET/POST` | `/api/programs/{id}/intakes/` | List or create intakes |
| `PATCH/DELETE` | `/api/programs/intakes/{id}/` | Update or delete intake |

### Full API Reference
Visit `/api/docs/` on a running instance for the complete OpenAPI specification.

---

## Application Status Flow

```
pending → reviewed → approved → interview_scheduled → interview_completed → enrolled
                   ↘ rejected
```

Every status transition must:
1. Update `status` and `status_updated_at`
2. Create an `ApplicationLog` entry
3. Send the relevant email template

---

## Custom User Model

Located at `accounts/models.py`. Primary key is `uid` (UUID). Always reference via `settings.AUTH_USER_MODEL` in ForeignKey definitions; use `get_user_model()` at runtime. Check role with `user.role == 'admin'` or the `IsAdminUser` permission class.

---

## Migrations

Always create a new migration after model changes. Never edit existing migration files.

```bash
python manage.py makemigrations <app_name>
python manage.py migrate
```

---

## Running Tests

```bash
python manage.py test <app_name>
```

For Google Calendar integration tests, mock `applications.gcal_service._get_calendar_service` — never make real API calls in tests.

---

## Deployment

The API is deployed on a Linux VPS (or Railway) behind Nginx + Gunicorn.

```bash
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
gunicorn ubuntu_labs.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

Set `DEBUG=False` and configure `ALLOWED_HOSTS` with the production domain in `.env`.
