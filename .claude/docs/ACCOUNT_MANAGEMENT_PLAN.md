# Account Management — Implementation Plan (for approval)

*Scope: a complete Account Management experience for **student** and **admin**, aligned with
the Keycloak/BFF auth architecture (see `KEYCLOAK_MIGRATION_REFINED.md`). Nothing here is
implemented yet — this is the proposal to approve.*

---

## 0. TL;DR — what actually needs deciding

1. **Three account features are broken *right now* by the Keycloak cutover** (§2). These are
   bugs, not new work, and should be fixed before adding anything.
2. **Name split**: adopting `first/middle/last` lets us delete the `split_name()` hack that
   caused the "Account is not fully set up" lockouts. Strong recommendation.
3. **Guardian/Documents/Payment-profile** are genuinely new models (§3).
4. Roughly **half the spec already exists** — don't rebuild it (§1).

---

## 1. What already exists (REUSE — do not rebuild)

| Spec item | Status today | Location |
|---|---|---|
| Profile: name, email, phone, photo | ✅ built | `AccountManager.tsx`, `updateMyProfile`, `uploadPhoto` |
| ID / Passport number | ✅ field exists | `User.id_number` |
| Password change | ⚠️ built but **broken** (§2.1) | `ChangePasswordView` |
| 2FA (TOTP) | ✅ built | `TwoFADevice`, `TwoFA*` views, `SecurityTab` |
| Sessions list + revoke | ⚠️ built but **stale** (§2.3) | `LoginSession`, `SessionsTab` |
| Audit logs | ✅ built | `AuditLog`, `/auth/audit-logs/` |
| Application summary | ✅ built | `StudentProfile.tsx` fetches latest application |
| Payments/receipts/status | ✅ built | `payments` app, student PaymentTab |
| Tabs shell (student + admin) | ✅ built | `components/ProfileSections.tsx` (shared) |

**Existing `User` fields:** `uid, email, display_name, photo_url, phone, id_number, role,
status, batch_year, fee_balance, total_fee_paid, notes, staff_role, individual_permissions,
google_linked, keycloak_sub, is_active, created_at, updated_at, last_login`.

The shared `ProfileSections.tsx` (`SettingsCard`, `SecurityTab`, `SessionsTab`) is already
consumed by **both** dashboards — new sections should follow that same shared pattern so
student and admin stay in sync.

---

## 2. 🚨 Phase 0 — Keycloak breakage to fix FIRST (these are live bugs)

These exist *today* because Keycloak now owns authentication. Adding features on top of
them would compound the problem.

### 2.1 "Change password" silently does nothing
`ChangePasswordView` updates the **Django** password hash. Keycloak no longer reads it —
login goes through the BFF to Keycloak. A user changes their password, gets a success
toast, and their **old password still works**. Worst kind of bug: silent.
**Fix:** route to Keycloak Admin API (`PUT /users/{id}/reset-password`) via the BFF.

### 2.2 Email change desyncs identity
Email is the Keycloak **username**. Changing it only in Django leaves Keycloak with the old
one — the user must keep logging in with their *old* email. `updateMyProfile` allows this today.
**Fix:** propagate to Keycloak in the same transaction; on Keycloak failure, do not commit Django.

### 2.3 Sessions list is stale/misleading
`LoginSession` only tracks Django-issued SimpleJWT sessions. In BFF mode Keycloak owns the
session. "Logout from all devices" no longer terminates the real session.
**Fix (decision needed):** either (a) read sessions from Keycloak (`GET /users/{id}/sessions`,
`POST /logout`), or (b) keep `LoginSession` for audit only and label it "recent activity".
→ **Recommend (a)** — it's the truth.

### 2.4 Deactivate/delete must propagate
Setting `is_active=False` in Django does **not** disable the Keycloak user; they can still
authenticate. **Fix:** mirror `enabled` and deletion to Keycloak.

### 2.5 Google-only users have no password
Users with `google_linked` (no credential) must see **"Set password"**, not "Change
password" (which will fail — it asks for a current password they never had).

---

## 3. Data model — proposed changes

