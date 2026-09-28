import {randomInt} from 'node:crypto';
import {completeApplication} from '../validation/farmerOnboarding.schema.js';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { hashPassword, comparePassword, signToken } from '../utils/token.js';
import { sendPasswordResetOtpEmail, sendLoginOtpEmail } from './email.service.js';
import { env } from '../config/env.js';

// ── In-memory OTP store (keyed by lowercased email) ──────────────────────────
// Each entry: { otp: string, expiresAt: number, attempts: number }
const otpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

function generateOtp() {
  return String(randomInt(100000, 1000000));
}


export async function registerCustomerService(data, verifiedPasswordHash) {
  const db = getDB();

  // 1. Check email uniqueness
  const existing = await db.collection('users').findOne({ email: data.email });
  if (existing) {
    const error = new Error('An account with this email address already exists.');
    error.code = 'EMAIL_ALREADY_EXISTS';
    error.statusCode = 409;
    throw error;
  }

  // 2. Hash password
  const passwordHash = verifiedPasswordHash || await hashPassword(data.password);

  // 3. Insert user record
  const now = new Date();
  const userDoc = {
    email: data.email,
    passwordHash,
    role: 'customer',
    name: data.name,
    phone: data.phone,
    address: data.address,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('users').insertOne(userDoc);
  const userId = result.insertedId.toString();

  // 4. Generate JWT
  const token = signToken({ sub: userId, role: 'customer' });

  return {
    token,
    user: {
      id: userId,
      role: 'customer',
      email: data.email,
      name: data.name,
      phone: data.phone,
      address: data.address,
    },
  };
}

export async function registerFarmerService(data, verifiedPasswordHash) {
  const db = getDB();

  // 1. Check email uniqueness
  const existing = await db.collection('users').findOne({ email: data.email });
  if (existing) {
    const error = new Error('An account with this email address already exists.');
    error.code = 'EMAIL_ALREADY_EXISTS';
    error.statusCode = 409;
    throw error;
  }

  // 2. Hash password
  const passwordHash = verifiedPasswordHash || await hashPassword(data.password);
  const now = new Date();

  // 3. Insert user record
  const userDoc = {
    email: data.email,
    passwordHash,
    role: 'farmer',
    name: data.name,
    phone: data.phone,
    address: data.address,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const userResult = await db.collection('users').insertOne(userDoc);
  const userId = userResult.insertedId;

  // 4. Insert farmer profile with pending approval
  const profileDoc = {
    userId,
    businessName: data.businessName,
    contactPerson: data.contactPerson,
    phone: data.phone,
    email: data.email,
    address: data.address,
    bio: data.bio || '',
    profileImageUrl: '',
    stallCoordinates: null,
    approvalStatus: 'draft',
    marketIds: [],
    operatingDays: [],
    createdAt: now,
    updatedAt: now,
  };

  const profileResult = await db.collection('farmerProfiles').insertOne(profileDoc);
  const token = signToken({ sub: userId.toString(), role: 'farmer' });

  return {
    token,
    user: {
      id: userId.toString(),
      role: 'farmer',
      email: data.email,
      name: data.name,
      phone: data.phone,
      farmerProfile: {
        id: profileResult.insertedId.toString(),
        businessName: data.businessName,
        approvalStatus: 'draft',
      },
    },
  };
}

export async function loginService(email, password) {
  const db = getDB();

  const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.code = 'INVALID_CREDENTIALS';
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('This account has been deactivated. Please contact support.');
    error.code = 'ACCOUNT_DEACTIVATED';
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password.');
    error.code = 'INVALID_CREDENTIALS';
    error.statusCode = 401;
    throw error;
  }

  const userId = user._id.toString();
  const token = signToken({ sub: userId, role: user.role });

  const userResponse = {
    id: userId,
    role: user.role,
    email: user.email,
    name: user.name,
    phone: user.phone,
  };

  if (user.role === 'farmer') {
    const profile = await db.collection('farmerProfiles').findOne({ userId: user._id });
    if (profile) {
      userResponse.farmerProfile = {
        id: profile._id.toString(),
        businessName: profile.businessName,
        approvalStatus: profile.approvalStatus,
        marketIds: profile.marketIds || [],
        operatingDays: profile.operatingDays || [],
      };
    }
  }

  return { token, user: userResponse };
}

export async function getCurrentUserService(userId) {
  const db = getDB();
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId), isActive: true });
  if (!user) {
    const error = new Error('User not found.');
    error.code = 'USER_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  const userResponse = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
    phone: user.phone,
    address: user.address,
  };

  if (user.role === 'farmer') {
    const profile = await db.collection('farmerProfiles').findOne({ userId: user._id });
    if (profile) {
      userResponse.farmerProfile = {
        id: profile._id.toString(),
        businessName: profile.businessName,
        approvalStatus: profile.approvalStatus,
        bio: profile.bio,
        marketIds: profile.marketIds || [],
        operatingDays: profile.operatingDays || [],
      };
    }
  }

  return userResponse;
}

