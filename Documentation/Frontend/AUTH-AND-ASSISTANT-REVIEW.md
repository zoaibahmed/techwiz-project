# Authentication and assistants — 28 September 2026

Implemented in the existing final-techwiz checkout. No production data was seeded or changed during this work.

## Authentication
- Customer and farmer registration now return an email verification challenge, not an authenticated account. POST /api/v1/auth/register/verify consumes the six-digit code and creates the account.
- Challenges expire after ten minutes, allow five incorrect attempts and cannot be reused. Pending records contain password and OTP hashes, not plaintext values. Failed email delivery removes the challenge.
- Signup/reset passwords require at least 12 characters, upper/lowercase, a number and a symbol, with the bcrypt 72-byte limit.
- Unknown login/reset emails return a clear not-registered response, as requested. This intentionally reveals registration status; authentication routes remain rate-limited.
- The previously authorised admin@marketlink.com password-only exception is retained, conditional on the stored administrator role and a correct password.
- Real inbox delivery requires working server EMAIL_USER, EMAIL_APP_PASSWORD and EMAIL_FROM configuration. Tests mock delivery; actual SMTP delivery has not been verified in this task.

## Assistants and admin
- Dashboard Copilot formats bold text/lists and stores browser-session history per account and role. Capability answers derive from the registered role tools; read operations and confirmation-required drafts are distinguished.
- Market Guide is a separate read-only public assistant. It retrieves published catalogue records for the selected location, provides public links and shopping guidance, and has no dashboard tools. Optional server-side AI can phrase answers; catalogue fallback works without AI.
- Public guidance currently uses the selected location and one question at a time. It does not retain server-side conversational memory or index every website document.
- Admin operations now include a searchable/filterable market ledger and a submitted-application review desk. Existing management routes and reports remain.

## Verification and review limits
- Production build and existing frontend unit tests passed.
- Focused backend tests cover registration verification, password rules, unknown-email handling, OTP/admin exception, public-guide boundaries and existing flow tests.
- Isolated browser checks cover signup challenge/wrong-code feedback, mobile overflow, public guide formatting, admin search and desktop/mobile assistant presentation. These use API fixtures, not real account creation or email delivery.
- Full npm run check reaches E2E but the Playwright-managed server cannot start because port 5173 is occupied. The running server was preserved.
- Antigravity's decline modal and reason forwarding exist. Its missing-reason fallback invents a stock/capacity reason and still deserves correction; its reported full test results were not independently reproduced here.
- Checkout is on main. Changes remain local; nothing was committed or pushed to main.
