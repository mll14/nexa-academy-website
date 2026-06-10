# Nexa Academy — CLAUDE.md

Project instructions for Claude Code. Read this file fully before making any changes.

---

## Project overview

Nexa Academy is an edtech platform for a Kenyan coding bootcamp. It handles course listings, student applications, admissions interviews, payments, and enrollment. The stack is a Django REST API backend and a React + Vite frontend, deployed separately.

**Live domains**
- Frontend: `nexaacademy.co.ke`
- API: `api.nexaacademy.co.ke`
- Admissions email: `admissions@nexaacademy.co.ke`

---

## Repository layout

```
site/
├── server-nexa-website/   # Django backend (Python)
└── client-nexa-academy/   # React frontend (JS)
```

---

## Backend — `server-nexa-website/`

### Tech stack
- **Django 6.0** with Django REST Framework 3.16
- **PostgreSQL** via `dj-database-url`
- **JWT auth** via `djangorestframework-simplejwt` (7-day access tokens, 30-day refresh)
- **Python-decouple** for env vars — never hard-code secrets
- **Whitenoise** for static files
- **drf-spectacular** for OpenAPI docs at `/api/docs/`
- **Timezone**: `Africa/Nairobi` (EAT, UTC+3) — all datetime logic must respect this

### Django apps

| App | Purpose |
|---|---|
| `accounts` | Custom `User` model (UUID PK as `uid`), roles: `admin` / `student` |
| `applications` | Application submissions, status workflow, `InterviewSlot` |
| `programs` | `Program` model, enrollments, certificates |
| `payments` | Paystack integration |
| `notifications` | In-app notifications |
| `newsletter` | Email subscription |
| `analytics` | Usage tracking |
| `contacts` | Contact form messages |
| `chatbot` | Gemini-powered RAG chatbot |
| `aiassistant` | AI retrieval endpoints |

### Custom user model
Located at `accounts/models.py`. Primary key is `uid` (UUID). Always use `settings.AUTH_USER_MODEL` in ForeignKey definitions, never import `User` directly from `accounts`. Check role with `user.role == 'admin'` — the permission class `accounts.permissions.IsAdminUser` does this check.

### Application status flow
```
pending → reviewed → approved → interview_scheduled → interview_completed → enrolled
                   ↘ rejected
```
Status changes must create an `ApplicationLog` entry. Always set `status_updated_at = timezone.now()` alongside status changes.

### InterviewSlot model (current state)
`applications/models.py` — fields: `proposed_times` (JSON list of ISO strings), `chosen_time`, `zoom_link`, `admin_approved`, `completed`. The `zoom_link` field is currently a plain URL string entered manually by the admin.

### Key API endpoints (existing)
```
POST   /api/applications/                          Create application
GET    /api/applications/                          List (admin: all; student: own)
POST   /api/applications/{id}/propose_interview_times/   Admin sets slots + zoom link
POST   /api/applications/{id}/choose_interview_time/     Student picks a slot
GET    /api/auth/login/                            JWT login
GET    /api/programs/                              List programs
```

### Adding new endpoints
1. Add view/action in the relevant `views.py`
2. Register in the app's `urls.py` router or `urlpatterns`
3. The main `ubuntu_labs/urls.py` includes all app URLs under `/api/`
4. Add the new URL pattern to this file only if it needs a top-level override

### Migrations
Always create migrations after model changes:
```bash
python manage.py makemigrations <app_name>
python manage.py migrate
```
Never edit existing migration files. If a migration needs correction, create a new one.

### Environment variables
Read from `.env` via `python-decouple`. Existing keys relevant to new work:

```env
# Google (existing — OAuth login)
GOOGLE_CLIENT_ID=

# New keys to add for Calendar integration
GOOGLE_SERVICE_ACCOUNT_JSON=      # Full JSON of service account credentials
GCAL_ADMISSIONS_CALENDAR_ID=      # Calendar ID for admissions@nexaacademy.co.ke
GCAL_WEBHOOK_TOKEN=               # Secret token to validate incoming webhook calls
GCAL_SLOT_DURATION_MINUTES=30     # Interview slot length
GCAL_SLOT_START_HOUR=9            # Earliest slot start (EAT, 24h)
GCAL_SLOT_END_HOUR=17             # Latest slot end (EAT, 24h)
GCAL_SLOT_COUNT=6                 # Number of slots to return per query
```

---

## Google Calendar / Meet integration (Feature 1)

### Goal
Replace manual interview time entry with calendar-aware slot suggestions. Auto-generate Google Meet links when a slot is confirmed.

### New files to create

**`applications/gcal_service.py`** — all Google Calendar logic lives here, not in views.