export async function updateFarmerApprovalService(farmerProfileId, newStatus, adminId, reason = '') {
  const db = getDB();
  const pId = new ObjectId(farmerProfileId);

  const profile = await db.collection('farmerProfiles').findOne({ _id: pId });
  if (!profile) {
    const error = new Error('Farmer profile not found.');
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  if (newStatus === 'approved' && profile.approvalStatus !== 'suspended' && (profile.onboarding?.status !== 'submitted' || !completeApplication(profile.onboarding?.stepData))) {
    throw Object.assign(new Error('Only a completed, submitted application can be approved.'), {statusCode:409,code:'APPLICATION_NOT_SUBMITTED'});
  }
  if (['rejected','suspended'].includes(newStatus) && !reason.trim()) {
    throw Object.assign(new Error('Please explain the reason to the farmer.'), {statusCode:400,code:'REASON_REQUIRED'});
  }
  if (newStatus === 'rejected' && profile.onboarding?.status !== 'submitted') throw Object.assign(new Error('Only a submitted application can be returned for changes.'),{statusCode:409});
  if (newStatus === 'suspended' && profile.approvalStatus !== 'approved') throw Object.assign(new Error('Only an approved farmer can be suspended.'),{statusCode:409});
  const previousStatus = profile.approvalStatus;
  const now = new Date();

  const decision = await db.collection('farmerProfiles').updateOne(
    { _id: pId, updatedAt: profile.updatedAt },
    {
      $set: {
        approvalStatus: newStatus,
        adminNotes: reason.trim(),
        "onboarding.status": newStatus,
        approvedAt: newStatus === 'approved' ? now : null,
        approvedBy: newStatus === 'approved' ? new ObjectId(adminId) : null,
        updatedAt: now,
      },
    }
  );

  if (!decision.matchedCount) throw Object.assign(new Error("Application changed. Refresh before making a decision."), {statusCode:409});

  // Keep account access for decisions and support; selling remains approval-gated.
  if (profile.userId) {
    await db.collection('users').updateOne(
      { _id: profile.userId },
      { $set: { isActive: true, updatedAt: now } }
    );
  }

  // Write audit log
  await db.collection('auditLogs').insertOne({
    actorId: new ObjectId(adminId),
    actorRole: 'admin',
    action: 'FARMER_STATUS_UPDATE',
    targetCollection: 'farmerProfiles',
    targetId: pId,
    details: {
      farmerUserId: profile.userId,
      businessName: profile.businessName,
      previousStatus,
      newStatus,
      reason,
    },
    createdAt: now,
  });

  return {
    id: farmerProfileId,
    businessName: profile.businessName,
    previousStatus,
    currentStatus: newStatus,
    updatedAt: now.toISOString(),
  };
}

export async function listFarmersForAdminService(query = {}) {
  const db = getDB();
  const filter = {};

  const status = typeof query === 'string' ? query : query.status;
  if (status) {
    filter.approvalStatus = status;
  }

  if (typeof query === 'object') {
    if (query.countryCode) {
      filter.countryCode = query.countryCode.toUpperCase().trim();
    }
    if (query.search) {
      const s = query.search.trim();
      filter.$or = [
        { businessName: { $regex: s, $options: 'i' } },
        { contactPerson: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
      ];
    }
  }

  const profiles = await db.collection('farmerProfiles').find(filter).sort({ createdAt: -1 }).toArray();

  return profiles.map((p) => ({
    id: p._id.toString(),
    userId: p.userId.toString(),
    businessName: p.businessName,
    contactPerson: p.contactPerson,
    email: p.email,
    phone: p.phone,
    address: p.address,
    countryCode: p.countryCode || 'PK',
    countryName: p.countryName || 'Pakistan',
    city: p.city || 'Lahore',
    approvalStatus: p.approvalStatus,
    onboardingStatus: p.onboarding?.status || (p.approvalStatus === 'approved' ? 'approved' : 'in_progress'),
    currentOnboardingStep: p.onboarding?.currentStep || 1,
    onboarding: p.onboarding || null,
    adminNotes: p.adminNotes || '',
    bio: p.bio || '',
    stallCoordinates: p.stallCoordinates || null,
    marketIds: (p.marketIds || []).map((id) => id.toString()),
    createdAt: p.createdAt?.toISOString(),
  }));
}

export async function listCustomersAdminService(query = {}) {
  const db = getDB();
  const filter = { role: 'customer' };

  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'suspended' || query.status === 'deactivated') filter.isActive = false;

  if (query.search) {
    const s = query.search.trim();
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
    ];
  }

  const users = await db
    .collection('users')
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    role: u.role,
    isActive: u.isActive !== false,
    status: u.isActive === false ? 'suspended' : 'active',
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
  }));
}

