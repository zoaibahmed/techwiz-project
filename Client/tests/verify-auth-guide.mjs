import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();
await mkdir('artifacts/auth-guide',{recursive:true});
await page.addInitScript(()=>{localStorage.setItem('marketlink.visitor.v1',JSON.stringify({version:1,locale:'en',country:'PK',city:'Karachi',seen:true}));sessionStorage.setItem('gather-grow.preloaded','1')});
await page.route('**/api/v1/auth/me',r=>r.fulfill({status:401,json:{error:{message:'Sign in'}}}));
await page.route('**/api/v1/auth/csrf-token',r=>r.fulfill({json:{data:{csrfToken:'browser-test'}}}));
await page.route('**/api/v1/auth/register/customer',r=>r.fulfill({status:202,json:{data:{challengeId:'test-challenge',email:'test@example.test',verificationRequired:true}}}));
await page.route('**/api/v1/auth/register/verify',r=>r.fulfill({status:400,json:{error:{message:'Incorrect verification code.'}}}));
await page.goto('http://127.0.0.1:5174/login');await expect(page.getByRole('heading',{name:'Good to see you again.'})).toBeVisible();await page.screenshot({path:'artifacts/auth-guide/login-desktop.png'});
await page.goto('http://127.0.0.1:5174/register/customer');
await page.getByLabel('Full name').fill('Test Person');await page.getByLabel('Phone number').fill('123456789');await page.getByLabel('Email address').fill('test@example.test');await page.getByLabel('Address',{exact:true}).fill('Test address');await page.getByLabel('Password',{exact:true}).fill('StrongPassword1!');await page.getByLabel('Confirm password').fill('StrongPassword1!');await page.screenshot({path:'artifacts/auth-guide/register-desktop.png'});await page.getByRole('button',{name:'Send verification code'}).click();await expect(page.getByRole('heading',{name:'Check your inbox.'})).toBeVisible();await page.getByLabel('Email verification code').fill('000000');await page.getByRole('button',{name:'Verify email & continue'}).click();await expect(page.getByRole('alert')).toContainText('Incorrect verification code');await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/auth-guide/otp-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
await page.route('**/api/v1/public-guide',r=>r.fulfill({json:{data:{reply:'**Pickup made simple**\nChoose a window and pay in person.',sources:[],engine:'Public catalogue guide',readOnly:true}}}));
await page.goto('http://127.0.0.1:5174/markets');await page.getByRole('button',{name:'Ask Market Guide',exact:true}).click();await page.getByRole('button',{name:'How do pickup and payment work?'}).click();await expect(page.locator('.chat-prose strong')).toContainText('Pickup made simple');await page.screenshot({path:'artifacts/auth-guide/public-guide-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
console.log('PASS: redesigned auth, signup challenge before account, wrong-code feedback, mobile overflow and public guide formatting. Browser uses isolated API fixtures.');await browser.close();

