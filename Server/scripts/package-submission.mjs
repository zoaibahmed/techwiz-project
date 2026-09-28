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
await writeFile(path.join(destination,'SUBMISSION-SETUP.txt'),'Install Client and Server dependencies separately using npm ci. Configure server environment privately using Server/.env.example. Start Server with npm run dev, then Client with npm run dev. No environment secrets, node_modules or database exports are included in this source folder. Database export and final seed counts are pending until the requested reset is completed.\n');
console.log(JSON.stringify({sourceFiles:count,output:destination}));
