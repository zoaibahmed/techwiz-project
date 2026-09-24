# MarketLink | Phased Execution, Integration, Quality and Demonstration Plan

**Status:** proposed INTERNAL execution plan. Timing varies with actual competition deadline and the user's approval. Source priorities derive from MarketLink SRS pp.8-15,18. This file is not a ready-made competition project report.

## 1. Branch and filesystem safety

- `Client` branch: Astra/Codex only. Worktree `D:\TECHWIZ7\.worktrees\frontend`; edit `Client/`, `Documentation/Frontend/` only.
- `Server` branch: Antigravity only. Original checkout `D:\TECHWIZ7`; edit `Server/`, `Documentation/Backend/` only. Read-only access to ignored `D:\TECHWIZ7\atlas-credentials.env` when necessary.
- `main`: the human owner exclusively controls merge and remote push. No standing integration authorisation for Antigravity. If the user says "enter integration mode", scope/time limits apply only to that instruction and it returns to backend-only afterward.
- Shared docs `Documentation/Shared/` are operator-controlled. A copy in Client branch does not magically appear in Server branch. Freeze approved version centrally and deliberately deliver that same version to BOTH worktrees, with recorded checksum/version if useful.
- Existing repo root `.gitignore` differs between initial branches; at a later approved merge reconcile union safely, including `atlas-credentials.env`, `.env*`, `*.env`, `!.env.example`, `.worktrees/`, `node_modules/`, `dist/`, `build/`, `coverage/`. Check tracked state as well as ignore patterns. Public repo: no secrets.
- Each agent `git status`, branch check, and staged-file review before push; stage explicit owned paths rather than `git add .`. Push to designated branch only. Never reset/force-push/delete another's worktree.

## 2. Phase gates (each phase must be verified before the next)

| Phase | Human approval / agent work | Exit evidence | Dependency |
|---|---|---|---|
| P0 Requirements lock | Human team reads SRS, identifies all C/F/A/X/N/D requirements; agents offer analysis only. | Agreed checklist, open questions, AI/tool rules and human ownership of submission docs. | SRS received. |
| P1 Contract lock | Operator reviews data model, auth, order transitions, map, AI capability priority, endpoints and mock fixtures with both agents. | Versioned identical shared API contract in BOTH worktrees; UI flow storyboard/approved Figma direction. | P0. |
| P2 Infrastructure and auth | Astra: shell/role navigation/forms; Antigravity: auth/role policies/admin farmer approval, secure seed/demo accounts. | Customer/farmer/admin can log in and see only authorised routes and APIs; tests; no secrets. | P1. |
| P3 Market + catalogue | Astra: map/list/market/farmer/product UX; Antigravity: markets/sessions/participation/categories/products/stock offers. | Real cross-service search/filter/day/market/map/stock; responsive; no fake records. | P2. |
| P4 Core reservation vertical slice | Both implement cart, stock-safe checkout, pickup selection, statuses, farmer accept/decline/ready, customer modify/cancel. | Recorded walkthrough and tests against real backend/Atlas incl concurrent last-stock checkout and cutoff. | P3. |
| P5 Complete mandatory SRS | favourites/restock, history/reorder, post-completion reviews/replies, notifications, admin moderation/categories/announcements/reports, About/Contact, NFR. | Requirement matrix all mandatory items passed; role-specific regression. | P4. |
| P6 AI basic + grounded | Optional basic customer Q&A using actual market/product/pickup facts. Add role/page-aware read-only copilot if time. | Source-linked, permission-scoped real-data AI; failures gracefully fallback; costs capped. | P5 (or minimal parallel work without threatening P5). |
| P7 AI actions + enhancements | Smart Basket, Market Day Planner, Farmer Copilot action previews, admin drafts, Pickup Passport, advanced motion. | Confirm-before-write, audit, non-AI parity, accessibility; no SRS regression. | P5/P6. |
| P8 Approved integration + demo | Human expressly authorises main integration; agent only if assigned; smoke/end-to-end, seeded reproducible demo, actual deliverables by students. | Test matrix, no credential leaks, demo video showing **all** functional requirements, hosted URL if practicable. | Approval and stable branches. |

**No artificial deadline is assumed.** If time is short, cut P7 before reducing P5 quality. P6 is optional in SRS but product ambition prioritises at least a useful read-only assistant **after core security/data**.

## 3. Vertical slices and cross-agent dependencies

Define slices as observable working experiences, each needing frontend, backend, test and product demonstration:

1. Customer registers -> can authenticate -> personal dashboard -> cannot access admin API.
2. Farmer registers -> sees pending approval -> admin approves -> farmer creates stall/market availability.
3. Admin creates market -> farmer participates -> customer discovers it by day/map -> farmer offer with unit/price/availability.
4. Customer reserves -> stock held safely -> farmer sees it -> accepts -> ready -> completed -> customer reviews -> admin metrics update.
5. Customer modifies/cancels before cutoff -> precise stock restored/rebalanced; late request rejected.
6. Customer favourites and restock -> notification real; reorder honours new price/stock.
7. AI asks specific market/day question -> retrieved actual product IDs; AI off -> app still works.

Agents must not implement only happy-path views. Test disabled accounts, failed network, empty data, out-of-stock, duplicate submit, concurrent checkout, cutoff boundary, cross-role access, map unavailable and AI unavailable.

