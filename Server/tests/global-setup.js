// Seeds the isolated test database once before the suite runs.
export default async function setup() {
  process.env.MONGODB_DB_NAME = 'techwiz_db_test';
  const { connectDB, closeDB, getDB } = await import('../src/config/db.js');
  const { seedDatabase } = await import('../src/seed/runSeed.js');
  await connectDB();
  try {
    await seedDatabase(getDB());
  } finally {
    await closeDB();
  }
}
