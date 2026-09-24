import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { hashPassword, comparePassword, signToken } from '../utils/token.js';

export async function registerCustomerService(data) {
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
  const passwordHash = await hashPassword(data.password);

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

export async function registerFarmerService(data) {
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
  const passwordHash = await hashPassword(data.password);
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
    approvalStatus: 'pending',
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
        approvalStatus: 'pending',
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

  const previousStatus = profile.approvalStatus;
  const now = new Date();

  await db.collection('farmerProfiles').updateOne(
    { _id: pId },
    {
      $set: {
        approvalStatus: newStatus,
        approvedAt: newStatus === 'approved' ? now : null,
        approvedBy: newStatus === 'approved' ? new ObjectId(adminId) : null,
        updatedAt: now,
      },
    }
  );

  // Sync user active state: suspended farmers cannot log in
  if (profile.userId) {
    await db.collection('users').updateOne(
      { _id: profile.userId },
      { $set: { isActive: newStatus !== 'suspended', updatedAt: now } }
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