```python
# Key functions this module must expose:
get_available_slots(start_date, end_date) -> list[datetime]
create_interview_event(application, chosen_time) -> dict  # returns {event_id, meet_url}
update_interview_event(event_id, new_time) -> dict
cancel_interview_event(event_id) -> None
sync_intake_to_calendar(intake) -> str  # returns event_id
delete_intake_from_calendar(event_id) -> None
```

### Google auth pattern
Use a service account with domain-wide delegation so the server can act as `admissions@nexaacademy.co.ke`:

```python
from google.oauth2 import service_account
from googleapiclient.discovery import build
import json
from django.conf import settings

SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
]

def _get_calendar_service():
    info = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=SCOPES
    ).with_subject('admissions@nexaacademy.co.ke')
    return build('calendar', 'v3', credentials=creds, cache_discovery=False)
```

### Free/busy slot detection
1. Call `freebusy().query()` on the admissions calendar for a 4-week window
2. Also query `en.ke#holiday@group.v.calendar.google.com` for Kenyan public holidays
3. Filter out: weekends, holidays, days with a blackout DB record, existing busy blocks
4. Generate 30-min candidate slots between configured start/end hours in EAT
5. Return the first N available slots (default 6)

### InterviewSlot model changes
Add fields via migration:

```python
gcal_event_id = models.CharField(max_length=255, blank=True)
meet_url = models.URLField(blank=True)
```

Update `InterviewSlotSerializer` to expose these new fields.

### New endpoints

**`GET /api/applications/{id}/available_slots/`**
- Permission: `IsAdminUser`
- Calls `gcal_service.get_available_slots()` and returns a list of ISO datetime strings in EAT
- Cache result for 5 minutes to avoid hammering the Calendar API

**`POST /api/applications/{id}/confirm_interview/`**
- Permission: `IsAdminUser`
- Body: `{ "chosen_time": "<ISO datetime>" }`
- Calls `gcal_service.create_interview_event()`, saves `gcal_event_id` and `meet_url` on `InterviewSlot`
- Transitions application status to `interview_scheduled`
- Sends confirmation email to applicant that includes the Meet link

**`POST /api/applications/{id}/reschedule_interview/`**
- Permission: `IsAdminUser`
- Body: `{ "chosen_time": "<ISO datetime>" }`
- Calls `gcal_service.update_interview_event()` with existing `gcal_event_id`

**`POST /api/applications/{id}/cancel_interview/`**
- Permission: `IsAdminUser`
- Calls `gcal_service.cancel_interview_event()`, clears slot fields

### Admin-managed blackout days
New model in `applications/models.py`:

```python
class InterviewBlackout(models.Model):
    date = models.DateField(unique=True)
    reason = models.CharField(max_length=255, blank=True)
    created_by = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interview_blackouts'
        ordering = ['date']
```

Expose via a simple ModelViewSet — list/create/delete, `IsAdminUser` for write, `IsAuthenticated` for read.

The free-slot service checks this table before returning slots.

---

## Intake management (Feature 2)

### Goal
Replace hard-coded `startDates[]` arrays in `client-nexa-academy/src/data/programs.js` with a live API. Admin manages intakes via the site. Changes sync two-ways with Google Calendar.

### New model — add to `programs/models.py`

```python
class ProgramIntake(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('draft', 'Draft'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='intakes')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    application_deadline = models.DateField(null=True, blank=True)
    max_seats = models.IntegerField(null=True, blank=True)
    seats_remaining = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    gcal_event_id = models.CharField(max_length=255, blank=True)
    notes = models.CharField(max_length=500, blank=True)
    source = models.CharField(max_length=10, default='site')  # 'site' or 'calendar'
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'program_intakes'
        ordering = ['start_date']
        unique_together = ['program', 'start_date']
```

### New endpoints — add to `programs/urls.py`

```
GET    /api/programs/{id}/intakes/        Public — list open/draft intakes for a program
POST   /api/programs/{id}/intakes/        Admin only — create intake
PATCH  /api/programs/intakes/{intake_id}/ Admin only — update intake
DELETE /api/programs/intakes/{intake_id}/ Admin only — delete intake
POST   /api/gcal-webhook/                 Unauthenticated — Google push notification receiver
```

### Two-way sync

**Site → Calendar (via Django signals)**

In `programs/signals.py`, connect to `post_save` and `post_delete` on `ProgramIntake`:
- On create/update: call `gcal_service.sync_intake_to_calendar(intake)` — creates or patches an all-day event on the admissions calendar. Store returned `gcal_event_id`.
- On delete: call `gcal_service.delete_intake_from_calendar(event_id)`.

Register signals in `programs/apps.py` `ready()`.

**Calendar → Site (webhook)**

`POST /api/gcal-webhook/` — no JWT required. Validate with `X-Goog-Channel-Token` header matching `settings.GCAL_WEBHOOK_TOKEN`.

