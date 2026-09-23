import { ObjectId } from 'mongodb';
import { verifyToken } from '../utils/token.js';
import { getDB } from '../config/db.js';

/**
 * Authenticates incoming request using HTTP-only cookie or Authorization Bearer header.
 */
export async function authenticateToken(req, res, next) {
  let token = null;

  // 1. Check cookies first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization Bearer header as secondary/API transport
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required to access this resource.',
        fields: [],
        requestId: req.id || 'auth_req',
      },
    });
  }

  try {
    const decoded = verifyToken(token);
    const db = getDB();

    const user = await db.collection('users').findOne({
      _id: new ObjectId(decoded.sub),
      isActive: true,
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_SESSION',
          message: 'User session is invalid, inactive, or has been revoked.',
          fields: [],
          requestId: req.id || 'auth_req',
        },
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      phone: user.phone,
    };

    // If farmer, attach their farmer profile context
    if (user.role === 'farmer') {
      const profile = await db.collection('farmerProfiles').findOne({ userId: user._id });
      if (profile) {
        req.farmerProfile = {
          id: profile._id.toString(),
          businessName: profile.businessName,
          approvalStatus: profile.approvalStatus,
        };
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED_OR_INVALID',
        message: 'Provided token is invalid or expired. Please log in again.',
        fields: [],
        requestId: req.id || 'auth_req',
      },
    });
  }
}

/**
 * Restricts access to specified roles.
 * @param {string[]} allowedRoles - Array of roles permitted (e.g. ['admin', 'farmer'])
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}.`,
          fields: [],
          requestId: req.id || 'auth_req',
        },
      });
    }
    next();
  };
}

/**
 * Enforces that a farmer account has been approved by an administrator
 * before allowing product creation, stock publishing, or order processing.
 */
export function requireApprovedFarmer(req, res, next) {
  if (req.user?.role !== 'farmer') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Resource restricted to farmer accounts.',
        fields: [],
        requestId: req.id || 'auth_req',
      },
    });
  }

  if (!req.farmerProfile || req.farmerProfile.approvalStatus !== 'approved') {
    return res.status(403).json({
      error: {
        code: 'FARMER_NOT_APPROVED',
        message: 'Your farmer registration is currently pending administrator review or has been suspended. Listings and order operations are disabled.',
        fields: [],
        requestId: req.id || 'auth_req',
      },
    });
  }

  next();
}

export const authenticate = authenticateToken;
