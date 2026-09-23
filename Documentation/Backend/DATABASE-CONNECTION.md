# MongoDB Atlas Connection Specification

**Project**: Aptech TechWiz 7 — End-to-End Web Solutions  
**Driver**: Official MongoDB Node.js Driver (`mongodb` v6.x)  
**Database**: Configurable via `MONGODB_DB_NAME` (Default: `techwiz_db`)  

---

## 1. Connection Architecture

The backend utilizes the native MongoDB Node.js driver to connect directly to the MongoDB Atlas cluster using standard connection pooling. Mongoose is intentionally omitted in compliance with architectural guidelines.

```
                  ┌──────────────────────────────┐
                  │    Server Runtime (Node.js)  │
                  │   src/config/db.js Singleton │
                  └──────────────┬───────────────┘
                                 │
                 Connection Pool (Min: 2, Max: 10)
                                 │
                                 ▼
             ┌────────────────────────────────────────┐
             │         MongoDB Atlas Cluster          │
             │   - admin database (ping check)        │
             │   - techwiz_db (application data)      │
             └────────────────────────────────────────┘
```

---

## 2. Configuration & Pooling Parameters

Configured in `src/config/db.js`:

| Parameter | Value | Description |
|---|---|---|
| `maxPoolSize` | `10` | Maximum number of concurrent connections in the pool |
| `minPoolSize` | `2` | Minimum warm connections maintained ready for immediate requests |
| `serverSelectionTimeoutMS` | `5000` | Timeout before failing if no healthy cluster node is found |
| `socketTimeoutMS` | `45000` | Socket inactivity timeout |

---

## 3. Credential Handling & Zero-Exposure Policy

- **Credential Resolution**: Credentials are read by `src/config/env.js` from `atlas-credentials.env` (at repository root) or local `Server/.env`.
- **Git Protection**: `atlas-credentials.env` is strictly ignored by both root and server `.gitignore` rules.
- **Redaction**: All database error handlers and logging pipelines run regex masks over connection strings to replace credentials (`mongodb+srv://[credentials-hidden]@...`) prior to logging or returning responses.
- **Client Shielding**: Neither `MONGODB_URI`, username, nor password is ever exposed to frontend clients or returned via API endpoints.

---

## 4. Non-Destructive Health Verification

A dedicated non-destructive ping utility is executed at server startup and on demand via `/api/health`:
```javascript
const adminDb = client.db('admin');
await adminDb.command({ ping: 1 });
```

This verification:
- Confirms network connectivity to Atlas.
- Confirms authentication credentials.
- Checks cluster responsiveness without writing, modifying, or reading sensitive application records.
