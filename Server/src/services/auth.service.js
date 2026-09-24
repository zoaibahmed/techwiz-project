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

export async function listFarmersForAdminService(filterStatus) {
  const db = getDB();
  const query = {};
  if (filterStatus) {
    query.approvalStatus = filterStatus;
  }

  const profiles = await db.collection('farmerProfiles').find(query).sort({ createdAt: -1 }).toArray();

  return profiles.map((p) => ({
    id: p._id.toString(),
    userId: p.userId.toString(),
    businessName: p.businessName,
    contactPerson: p.contactPerson,
    email: p.email,
    phone: p.phone,
    address: p.address,
    approvalStatus: p.approvalStatus,
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