### 3.1 Extend `User` (personal details)
```python
first_name   = models.CharField(max_length=100, blank=True)
middle_name  = models.CharField(max_length=100, blank=True)
last_name    = models.CharField(max_length=100, blank=True)
date_of_birth = models.DateField(null=True, blank=True)
gender       = models.CharField(max_length=20, blank=True, choices=GENDER_CHOICES)
nationality  = models.CharField(max_length=100, blank=True)
alt_phone    = models.CharField(max_length=20, blank=True)
# address
country      = models.CharField(max_length=100, blank=True)
county       = models.CharField(max_length=100, blank=True)
city         = models.CharField(max_length=100, blank=True)
postal_address = models.CharField(max_length=255, blank=True)
```
**Why on `User` and not a separate `Profile`:** `display_name`, `phone`, `id_number`,
`photo_url` already live on `User`. Splitting personal data across two tables creates an
awkward seam and a second query on every profile read. `User` is already the profile.

**`display_name` stays** as the canonical display string (used across the app), kept in sync
from first/last on save. **Bonus:** with real `first_name`/`last_name` we can **delete the
`split_name()` fallback hack** and map names to Keycloak properly — that hack is what caused
the recent "Account is not fully set up" lockouts.

### 3.2 New models
```python
class Guardian:            # §2 of spec — supports multiple
    user, full_name, relationship, phone, email, occupation,
    is_primary(bool), is_emergency_contact(bool), created_at

class PaymentProfile:      # §3 of spec — NOT card data (Paystack tokenizes)
    user(OneToOne), payer_name, method(mpesa|card|bank),
    payer_phone, billing_email, updated_at

class Document:            # §5 of spec
    user, doc_type(id|certificate|photo), file_url, status(pending|verified|rejected),
    rejection_reason, uploaded_at, reviewed_by, reviewed_at

class NotificationPreference:  # §6 of spec
    user(OneToOne), email_enabled, sms_enabled,
    application_updates, payment_updates, announcements
```
**Not stored:** card numbers/PANs. Paystack tokenizes; storing them drags in PCI scope.
`id_number` is sensitive — see §6.

---

## 4. API endpoints (Django)

All under existing conventions: `IsAuthenticated` minimum, serializers in `serializers.py`,
`ApplicationLog`/`AuditLog` entries on mutations.

```
# Phase 0 — Keycloak correctness
POST   /api/auth/keycloak/set-password/     {new_password}      -> Keycloak reset-password
PATCH  /api/auth/my-profile/                 (email change now syncs to Keycloak)
GET    /api/auth/keycloak/sessions/                              -> Keycloak user sessions
POST   /api/auth/keycloak/logout-all/                            -> Keycloak logout all

# Personal / address  (extends existing my-profile)
PATCH  /api/auth/my-profile/                 personal + address fields

# Guardians
GET/POST        /api/auth/guardians/
PATCH/DELETE    /api/auth/guardians/{id}/

# Payment profile
GET/PUT         /api/auth/payment-profile/

# Documents
GET/POST        /api/auth/documents/         (upload -> Cloudinary, like uploadPhoto)
DELETE          /api/auth/documents/{id}/
PATCH           /api/auth/documents/{id}/review/    admin only: verify/reject

# Notification preferences
GET/PUT         /api/auth/notification-preferences/

# Account controls
POST   /api/auth/account/deactivate/        (mirrors enabled=false to Keycloak)
POST   /api/auth/account/export/            (GDPR JSON export)
DELETE /api/auth/account/                   (soft-delete + Keycloak delete, admin-confirmed)
```

---

## 5. Frontend (admissions-portal)

**Reuse the existing shared pattern.** `components/ProfileSections.tsx` already backs both
dashboards; add new sections there so student + admin stay consistent.

**Student — `/student/profile`** (tabs):
`Profile` · `Guardian` · `Documents` · `Payments` · `Security` · `Notifications`

**Admin — `/admin/account`** (tabs):
`Profile` · `Security` · `Sessions` · `Notifications`
*(no Guardian/Documents — not applicable to staff)*

**Admin — student record** (`/admin/students/$uid`): read guardians + documents, and
**review documents** (verify/reject) — that's the admin-side counterpart.

New shared components: `PersonalDetailsForm`, `AddressForm`, `GuardianList`,
`DocumentUploader`, `NotificationPrefs`, `AccountControls`.
UI stays shadcn + `react-hot-toast` per project conventions.

---

## 6. Security & compliance

- **OTP on sensitive changes** (email/password): reuse the existing `TwoFADevice` TOTP
  challenge rather than building SMS OTP (spec asks SMS/email — see Open Question 3).
- **`id_number`** is PII. Currently plaintext. Options: leave, mask in API responses, or
  encrypt at rest. → **Recommend masking in responses + audit-logging access.**
- **Rate limits**: reuse existing throttles (`login`, `two_fa`, `forgot_password`); add one
  for document upload.