## 4. Contract handoff template (for every slice)

```
Feature ID / SRS clause:
Contract version:
Frontend page/route and user actions:
Backend method/path and role/ownership:
Request example (no secret):
Response example (success, empty, forbidden, conflict):
Loading/empty/error behavior:
DB mutation or query and invariant:
Test fixture IDs and reproducible steps:
Dependencies / open decisions:
Owner confirmation:
```

Front end may create contract-driven mocks labeled `MOCK`, never pretend they are successful live API integration. Backend must provide real request-response samples and tests. Both freeze field spelling, date, money, stock and error semantics. Only operator authorises new shared contract versions.

## 5. Local integration mechanics (no unauthorised main merge)

**Development-time testing without merging main:** If both branches have same approved contract, each agent can run its own app and test against a deliberately started compatible counterpart **only under operator-approved environment access**. Alternatively, human operator starts both and exercises flows. Do not require one agent to modify the other's files. Differences in worktrees mean paths must be explicitly provided and secrets kept local. Agent claims of integration require actual browser -> Express -> MongoDB request, never two isolated green test suites.

**When human explicitly orders a main integration:** inspect all worktrees and `git status`, fetch remote, create safe isolated main worktree, merge approved Client and Server commits locally with full history, resolve `.gitignore` and shared-doc conflicts preserving both, install dependencies inside integrated directories, configure secure local env without tracked secrets, run tests and real end-to-end browser requests, present SHA/report. **Separate explicit human approval required before `git push origin main`.** No permanent main authority.

**After approved merge:** human coordinates deliberate re-sync of approved `main` into each development branch (without unapproved cross-agent edits), check actual conflicts and preserve own branch ownership.

## 6. Testing plan

| Surface | Required tests / evidence |
|---|---|
| Authentication | valid/invalid login, hashed password, logout/expiry, pending/suspended farmer, inactive customer, admin separation, role bypass blocked by backend. |
| Data model | orphan prevention, actual market-day offers, valid map coords, controlled category, currency/quantity, historical order snapshots, proper indexes. |
| Inventory | exact stock after create/edit/cancel/decline, concurrent final item, idempotency, stale price, sold-out/unavailable offers, protected reserved qty. |
| Date/pickup | valid day/slot, cutoff before/at/after, server timezone, location/market alignment and capacity policy. |
| Marketplace | catalogue text/search/filter/sort/pagination, map/list sync, favourites, reorder with current availability, relevant empty states. |
| Farmer | weekly template carry-forward, product CRUD, stalls/markets, order stages, insights match seeded totals. |
| Admin | approval gates, markets/category CRUD, moderation visibility, announcements, report definitions and no false paid revenue. |
| Notifications | confirmation/ready and restock path, retry/in-app fallback; no duplicate triggered by retry. |
| Reviews | completed-order eligibility, farmer replies only own, moderation, private data isolation. |
| AI | real retrieval, no fabricated prices, no role leakage, prompt-injection resistance, valid draft/confirm, writes rejected on stale data, API-off fallback, rate/cost controls. |
| UX | responsive 320/390/768/desktop, keyboard and clear focus, WCAG-conscious semantics, reduced motion, loading/error/empty states, performance on large catalogues. |
| Security | secrets absent Git/frontend, safe file upload/media, CORS locked for deployment, headers, auth, validation, rate limiting, no raw stack traces. |

## 7. Demo scenario and realistic test data

Keep data demonstrably **sample/test data**, not claims about real farmers. Use sample markets (2-3), approved and pending farmers, customer, admin, multiple market days, product units/categories, limited popular stock, distinct pickup slots and two farmers. Provide a deterministic fixture set approved by human students; don't include genuine secrets or production personal data.

Script the demonstration so each SRS requirement can be shown and understood, not just flashed on screen. One compelling story: admin sets market/approves farmer -> farmer posts weekly stock and pickup times -> customer discovers via map and filters -> basket and reservation -> farmer receives/accepts/ready -> customer history/pickup -> completion/review -> admin reports. Demonstrate cancellation/cutoff and stock conflict separately. Show About/Contact, favourites/restock, notifications, categories, moderation, mobile, and optional AI if implemented.

## 8. Mandatory submission duties owned by humans

SRS p.18: project report covering problem, design, diagrams, database and test data; installation instructions and sample role credentials (only **dedicated demo accounts**, no Atlas/OpenAI secrets); consolidated ZIP, `ReadMe.doc`, full-feature `.mp4`; website URL preferred. The SRS also names `.sql` scripts while allowing MongoDB. Seek organiser clarification, record response; never fabricate SQL deliverables or claim that AI-authored engineering notes are the team's final report. SRS p.13 requires AI tool acknowledgement, meaningful student modification and understanding, and prohibits AI fully creating ready-made documentation. Human team writes/adapts submitted docs and can explain all code.

## 9. Agent progress reporting format

At each phase: branch/worktree, contract version, precise files changed, SRS IDs done, enhancement IDs done, tests actually executed with pass/fail, real API integration status, seed data used, images/licenses, secrets check, known edge cases, requested decisions, commit SHA and pushed branch. If no tests run, state untested. If blocked by another agent, notify operator rather than modifying opponent's files. If an operation might touch main, stop and request explicit human permission.
