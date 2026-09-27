import {chromium} from '@playwright/test';
const b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage({viewport:{width:1440,height:1000}});
await p.addInitScript(()=>{localStorage.setItem('marketlink.visitor.v1',JSON.stringify({version:1,locale:'en',country:'PK',city:'Lahore',seen:true}));sessionStorage.setItem('gather-grow.preloaded','1')});await p.goto('http://127.0.0.1:5174/farmers/66f100000000000000000002');await p.waitForTimeout(4000);console.log((await p.locator('body').innerText()).slice(0,1800));await p.screenshot({path:'artifacts/reviews-page.png'});await p.locator('#reviews').scrollIntoViewIfNeeded();await p.waitForTimeout(1800);
console.log(await p.locator('.sr').evaluate(el=>({height:el.clientHeight,children:[...el.children].map(x=>({cls:x.className,rect:x.getBoundingClientRect().toJSON()})),headers:[...el.querySelectorAll('header')].slice(0,2).map(x=>({pos:getComputedStyle(x).position,top:getComputedStyle(x).top})),cards:[...el.querySelectorAll('.sr-card')].slice(0,2).map(x=>({clip:getComputedStyle(x).clipPath,text:x.innerText}))})));
await p.screenshot({path:'artifacts/reviews-before.png'});await b.close();


