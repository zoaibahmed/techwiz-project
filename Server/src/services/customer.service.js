import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

export async function getCustomerPreferencesService(customerId) {
  const db = getDB();
  const cId = new ObjectId(customerId);

  const customer = await db.collection('users').findOne({ _id: cId });
  if (!customer) {
    const err = new Error('Customer not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  let preferredMarket = null;
  if (customer.preferences?.preferredMarketId) {
    const market = await db.collection('markets').findOne({ _id: new ObjectId(customer.preferences.preferredMarketId) });
    if (market) {
      preferredMarket = {
        id: market._id.toString(),
        name: market.name,
        address: market.address,
      };
    }
  }

  return {
    preferredMarketId: customer.preferences?.preferredMarketId || null,
    preferredMarket,
    dietaryPreferences: customer.preferences?.dietaryPreferences || [],
    defaultPickupNotes: customer.preferences?.defaultPickupNotes || '',
    phone: customer.phone || '',
  };
}

export async function updateCustomerPreferencesService(customerId, preferencesData) {
  const db = getDB();
  const cId = new ObjectId(customerId);

  const updateFields = {
    updatedAt: new Date(),
  };

  if (preferencesData.phone !== undefined) {
    updateFields.phone = preferencesData.phone;
  }

  if (preferencesData.preferredMarketId !== undefined) {
    updateFields['preferences.preferredMarketId'] = preferencesData.preferredMarketId;
  }
  if (preferencesData.dietaryPreferences !== undefined) {
    updateFields['preferences.dietaryPreferences'] = preferencesData.dietaryPreferences;
  }
  if (preferencesData.defaultPickupNotes !== undefined) {
    updateFields['preferences.defaultPickupNotes'] = preferencesData.defaultPickupNotes;
  }

  await db.collection('users').updateOne(
    { _id: cId },
    { $set: updateFields }
  );

  return getCustomerPreferencesService(customerId);
}

export async function getCustomerProfileService(customerId) {
  const db = getDB();
  const cId = new ObjectId(customerId);

  const customer = await db.collection('users').findOne({ _id: cId });
  if (!customer) {
    const err = new Error('Customer not found.');
    err.code = 'NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const prefs = await getCustomerPreferencesService(customerId);

  return {
    id: customer._id.toString(),
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    name: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
    email: customer.email,
    phone: customer.phone || '',
    role: customer.role,
    preferences: prefs,
    createdAt: customer.createdAt instanceof Date ? customer.createdAt.toISOString() : customer.createdAt,
    updatedAt: customer.updatedAt instanceof Date ? customer.updatedAt.toISOString() : customer.updatedAt,
  };
}

export async function updateCustomerProfileService(customerId, data) {
  const db = getDB();
  const cId = new ObjectId(customerId);

  const updateFields = {
    updatedAt: new Date(),
  };

  if (data.firstName !== undefined) updateFields.firstName = data.firstName;
  if (data.lastName !== undefined) updateFields.lastName = data.lastName;
  if (data.name !== undefined) updateFields.name = data.name;
  if (data.phone !== undefined) updateFields.phone = data.phone;

  if (data.preferredMarketId !== undefined) {
    updateFields['preferences.preferredMarketId'] = data.preferredMarketId;
  }
  if (data.dietaryPreferences !== undefined) {
    updateFields['preferences.dietaryPreferences'] = data.dietaryPreferences;
  }
  if (data.defaultPickupNotes !== undefined) {
    updateFields['preferences.defaultPickupNotes'] = data.defaultPickupNotes;
  }

  await db.collection('users').updateOne({ _id: cId }, { $set: updateFields });
  return getCustomerProfileService(customerId);
}

