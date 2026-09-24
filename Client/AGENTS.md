# Frontend operating rules

- The owner has supplied the MarketLink SRS and authorised complete frontend development using isolated, labelled fixtures while the API contract is unapproved. Preserve the existing implementation. Follow the SRS; final submission remains student-owned and must satisfy its AI-use rules.
- Work on the existing Client branch only. Check branch, remote, worktrees and status before changes and before commits.
- Own Client/ and Documentation/Frontend/. Read approved Documentation/Shared/ contracts. Do not modify Server/, Documentation/Backend/ or shared documents.
- Never open, read, log, copy or transmit atlas-credentials.env. Never put secrets in browser code or VITE_* values.
- Never switch the shared Server checkout. This frontend lives in an isolated worktree. Use explicit working directories for commands.
- Stage explicit frontend files only; no unrestricted git add. Root .gitignore is the user-approved preparation exception. Other root changes require approval.
- Push explicitly with git push origin HEAD:Client only after verifying the branch. Never merge, force-push or push main/Server.
- Latest owner permission allows Figma only within existing free quota, with no charges or repeated quota retries. Figma must not block React/CSS development. Review actual browser screenshots and test interactions.
- No gradients, repetitive card grids or decorative motion everywhere. Respect focus, keyboard operation, contrast and reduced motion.
- Read the approved API contract before any feature integration. No invented production endpoints, direct MongoDB access or assumed authentication/error schemas.
- Run npm run check from Client after meaningful code changes. Use only relevant tests. Do not claim backend integration based on mocks.
