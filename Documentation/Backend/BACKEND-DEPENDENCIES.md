# Backend Dependencies Manifest

**Project**: Aptech TechWiz 7 — End-to-End Web Solutions  
**Target Directory**: `Server/`  
**Package Manager**: `npm` v11.6.2  
**Node.js**: `v25.2.1`  

---

## 1. Production Dependencies

| Package | Version | Purpose & Rationale |
|---|---|---|
| `express` | `^5.2.1` | Core HTTP framework providing minimalist, performant, and modular web server capabilities. |
| `mongodb` | `^6.14.2` | Official native MongoDB driver for Node.js, providing high-performance connection pooling without ORM/ODM overhead. |
| `cors` | `^2.8.6` | Middleware for managing Cross-Origin Resource Sharing with customizable white-lists for client applications. |
| `dotenv` | `^17.3.1` | Loads environment variables from local environment files (`atlas-credentials.env` and `.env`). |
| `helmet` | `^8.1.0` | Secures HTTP headers by configuring CSP, HSTS, no-sniff, and frame-options to protect against common web vulnerabilities. |
| `zod` | `^3.24.2` | Type-safe schema declaration and validation library for incoming request bodies, queries, and environment configs. |

---

## 2. Development & Testing Dependencies

| Package | Version | Purpose & Rationale |
|---|---|---|
| `vitest` | `^4.1.11` | Modern, lightning-fast ESM-native test runner compatible with Vite ecosystem. |
| `supertest` | `^7.1.3` | High-level HTTP assertions library for integration testing Express routes without binding to physical network ports. |

---

## 3. Dependency Audit Status

- Total production dependencies: 6
- Total development dependencies: 2
- Vulnerability audit result: **0 vulnerabilities** (`npm audit` clean).
- No frontend libraries installed in `Server/`.
- No redundant or deprecated libraries.
