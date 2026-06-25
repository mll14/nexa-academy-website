# Admissions Portal

> Student and admin portal for Nexa Academy. Built with Vite, React 18, TanStack Router, and TanStack Query.

**Live:** [portal.nexaacademy.co.ke](https://portal.nexaacademy.co.ke)

---

## Overview

The admissions portal serves two distinct user roles:

- **Students** — track their application status, view interview slots, manage payments, and update their profile.
- **Admins** — manage the full admissions pipeline: applications, interviews, enrolled students, payments, programs, leads, messages, newsletter, and staff access control.

---

## Features

### Student Side
| Feature | Description |
|---|---|
| Application tracker | Real-time status updates through the full admissions flow |
| Interview scheduling | View proposed interview slots and confirm a time |
| Payment dashboard | View payment plan, deposit progress, and instalment schedule |
| Profile management | Update personal info, upload documents |
| Notifications | In-app notification feed |

### Admin Side
| Feature | Description |
|---|---|
| Application management | List, search, filter, and update application status with audit logs |
| Interview management | Propose interview times, attach Zoom/Meet links, mark completion |
| Enrolled students | Finance reconciliation, cohort grouping, follow-up emails |
| Programs & intakes | Manage programs and cohort intake dates synced to Google Calendar |
| Payments | Full transaction history, payment plan requests, manual overrides |
| Leads | Contact form submissions and coming-soon interest registrations |
| Messages | Inbound contact form messages |
| Newsletter | Subscriber list management |
| Appointments | Booking management with calendar view |
| Staff roles & permissions | Role-based access control with per-codename permission gates |
| Audit logs | Full history of admin actions |
| Account settings | 2FA, Google OAuth link, profile |

---

## Tech Stack

| Library | Purpose |
|---|---|
| [Vite](https://vitejs.dev) | Build tool & dev server |
| [React 18](https://react.dev) | UI framework |
| [TanStack Router v1](https://tanstack.com/router) | Type-safe file-based routing with `beforeLoad` guards |
| [TanStack Query v5](https://tanstack.com/query) | Server-state cache, background refetch, optimistic UI |
| [Tailwind CSS v3](https://tailwindcss.com) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com) | Accessible component primitives |
| [react-hot-toast](https://react-hot-toast.com) | Toast notifications |
| [lucide-react](https://lucide.dev) | Icons |

---

## Project Structure

```
admissions-portal/
├── public/
│   └── _headers            # Cloudflare Pages security headers
├── src/
│   ├── components/
│   │   ├── admin/          # Admin-specific components (calendar, notes, toolbar)
│   │   ├── ui/             # shadcn-based primitives (button, card, dialog…)
│   │   ├── AdminLayout.tsx # Persistent sidebar + top bar for admin routes
│   │   ├── StudentLayout.tsx
│   │   └── ErrorBoundary.tsx
│   ├── context/
│   │   └── AuthContext.tsx # JWT auth state, login/logout, 2FA, role helpers
│   ├── lib/
│   │   ├── api/            # Per-domain API modules (applications, payments…)
│   │   ├── api.ts          # Legacy unified API client (migrating to api/)
│   │   └── auth.ts         # Token storage, refresh logic
│   ├── pages/
│   │   ├── admin/          # All admin pages
│   │   └── student/        # Student dashboard pages
│   ├── types/
│   │   └── index.ts        # Shared TypeScript interfaces
│   └── router.tsx          # TanStack Router tree with lazy-loaded routes
└── index.html
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- Running instance of `server-nexa-website` (or the live API)

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env` and fill in:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-v3-site-key
```

### Development

```bash
npm run dev       # http://localhost:5173
```

### Build

```bash
npm run build     # output → dist/
```

### Type Check

```bash
npx tsc --noEmit
```

---

## Authentication

The portal uses JWT authentication with httpOnly refresh cookies:

- **Access token** — stored in memory (module-level variable), 7-day expiry
- **Refresh token** — httpOnly cookie, 30-day expiry
- On page reload, the app exchanges the refresh cookie for a fresh access token before rendering protected routes
- Google OAuth login is supported via `@react-oauth/google`
- Two-factor authentication (TOTP) is supported

Role checks are performed in `AuthContext` via `isAdmin()`, `isStudent()`, and `hasPermission(codename)`. Route-level guards use TanStack Router's `beforeLoad` hook.

---

## Application Status Flow

```
pending → reviewed → approved → interview_scheduled → interview_completed → enrolled
                   ↘ rejected
```

Every status transition creates an `ApplicationLog` entry on the server.

---

## Deployment

The portal is a static SPA deployable to any CDN. Cloudflare Pages is used in production.

```bash
npm run build
# Deploy dist/ to Cloudflare Pages / Netlify / S3 + CloudFront
```

Set production environment variables in the Cloudflare Pages dashboard.
