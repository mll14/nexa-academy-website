# Nexa Academy Website Client

Nexa Academy Website Client is a React + Vite single-page application for the Nexa Academy learning platform. It presents the public marketing site, program catalog, application flow, student dashboard, admin area, and an AI-powered chatbot, all backed by a separate API service.

## Overview

This frontend is designed for prospective students, enrolled students, and administrators. It includes:

- A polished public homepage with program highlights and calls to action.
- Program listing and program detail pages for software engineering and cloud computing.
- A guided application form with validation and reCAPTCHA protection.
- Student login and protected student dashboard routes.
- Admin login and protected admin pages for managing applications, messages, enrollments, transactions, and subscribers.
- A contact form, FAQ page, legal pages, and a chatbot assistant for site guidance.

## Tech Stack

- React 19
- Vite
- React Router
- Framer Motion
- Tailwind CSS 4
- Cloudflare Vite plugin and Wrangler support
- Google OAuth for sign-in
- Google reCAPTCHA for application protection
- Gemini API support for the site chatbot

## Features

- Responsive landing pages with animated sections and reusable UI components.
- Dynamic routing for public, student, and admin experiences.
- Token-based authentication with protected routes.
- Student application submission with backend persistence.
- Contact form submission to the API.
- Newsletter subscription support in the footer.
- AI chatbot fallback responses tailored to Nexa Academy content.
- SEO metadata helpers for key public pages.

## Project Structure

```text
src/
	App.jsx                 # App shell, routing, layout, chatbot visibility
	main.jsx                # React entry point and providers
	components/             # Shared UI components and protected route helpers
	context/                # Authentication context
	data/                   # Static program data
	hooks/                  # Custom data hooks
	pages/                  # Public, student, and admin pages
	services/               # API, auth, application, email, payment, and chatbot services
	utils/                  # API config, SEO helpers, export helpers, tests
```

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- A running backend API for authentication, applications, contact messages, and enrollment data

## Getting Started

1. Install dependencies.

```bash
npm install
```

2. Create a local environment file.

Create a `.env` file in the project root and add the required variables:

```bash
VITE_API_URL=http://localhost:8000/api
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

`VITE_API_URL` defaults to `http://localhost:8000/api` if it is not set, but defining it explicitly makes local and production environments easier to manage.

3. Start the development server.

```bash
npm run dev
```

The app runs on port `3000` by default.

## Available Scripts

- `npm run dev` - start the Vite development server.
- `npm run build` - create a production build in `dist/`.
- `npm run preview` - build the app and serve it with Wrangler.
- `npm run lint` - run ESLint across the project.
- `npm run deploy` - build and deploy with Wrangler.

## Backend Integration

This frontend expects an API that supports the following flows:

- Student sign up and login.
- Admin login.
- Profile retrieval and updates.
- Program application submission.
- Contact message submission.
- Enrollment and transaction data for dashboards.

The client currently calls endpoints such as:

- `/auth/signup/`
- `/token/`
- `/token/refresh/`
- `/auth/profile/`
- `/auth/login/google/`
- `/auth/logout/`
- `/messages/`

## Route Map

Public routes:

- `/` - Home
- `/programs` - Program listing
- `/programs/:programId` - Program details
- `/apply` - Application form
- `/contact` - Contact page
- `/faq` - Frequently asked questions
- `/terms` - Terms and conditions
- `/privacy` - Privacy policy

Student routes:

- `/student-login` - Student authentication
- `/student-dashboard/:uid` - Student dashboard
- `/enrollment` - Enrollment flow

Admin routes:

- `/admin/*` - Admin dashboard and management pages

There is also a debug-only admin login page at `/admin-login-debug`.

## Environment Notes

- The application uses Google reCAPTCHA in the application form.
- Google OAuth is enabled when `VITE_GOOGLE_CLIENT_ID` is present.
- Gemini-powered chatbot responses are enabled when `VITE_GEMINI_API_KEY` is configured.
- Auth tokens are stored in `localStorage` for session persistence.

## Deployment

The project includes support for Cloudflare and Vercel-style deployment setups.

- `wrangler.jsonc` is configured for Cloudflare static asset hosting and SPA routing.
- `vercel.json` includes SPA rewrites and security headers.

For production builds, run:

```bash
npm run build
```

Then deploy using your target platform's workflow.

## Useful Notes

- The app uses React Router for client-side navigation, so the hosting platform must rewrite unknown routes to `index.html`.
- The chatbot includes fallback responses, so it remains usable even if the Gemini API key is missing.
- The app is designed to work with a separate backend rather than embedding server logic in the frontend.

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.
