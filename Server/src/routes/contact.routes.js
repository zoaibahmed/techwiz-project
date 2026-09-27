import { Router } from 'express';
import { deliverContact } from '../services/contact.service.js';
export const contactRouter=Router();
const requests=new Map();
contactRouter.post('/contact',async(req,res,next)=>{
 const now=Date.now();
 for(const [key,value] of requests)if(value.until<=now)requests.delete(key);
 const key=req.ip;
 const bucket=requests.get(key)??{count:0,until:now+15*60*1000};
 if(bucket.count>=5||requests.size>=10000){res.set('Retry-After','900');return res.status(429).json({error:{code:'CONTACT_RATE_LIMIT',message:'Too many messages. Please try again in 15 minutes.'}})}
 bucket.count++;requests.set(key,bucket);
 try{const data=await deliverContact(req.body);res.status(200).json({data})}catch(error){next(error)}
});