export async function updateCustomerStatusAdminService(customerId, isActive, adminId, reason = '') {
  const db = getDB();
  const cId = new ObjectId(customerId);

  const customer = await db.collection('users').findOne({ _id: cId, role: 'customer' });
  if (!customer) {
    const error = new Error('Customer not found.');
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  await db.collection('users').updateOne(
    { _id: cId },
    { $set: { isActive, updatedAt: now } }
  );

  // Write audit log
  await db.collection('auditLogs').insertOne({
    actorId: new ObjectId(adminId),
    actorRole: 'admin',
    action: 'CUSTOMER_STATUS_UPDATE',
    targetCollection: 'users',
    targetId: cId,
    details: {
      customerEmail: customer.email,
      previousActive: customer.isActive,
      newActive: isActive,
      reason,
    },
    createdAt: now,
  });

  return {
    id: customerId,
    name: customer.name,
    email: customer.email,
    isActive,
    status: isActive ? 'active' : 'suspended',
    updatedAt: now.toISOString(),
  };
}

export async function getCustomerDetailsAdminService(customerId) {
  const db = getDB();
  const cId = new ObjectId(customerId);

  const customer = await db.collection('users').findOne({ _id: cId, role: 'customer' });
  if (!customer) {
    const error = new Error('Customer not found.');
    error.code = 'NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  // Get orders summary
  const orders = await db
    .collection('orders')
    .find({ customerId: cId })
    .sort({ createdAt: -1 })
    .toArray();

  const counts = {
    total: orders.length,
    placed: 0,
    accepted: 0,
    ready_for_pickup: 0,
    completed: 0,
    declined: 0,
    cancelled: 0,
  };

  let totalSpentMinor = 0;
  for (const o of orders) {
    const st = o.status === 'confirmed' ? 'accepted' : o.status;
    if (counts[st] !== undefined) counts[st]++;
    if (st === 'completed') {
      totalSpentMinor += (o.payment?.paidAmountMinor || o.totalAmountMinor || 0);
    }
  }

  const favouritesCount = await db.collection('favourites').countDocuments({ customerId: cId });
  const activeAlertsCount = await db.collection('restockAlerts').countDocuments({ customerId: cId, status: 'active' });

  return {
    id: customer._id.toString(),
    name: customer.name,
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    email: customer.email,
    phone: customer.phone || '',
    role: customer.role,
    isActive: customer.isActive !== false,
    status: customer.isActive === false ? 'suspended' : 'active',
    preferences: customer.preferences || {},
    metrics: {
      orderCounts: counts,
      totalSpentMinor,
      favouritesCount,
      activeAlertsCount,
    },
    ordersSummary: {
      totalOrders: counts.total,
      placed: counts.placed,
      accepted: counts.accepted,
      ready_for_pickup: counts.ready_for_pickup,
      completed: counts.completed,
      declined: counts.declined,
      cancelled: counts.cancelled,
      totalSpentMinor,
    },
    recentOrders: orders.slice(0, 5).map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      marketDate: o.marketDate,
      marketName: o.marketSnapshot?.name || 'Farmers Market',
      farmerBusinessName: o.farmerSnapshot?.businessName || 'Farm',
      totalAmountMinor: o.totalAmountMinor,
      status: o.status === 'confirmed' ? 'accepted' : o.status,
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    })),
    createdAt: customer.createdAt instanceof Date ? customer.createdAt.toISOString() : customer.createdAt,
    updatedAt: customer.updatedAt instanceof Date ? customer.updatedAt.toISOString() : customer.updatedAt,
  };
}


