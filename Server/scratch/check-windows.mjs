import { connectDB, closeDB } from '../src/config/db.js';

try {
  const { db } = await connectDB();
  const windows = await db.collection('pickupWindows').find({}).toArray();
  console.log('Total pickup windows in DB:', windows.length);
  console.log('Sample windows:', windows.slice(0, 4).map(w => ({
    farmerId: w.farmerId,
    marketId: w.marketId,
    date: w.date,
    startTime: w.startTime,
    endTime: w.endTime,
    cutoffAt: w.cutoffAt
  })));
  
  const offers = await db.collection('stockOffers').find({}).toArray();
  console.log('Total stock offers:', offers.length);
  const offerDates = [...new Set(offers.map(o => o.date))].sort();
  console.log('Offer dates in DB:', offerDates);
  const windowDates = [...new Set(windows.map(w => w.date))].sort();
  console.log('Window dates in DB:', windowDates);
} finally {
  await closeDB();
}
