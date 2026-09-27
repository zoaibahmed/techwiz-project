import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const id='66f100000000000000000001',mid='66f000000000000000000001';let role='farmer',rows=[];
await p.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;let data={};
if(path.endsWith('/auth/me'))data={id,role,name:'Workflow test'};
else if(path.endsWith('/catalogue'))data={markets:[{id:mid,name:'London Saturday Market',countryCode:'GB',city:'London',address:'10 Market Square',active:true,day:'2026-10-03',hours:'09:00–13:00'}],farmers:[],products:[],categories:[]};
else if(path.endsWith('/workspace'))data={session:{id,role,name:'Workflow test'},profile:{id,name:'Test farm',state:'Approved',marketId:'',marketIds:[]},farmers:[{id,name:'Test farm',state:'Approved',marketId:'',marketIds:[]}],orders:[],products:[]};
else if(path.endsWith('/farmer/profile'))data={id,businessName:'Test farm',city:'London',countryCode:'GB',countryName:'United Kingdom',marketIds:[]};
else if(path.endsWith('/admin/farmers'))data=[{id,businessName:'Test farm',approvalStatus:'approved',onboardingStatus:'approved',onboarding:{stepData:{}}}];
else if(path.includes('/market-requests')){if(r.request().method()==='POST')rows=[{marketId:mid,marketName:'London Saturday Market',status:'pending',reason:''}];if(r.request().method()==='PATCH')rows=rows.map(x=>({...x,...r.request().postDataJSON()}));data=rows;}
else if(path.endsWith('/auth/csrf-token'))data={csrfToken:'test'};
await r.fulfill({json:{data}})});
try{
await p.goto('http://127.0.0.1:5174/farmer/markets');await expect(p.getByRole('heading',{name:'Your markets & pickup venues'})).toBeVisible();await p.getByRole('button',{name:'Request to join'}).click();await expect(p.getByRole('button',{name:'Awaiting review'})).toBeDisabled();await mkdir('artifacts/dashboard-polish',{recursive:true});await p.screenshot({path:'artifacts/dashboard-polish/farmer-markets-desktop.png'});await p.setViewportSize({width:390,height:844});expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await p.screenshot({path:'artifacts/dashboard-polish/farmer-markets-mobile.png'});
role='admin';await p.setViewportSize({width:1440,height:1000});await p.goto('http://127.0.0.1:5174/admin/farmers/'+id);await expect(p.getByRole('heading',{name:'Market participation requests'})).toBeVisible();await p.getByRole('button',{name:'Return request'}).click();await expect(p.getByText('Explain why this venue request is being returned.')).toBeVisible();p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Approve venue'}).click();await expect(p.getByRole('button',{name:'Approve venue'})).toHaveCount(0);await p.goto('http://127.0.0.1:5174/login');await expect(p.getByText('Evaluator accounts')).toHaveCount(0);console.log('PASS: venue requests, admin approval/rejection validation, mobile layout and demo login removed. API fixtures.');
}finally{await b.close()}
