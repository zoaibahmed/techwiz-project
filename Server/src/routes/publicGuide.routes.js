import {Router} from 'express';
import {z} from 'zod';
import {publicGuide} from '../services/ai/publicGuide.service.js';
const router=Router(),limits=new Map();
const schema=z.object({
  message:z.string().trim().min(2).max(1500),
  country:z.string().regex(/^[A-Z]{2}$/).or(z.literal('')).optional(),
  city:z.string().max(100).optional(),
  history:z.array(z.object({question:z.string(),reply:z.string()})).max(50).optional(),
}).strict();
router.post('/public-guide',async(req,res,next)=>{try{
 const now=Date.now();for(const [key,value] of limits)if(value.until<now)limits.delete(key);
 const key=req.ip,entry=limits.get(key)||{count:0,until:now+60000};
 if(entry.count>=20||limits.size>=10000&&!limits.has(key))return res.status(429).json({error:{message:'Please wait a minute before asking again.'}});
 entry.count++;limits.set(key,entry);const {message,...context}=schema.parse(req.body);
 res.json({data:await publicGuide(message,context)});
}catch(e){next(e)}});
export default router;
