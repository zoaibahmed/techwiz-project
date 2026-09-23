/**
 * MongoDB Index Configuration for MarketLink
 * Ensures data integrity, uniqueness constraints, and high-performance querying.
 */
export async function setupDatabaseIndexes(db) {
  try {
    // 1. Users
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ isActive: 1 });

    // 2. Farmer Profiles
    await db.collection('farmerProfiles').createIndex({ userId: 1 }, { unique: true });
    await db.collection('farmerProfiles').createIndex({ approvalStatus: 1 });
    await db.collection('farmerProfiles').createIndex({ stallCoordinates: '2dsphere' }, { sparse: true });

    // 3. Markets
    await db.collection('markets').createIndex({ name: 1 });
    await db.collection('markets').createIndex({ coordinates: '2dsphere' }, { sparse: true });
    await db.collection('markets').createIndex({ operatingDays: 1 });

    // 4. Categories
    await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
    await db.collection('categories').createIndex({ name: 1 }, { unique: true });

    // 5. Products
    await db.collection('products').createIndex({ farmerId: 1 });
    await db.collection('products').createIndex({ categoryId: 1 });
    await db.collection('products').createIndex({ name: 'text', description: 'text' });

    // 6. Stock Offers (Dated Inventory)
    await db.collection('stockOffers').createIndex(
      { farmerId: 1, marketId: 1, productId: 1, date: 1 },
      { unique: true }
    );
    await db.collection('stockOffers').createIndex({ marketId: 1, date: 1, status: 1 });
    await db.collection('stockOffers').createIndex({ productId: 1 });

    // 7. Pickup Windows
    await db.collection('pickupWindows').createIndex({ farmerId: 1, marketId: 1, date: 1 });
    await db.collection('pickupWindows').createIndex({ cutoffAt: 1 });

    // 8. Orders
    await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection('orders').createIndex({ customerId: 1, createdAt: -1 });
    await db.collection('orders').createIndex({ farmerId: 1, status: 1 });
    await db.collection('orders').createIndex({ checkoutGroupId: 1 });
    await db.collection('orders').createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });

    // 9. Reviews (Allow reviewing farmer and each distinct product in a completed order)
    try {
      await db.collection('reviews').dropIndex('orderId_1');
    } catch (_) {}
    await db.collection('reviews').createIndex(
      { orderId: 1, customerId: 1, targetType: 1, targetId: 1 },
      { unique: true }
    );
    await db.collection('reviews').createIndex({ farmerId: 1, moderationStatus: 1 });
    await db.collection('reviews').createIndex({ targetId: 1, moderationStatus: 1 });

    // 10. Favourites
    await db.collection('favourites').createIndex(
      { customerId: 1, targetType: 1, targetId: 1 },
      { unique: true }
    );

    // 11. Notifications
    await db.collection('notifications').createIndex({ userId: 1, isRead: 1, createdAt: -1 });

    // 12. AI Action Drafts (TTL Index)
    await db.collection('aiActionDrafts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    console.log('[Database] Indexes verified and established.');
    return true;
  } catch (err) {
    console.error('[Database Index Error]:', err.message);
    throw err;
  }
}
