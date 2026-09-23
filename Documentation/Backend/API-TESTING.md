# API Testing and Verification Guide

**Project**: Aptech TechWiz 7 — End-to-End Web Solutions  
**Target Directory**: `Server/`  
**Test Suite**: Vitest v4.x + Supertest v7.x  

---

## 1. Automated Testing Suite

Automated tests are located in `Server/tests/`. They test server integration and database modules in isolation.

### Running Tests

From `D:\TECHWIZ7\Server`:
```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### Current Test Coverage

| Test File | Description | Cases Covered |
|---|---|---|
| `tests/health.test.js` | Endpoint verification for `/api/health`, `/`, and error handling | 4 passing tests |
| `tests/db.test.js` | Guard clauses, health ping logic, and connection checks | 3 passing tests |
| **Total** | **All passing (100%)** | **7 passing tests** |

---

## 2. Preparation Endpoints Specification

### Endpoint: `GET /api/health`
Checks backend and database connectivity.

#### Response: HTTP 200 OK (Healthy)
```json
{
  "status": "ok",
  "timestamp": "2026-09-23T07:15:46.457Z",
  "uptimeSeconds": 11,
  "environment": "development",
  "database": {
    "status": "connected",
    "databaseName": "techwiz_db",
    "latencyMs": 222
  },
  "version": "1.0.0"
}
```

#### Response: HTTP 503 Service Unavailable (Degraded)
```json
{
  "status": "degraded",
  "timestamp": "2026-09-23T07:15:46.457Z",
  "uptimeSeconds": 11,
  "environment": "development",
  "database": {
    "status": "disconnected",
    "databaseName": "techwiz_db",
    "latencyMs": null
  },
  "version": "1.0.0"
}
```

---

### Endpoint: `GET /`
Provides root service ping.

#### Response: HTTP 200 OK
```json
{
  "message": "TechWiz 7 Backend API Server",
  "status": "active",
  "docs": "/api/health"
}
```

---

### Endpoint: Undefined Routes (404)
Returns standardized JSON error.

#### Response: HTTP 404 Not Found
```json
{
  "success": false,
  "error": {
    "message": "Endpoint not found: GET /api/example",
    "code": "NOT_FOUND"
  }
}
```

---

## 3. Manual Curl Testing

```bash
# Health check
curl -i http://localhost:5000/api/health

# Root ping
curl -i http://localhost:5000/

# 404 handler check
curl -i http://localhost:5000/api/nonexistent
```
