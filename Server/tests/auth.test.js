import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, closeDB, getDB } from '../src/config/db.js';
import { setupDatabaseIndexes } from '../src/config/indexes.js';

describe('MarketLink Authentication & RBAC Test Suite', () => {
  let app;
  let db;

  const testCustomerEmail = `test.cust.${Date.now()}@example.com`;
  const testFarmerEmail = `test.farmer.${Date.now()}@example.com`;
  const adminEmail = `admin.${Date.now()}@marketlink.com`;

  let customerCookies = [];
  let customerCsrfToken = '';
  let farmerCookies = [];
  let adminCookies = [];
  let adminCsrfToken = '';
  let farmerProfileId = '';

  beforeAll(async () => {
    app = createApp();
    await connectDB();
    db = getDB();
    await setupDatabaseIndexes(db);
  });

  afterAll(async () => {
    if (db) {
      await db.collection('users').deleteMany({
        email: { $in: [testCustomerEmail, testFarmerEmail, adminEmail] },
      });
      if (farmerProfileId) {
        await db.collection('farmerProfiles').deleteOne({ email: testFarmerEmail });
      }
    }
    await closeDB();
  });

  const extractCookie = (cookies, name) => {
    const raw = cookies.find((c) => c.startsWith(`${name}=`));
    if (!raw) return '';
    return raw.split(';')[0].split('=')[1];
  };

  // 1. Customer Registration sets HTTP-only auth cookie & csrf cookie
  it('POST /api/v1/auth/register/customer should register a new customer and set cookies without token in JSON', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register/customer')
      .send({
        name: 'Test Customer',
        email: testCustomerEmail,
        password: 'Password123!',
        phone: '+923001112233',
        address: 'Test Address, Lahore',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.user.email).toBe(testCustomerEmail);
    // Token must NOT be in JSON payload (strictly HTTP-only cookie)
    expect(res.body.data.token).toBeUndefined();

    // Verify Set-Cookie headers
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    customerCookies = setCookie;

    const tokenCookie = setCookie.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain('HttpOnly');

    const csrfCookie = setCookie.find((c) => c.startsWith('marketlink_csrf='));
    expect(csrfCookie).toBeDefined();
    customerCsrfToken = extractCookie(setCookie, 'marketlink_csrf');
    expect(customerCsrfToken.length).toBeGreaterThan(10);
  });

  // 2. Email Uniqueness
  it('POST /api/v1/auth/register/customer should reject duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register/customer')
      .send({
        name: 'Duplicate Customer',
        email: testCustomerEmail,
        password: 'Password123!',
        phone: '+923001112233',
        address: 'Test Address, Lahore',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  // 3. Farmer Registration with Pending Approval
  it('POST /api/v1/auth/register/farmer should register farmer in pending status', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register/farmer')
      .send({
        name: 'Test Farmer Owner',
        email: testFarmerEmail,
        password: 'Password123!',
        phone: '+923002223344',
        address: 'Farm Address, Bedian Road',
        businessName: 'Organic Test Farm',
        contactPerson: 'Test Farmer Owner',
        bio: 'Specialising in seasonal produce.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('farmer');
    expect(res.body.data.user.farmerProfile.approvalStatus).toBe('pending');
    farmerCookies = res.headers['set-cookie'];
    farmerProfileId = res.body.data.user.farmerProfile.id;
  });

  // 4. Login
  it('POST /api/v1/auth/login should authenticate user and set HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testCustomerEmail,
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.user.email).toBe(testCustomerEmail);
    expect(res.headers['set-cookie']).toBeDefined();
    customerCookies = res.headers['set-cookie'];
    customerCsrfToken = extractCookie(customerCookies, 'marketlink_csrf');
  });

  it('POST /api/v1/auth/login should reject invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testCustomerEmail,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  // 5. Get Current User Profile (me) via HTTP-only cookie hydration
  it('GET /api/v1/auth/me should hydrate session from HTTP-only cookie', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', customerCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testCustomerEmail);
    expect(res.body.data.user.role).toBe('customer');
  });

  // 6. CSRF Protection on mutating requests
  it('Mutating request with cookie but missing CSRF token should be rejected with 403', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', customerCookies);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('Mutating request with valid CSRF token in header should succeed', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', customerCookies)
      .set('x-csrf-token', customerCsrfToken);

    expect(res.status).toBe(200);
    expect(res.body.data.loggedOut).toBe(true);

    // Verify token cookie is cleared
    const setCookie = res.headers['set-cookie'];
    const clearedToken = setCookie.find((c) => c.startsWith('token=;'));
    expect(clearedToken).toBeDefined();
  });

  // 7. Admin Farmer Approval & RBAC
  it('Customer attempting to access admin route should receive 403 Forbidden', async () => {
    // Log back in to get active customer cookie
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testCustomerEmail,
        password: 'Password123!',
      });
    const loggedInCookies = loginRes.headers['set-cookie'];

    const res = await request(app)
      .get('/api/v1/admin/farmers')
      .set('Cookie', loggedInCookies);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Admin can list and approve a pending farmer with proper CSRF token and cookie', async () => {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.default.hash('AdminPassword123!', 10);

    await db.collection('users').insertOne({
      email: adminEmail,
      passwordHash: hash,
      role: 'admin',
      name: 'Test Admin',
      isActive: true,
      createdAt: new Date(),
    });

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: adminEmail,
        password: 'AdminPassword123!',
      });

    expect(adminLoginRes.status).toBe(200);
    adminCookies = adminLoginRes.headers['set-cookie'];
    adminCsrfToken = extractCookie(adminCookies, 'marketlink_csrf');

    // List farmers as admin
    const listRes = await request(app)
      .get('/api/v1/admin/farmers')
      .set('Cookie', adminCookies);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    // Approve the test farmer with CSRF token
    const approveRes = await request(app)
      .patch(`/api/v1/admin/farmers/${farmerProfileId}/status`)
      .set('Cookie', adminCookies)
      .set('x-csrf-token', adminCsrfToken)
      .send({
        approvalStatus: 'approved',
        reason: 'Registration verified by test suite',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.currentStatus).toBe('approved');
  });
});

