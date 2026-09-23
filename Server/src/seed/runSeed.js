import { connectDB, closeDB, getDB } from '../config/db.js';
import { setupDatabaseIndexes } from '../config/indexes.js';
import { generateSeedData } from './seedData.js';

export async function runSeed() {
  console.log('--- SEEDING MARKETLINK DEMONSTRATION DATA (LAHORE) ---');
  try {
    await connectDB();
    const db = getDB();

    // 1. Establish indexes
    await setupDatabaseIndexes(db);

    // 2. Generate seed data
    const seed = await generateSeedData();

    // 3. Clear existing development collections safely
    const collectionNames = [
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
      'notifications',
      'auditLogs',
      'aiActionDrafts',
    ];

    for (const name of collectionNames) {
      await db.collection(name).deleteMany({});
    }
    console.log('[Seed] Cleared existing development records.');

    // 4. Insert seed collections
    await db.collection('users').insertMany(seed.users);
    await db.collection('farmerProfiles').insertMany(seed.farmerProfiles);
    await db.collection('markets').insertMany(seed.markets);
    await db.collection('categories').insertMany(seed.categories);
    await db.collection('products').insertMany(seed.products);
    await db.collection('pickupWindows').insertMany(seed.pickupWindows);
    await db.collection('stockOffers').insertMany(seed.stockOffers);
    await db.collection('orders').insertMany(seed.orders);
    await db.collection('reviews').insertMany(seed.reviews);
    await db.collection('favourites').insertMany(seed.favourites);
    await db.collection('notifications').insertMany(seed.notifications);

    console.log('[Seed] Successfully populated demonstration dataset:');
    console.log(` - Users: ${seed.users.length}`);
    console.log(` - Farmer Profiles: ${seed.farmerProfiles.length}`);
    console.log(` - Markets: ${seed.markets.length}`);
    console.log(` - Categories: ${seed.categories.length}`);
    console.log(` - Products: ${seed.products.length}`);
    console.log(` - Stock Offers: ${seed.stockOffers.length}`);
    console.log(` - Orders: ${seed.orders.length}`);
    console.log(` - Reviews: ${seed.reviews.length}`);
    console.log(` - Favourites: ${seed.favourites.length}`);
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
