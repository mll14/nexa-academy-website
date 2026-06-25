# Nexa Academy — Platform Monorepo

> Kenya's leading coding bootcamp. This repository contains the full Nexa Academy platform: public website, student admissions portal, and REST API backend.

**Live**
| App | URL |
|---|---|
| Landing page | [nexaacademy.co.ke](https://nexaacademy.co.ke) |
| Admissions portal | [portal.nexaacademy.co.ke](https://portal.nexaacademy.co.ke) |
| API | [api.nexaacademy.co.ke](https://api.nexaacademy.co.ke) |

---

## Repository Layout

```
nexa-academy/
├── landing-page/           # Public marketing & application site (Next.js 15)
├── admissions-portal/      # Student & admin portal (Vite + React)
└── server-nexa-website/    # REST API backend (Django 6 + DRF)
```

Each sub-project is independently deployable with its own dependencies, environment variables, and CI configuration.

---

## Architecture Overview

```
                    ┌─────────────────────────┐
                    │   Sanity.io  (CMS/CDN)  │
                    └────────────┬────────────┘
                                 │ GROQ
              ┌──────────────────▼──────────────────┐
              │         landing-page (Next.js)       │
              │  Edge runtime · ISR · Tailwind CSS   │
              └──────────────────┬──────────────────┘
                                 │ REST
              ┌──────────────────▼──────────────────┐
              │    server-nexa-website (Django API)  │
              │   PostgreSQL · JWT · Paystack         │
              └──────────────────┬──────────────────┘
                                 │ REST + JWT
              ┌──────────────────▼──────────────────┐
              │    admissions-portal (Vite/React)    │
              │  TanStack Router · TanStack Query    │
              └─────────────────────────────────────┘
```

---

## Apps at a Glance

### `landing-page/` — Public Site
Next.js 15 app running on the Cloudflare edge. Pulls content from Sanity CMS via GROQ queries. Handles the application funnel, blog, program pages, appointments, and FAQ. Server Components by default with selective `"use client"` boundaries.

→ [Full docs](./landing-page/README.md)

### `admissions-portal/` — Admin & Student Portal
Vite + React SPA. Admins manage applications, interviews, payments, enrolled students, leads, and staff roles. Students track their own application, payment schedule, and profile. Route-level code splitting, TanStack Query caching, and role-based permission gates throughout.

→ [Full docs](./admissions-portal/README.md)

### `server-nexa-website/` — REST API
Django 6 + Django REST Framework. Provides JWT-authenticated endpoints for all three client apps. Covers user accounts, applications, programs, payments (Paystack), notifications, newsletter, chatbot (Gemini RAG), and more.

→ [Full docs](./server-nexa-website/README.md)

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Public site | Next.js 15, React 19, Tailwind CSS, Sanity CMS |
| Admin/student portal | Vite, React 18, TanStack Router v1, TanStack Query v5 |
| API | Django 6, Django REST Framework 3.16, PostgreSQL |
| Auth | JWT (simplejwt) — 7-day access / 30-day refresh, Google OAuth, 2FA |
| Payments | Paystack |
| CMS | Sanity v3 |
| Email | Django templated HTML emails |
| AI | Gemini-powered RAG chatbot |
| Deployment | Cloudflare Pages (frontend), Railway/VPS (API) |

---

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.12+
- PostgreSQL 15+

### 1. API

```bash
cd server-nexa-website
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in DATABASE_URL, SECRET_KEY, etc.
python manage.py migrate
python manage.py runserver    # http://localhost:8000
```

### 2. Landing page

```bash
cd landing-page
npm install
cp .env.local.example .env.local   # fill in Sanity project ID, API base URL
npm run dev                         # http://localhost:3000
```

### 3. Admissions portal

```bash
cd admissions-portal
npm install
cp .env.local.example .env    # set VITE_API_BASE_URL
npm run dev                    # http://localhost:5173
```

---

## Contributing

1. Branch off `main` using the convention `feat/`, `fix/`, or `chore/`
2. Keep each PR scoped to one sub-project where possible
3. Run `tsc --noEmit` before pushing for the two TypeScript apps
4. For Django changes, always include a migration — never edit existing ones

---

## Licence

Private — Nexa Academy. All rights reserved.
