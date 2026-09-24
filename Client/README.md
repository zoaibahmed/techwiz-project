# MarketLink · The Living Market

Responsive React / Vite / TypeScript frontend, on branch `Client`.

```powershell
Set-Location D:\TECHWIZ7\.worktrees\frontend\Client
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The banner identifies the development preview. Use Sign in → Try customer demo, or Demo controls to select a customer/farmer/admin account. All records/actions are fictional and held in memory; refresh resets them. No backend or OpenAI credentials are needed or requested.

## Verification and builds

- `npm run check`: typecheck, standard build, unit tests and Edge browser tests.
- `npm run build:demo`: explicitly labelled fixture showcase.
- `npm run preview`: preview the latest build on a local Vite preview port.
- `node tests/build-smoke.mjs demo`: verify a previously built demo bundle.
- `npm run build`: standard production bundle deliberately shows integration unavailable until an approved live adapter is implemented.
- `node tests/build-smoke.mjs live`: verify that standard build and absence of API calls.

Node >=22.12 is required. Tests currently use locally installed Microsoft Edge. Do not change global machine settings to satisfy a missing browser; adapt the local test setup deliberately.

## Ownership and source of truth

Only Client/ and Documentation/Frontend/ belong to this agent. Original D:\TECHWIZ7 remains the Server checkout. Never access atlas-credentials.env, edit Server, merge or push main. Do not put secrets in VITE_* variables.

The proposed API contract is still unapproved. The fixture models are not final DTOs. The central HTTP transport exists but is not instantiated. No live authentication, database order, map coordinates, email delivery or OpenAI connection is claimed.

See [implementation status](../Documentation/Frontend/IMPLEMENTATION-STATUS.md) for implemented routes, remaining functionality, test scope, assets and backend dependencies. See [the complete portable prompt](MARKETLINK-MASTER-FRONTEND-PROMPT.md) for the full target design/page specifications requested by the owner. That prompt describes intended scope, not a completed-feature claim.

These files are internal development notes, not the student's final competition submission report.
