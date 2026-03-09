# Security Plan — YPP Portal

**Generated:** 2026-03-09
**Branch:** `claude/security-review-plan-tkR9D`
**Scope:** Full audit — all severity levels

---

## Executive Summary

The YPP Portal has a solid foundational security posture (JWT auth, bcrypt passwords, Redis rate limiting, Zod validation, Prisma ORM, security headers). A prior `SECURITY_AUDIT.md` captured 26 issues as of 2026-02-05 and several were addressed. This plan covers **remaining open issues** plus **new hardening items** requested during this review session.

**Confirmed open issues:**
- 1 IDOR in a server action (`student-progress-actions.ts`)
- No real account lockout (in-memory counter logs but never blocks)
- No 2FA/MFA
- Session cookie security relying on NextAuth defaults (not explicit)
- Next.js 14.2.28 has known CVEs (latest safe: 14.2.35+)
- CSP `script-src` contains `'unsafe-inline'` and `'unsafe-eval'`
- Non-atomic cascade deletes (no `prisma.$transaction`)
- Hardcoded seed password in seed file
- Missing enum validation before DB writes
- No audit logging for several critical actions

---

## Phase 1 — IDOR Fix in Server Actions (1–2 hours)

### Issue
`lib/student-progress-actions.ts` accepts a `userId` parameter and queries the database **without verifying that the caller is that user or an admin**. Any authenticated user could pass another user's ID and read their progress data.

### Fix
Add session ownership check at the top of every function in that file:

```typescript
// In lib/student-progress-actions.ts
import { requireSessionUser } from "@/lib/authorization";

export async function getStudentProgressSnapshot(userId: string) {
  const sessionUser = await requireSessionUser();
  // Allow only self-access or admin/staff/instructor access
  const allowedRoles = ["ADMIN", "STAFF", "INSTRUCTOR", "MENTOR", "CHAPTER_LEAD"];
  const isSelf = sessionUser.id === userId;
  const hasElevatedRole = sessionUser.roles.some((r) => allowedRoles.includes(r));
  if (!isSelf && !hasElevatedRole) {
    throw new Error("Forbidden");
  }
  // ... existing logic
}
```

**Files to change:**
- `lib/student-progress-actions.ts` — add ownership check to all exported functions

---

## Phase 2 — Real Account Lockout (2–3 hours)

### Issue
The current `failedAttempts` Map in `lib/auth.ts` only triggers an audit log after 5 failures. It does **not** block further attempts, resets on server restart, and is bypassed by the Redis rate limiter's separate 10-attempt window. These two mechanisms are inconsistent.

### Fix
Consolidate account lockout into Redis (already used for rate limiting):

1. **Remove** the in-memory `failedAttempts` Map from `lib/auth.ts`
2. **Add** `checkAccountLockout(email)` to `lib/rate-limit-redis.ts`:
   - Increment failure counter in Redis with 30-minute TTL
   - After 5 failures → return `{ locked: true }`
   - On successful login → call `clearAccountLockout(email)` to reset counter
3. **Check** lockout **before** `bcryptjs.compare()` in the credentials `authorize()` callback (to prevent timing-based enumeration)
4. **Add** `lockoutExpiresAt` field to audit log for the lockout event

**Files to change:**
- `lib/rate-limit-redis.ts` — add `checkAccountLockout()` and `clearAccountLockout()`
- `lib/auth.ts` — remove in-memory map, call new Redis functions, clear on success

---

## Phase 3 — Session Cookie Hardening (30 minutes)

### Issue
`lib/auth.ts` does not explicitly configure NextAuth cookie options. It relies on NextAuth's internal defaults, which may vary across versions. Explicit configuration is required for audibility and production safety.

### Fix
Add a `cookies` block to `authOptions` in `lib/auth.ts`:

```typescript
cookies: {
  sessionToken: {
    name:
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
},
```

**Files to change:**
- `lib/auth.ts` — add `cookies` block to `authOptions`

---

## Phase 4 — Two-Factor Authentication (TOTP) (1–2 days)

### Issue
No MFA exists. ADMIN, STAFF, and INSTRUCTOR accounts with elevated privileges are protected only by password + rate limiting.

### Design
- **Library:** `otplib` (TOTP standard, RFC 6238) + `qrcode` for QR code generation
- **Scope:** Optional for all users; surfaced prominently in account settings
- **Storage:** Add `twoFactorSecret` (encrypted string) and `twoFactorEnabled` (boolean) to the `User` model
- **Recovery codes:** Generate 8 single-use recovery codes stored as hashed values in a new `TwoFactorRecovery` table

### Database Migration

