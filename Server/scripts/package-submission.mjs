// Builds an offline source package. Database exports and credentials are deliberately separate.
import {execFileSync} from 'node:child_process';
import {mkdir,copyFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const destination=path.join(root,'Submission/MarketLink/Project Folder');
const candidates=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
let count=0;
for(const relative of new Set(candidates)){
 if(!/^(Client\/|Server\/|README(?:_START_HERE)?\.md$|\.gitignore$)/.test(relative))continue;
 if(/(^|\/)(node_modules|dist|artifacts|test-results|playwright-report|\.git|word-assets|uploads)(\/|$)/.test(relative))continue;
 if(/(^|\/)(\.env(?:\..*)?|atlas-credentials\.env)$/.test(relative)&&!relative.endsWith('.env.example'))continue;
 if(/(~\$|\.log$|\.tsbuildinfo$|backup|dump|credentials)/i.test(relative))continue;
 const source=path.join(root,relative),target=path.join(destination,relative);
 if(!(await stat(source)).isFile())continue;
 await mkdir(path.dirname(target),{recursive:true});await copyFile(source,target);count++;
}
await writeFile(path.join(destination,'SUBMISSION-SETUP.txt'),'Install Client and Server dependencies separately using npm ci. Configure server environment privately using Server/.env.example. Start Server with npm run dev, then Client with npm run dev. No environment secrets or node_modules are included in this source folder. The separate Database File folder contains a private canonical EJSON export. To restore, configure a dedicated empty evaluation database and run node scripts/restore-submission.mjs with the absolute export path from Server. Never run the legacy npm run seed on the submission database. The prepared dataset has 10 countries, 40 cities, 80 sample markets, 320 sample growers and 1280 sample products. Sample prices and location pins are illustrative, not verified real listings. Admin access is preserved; use a real registered email to test customer/farmer authentication. Do not publish the database export or submission archive.\n');
console.log(JSON.stringify({sourceFiles:count,output:destination}));