- **Audit**: every profile/guardian/document/security mutation writes an `AuditLog` row.
- **RBAC**: unchanged — stays in Django (`staff_role` / `has_app_permission`). Document
  review needs a new permission, e.g. `documents.review`.

---

## 7. Phasing (suggested order)

| Phase | Content | Risk |
|---|---|---|
| **0** | Keycloak fixes: password, email sync, sessions, deactivate, Google-only UX | **High value — fixes live bugs** |
| **1** | Personal details + address (+ first/last names, delete `split_name` hack) | Low |
| **2** | Guardians | Low |
| **3** | Documents + admin review | Medium (uploads, storage) |
| **4** | Notification preferences | Low |
| **5** | Payment profile | Low (reuses payments app) |
| **6** | Account controls (deactivate / export / delete) | Medium (destructive) |

---

## 8. ✅ APPROVED DECISIONS (2026-07-17)

| # | Decision | Impact |
|---|---|---|
| 1 | **Real Keycloak sessions** | `LoginSession` UI re-points to Keycloak `GET /users/{id}/sessions`; "logout all" → Keycloak. Keep `LoginSession` rows for audit history only. |
| 2 | **Personal fields on `User`** | Extend `User` per §3.1. No separate `Profile` model. |
| 3 | **Keycloak OTP** (not Django TOTP, not SMS) | ⚠️ **See §8.1 — has a hard constraint.** Django `TwoFADevice` gets deprecated; users re-enroll. |
| 4 | **Guardian = optional**, needed for young applicants (~18); guardian may also be the **bill payer** | `Guardian.is_bill_payer` flag; `PaymentProfile.payer` can point at a Guardian. Not required for all. |
| 5 | **Soft delete** | `User.status='deleted'` + anonymise PII; Keycloak user `enabled=false` (or deleted). Never cascade — payments/applications FKs must survive for financial records. |
| 6 | **Do everything** (all phases) | Execute Phase 0 → 6 in order. |
| — | `id_number` (unanswered) | Proceeding with the recommendation: **mask in API responses + audit-log access**. Say the word to change. |

### 8.1 ⚠️ Keycloak OTP — the constraint you must accept

Keycloak's Admin REST API has **no supported way to enrol a TOTP credential**. Enrolment
only happens inside Keycloak's own browser flow. And the obvious workaround — setting the
`CONFIGURE_TOTP` required action — **breaks BFF password login**, because required actions
make the Direct Access Grant fail with the same `"Account is not fully set up"` error that
locked users out last week. So we cannot enrol OTP from our custom UI.

**Consequences of choosing Keycloak OTP:**
1. **Enrolment leaves our UI.** The "Enable 2FA" button must redirect to Keycloak's Account
   Console (`{server}/realms/{realm}/account/#/security/signing-in`). It can be themed to
   look like Nexa, but it is not our React page. *(Verification at login stays in our UI.)*
2. **Login verification works**, but needs the realm's **Direct Grant flow** to include
   *"Direct Grant - Validate OTP"* (Conditional) — a realm config change.
3. **Detecting "OTP required" is ambiguous** — Keycloak deliberately returns a generic
   `invalid_grant`. So the BFF must look the user up via the Admin API to see whether they
   have an `otp` credential, then return `{requires_2fa: true}`; the frontend re-submits
   `{email, password, otp}` together (password stays in React state — never stored server-side).
   Costs one Admin API call per login for OTP users.
4. **Existing Django 2FA users must re-enrol** — TOTP secrets cannot be transferred into
   Keycloak. Any user currently on `TwoFADevice` loses 2FA until they re-enrol.

**The alternative** (if 1 or 4 is unacceptable): keep the existing Django `TwoFADevice` TOTP
for the password path — it already works, is fully in our UI, and needs no re-enrolment.
Keycloak would still own OTP for social/redirect logins.

→ **Confirm:** accept the Account-Console redirect for enrolment, or keep Django TOTP?

---

## 8.2 ✅ RESOLVED (2026-07-21) — §8.1 decided, Phases 0/1/2/4 shipped

**Decision on §8.1: keep Django TOTP.** Enrolment stays in our React UI on `TwoFADevice`
+ `pyotp` — it already works, needs no re-enrolment, and avoids the realm Direct-Grant
change and the per-login Admin API call. Keycloak still enforces its own OTP on
social/redirect sign-ins; when an account carries a Keycloak `otp` credential the Security
tab says so and links to the Account Console rather than pretending it can manage it.

### What landed

