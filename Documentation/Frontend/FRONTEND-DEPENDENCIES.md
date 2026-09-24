> Current implementation update: the SRS has arrived and the owner authorised frontend development. The preparation record below is historical. See [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) for the current app, design, dependencies, test coverage and remaining integration work. Figma may now be used within free quota but must not block coding.

# Dependencies and skills

No frontend dependencies existed initially. Versions are exact in Client/package.json with a committed lockfile.

| Package | Version | Purpose |
| --- | --- | --- |
| react / react-dom | 19.3.0 | UI runtime |
| vite | 8.3.0 | Dev server and production bundle |
| @vitejs/plugin-react | 6.1.1 | React support |
| typescript | 7.0.2 | Strict static checks |
| gsap | 3.15.0 | Available for deliberate timelines; not bundled by current page |
| motion | 13.4.1 | Available for React motion; not bundled by current page |
| lucide-react | 1.47.0 | SVG icons |
| vitest | 4.1.11 | API transport tests |
| @playwright/test | 1.63.0 | Browser smoke test using installed Edge |

Matching React type definitions and Node types are dev dependencies. HTML5, CSS and inline SVG require no package. Tailwind is deferred pending permission/need. Three.js, React Three Fiber, Drei and Lenis are not installed. No backend packages or database clients were installed.

Reviewed official references: [Vite setup](https://vite.dev/guide/), [Motion installation](https://motion.dev/docs/react-installation), [GSAP React guidance](https://gsap.com/resources/React/). Runtime/build compatibility is also verified locally rather than inferred from version numbers.

## Skills installed

| Capability | Source | Local skill directory |
| --- | --- | --- |
| UI/UX Pro Max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | C:/Users/NC/.agents/skills/ui-ux-pro-max |
| Frontend Design | https://github.com/anthropics/skills/tree/main/skills/frontend-design | C:/Users/NC/.codex/skills/frontend-design |
| Web Design Guidelines | https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines | C:/Users/NC/.codex/skills/web-design-guidelines |
| React Best Practices | https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices | C:/Users/NC/.codex/skills/react-best-practices |
| React Composition Patterns | https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns | C:/Users/NC/.codex/skills/composition-patterns |

Existing plugin skills were inventoried; these exact missing skills were not duplicated. Official installation instructions and skill entrypoints were reviewed. Anthropic/Vercel skills used the bundled Codex skill installer. UI/UX Pro Max used its official CLI with --ai codex --global and no force option. The README's --dry-run option was rejected by the installed CLI; its supported help was checked before completing installation.

Verification: SKILL.md entrypoints exist and were read; UI/UX Pro Max local Python search returned accessibility results successfully. Skills are installed in standard discovery locations, and can be read directly now. Automatic discovery in a fresh Codex turn/session remains to be confirmed; do not represent the current fixed session catalog as refreshed. The installer recommends restarting the coding assistant; newly installed Codex skills should be available on the next turn.

User rules always override skill defaults: do not invent a subject, build competition features early, use gradients or deploy automatically. React/Next.js advice must be filtered for this client-only Vite application.