/**
 * Step 1 of password reset: look up the account, generate a 6-digit OTP,
 * persist it in the in-memory store, and email it to the user.
 */
export async function forgotPasswordService(email) {
  const db = getDB();
  const key = email.toLowerCase().trim();
  const user = await db.collection('users').findOne({ email: key, isActive: true });
  if (!user) throw Object.assign(new Error('This email is not registered. Create an account first.'),{statusCode:404,code:'EMAIL_NOT_REGISTERED'});
  const recent=otpStore.get('reset:'+key);
  if(recent && recent.expiresAt-Date.now()>OTP_TTL_MS-60000)throw Object.assign(new Error('Wait a minute before requesting another code.'),{statusCode:429});
  const otp = generateOtp();
  otpStore.set('reset:' + key, { otp, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  await sendPasswordResetOtpEmail(key, otp, user.name);

  return { sent: true };
}

/**
 * Step 2: verify the OTP and update the password.
 */
export async function resetPasswordService(email, otp, newPassword) {
  const key = email.toLowerCase().trim();
  const record = otpStore.get('reset:' + key);
  if (!record) throw Object.assign(new Error('No reset was requested or the code expired.'), { statusCode: 400, code: 'OTP_NOT_FOUND' });
  if (Date.now() > record.expiresAt) {
    otpStore.delete('reset:' + key);
    otpStore.delete(key);
    throw Object.assign(new Error('The reset code has expired. Please request a new one.'), { statusCode: 400, code: 'OTP_EXPIRED' });
  }
  record.attempts += 1;
  if (record.attempts > MAX_OTP_ATTEMPTS) {
    otpStore.delete('reset:' + key);
    otpStore.delete(key);
    throw Object.assign(new Error('Too many incorrect attempts. Please request a new reset code.'), { statusCode: 429, code: 'OTP_TOO_MANY_ATTEMPTS' });
  }
  if (record.otp !== otp.trim()) throw Object.assign(new Error('Incorrect reset code. Please try again.'), { statusCode: 400, code: 'OTP_INVALID' });
  const db = getDB();
  const passwordHash = await hashPassword(newPassword);
  const result = await db.collection('users').updateOne({ email: key, isActive: true }, { $set: { passwordHash, updatedAt: new Date() } });
  otpStore.delete('reset:' + key);
  otpStore.delete(key);
  if (result.matchedCount === 0) throw Object.assign(new Error('Account not found.'), { statusCode: 404, code: 'NOT_FOUND' });
}

/**
 * 2-Step Login Step 1: verify credentials, generate a 6-digit login OTP,
 * and email it to the user.
 */
export async function sendLoginOtpService(email, password) {
  const db = getDB();
  const key = email.toLowerCase().trim();
  const user = await db.collection('users').findOne({ email: key, isActive: true });
  if (!user) {
    const error = new Error('This email is not registered or the account is inactive.');
    error.code = 'EMAIL_NOT_REGISTERED';
    error.statusCode = 404;
    throw error;
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password.');
    error.code = 'INVALID_CREDENTIALS';
    error.statusCode = 401;
    throw error;
  }

  // Owner-authorized password-only access for this existing administrator account.
  // The database role and password are checked before granting the exception.
  if (key === 'admin@marketlink.com' && user.role === 'admin') {
    otpStore.delete('login:' + key);
    return {
      otpSent: false,
      email: key,
      token: signToken({sub:user._id.toString(),role:user.role}),
      user: {id:user._id.toString(),role:user.role,email:user.email,name:user.name},
    };
  }

  const recent=otpStore.get('login:'+key);
  if(recent && recent.expiresAt-Date.now()>OTP_TTL_MS-60000)throw Object.assign(new Error('Wait a minute before requesting another code.'),{statusCode:429});
  const otp = generateOtp();
  otpStore.set('login:' + key, {
    otp,
    userId: user._id.toString(),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  await sendLoginOtpEmail(key, otp, user.name);

  return {
    otpSent: true,
    email: key,
  };
}

/**
 * 2-Step Login Step 2: verify the OTP, complete sign in, and issue session token.
 */
export async function verifyLoginOtpService(email, otp) {
  const key = email.toLowerCase().trim();
  const record = otpStore.get('login:' + key);
  if (!record) {
    throw Object.assign(new Error('No verification code was requested or the code expired.'), { statusCode: 400, code: 'OTP_NOT_FOUND' });
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete('login:' + key);
    throw Object.assign(new Error('The verification code has expired. Please sign in again.'), { statusCode: 400, code: 'OTP_EXPIRED' });
  }
  record.attempts += 1;
  if (record.attempts > MAX_OTP_ATTEMPTS) {
    otpStore.delete('login:' + key);
    throw Object.assign(new Error('Too many incorrect attempts. Please sign in again.'), { statusCode: 429, code: 'OTP_TOO_MANY_ATTEMPTS' });
  }
  if (record.otp !== otp.trim()) {
    throw Object.assign(new Error('Incorrect verification code. Please try again.'), { statusCode: 400, code: 'OTP_INVALID' });
  }

  const db = getDB();
  const user = await db.collection('users').findOne({ _id: new ObjectId(record.userId), isActive: true });
  if (!user) {
    throw Object.assign(new Error('User account not found.'), { statusCode: 404, code: 'NOT_FOUND' });
  }

  otpStore.delete('login:' + key);

  const userId = user._id.toString();
  const token = signToken({ sub: userId, role: user.role });

  const userResponse = {
    id: userId,
    role: user.role,
    email: user.email,
    name: user.name,
    phone: user.phone,
  };

  if (user.role === 'farmer') {
    const profile = await db.collection('farmerProfiles').findOne({ userId: user._id });
    if (profile) {
      userResponse.farmerProfile = {
        id: profile._id.toString(),
        businessName: profile.businessName,
        approvalStatus: profile.approvalStatus,
        marketIds: profile.marketIds || [],
        operatingDays: profile.operatingDays || [],
      };
    }
  }

  return { token, user: userResponse };
}
