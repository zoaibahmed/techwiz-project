import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.addInitScript(()=>{localStorage.setItem('marketlink.visitor.v1',JSON.stringify({version:1,locale:'en',country:'PK',city:'Lahore',day:'2026-10-03',seen:true}));sessionStorage.setItem('gather-grow.preloaded','1')});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('Client/artifacts/flow-refresh',{recursive:true});
for(const route of ['/','/products','/markets','/contact']){await page.goto('http://127.0.0.1:5174'+route);await page.waitForTimeout(4500);await page.screenshot({path:'Client/artifacts/flow-refresh/'+(route==='/'?'home':route.slice(1))+'-desktop.png',fullPage:false});console.log(route,await page.locator('h1').first().textContent(),await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));}
await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5174/');await page.waitForTimeout(4500);await page.screenshot({path:'Client/artifacts/flow-refresh/home-mobile.png'});
console.log('errors',errors);await browser.close();
