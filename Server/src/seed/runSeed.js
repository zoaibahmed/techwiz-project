import { connectDB, closeDB, getDB } from '../config/db.js';
import { setupDatabaseIndexes } from '../config/indexes.js';
import { env } from '../config/env.js';
import { generateSeedData } from './seedData.js';

const COLLECTIONS = [
  'users',
  'farmerProfiles',
  'markets',
  'categories',
  'products',
  'pickupWindows',
  'stockOffers',
  'orders',
  'reviews',
  'favourites',
  'restockAlerts',
  'weeklyStockTemplates',
  'notifications',
  'announcements',
  'contactInquiries',
];
const CLEARED_ONLY = ['auditLogs', 'aiActionDrafts', 'conversations', 'messages', 'supportTickets'];

/** Replace every MarketLink collection in the active database with the seed dataset. */
export async function seedDatabase(db, options = {}) {
  await setupDatabaseIndexes(db);
  const seed = await generateSeedData(options);
  for (const name of [...COLLECTIONS, ...CLEARED_ONLY]) {
    await db.collection(name).deleteMany({});
  }
  for (const name of COLLECTIONS) {
    if (seed[name]?.length) await db.collection(name).insertMany(seed[name]);
  }
  return seed;
}

export async function runSeed() {
  console.log(`--- SEEDING MARKETLINK (${env.MONGODB_DB_NAME}) ---`);
  try {
    await connectDB();
    const seed = await seedDatabase(getDB());
    for (const name of COLLECTIONS) {
      console.log(` - ${name.padEnd(22)} ${seed[name]?.length ?? 0}`);
    }
    console.log('--- SEED COMPLETE ---');
    return seed;
  } catch (err) {
    console.error('[Seed Error]:', err.message);
    throw err;
  } finally {
    await closeDB();
  }
}

// Allow direct execution from CLI
if (process.argv[1] && process.argv[1].endsWith('runSeed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
