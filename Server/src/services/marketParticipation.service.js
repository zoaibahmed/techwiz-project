import {ObjectId} from 'mongodb';
import {getDB} from '../config/db.js';
const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode})};
const oid=id=>{if(!ObjectId.isValid(id))fail('Invalid record ID.');return new ObjectId(id)};
export async function marketRequests(profileId){
 const profile=await getDB().collection('farmerProfiles').findOne({_id:oid(profileId)});
 if(!profile)fail('Farmer not found.',404);
 return Object.entries(profile.marketRequests||{}).map(([marketId,r])=>({marketId,...r}));
}
export async function requestMarket(profileId,marketId){
 const db=getDB(),id=oid(marketId),pid=oid(profileId);
 const profile=await db.collection('farmerProfiles').findOne({_id:pid,approvalStatus:'approved'});
 if(!profile)fail('An approved farmer account is required.',403);
 const market=await db.collection('markets').findOne({_id:id,isActive:true});
 if(!market)fail('This venue is unavailable.',404);
 if(market.countryCode!==profile.countryCode||market.city?.trim().toLowerCase()!==profile.city?.trim().toLowerCase())fail('Choose a venue in your registered country and city. Contact support to change your operating location.');
 const key=`marketRequests.${id}`;
 const result=await db.collection('farmerProfiles').updateOne({_id:pid,approvalStatus:'approved',marketIds:{$ne:id},[`${key}.status`]:{$ne:'pending'}},{$set:{[key]:{status:'pending',marketName:market.name,requestedAt:new Date(),reason:''},updatedAt:new Date()}});
 if(!result.matchedCount)fail('You already joined this venue or have a pending request.',409);
 return marketRequests(profileId);
}
export async function decideMarket(profileId,marketId,status,reason,adminId){
 if(!['approved','rejected'].includes(status))fail('Choose approve or reject.');
 if(status==='rejected'&&(!reason?.trim()||reason.length>500))fail('Provide a rejection reason (up to 500 characters).');
 const db=getDB(),pid=oid(profileId),mid=oid(marketId),key=`marketRequests.${mid}`;
 if(status==='approved'&&!await db.collection('markets').findOne({_id:mid,isActive:true}))fail('The venue is no longer active.');
 const update={$set:{[`${key}.status`]:status,[`${key}.reason`]:status==='rejected'?reason.trim():'',[`${key}.decidedAt`]:new Date(),[`${key}.decidedBy`]:oid(adminId),updatedAt:new Date()}};
 if(status==='approved')update.$addToSet={marketIds:mid};
 const result=await db.collection('farmerProfiles').updateOne({_id:pid,approvalStatus:'approved',[`${key}.status`]:'pending'},update);
 if(!result.matchedCount)fail('Request changed or farmer is no longer approved. Refresh the page.',409);
 return marketRequests(profileId);
}
