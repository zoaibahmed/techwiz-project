import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
let role='farmer';
const id='66f100000000000000000001';
const markets=[{id:'66f000000000000000000001',name:'Lahore market',countryCode:'PK',city:'Lahore',active:true},{id:'66f000000000000000000002',name:'London market',countryCode:'GB',city:'London',active:true}];
const application={status:'in_progress',approvalStatus:'draft',stepData:{step1_account:{contactPerson:'Test Farmer',phone:'12345678'},step2_location:{countryCode:'GB',countryName:'United Kingdom',region:'England',city:'London',address:'10 Market Street'},step3_profile:{businessName:'Test Farm',bio:'Fresh local produce for market day.'}},adminNotes:''};
const ticket={id,reference:'SUP-'+id.toUpperCase(),subject:'Application question',ownerName:'Test Farmer',ownerRole:'farmer',status:'open',updatedAt:new Date().toISOString(),messages:[]};
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',async route=>{const url=new URL(route.request().url()),p=url.pathname;let data={};let status=200;
 if(p.endsWith('/auth/me'))data={id,role,name:'Test Farmer'};
 else if(p.endsWith('/catalogue'))data={markets,farmers:[],products:[],categories:[]};
 else if(p.endsWith('/workspace'))data={session:{id,role,name:'Test Farmer'},farmers:[{id,name:'Test Farm',person:'Test Farmer',state:'Pending',marketId:''}],profile:{id,name:'Test Farm',person:'Test Farmer',state:'Pending',marketId:'',marketIds:[]},orders:[],products:[]};
 else if(p.includes('/market-requests'))data=[];
 else if(p.endsWith('/admin/farmers'))data=[{id,businessName:'Test Farm',contactPerson:'Test Farmer',approvalStatus:'draft',onboardingStatus:application.status,onboarding:{stepData:application.stepData},adminNotes:'Please correct the address'}];
 else if(p.endsWith('/close')&&p.includes('/support/')){ticket.status='closed';data=ticket}
 else if(p.endsWith('/farmer/onboarding')){if(route.request().method()==='PUT'){status=400;data={error:{message:'Test validation failure'}}}else data=application}
 else if(p.endsWith('/support/tickets')&&route.request().method()==='GET')data=[ticket];
 else if(p.endsWith('/support/tickets')&&route.request().method()==='POST'){const body=route.request().postDataJSON();ticket.subject=body.subject;ticket.messages=[{id:'first',senderName:'Test Farmer',senderRole:'farmer',text:body.message,createdAt:new Date().toISOString()}];data=ticket}
 else if(p.endsWith('/messages')&&p.includes('/support/')){ticket.messages.push({id:'reply',senderName:'Test Farmer',senderRole:'farmer',text:route.request().postDataJSON().message,createdAt:new Date().toISOString()});data=ticket}
 else if(p.includes('/support/tickets/'))data=ticket;
 else if(p.endsWith('/auth/csrf-token'))data={csrfToken:'test'};
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===200?{data}:data)});
});
try{
 await page.goto('http://127.0.0.1:5174/farmer');await expect(page.getByRole('heading',{name:'Prepare your farm for market day.'})).toBeVisible();
 await expect(page.locator('a[href="/farmer/products"]')).toHaveCount(0);
 await page.getByRole('button',{name:'4. Market venues'}).click();await expect(page.getByRole('combobox',{name:'Market venue',exact:true})).toContainText('London market');await expect(page.getByRole('combobox',{name:'Market venue',exact:true})).not.toContainText('Lahore market');
 await page.getByRole('button',{name:'2. Location'}).click();await page.getByLabel('City',{exact:true}).fill('Kabul');await page.getByRole('combobox',{name:'Country',exact:true}).selectOption('AF');await page.getByRole('button',{name:'4. Market venues'}).click();await expect(page.getByRole('heading',{name:'No registered venue here yet'})).toBeVisible();
 await page.getByRole('button',{name:'1. Identity'}).click();await page.getByRole('button',{name:'Save and continue'}).click();await expect(page.getByRole('alert')).toContainText('Test validation failure');await expect(page.getByRole('heading',{name:'Identity',exact:true})).toBeVisible();
 await page.goto('http://127.0.0.1:5174/farmer/products/new');await expect(page.getByRole('heading',{name:'Prepare your farm for market day.'})).toBeVisible();
 await page.goto('http://127.0.0.1:5174/farmer/support');await page.getByRole('button',{name:'Open a ticket'}).click();await page.getByLabel('Subject',{exact:true}).fill('Need a London venue');await page.getByLabel('Your message').fill('Please help us list our local market.');await page.getByRole('button',{name:'Send ticket',exact:true}).click();await expect(page.getByText('Please help us list our local market.',{exact:true})).toBeVisible();await page.getByLabel('Reply',{exact:true}).fill('Here are further details.');await page.getByRole('button',{name:'Send reply'}).click();await expect(page.getByText('Here are further details.',{exact:true})).toBeVisible();
 await page.screenshot({path:'Client/artifacts/flow-refresh/support-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'Client/artifacts/flow-refresh/support-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 role='admin';await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5174/admin/farmers/'+id);await expect(page.getByRole('button',{name:'Approve farmer',exact:true})).toBeDisabled();await expect(page.getByText('10 Market Street',{exact:true})).toBeVisible();await page.screenshot({path:'Client/artifacts/flow-refresh/application-admin.png'});await page.goto('http://127.0.0.1:5174/admin/support');await page.getByRole('button',{name:/Need a London venue/}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Close resolved ticket'}).click();await expect(page.getByText('This ticket is closed.',{exact:false})).toBeVisible();
 role='customer';await page.goto('http://127.0.0.1:5174/customer/support');await expect(page.getByRole('heading',{name:'Your support tickets',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Review a reported customer–farmer conversation'})).toHaveCount(0);
 console.log('PASS: location filtering, no-coverage state, failed-save honesty, pending route restriction, ticket creation/reply, mobile width. API fixtures only.');expect(errors).toEqual([]);
}finally{await browser.close()}