On a valid notification:
1. Fetch the changed event from Calendar API using the `resourceId` in the notification
2. Match it to a `ProgramIntake` by `gcal_event_id`
3. Update the record, setting `source='calendar'` and `last_synced_at=now()`
4. If no match, create a new `ProgramIntake` (Calendar-originated)

**Conflict resolution**: last-write-wins. The `source` and `last_synced_at` fields are for audit — do not implement complex merge logic.

**Webhook channel renewal**: Google push notification channels expire after 7 days. Create a management command `python manage.py renew_gcal_webhooks` that re-registers the channel. Add this to your deployment cron/scheduler to run every 5 days.

### Frontend changes

**Remove hard-coded intake data** from `src/data/programs.js` — delete `startDates`, `nextIntake`, and `applicationDeadline` fields.

**`src/hooks/useCourses.js`** — extend to fetch intakes:

```js
// Fetch intakes for a specific program
const fetchIntakes = async (programId) => {
  const res = await apiService.get(`/programs/${programId}/intakes/`);
  return res.results || res;
};
```

**`src/pages/landing-page/ProgramDetail.jsx`** — replace static dates with data from `fetchIntakes(program.program_id)`. Show a loading state while fetching.

**`src/pages/landing-page/ApplicationPage.jsx`** — populate the intake date picker from live API data, not from `programs.js`.

**Admin intake manager** — add a new tab or section in `src/pages/admin/AdminPage.jsx`:
- Table: program name, start date, deadline, seats remaining, status, sync status (shows last_synced_at)
- Add / Edit intake form (inline or drawer)
- Delete with confirmation
- "Sync now" button: calls `POST /api/programs/intakes/{id}/force_sync/` to push the record to Calendar immediately

---

## New dependencies to add

### Backend (`requirements.txt`)
```
google-api-python-client==2.151.0
google-auth-httplib2==0.2.0
google-auth-oauthlib==1.2.1
```

### Frontend
No new npm packages needed. The existing `@react-oauth/google` is for user login only — do not use it for the service account Calendar calls.

---

## Code conventions

### Backend
- Use `from django.utils import timezone` for all datetime operations — never `datetime.now()`. The project timezone is EAT.
- All new views must use `IsAuthenticated` as a minimum. Admin-only actions use `IsAdminUser` from `accounts.permissions`.
- Wrap external API calls (Google Calendar) in `try/except` and log errors with `logger.error(...)`. Never let a Calendar API failure crash the main application flow.
- New serializers go in the app's `serializers.py`. Never inline serializer logic in views.
- `ApplicationLog` entries must be created for every application status change. Pattern: create the log inside the same view/action that changes the status.

### Frontend
- All API calls go through `src/services/apiService.js` — never use `fetch` directly in components.
- Responses use snake_case from the API; the service layer (e.g. `applicationService.js`) maps to camelCase for components. Follow this pattern for any new service methods.
- Admin-only UI components go in `src/pages/admin/`. Public-facing pages go in `src/pages/landing-page/`. Student dashboard components go in `src/pages/student-dashboard/`.
- Use existing UI components from `src/components/ui/` (shadcn-based). Do not add new UI libraries.
- Toast notifications use `react-hot-toast` — import from there, not from shadcn.

---

## Testing approach

### Backend
Run tests with:
```bash
cd server-nexa-website
python manage.py test <app_name>
```
For Calendar integration, mock the `googleapiclient` calls in unit tests — do not make real API calls in tests. Use `unittest.mock.patch('applications.gcal_service._get_calendar_service')`.

### Frontend
No test runner is configured. Test new flows manually by running:
```bash
cd client-nexa-academy
npm run dev
```

---

## Local development

### Backend
```bash
cd server-nexa-website
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL and other vars
python manage.py migrate
python manage.py runserver
```
API available at `http://localhost:8000`. Docs at `http://localhost:8000/api/docs/`.

### Frontend
```bash
cd client-nexa-academy
npm install
npm run dev
```
Frontend available at `http://localhost:5173`. Proxies `/api/*` to `http://localhost:8000`.

---

## Things to never do

- Never hard-code dates, intake data, or program slugs in the frontend. Fetch from the API.
- Never commit `.env` files or service account JSON to the repository. Use environment variables.
- Never call Google Calendar APIs synchronously in the critical path of a user-facing request if it can be deferred. For `available_slots`, it is acceptable because the admin is explicitly requesting it.
- Never bypass `InterviewSlot` and write calendar event IDs directly onto `Application`. Calendar metadata lives on `InterviewSlot`.
- Never import `User` directly from `accounts.models` in other apps. Use `settings.AUTH_USER_MODEL` for FK definitions and `get_user_model()` at runtime.
- Never create a new interview event without first checking that no `gcal_event_id` already exists on the slot (to avoid duplicate calendar events on retries).
- Never let a Google Calendar webhook handler return a non-2xx response for valid (but unrecognised) events — return 200 even if you take no action, otherwise Google will retry indefinitely.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

