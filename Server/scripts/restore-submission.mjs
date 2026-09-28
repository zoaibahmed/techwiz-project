import {readFile} from 'node:fs/promises';
import {BSON} from 'mongodb';
import {connectDB,closeDB} from '../src/config/db.js';

// Configure MONGODB_DB_NAME to an EMPTY evaluation database before running this.
// Usage: node scripts/restore-submission.mjs /absolute/path/MarketLink.ejson
try {
  if(!process.argv[2]) throw new Error('Export path required');
  const payload=BSON.EJSON.parse(await readFile(process.argv[2],'utf8'));
  if(payload.format!=='MarketLink canonical EJSON v1') throw new Error('Unsupported export');
  const {db}=await connectDB();
  if(['admin','local','config'].includes(db.databaseName)) throw new Error('System database refused');
  if((await db.listCollections({}, {nameOnly:true}).toArray()).length) throw new Error('Target database must be empty');
  for(const c of payload.collections) {
    await db.createCollection(c.name);
    if(c.documents.length) await db.collection(c.name).insertMany(c.documents);
    for(const index of c.indexes) {
      if(index.name==='_id_') continue;
      const {key,v,ns,...options}=index;
      const restoredKey=key._fts==='text'
        ? Object.fromEntries([...Object.entries(key).filter(([k])=>!['_fts','_ftsx'].includes(k)),...Object.keys(options.weights||{}).map(k=>[k,'text'])])
        : key;
      await db.collection(c.name).createIndex(restoredKey,options);
    }
  }
  console.log('Database restored. Keep the export private.');
} catch(e) {console.error('Restore failed: '+e.name+'. Check that the export is valid and the configured target is empty.');process.exitCode=1;}
finally {await closeDB();}
