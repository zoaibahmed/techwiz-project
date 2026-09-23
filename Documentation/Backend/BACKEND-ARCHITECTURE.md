# Backend Architecture Specification

**Project**: Aptech TechWiz 7 — End-to-End Web Solutions  
**Component**: Backend API Server (`Server/`)  
**Runtime**: Node.js v25.2.1 (ESM) | Express v5.x | MongoDB Native Driver v6.x  
**Branch**: `Server`  

---

## 1. Architectural Overview

The backend is engineered as a high-performance, modular, and secure RESTful service. The design strictly adheres to separation of concerns, ensuring that business logic, data access, transport protocol handling, and configuration remain decoupled.

```
[ HTTP Client / Frontend (Astra 6) ]
                 │
                 ▼
     [ Security Middleware ] (Helmet, CORS)
                 │
                 ▼
     [ Request Parsers ] (JSON, URL-encoded)
                 │
                 ▼
       [ API Router ] (/api)
                 │
                 ▼
     [ Modular Route Handlers ] (/health, future SRS modules)
                 │
                 ▼
          [ Controllers ] (Request extraction, HTTP status mapping)
                 │
                 ▼
           [ Services ] (Pure business logic, orchestration)
                 │
                 ▼
       [ Database Layer ] (Native MongoDB connection pool)
                 │
                 ▼
    [ MongoDB Atlas Cluster ]
```

---

## 2. Directory Structure

```
Server/
├── package.json               # ESM configuration, scripts, dependencies
├── package-lock.json          # Dependency lockfile
├── .gitignore                 # Local secrets, build & dependency exclusions
├── .env.example               # Sanitized template for environment variables
├── src/
│   ├── app.js                 # Express application factory & middleware pipeline
│   ├── server.js              # Server entry point, DB boot, lifecycle handlers
│   ├── config/
│   │   ├── env.js             # Secure environment loader (Atlas & local .env)
│   │   └── db.js              # Native MongoDB singleton connection pool
│   ├── middleware/
│   │   ├── corsConfig.js      # Strict CORS origin and header control
│   │   ├── errorHandler.js    # Central error handler with secret redaction
│   │   └── notFoundHandler.js # Standardized 404 handler
│   ├── routes/
│   │   ├── index.js           # Master API router mounting under /api
│   │   └── health.routes.js   # Preparation health check route
│   ├── controllers/
│   │   └── health.controller.js # Health controller handling HTTP responses
│   ├── services/
│   │   └── health.service.js  # System metrics & DB connectivity aggregator
│   ├── models/                # Placeholder for future competition collections
│   └── validation/            # Placeholder for future Zod request validators
└── tests/
    ├── db.test.js             # Unit tests for database connection logic
    └── health.test.js         # Integration tests for health & error endpoints
```

---

## 3. Middleware & Pipeline Hierarchy

1. **Helmet**: Applies hardened HTTP security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options).
2. **CORS**: Enforces origin restrictions allowing configured frontend clients (`CLIENT_ORIGIN` and local development hosts).
3. **Body Parsers**: Express JSON and URL-encoded parsers with explicit `1mb` payloads limits to guard against payload-flooding attacks.
4. **API Router**: Mounts versioned and modular sub-routers under the `/api` prefix.
5. **Root Handler**: Provides a base operational ping at `/`.
6. **404 Handler (`notFoundHandler`)**: Intercepts unrouted requests and responds with structured JSON error objects.
7. **Central Error Handler (`errorHandler`)**: Catches all synchronous and asynchronous errors, redacts credentials, formats a clean JSON response, and suppresses stack traces in production.

---

## 4. Graceful Shutdown & Process Lifecycle

`server.js` manages process lifecycle events:
- **SIGINT / SIGTERM**: Initiates connection draining on the HTTP listener, closes the active MongoDB connection pool cleanly, and exits with code 0.
- **unhandledRejection & uncaughtException**: Logs error summaries with credentials masked to prevent cluster crashes without visibility.
