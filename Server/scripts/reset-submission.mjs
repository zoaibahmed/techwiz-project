import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {BSON} from 'mongodb';
import {connectDB,closeDB} from '../src/config/db.js';
import {hashPassword} from '../src/utils/token.js';
import {generateSubmissionData} from '../src/seed/submissionData.js';

const root=path.resolve(import.meta.dirname,'../..');
const allowed=['users','farmerProfiles','markets','categories','products','pickupWindows','stockOffers','orders','reviews','favourites','restockAlerts','weeklyStockTemplates','notifications','announcements','contactInquiries','auditLogs','aiActionDrafts','conversations','messages','supportTickets','pendingRegistrations'];
const serialize=value=>BSON.EJSON.stringify(value,{relaxed:false});
const digest=text=>createHash('sha256').update(text).digest('hex');

async function snapshot(db,directory,session) {
  await mkdir(directory,{recursive:true});
  const collections=[];
  for(const {name} of await db.listCollections({}, {nameOnly:true}).toArray()) {
    if(!allowed.includes(name)) throw new Error('Unexpected collection; inspect before resetting');
    collections.push({name,indexes:await db.collection(name).indexes(),documents:await db.collection(name).find({},session?{session}:{}).toArray()});
  }
  const text=serialize({format:'MarketLink canonical EJSON v1',database:db.databaseName,exportedAt:new Date(),collections});
  const file=path.join(directory,'MarketLink.ejson');
  await writeFile(file,text);
  const reread=await readFile(file,'utf8');
  assert.equal(digest(reread),digest(text));
  assert.equal(BSON.EJSON.parse(reread).collections.length,collections.length);
  await writeFile(path.join(directory,'manifest.json'),JSON.stringify({sha256:digest(text),counts:Object.fromEntries(collections.map(c=>[c.name,c.documents.length]))},null,2));
  return file;
}

try {
  if(!process.argv.includes('--replace-authorized-sample-data')) throw new Error('Explicit destructive-reset flag required');
  const {db,client}=await connectDB();
  if(['admin','local','config'].includes(db.databaseName)) throw new Error('Refusing system database');
  const admin=await db.collection('users').findOne({email:'admin@marketlink.com',role:'admin',isActive:true});
  if(!admin?.passwordHash) throw new Error('Designated active admin missing; nothing changed');
  const backupDir=path.join(root,'.submission-private',`before-reset-${new Date().toISOString().replace(/[:.]/g,'-')}`);
  // Snapshot reads use one consistent transaction. No mutation precedes verified backup.
  const session=client.startSession();
  try {
    await session.withTransaction(async()=>{await snapshot(db,backupDir,session);},{readConcern:{level:'snapshot'}});
    console.log('Rollback backup verified at '+backupDir);
    // Sample identities cannot log in with a published seed password. Use real registration for user testing.
    const farmerPasswordHash=await hashPassword(randomBytes(48).toString('base64url'));
    const data=generateSubmissionData({admin,farmerPasswordHash});
    assert.equal(data.markets.length,80);assert.equal(data.farmerProfiles.length,320);assert.equal(data.products.length,1280);
    await session.withTransaction(async()=>{
      const current=await db.collection('users').findOne({_id:admin._id},{session});
      assert.equal(serialize(current),serialize(admin),'Admin changed during preparation; abort');
      for(const name of allowed) {
        // Existing admin document is not deleted or overwritten.
        await db.collection(name).deleteMany(name==='users'?{_id:{$ne:admin._id}}:{},{session});
        const records=name==='users'?data.users.filter(u=>!u._id.equals(admin._id)):data[name];
        if(records?.length) await db.collection(name).insertMany(records,{session});
      }
    },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
    assert.equal(serialize(await db.collection('users').findOne({_id:admin._id})),serialize(admin));
    for(const [name,records] of Object.entries(data)) assert.equal(await db.collection(name).countDocuments(),records.length);
    const output=path.join(root,'Submission/MarketLink/Database File');
    const exported=await snapshot(db,output);
    await writeFile(path.join(output,'README.txt'),'Canonical MongoDB Extended JSON export with collection indexes. 10 countries, 40 cities, 80 sample markets, 320 sample growers, 1280 sample products. The existing admin account is preserved. All other old records were removed. No fabricated orders or reviews are included. Sample accounts use example.test email addresses and unavailable random passwords; use real registrations for authentication testing. City pins are illustrative, not verified market addresses.\n\nPRIVATE DATABASE FILE: contains the preserved admin password hash. Do not upload this folder or its archive to GitHub or a public web server. Restore only to a dedicated empty evaluation database using Server/scripts/restore-submission.mjs. The source package does not contain environment credentials.\n');
    console.log(JSON.stringify({exported,counts:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length])),adminPreserved:true}));
  } finally {await session.endSession();}
} catch(error) {
  console.error('Reset/export failed: '+error.name+'; inspect locally. Secrets are not logged.');
  process.exitCode=1;
} finally {await closeDB();}
