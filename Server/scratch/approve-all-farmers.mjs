import { connectDB, getDB } from '../src/config/db.js';
import { ObjectId } from 'mongodb';

await connectDB();
const db = getDB();

await db.collection('farmerProfiles').updateMany(
  { approvalStatus: 'pending' },
  { $set: { approvalStatus: 'approved', marketIds: [new ObjectId('66f200000000000000000001')] } }
);

const farmers = await db.collection('farmerProfiles').find().toArray();
console.log('Total farmers in DB:', farmers.length);
for (const f of farmers) {
  console.log(`- ${f.businessName} (status: ${f.approvalStatus}, markets: ${f.marketIds?.length || 0})`);
}

process.exit(0);
