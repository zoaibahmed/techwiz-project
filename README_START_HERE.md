# MarketLink | Internal engineering briefing pack

**Purpose:** give Astra/Codex, Antigravity, and the human operator the SAME picture of the selected MarketLink/eGreen Basket product before implementation. These files are internal planning/coordination aids, **not the required competition submission report**.

## Read in this order

1. `Documentation/Shared/00_PRODUCT_BLUEPRINT.md` - full product vision, original SRS traceability, functionality, AI product strategy, user journeys, model and open decisions.
2. `Documentation/Shared/01_API_AND_DATA_CONTRACT.md` - proposed shared API, cross-role data shapes, state transitions, conventions and test cases. **DRAFT: human approval required before it becomes an implementation contract.**
3. `Documentation/Shared/02_PHASES_INTEGRATION_AND_QA.md` - phase gates, ownership, cross-branch exchange, demo plan, quality checks.
4. `Documentation/Frontend/ASTRA_CODEX_INSTRUCTIONS.md` - frontend agent's self-contained operating brief and phase tasks.
5. `Documentation/Backend/ANTIGRAVITY_INSTRUCTIONS.md` - backend agent's self-contained operating brief and phase tasks.

## How to use the files in the Windows project

These delivered files are NOT yet in `D:\TECHWIZ7` or in GitHub. Review them first. Place each under the matching `Documentation/` path in your project **using the normal developer process and after checking the intended branch/worktree**. Treat the master documents as operator-controlled: do not allow two agents to independently edit or commit competing copies.

- Astra worktree: `D:\TECHWIZ7\.worktrees\frontend`, application `Client/`, branch `Client`.
- Antigravity original checkout: `D:\TECHWIZ7`, application `Server/`, branch `Server`.
- Integration workspace, if separately authorised: isolated `main` worktree created with operator approval. No automatic main merge/push.
- Existing credentials file: `D:\TECHWIZ7\atlas-credentials.env`; never include in this pack, Git, frontend bundles, tickets, logs, or chats.

Both agents must READ the full product blueprint and approved contract but may EDIT only their owned code and private team documentation. If the shared master exists in one Git branch, **the other branch cannot see it just because it has the same folder name**. The operator must deliver an approved, identical version to both worktrees using a controlled change, or the agent must read a specifically approved file path; no unilateral branch merging.

## Important status categories

- **[SRS]** means demanded by the supplied MarketLink SRS, v1.0, pages 3-18.
- **[OPTIONAL SRS]** means explicitly optional in that SRS.
- **[ENHANCEMENT]** means our own proposed creative/technical extension; defer if it threatens SRS coverage.
- **[PROPOSAL]** means an engineering choice needing operator approval, not a fact specified in the SRS.
- **[OPEN]** means the SRS is silent/ambiguous; do not quietly present a decision as official.

## Competition compliance warning

The supplied SRS, p.13, allows AI as a supporting aid but requires meaningful student modification and understanding of AI-assisted code/content, acknowledgement of tools, and prohibits AI fully generating ready-made submission documentation. The human team must write/review its own required report and be able to explain the architecture/code and test evidence. These engineering briefs do not replace that obligation. SRS p.18 asks for installation instructions, credentials for all demo roles, a video covering all functional requirements, and a consolidated ZIP/ReadMe.doc. It also mentions `.sql` scripts despite permitting MongoDB on p.15: clarify the format expectation with organisers; never invent a false SQL schema for MongoDB.

## Non-negotiable global principle

**An attractive, complete, understandable, functioning SRS-aligned product with grounded AI is the goal. More features are not a substitute for correct required features, safe data handling, and a demonstrable end-to-end flow.**

## Paste-ready first instruction to each agent

Attach the MarketLink SRS PDF **and this blueprint ZIP** to both agents, or place verified copies of the documents where they can read them. Do not assume either agent can read the other's separate Git worktree.

**To Astra/Codex:** "Read the official MarketLink SRS and the attached internal pack, especially `00_PRODUCT_BLUEPRINT.md`, `01_API_AND_DATA_CONTRACT.md`, `02_PHASES_INTEGRATION_AND_QA.md` and your `ASTRA_CODEX_INSTRUCTIONS.md`. Stay on Client, touch only Client and Documentation/Frontend. Give me your SRS coverage, proposed Figma visual direction, frontend route map, API dependencies and decisions needing my approval. No bulk feature coding, no shared contract rewrite, no main merge or push until I authorise the phase. Tell me exactly what Antigravity needs to provide to keep integration simple."

**To Antigravity:** "Read the official MarketLink SRS and the attached internal pack, especially `00_PRODUCT_BLUEPRINT.md`, `01_API_AND_DATA_CONTRACT.md`, `02_PHASES_INTEGRATION_AND_QA.md` and your `ANTIGRAVITY_INSTRUCTIONS.md`. Stay in BACKEND-ONLY MODE on Server. Give me your data model, order/stock/pickup invariants, permissions, API proposal, AI grounding/action design and decisions needing my approval. Touch only Server and Documentation/Backend if authorised. Do not edit Client, create integration worktrees, merge or push main. Explain exact contract information Astra needs. Stop after analysis until I approve the phase."

**Operator action after both reports:** resolve the `[OPEN]` decisions, approve a numbered contract version and a Figma direction, distribute identical approved shared docs to both worktrees, then issue **narrow, matching P2/P3/P4 feature assignments**. During normal development, each agent pushes its own branch; main merges require a later separate human command.
