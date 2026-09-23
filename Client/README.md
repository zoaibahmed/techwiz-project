# TECHWIZ7 frontend preparation

No competition functionality has been built. The current page only verifies the runtime.

Active local frontend: `D:\TECHWIZ7\.worktrees\frontend\Client` (branch `Client`).
The original `D:\TECHWIZ7` checkout belongs to branch `Server`; do not switch it.

```powershell
Set-Location D:\TECHWIZ7\.worktrees\frontend\Client
npm ci
npm run dev
npm run check
```

Development URL: http://127.0.0.1:5173. `npm run preview` serves a completed build.
The browser test uses installed Microsoft Edge. On another machine, install Edge or explicitly change the test browser configuration.

Use Node >=22.12; verified here on Node 25.2.1 and npm 11.6.2. Select a maintained LTS runtime for the final competition environment after reviewing its requirements.

Only public configuration belongs in `.env.local`. The provided `.env.example` intentionally leaves the API origin empty. The transport is not instantiated and no backend requests run.

See `../Documentation/Frontend/FRONTEND-READINESS.md` for readiness, ownership and outstanding gates.
