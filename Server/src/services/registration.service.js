import {randomInt,randomUUID,createHash} from 'node:crypto';
import {getDB} from '../config/db.js';
import {hashPassword} from '../utils/token.js';
import {sendRegistrationOtpEmail} from './email.service.js';
import {registerCustomerService,registerFarmerService} from './auth.service.js';
const digest=value=>createHash('sha256').update(value).digest('hex');
const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode})};
export async function beginRegistration(data,role){
 const db=getDB();
 if(await db.collection('users').findOne({email:data.email}))fail('This email is already registered. Sign in instead.',409);
 const pending=db.collection('pendingRegistrations');
 if(await pending.findOne({'data.email':data.email,sentAt:{$gt:new Date(Date.now()-60000)}}))fail('Wait a minute before requesting another verification code.',429);
 await pending.createIndex({expiresAt:1},{expireAfterSeconds:0});
 const challengeId=randomUUID(),code=String(randomInt(100000,1000000));
 const {password,...safe}=data;
 const record={_id:challengeId,role,data:safe,passwordHash:await hashPassword(password),codeHash:digest(code),attempts:0,sentAt:new Date(),expiresAt:new Date(Date.now()+600000)};
 await pending.insertOne(record);
 try{await sendRegistrationOtpEmail(data.email,code,data.name)}catch(e){await pending.deleteOne({_id:challengeId});throw e}
 return {challengeId,email:data.email,verificationRequired:true};
}
export async function finishRegistration(challengeId,code){
 if(typeof challengeId!=='string'||typeof code!=='string'||!/^\d{6}$/.test(code))fail('Enter your six-digit email code.');
 const pending=getDB().collection('pendingRegistrations');
 const record=await pending.findOne({_id:challengeId});
 if(!record||record.expiresAt<=new Date())fail('The verification code expired. Please register again.');
 if(record.attempts>=5)fail('Too many incorrect codes. Please register again.',429);
 if(record.codeHash!==digest(code)){await pending.updateOne({_id:challengeId},{$inc:{attempts:1}});fail('Incorrect verification code.');}
 const claimed=await pending.findOneAndDelete({_id:challengeId,codeHash:digest(code),attempts:{$lt:5},expiresAt:{$gt:new Date()}});
 if(!claimed)fail('This code was already used or expired.',409);
 const result=await (claimed.role==='farmer'?registerFarmerService:registerCustomerService)(claimed.data,claimed.passwordHash);
 await getDB().collection('users').updateOne({email:claimed.data.email},{$set:{emailVerifiedAt:new Date()}});
 return result;
}
