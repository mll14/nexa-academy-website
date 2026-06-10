# Google Calendar & Google Meet — Backend Setup Guide

This guide connects the Nexa Academy backend to Google Calendar using **Google Workspace
domain-wide delegation**. The service account acts as `admissions@nexaacademy.co.ke`,
so all events appear as created by that account and Meet links are provisioned under the
Workspace licence.

---

## How It Works

A Google Cloud service account is granted **domain-wide delegation** by a Google Workspace
super-admin. When the backend calls the Calendar API, it impersonates
`admissions@nexaacademy.co.ke` (via `.with_subject()`). No password, no OAuth consent
screen — just a JSON key and an Admin console authorisation.

```
Django backend
    │
    ▼
Service account (JSON key in .env)
    │  impersonates via domain-wide delegation
    ▼
admissions@nexaacademy.co.ke  ←→  Google Calendar / Meet
```

---

## Prerequisites

- Access to [Google Cloud Console](https://console.cloud.google.com) (any account)
- **Google Workspace super-admin** access to the `nexaacademy.co.ke` domain
- Python dependencies installed (see Step 7)

---

## Step 1 — Google Cloud Project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. Click the project picker → **New Project**.
3. Name it `nexa-academy` and click **Create**.
4. Confirm the new project is selected in the top bar.

> You can use any Google account to own this GCP project. The GCP project is separate
> from the Google Workspace domain — the delegation is granted in the Workspace Admin
> console, not in GCP.

---

## Step 2 — Enable Required APIs

Go to **APIs & Services → Library** and enable:

| API | Purpose |
|-----|---------|
| **Google Calendar API** | Read/write events and free/busy data |

Search by name, click it, then click **Enable**.

---

## Step 3 — Create a Service Account

1. Go to **IAM & Admin → Service Accounts → + Create Service Account**.
2. Fill in:
   - **Name**: `nexa-admissions-calendar`
   - **Description**: `Nexa Academy admissions calendar integration`
3. Click **Create and Continue** → skip role/user grant steps → **Done**.
4. Click the service account row to open its details.
5. On the **Details** tab, note the **Unique ID** (a long number, e.g. `114…`) — you will
   paste this into the Workspace Admin console in Step 5.

---

## Step 4 — Enable Domain-Wide Delegation on the Service Account

1. Still on the service account page, click **Edit** (pencil icon at the top).
2. Expand **Advanced settings**.
3. Check **Enable Google Workspace Domain-wide Delegation**.
4. Enter a product name for the OAuth screen (e.g. `Nexa Academy Calendar`).
5. Click **Save**.

---

## Step 5 — Authorise the Service Account in Workspace Admin Console

This step requires a **Google Workspace super-admin** login.

1. Go to [https://admin.google.com](https://admin.google.com) and sign in as a super-admin
   for `nexaacademy.co.ke`.
2. Navigate to **Security → Access and data control → API controls**.
3. Click **Manage Domain Wide Delegation** → **Add new**.
4. Enter:
   - **Client ID**: paste the **Unique ID** from Step 3
   - **OAuth scopes** (comma-separated):
     ```
     https://www.googleapis.com/auth/calendar,https://www.googleapis.com/auth/calendar.events
     ```
5. Click **Authorize**.

The service account can now impersonate any user in `nexaacademy.co.ke`.

---

## Step 6 — Download the Service Account JSON Key

1. Back in **GCP → IAM & Admin → Service Accounts**, click the service account.
2. Go to the **Keys** tab → **Add Key → Create new key → JSON → Create**.
3. A `.json` file downloads. **Keep this file secure — never commit it to git.**

---

## Step 7 — Get the Admissions Calendar ID

1. Log into Google Calendar as `admissions@nexaacademy.co.ke`.
2. Hover over the admissions calendar in the left sidebar → three-dot menu →
   **Settings and sharing**.
3. Scroll to **Integrate calendar**.
4. Copy the **Calendar ID** (it looks like `admissions@nexaacademy.co.ke` or a long
   `@group.calendar.google.com` string).

> For the primary calendar of `admissions@nexaacademy.co.ke` the Calendar ID is simply
> `admissions@nexaacademy.co.ke`, which is the default value already set in `.env`.

---

## Step 8 — Configure Environment Variables

Add these to `server-nexa-website/.env`:

```env
# Paste the full JSON key file contents as a single-line compact string:
#   cat /path/to/key.json | python3 -m json.tool --compact
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"nexa-academy",...}

# Calendar ID from Step 7 (default is fine for the primary admissions calendar)
GCAL_ADMISSIONS_CALENDAR_ID=admissions@nexaacademy.co.ke

# Workspace user the service account will impersonate
GCAL_DELEGATE_EMAIL=admissions@nexaacademy.co.ke

# Public HTTPS URL of the Django API (used to register the webhook channel)
BACKEND_URL=https://api.nexaacademy.co.ke

# Random secret for webhook validation:
#   python3 -c "import secrets; print(secrets.token_hex(32))"
GCAL_WEBHOOK_TOKEN=<your-generated-token>

# Interview slot configuration
GCAL_SLOT_DURATION_MINUTES=30
GCAL_SLOT_START_HOUR=9
GCAL_SLOT_END_HOUR=17
GCAL_SLOT_COUNT=6
```

These are already wired into `ubuntu_labs/settings.py` — no manual edits needed there.

---

## Step 9 — Install Python Dependencies

`requirements.txt` already contains:

```
google-api-python-client==2.151.0
google-auth-httplib2==0.2.0
google-auth-oauthlib==1.2.1
```

Install:

```bash
cd server-nexa-website
pip install -r requirements.txt
```

---

## Step 10 — Verify the Connection

Run this script to confirm the service account can impersonate `admissions@nexaacademy.co.ke`
and reach the calendar:

```bash
cd server-nexa-website
python3 - <<'EOF'
import os, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ubuntu_labs.settings')
import django; django.setup()
from django.conf import settings
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
]

info = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
creds = service_account.Credentials.from_service_account_info(
    info, scopes=SCOPES
).with_subject(settings.GCAL_DELEGATE_EMAIL)

service = build('calendar', 'v3', credentials=creds, cache_discovery=False)
cal = service.calendars().get(calendarId=settings.GCAL_ADMISSIONS_CALENDAR_ID).execute()
print("Connected as:", settings.GCAL_DELEGATE_EMAIL)
print("Calendar summary:", cal['summary'])
EOF
```

Expected output:
```
Connected as: admissions@nexaacademy.co.ke
Calendar summary: admissions@nexaacademy.co.ke
```

---

## How Google Meet Links Are Generated

No extra setup needed. Because the backend acts as a Workspace user, Google provisions Meet
rooms automatically. `gcal_service.create_interview_event()` sets:

```python
'conferenceData': {
    'createRequest': {
        'requestId': f"nexa-{application.id}",
        'conferenceSolutionKey': {'type': 'hangoutsMeet'},
    }
}
```

with `conferenceDataVersion=1`. The Meet join URL is returned in the API response and stored
in `InterviewSlot.meet_url`.

> **Note**: Meet link generation requires the impersonated account (`admissions@nexaacademy.co.ke`)
> to be a Google Workspace account (not a personal Gmail). It is.

---

## Webhook Channel Renewal

Google push notification channels expire after 7 days. Renew every 5 days via management command:

```bash
python3 manage.py renew_gcal_webhooks
```

Add to server cron:

```cron
0 3 */5 * * cd /path/to/server-nexa-website && python3 manage.py renew_gcal_webhooks
```

The webhook endpoint is `POST /api/gcal-webhook/` (no JWT). It validates the
`X-Goog-Channel-Token` header against `settings.GCAL_WEBHOOK_TOKEN`.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `401 unauthorized_client` | Domain-wide delegation not authorised in Workspace Admin | Re-do Step 5; confirm the Client ID is the numeric Unique ID, not the email |
| `403 forbidden` | Scopes not included in Admin console authorisation | Re-do Step 5 and add both calendar scopes |
| `invalid_grant` | JSON key malformed in `.env` (line breaks inside value) | Re-paste as a single compact line using `python3 -m json.tool --compact` |
| `400 invalidSyncToken` | Webhook sync token expired | Re-run `renew_gcal_webhooks` |
| No Meet link in response | `conferenceDataVersion=1` not passed, or non-Workspace account | Confirm query param is set; verify `GCAL_DELEGATE_EMAIL` is a Workspace user |
| Students not receiving calendar invites | `sendUpdates='all'` missing or student email wrong | Check `InterviewSlot.student_gmail`; `sendUpdates='all'` is already set in `gcal_service.py` |
| `domainPolicy` blocks key creation | Org policy on GCP project restricts service account keys | Create the GCP project under a personal Google account instead of the Workspace org |

---

## Security Checklist

- [ ] Service account JSON stored only in `.env` / server environment variables, never in git
- [ ] `.env` is listed in `.gitignore`
- [ ] `GCAL_WEBHOOK_TOKEN` is a 32+ hex character random value
- [ ] Downloaded JSON key file deleted from local machine after pasting into `.env`
- [ ] Domain-wide delegation scoped to only the two Calendar scopes (not `gmail`, `drive`, etc.)
- [ ] Service account has no IAM roles on the GCP project (it only needs the API enabled, not project permissions)
