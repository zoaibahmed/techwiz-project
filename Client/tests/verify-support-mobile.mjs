import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const b=await chromium.launch({channel:'msedge',headless:true});await mkdir('artifacts/support-mobile',{recursive:true});
for(const role of ['customer','farmer','admin']){
const p=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});const id='66f100000000000000000001';
await p.addInitScript(()=>{localStorage.setItem('marketlink.visitor.v1',JSON.stringify({version:1,locale:'en',country:'PK',city:'Lahore',seen:true}));sessionStorage.setItem('gather-grow.preloaded','1')});
await p.route('**/api/v1/auth/me',r=>r.fulfill({json:{data:{user:{id,role,name:'Browser test'}}}}));
await p.route('**/api/v1/workspace**',r=>r.fulfill({json:{data:{session:{id,role,name:'Browser test'},profile:{id,state:'Approved',approvalStatus:'approved',name:'Test farm',marketIds:[]},farmers:[{id,state:'Approved',name:'Test farm',marketIds:[]}],orders:[],products:[]}}}));
const ticket={id:'test-ticket',reference:'SUP-TEST',subject:'Pickup help',status:'open',ownerName:'Test shopper',ownerRole:'customer',updatedAt:'2026-09-28T10:00:00Z',messages:[{id:'m1',senderRole:'customer',senderName:'Test shopper',text:'Please help me with my pickup.',createdAt:'2026-09-28T10:00:00Z'}]};
await p.route('**/api/v1/support/tickets**',r=>r.fulfill({json:{data:r.request().url().includes('test-ticket')?ticket:[ticket]}}));
await p.goto('http://127.0.0.1:5174/'+role+'/support');await expect(p.locator('.support-ticket')).toBeVisible();await p.locator('.support-ticket').click();await expect(p.getByText('Please help me with my pickup.')).toBeVisible();expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await p.screenshot({path:`artifacts/support-mobile/${role}-thread.png`});await p.locator('.support-back').click();await expect(p.locator('.support-ticket')).toBeVisible();await p.getByRole('button',{name:'Open navigation',exact:true}).click();await expect(p.locator('.mobile-drawer-sidebar')).toHaveClass(/open/);await p.screenshot({path:`artifacts/support-mobile/${role}-menu.png`});await p.keyboard.press('Escape');await expect(p.locator('.mobile-drawer-sidebar')).not.toHaveClass(/open/);
if(role==='customer'){await p.setViewportSize({width:1440,height:900});const rail=p.locator('.customer-rail');await expect(rail).toBeVisible();const before=await rail.boundingBox();await p.locator('.customer-main').evaluate(e=>e.scrollTop=300);expect((await rail.boundingBox()).y).toBe(before.y);await expect(rail.getByRole('button',{name:'Sign out'})).toBeVisible()}
await p.close();console.log(role+' mobile support, menu and overflow passed');}
await b.close();