| Area | Where |
|---|---|
| Runtime Keycloak Admin client | `accounts/keycloak_admin.py` (token cached; `KeycloakAdminError`) |
| §2.1 password change | `ChangePasswordView` → Keycloak `reset-password`; current password verified by direct grant, not the (stale) Django hash. Keycloak failure ⇒ **502, Django unchanged** |
| §2.2 email desync | `UpdateMyProfileView` pushes `email` + `username` to Keycloak *before* committing Django |
| §2.3 sessions | `LoginSessionListView` / revoke read & write **real Keycloak sessions**; `LoginSession` kept as audit fallback. New `POST /auth/sessions/logout-all/` |
| §2.5 Google-only users | `GET /auth/account/credentials/` reports `has_password`; Security tab offers **Set password** |
| §3.1 personal + address | `User` extended; `display_name` now derived from name parts; `split_name()` no longer used for self-service updates |
| §3.2 Guardian | `accounts.Guardian` + `/auth/guardians/` (own rows only; single-primary enforced; `is_bill_payer`) |
| §3.2 NotificationPreference | `accounts.NotificationPreference` + `/auth/notification-preferences/` (lazily created defaults) |
| `id_number` | Masked to last-4 for non-admins in `UserSerializer`/`MyProfileSerializer`; admins see it in full |
| Frontend | `components/AccountSections.tsx` (personal, address, guardians, prefs) shared by `admin/AccountManager.tsx` and `student/StudentProfile.tsx` |
| Tests | `accounts/tests_account.py` — all Keycloak calls mocked |

### Still outstanding after the first pass
~~Phase 3, Phase 6~~ — shipped in the second pass (below). Phase 5 PaymentProfile was
**dropped** by decision (see §8.3).

---

## 8.3 ✅ RESOLVED (2026-07-22) — Phases 3 & 6 shipped; Phase 5 dropped for guardian billing

**Phase 5 (PaymentProfile) is not built.** Payments already run entirely through
Paystack + manual reconciliation, so a stored payer profile adds nothing. Instead the
**bill-payer guardian** becomes the payer surface: whenever a billing document reaches the
student, it also reaches their `is_bill_payer` guardians.

| Area | Where |
|---|---|
| Bill-payer CC | `payments/views.py::bill_payer_guardian_emails()`; folded into `_send_payment_receipt` and `_send_invoice_email` (invoice sender now loops + returns the recipient list) |
| Guardian intro email | `accounts.GuardianViewSet` sends `emails/guardian_bill_payer.html` (current balance + M-Pesa how-to-pay) when a guardian is **created as** or **promoted to** bill payer, or their email changes. Best-effort — never blocks the save |
| Phase 3 Documents | `accounts.Document` (Cloudinary URL only) + `/auth/documents/` (own rows; upload sniffs PDF/image magic bytes; delete removes the Cloudinary asset). Admin review via `PATCH /auth/documents/{id}/review/`, gated by `documents.review`; rejection requires a reason; notifies the student |
| Phase 6 controls | `GET /auth/account/export/` (JSON download), `POST /auth/account/deactivate/`, `DELETE /auth/account/` (soft-delete). All re-auth via `_reauthenticate()` and mirror `enabled=false`/`logout_all` to Keycloak. **Soft delete only** — the row is kept so payments/applications aren't orphaned |
| Frontend | `AccountSections.tsx`: `DocumentsSection`, `AdminDocumentReview` (embedded in `admin/StudentDetail.tsx`), `AccountControlsSection` (danger zone in the student Profile tab). New student **Documents** tab |
| Tests | `accounts/tests_account.py`: bill-payer CC/intro, document review permissions, account controls (all Keycloak + email mocked) |

Still not done: Phase 5 is intentionally closed. `id_number` remains masked-in-responses
(not encrypted at rest).

---

## 9. ❓ Original open questions (now answered above)

1. **Sessions**: show real **Keycloak** sessions (recommended), or keep `LoginSession` as
   read-only "recent activity"?
2. **Personal fields on `User`** (recommended) or a separate `Profile` model per your spec?
3. **OTP channel**: spec says SMS/Email OTP. You already have working **TOTP (authenticator
   app)**. Add SMS (needs an SMS provider + cost + rate limiting) or reuse TOTP?
4. **`id_number`**: leave plaintext, mask in responses (recommended), or encrypt at rest?
5. **Guardian applicability**: all students, or only where relevant? (Nexa is a bootcamp —
   are applicants mostly adults? This may be low-value.)
6. **Account deletion**: hard delete or soft-delete/anonymise? (Payments/applications have
   FKs — hard delete will cascade or fail.)
7. **Scope now**: do all phases, or just **Phase 0 + 1** to start?
