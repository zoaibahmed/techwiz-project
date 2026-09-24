import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
const isolate=async context=>context.route('**/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":{"message":"Frontend capture; backend not connected"}}'}));
const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:'test-results/video',size:{width:1440,height:960}}});
await isolate(context);
const page=await context.newPage();
await page.goto('http://127.0.0.1:5173');
await page.getByRole('dialog').waitFor();await page.waitForTimeout(1000);
await page.getByLabel('Country or territory',{exact:true}).fill('Japan');
await page.locator('.country-item').filter({hasText:'Japan'}).click();
await page.locator('.apply-btn').click();await page.waitForTimeout(800);
await page.locator('.coverage-empty').scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
await page.locator('.coverage-actions').getByRole('button',{name:'Explore the Lahore demo'}).click();
await page.evaluate(()=>scrollTo({top:0,behavior:'smooth'}));await page.waitForTimeout(1200);
await page.locator('.global-hero').getByRole('button',{name:'Find your market',exact:true}).click();await page.waitForTimeout(1000);
await page.getByRole('button',{name:'Select Riverside Gathering',exact:true}).click();await page.waitForTimeout(650);
await page.getByRole('button',{name:'Select The Orchard Market',exact:true}).click();
await page.locator('.grower-switcher').getByRole('button',{name:'The Kitchen Garden'}).click();await page.waitForTimeout(850);
await page.locator('.bench-add').click();await page.waitForTimeout(1000);
await page.evaluate(()=>scrollTo({top:0,behavior:'smooth'}));await page.waitForTimeout(1000);
await page.locator('.hero-location').click();await page.locator('.lang-btn').filter({hasText:'اردو'}).click();await page.waitForTimeout(900);
await page.locator('.apply-btn').click();await page.waitForTimeout(1300);
await page.mouse.wheel(0,600);await page.waitForTimeout(1200);
const video=page.video();await context.close();await video.saveAs('test-results/global-walkthrough.webm');

const stills=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await isolate(stills);
const p=await stills.newPage();await p.goto('http://127.0.0.1:5173');await p.getByRole('dialog').waitFor();
await p.screenshot({path:'test-results/global-onboarding-desktop.png'});
await p.setViewportSize({width:390,height:844});await p.screenshot({path:'test-results/global-onboarding-mobile.png'});
await p.locator('.demo-switch-btn').click();
for(const [label,width] of [['desktop',1440],['mobile',390],['small-mobile',320]]){
 await p.setViewportSize({width,height:1000});
 await p.evaluate(async()=>{for(const img of document.images){img.loading='eager';await img.decode().catch(()=>{});}scrollTo(0,0);await document.fonts.ready;});
 await p.screenshot({path:`test-results/global-${label}.png`,fullPage:true});
 await p.screenshot({path:`test-results/global-${label}-viewport.png`});
 console.log(label,'overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
}
await p.locator('.hero-location').click();await p.getByLabel('Country or territory',{exact:true}).fill('Japan');await p.locator('.country-item').filter({hasText:'Japan'}).click();await p.locator('.apply-btn').click();
for(const [label,width] of [['desktop',1440],['mobile',390]]){await p.setViewportSize({width,height:1000});await p.locator('.coverage-empty').scrollIntoViewIfNeeded();await p.screenshot({path:`test-results/global-empty-${label}.png`});}
await p.evaluate(()=>scrollTo(0,0));await p.locator('.hero-location').click();await p.locator('.lang-btn').filter({hasText:'اردو'}).click();await p.locator('.apply-btn').click();await p.screenshot({path:'test-results/global-urdu-mobile.png',fullPage:true});
await stills.close();await browser.close();
