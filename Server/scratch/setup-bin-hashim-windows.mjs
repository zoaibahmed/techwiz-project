import { connectDB, closeDB } from '../src/config/db.js';
import { ObjectId } from 'mongodb';

try {
  const { db } = await connectDB();
  const farmer = await db.collection('farmerProfiles').findOne({ businessName: /Bin Hashim/i });
  if (!farmer) throw new Error('Farmer Bin Hashim not found');

  const marketId = farmer.marketIds?.[0] || new ObjectId('66f200000000000000000007'); // Clifton Seaside Market

  // 1. Add Pickup Windows for Bin Hashim
  const windowsToAdd = [
    // Today (2026-09-27) evening/test window
    {
      farmerId: farmer._id,
      marketId,
      date: '2026-09-27',
      startTime: '08:00',
      endTime: '23:59',
      cutoffAt: new Date('2026-09-27T23:59:00.000Z'),
      maxCapacity: 50,
      currentReservations: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Tomorrow (2026-09-28)
    {
      farmerId: farmer._id,
      marketId,
      date: '2026-09-28',
      startTime: '08:00',
      endTime: '10:00',
      cutoffAt: new Date('2026-09-28T07:00:00.000Z'),
      maxCapacity: 50,
      currentReservations: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Next Saturday (2026-10-03)
    {
      farmerId: farmer._id,
      marketId,
      date: '2026-10-03',
      startTime: '08:00',
      endTime: '09:30',
      cutoffAt: new Date('2026-10-03T01:00:00.000Z'),
      maxCapacity: 50,
      currentReservations: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      farmerId: farmer._id,
      marketId,
      date: '2026-10-03',
      startTime: '09:30',
      endTime: '11:30',
      cutoffAt: new Date('2026-10-03T01:00:00.000Z'),
      maxCapacity: 50,
      currentReservations: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Next Sunday (2026-10-04)
    {
      farmerId: farmer._id,
      marketId,
      date: '2026-10-04',
      startTime: '08:00',
      endTime: '11:00',
      cutoffAt: new Date('2026-10-04T01:00:00.000Z'),
      maxCapacity: 50,
      currentReservations: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Remove existing and insert fresh
  await db.collection('pickupWindows').deleteMany({ farmerId: farmer._id });
  const inserted = await db.collection('pickupWindows').insertMany(windowsToAdd);
  console.log(`Inserted ${inserted.insertedCount} pickup windows for Bin Hashim.`);

  // 2. Make all stock offers for Bin Hashim 'available'
  const updateOffers = await db.collection('stockOffers').updateMany(
    { farmerId: farmer._id },
    { $set: { status: 'available', updatedAt: new Date() } }
  );
  console.log(`Updated ${updateOffers.modifiedCount} stock offers to 'available'.`);

  // 3. For every product, also ensure there is a stock offer for 2026-10-03
  const prods = await db.collection('products').find({ farmerId: farmer._id, isArchived: { $ne: true } }).toArray();
  for (const prod of prods) {
    const existingOfferNext = await db.collection('stockOffers').findOne({
      productId: prod._id,
      date: '2026-10-03'
    });
    if (!existingOfferNext) {
      await db.collection('stockOffers').insertOne({
        productId: prod._id,
        farmerId: farmer._id,
        marketId,
        date: '2026-10-03',
        totalQuantity: 50,
        reservedQuantity: 0,
        availableQuantity: 50,
        priceMinor: prod.basePriceMinor || 25000,
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Created next Saturday stock offer for ${prod.name}`);
    }
  }

  console.log('Setup completed successfully!');
} finally {
  await closeDB();
}
