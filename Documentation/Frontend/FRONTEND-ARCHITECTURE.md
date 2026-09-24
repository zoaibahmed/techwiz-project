> Current implementation update: the SRS has arrived and the owner authorised frontend development. The preparation record below is historical. See [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) for the current app, design, dependencies, test coverage and remaining integration work. Figma may now be used within free quota but must not block coding.

# Frontend architecture

## Scope and ownership

Preparation only. The SRS and competition rules override this plan. Verify AI assistance, external tools, libraries, generated assets and prebuilt preparation eligibility before producing competition deliverables.

React + TypeScript + Vite, semantic HTML and plain CSS. No domain model, application routes, authentication flow, dashboard, persistence or backend endpoints are assumed.

Current files:
- `Client/src/main.tsx`: React entry, StrictMode and global CSS.
- `Client/src/App.tsx`: temporary preparation status page.
- `Client/src/styles.css`: provisional spacing, responsive type, focus and reduced-motion foundation.
- `Client/src/lib/api-client.ts`: isolated fetch transport; no automatic requests.
- `Client/src/lib/api-client.test.ts`: synthetic transport tests.
- `Client/tests/readiness.spec.ts`: real browser startup, responsive layout and runtime checks.

Introduce feature folders, routes and shared components only from actual SRS requirements. Prefer local component state; add shared state or a data cache only when justified. Keep heavy visualization modules dynamically loaded. Never animate the same property with two animation libraries.

## Contract gate

No approved shared contract existed at preparation time. Before integration, read the approved version in Documentation/Shared/. Record its version and confirm endpoint paths, methods, request/response fields, types, validation, pagination, authentication, CORS/credentials policy and error format. Propose disagreements to the operator; do not edit the shared contract.

Create a single configured transport using the approved public VITE_API_BASE_URL. Endpoint paths are relative to that base. Responses remain unknown until validated against the approved schema; TypeScript assertions are not validation. ApiHttpError retains status and unknown response body without inventing an envelope. Fetch network/abort errors propagate. Credentials default to omitted and redirects are rejected. Authentication must be added only as specified by the approved contract; do not persist tokens speculatively. No automatic mutation retries.

Mocks must be isolated from production, use the approved contract and be labelled in tests. The current example.test fixtures test transport only and are not proposed endpoints. Real backend tests are mandatory before claiming integration.

## Local isolation

The existing repository was restored concurrently by another process and found on Server. It was not switched. Client is a tracking checkout of the existing origin/Client branch at D:\TECHWIZ7\.worktrees\frontend. Both worktrees share repository history, not working files or indexes. Original Client, Server and Documentation directories were preserved.

Run frontend commands in the worktree's Client directory. Do not copy the frontend into the active Server checkout. Each worktree retains normal Client/Server/Documentation repository-relative layout. The operator alone integrates branches into main. No junctions or separate unrelated repositories were created.

Local Git info/exclude excludes .worktrees, env files, dependencies and builds. A user-approved tracked root .gitignore in Client provides portable exclusions. The original checkout's concurrently created .gitignore was not edited or staged by this agent.

Before commit: verify Client branch, origin URL, status, diff, authorized paths and ignored credentials. Stage exact frontend paths and approved .gitignore. Run npm run check. Push explicitly to origin HEAD:Client. Never push/merge main or Server.