```prisma
// In prisma/schema.prisma — add to User model:
twoFactorEnabled  Boolean   @default(false)
twoFactorSecret   String?   // AES-256-GCM encrypted TOTP secret

// New model:
model TwoFactorRecovery {
  id        String   @id @default(cuid())
  userId    String
  codeHash  String   // bcrypt hash of recovery code
  usedAt    DateTime?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Implementation Steps

1. **`lib/two-factor-actions.ts`** (new file)
   - `setupTwoFactor()` — generates TOTP secret, returns QR code data URL and plain secret for display
   - `enableTwoFactor(code)` — verifies the user's first TOTP code, saves encrypted secret, marks `twoFactorEnabled = true`, generates and returns recovery codes
   - `disableTwoFactor(code)` — verifies code, clears secret and recovery codes
   - `verifyTwoFactorCode(userId, code)` — validates TOTP code or a recovery code

2. **`lib/auth.ts`** — after password check passes, if `user.twoFactorEnabled`:
   - Throw a special `TWO_FACTOR_REQUIRED` error with a short-lived, signed challenge token
   - Add a second credentials path that accepts `{ challengeToken, totpCode }` and completes the login

3. **`app/(public)/login/page.tsx`** — add a second step UI:
   - On `TWO_FACTOR_REQUIRED`, show a TOTP code input field
   - Submit challenge token + TOTP code to complete login
   - "Use a recovery code instead" link

4. **`app/(app)/settings/security/page.tsx`** (new page or add to existing settings)
   - Show 2FA status (enabled/disabled)
   - Setup flow: show QR code → enter code to confirm → display recovery codes
   - Disable flow: confirm with current TOTP code

5. **`lib/encryption.ts`** (new helper)
   - AES-256-GCM encrypt/decrypt using a `TWO_FACTOR_ENCRYPTION_KEY` env variable
   - Used to encrypt `twoFactorSecret` at rest

**New environment variable:**
```
TWO_FACTOR_ENCRYPTION_KEY=  # 32-byte hex key (openssl rand -hex 32)
```

**Files to create/change:**
- `prisma/schema.prisma` — add fields + `TwoFactorRecovery` model
- `prisma/migrations/` — new migration
- `lib/two-factor-actions.ts` — new file
- `lib/encryption.ts` — new helper for AES encryption
- `lib/auth.ts` — 2FA challenge integration
- `app/(public)/login/page.tsx` — second-step UI
- `app/(app)/settings/security/page.tsx` — 2FA management UI

---

## Phase 5 — CSP Hardening (2–4 hours)

### Issue
`next.config.mjs` sets `script-src 'self' 'unsafe-inline' 'unsafe-eval'`. This largely defeats XSS protection from the Content Security Policy.

### Root cause
Next.js App Router uses inline scripts for hydration. `'unsafe-eval'` is typically required by some libraries (e.g., older versions of Pusher SDK, dynamic code). These need to be removed or replaced with nonce-based CSP.

### Fix (Incremental Approach)

**Step 1 — Audit what requires `unsafe-eval`**
Run the app with `unsafe-eval` removed and check browser console for violations. Common culprits: Pusher client, certain React internals in dev mode.

**Step 2 — Switch to nonce-based CSP**
Next.js 14 supports nonce injection via middleware:

```typescript
// middleware.ts — generate nonce per request
import { NextResponse } from "next/server";
import crypto from "crypto";

export function middleware(request: NextRequest) {
  const nonce = crypto.randomBytes(16).toString("base64");
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,  // Remove unsafe-inline
    "style-src 'self' 'unsafe-inline'",     // Inline styles are lower risk
    "img-src 'self' data: blob: https:",
    `connect-src 'self' blob: data: https://*.pusher.com wss://*.pusher.com`,
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.loom.com",
  ].join("; ");

  const response = NextResponse.next({
    headers: { "x-nonce": nonce },
  });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}
