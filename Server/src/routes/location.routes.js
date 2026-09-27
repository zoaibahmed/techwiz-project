import {Router} from 'express';
import {authenticateToken} from '../middleware/auth.js';
const router=Router();
const cache=new Map();let nextRequest=0;
router.get('/locations/search',authenticateToken,async(req,res,next)=>{
 try{
 const q=String(req.query.q||'').trim(),country=String(req.query.country||'').toLowerCase();
 if(q.length<3||q.length>200|| (country&&!/^[a-z]{2}$/.test(country)))return res.status(400).json({error:{message:'Enter a valid address and country.'}});
 const key=q.toLowerCase()+'|'+country,entry=cache.get(key);
 if(entry&&entry.until>Date.now())return res.json({data:entry.data});
 if(Date.now()<nextRequest)return res.status(429).json({error:{message:'Please wait a moment before searching again.'}});
 nextRequest=Date.now()+1100;
 const params=new URLSearchParams({q,format:'jsonv2',limit:'5',...(country?{countrycodes:country}:{})});
 const response=await fetch('https://nominatim.openstreetmap.org/search?'+params,{headers:{'User-Agent':'MarketLink/1.0 (farmers-market location picker)'},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Map search unavailable');
 const rows=await response.json();const data=rows.map(r=>({label:r.display_name,latitude:Number(r.lat),longitude:Number(r.lon)}));
 if(cache.size>500)cache.clear();cache.set(key,{data,until:Date.now()+86400000});res.json({data});
 }catch{next(Object.assign(new Error('Address search is unavailable. Select a location on the map.'),{statusCode:503}))}
});
export default router;