```

Pass the nonce to `<Script>` tags via `next/headers`:
```typescript
// In layout.tsx:
import { headers } from "next/headers";
const nonce = headers().get("x-nonce") ?? "";
<Script nonce={nonce} ... />
```

**Step 3 — If `unsafe-eval` cannot be removed** (e.g., Pusher SDK hard requirement):
Add a CSP violation report endpoint (`/api/csp-report`) and use `report-uri` to monitor violations before tightening further.

**Files to change:**
- `next.config.mjs` — remove static CSP header (moved to middleware)
- `middleware.ts` — add nonce generation and dynamic CSP header
- `app/layout.tsx` — pass nonce to `<Script>` components

---

## Phase 6 — Dependency Upgrades (1–2 hours)

### Critical
| Package | Current | Target | Reason |
|---------|---------|--------|--------|
| `next` | 14.2.28 | 14.2.35+ | Multiple CVEs (SSRF, path traversal, cache poisoning) |

### Upgrade Command
```bash
npm install next@14.2.35
npm audit
```

### After Upgrading
- Run `npm audit` and address any remaining HIGH/CRITICAL advisories
- Run full test suite
- Verify auth flow end-to-end (magic link, credentials, Google OAuth)

**Files to change:**
- `package.json` — bump `next` version
- `package-lock.json` — regenerated by npm install

---

## Phase 7 — Medium & Low Severity Issues (Half day)

### M1 — Hardcoded Seed Password
**File:** `prisma/seed.ts`
Move the demo password to an environment variable:
```typescript
// Before: password: "ypp-demo-2026"
// After:
const seedPassword = process.env.SEED_DEMO_PASSWORD ?? "ypp-demo-2026";
```
Add `SEED_DEMO_PASSWORD` to `.env.example`.

### M2 — Non-Atomic Cascade Deletes
**File:** `lib/chapter-actions.ts` (deleteChapter function)
Wrap multi-step deletes in `prisma.$transaction([])`:
```typescript
await prisma.$transaction([
  prisma.userRole.deleteMany({ where: { user: { chapterId: id } } }),
  prisma.enrollment.deleteMany({ where: { chapterId: id } }),
  prisma.chapter.delete({ where: { id } }),
]);
```

### M3 — Enum Validation Before DB Writes
**File:** `lib/authorization.ts` and any action that writes a `RoleType`
Add explicit Zod enum validation:
```typescript
const RoleTypeSchema = z.enum(["ADMIN", "INSTRUCTOR", "STUDENT", "MENTOR", "CHAPTER_LEAD", "STAFF", "PARENT"]);
```
Parse user-supplied role values through this schema before any `prisma.userRole.create()`.

### M4 — Audit Logging for Missing Critical Actions
Currently `logAuditEvent()` exists but is not called for:
- Role assignment/removal
- Chapter admin changes
- Bulk user operations

Add `await logAuditEvent(...)` calls in:
- `lib/user-management-actions.ts` — role changes
- `lib/chapter-actions.ts` — admin changes
- `lib/bulk-actions.ts` — bulk operations

### L1 — Docker Default Credentials
Update `docker-compose.yml` to use environment variables instead of `ypp:ypp` defaults. Add a note in README that default credentials must be changed for any non-local deployment.

### L2 — Console Error Cleanup
Remove or guard `console.error` / `console.log` statements in production paths so internal error details are not leaked in server logs that may be externally accessible.

---

## Implementation Priority Order

| Priority | Phase | Effort | Risk if Skipped |
|----------|-------|--------|-----------------|
| 1 | Phase 1 — IDOR Fix | 1–2 hrs | Any user can read any student's progress |
| 2 | Phase 6 — Next.js CVE upgrade | 1–2 hrs | Known exploitable CVEs in production |
| 3 | Phase 3 — Cookie hardening | 30 min | Session cookie misconfiguration |
| 4 | Phase 2 — Real account lockout | 2–3 hrs | Brute force beyond rate limit window |
| 5 | Phase 4 — 2FA / MFA | 1–2 days | No second factor for privileged accounts |
| 6 | Phase 5 — CSP hardening | 2–4 hrs | Reduced XSS protection |
| 7 | Phase 7 — Medium/Low | Half day | Lower severity hardening |

---

## Environment Variables to Add

```bash
# Two-factor authentication (Phase 4)
TWO_FACTOR_ENCRYPTION_KEY=  # openssl rand -hex 32

# Seed password (Phase 7 M1)
SEED_DEMO_PASSWORD=         # Strong random password for demo accounts
```

Add both to `.env.example`.

---

## Testing Checklist (After Each Phase)

- [ ] Login with correct credentials — succeeds
- [ ] Login with wrong password 5× — lockout triggers (Phase 2)
- [ ] Login after lockout expires — succeeds
- [ ] 2FA setup flow — QR code shown, code accepted, recovery codes generated (Phase 4)
- [ ] 2FA login flow — second step required, TOTP accepted (Phase 4)
- [ ] Recovery code login — works once, invalidated after use (Phase 4)
- [ ] Cookie inspection — httpOnly=true, SameSite=Lax, Secure in production (Phase 3)
- [ ] CSP violation report — none for normal app usage (Phase 5)
- [ ] `npm audit` — no HIGH or CRITICAL findings (Phase 6)
- [ ] Student progress API — other user's ID returns 403 (Phase 1)
- [ ] Role assignment without admin — returns 403 (Phase 7 M3)
