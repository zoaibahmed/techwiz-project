import {ObjectId} from 'mongodb';
import {z} from 'zod';
import {getDB} from '../config/db.js';
const text=z.string().trim().min(2).max(4000);
export const ticketSchema=z.object({subject:z.string().trim().min(4).max(140),message:text}).strict();
export const replySchema=z.object({message:text}).strict();
export function ticketAccess(ticket,user){return user.role==='admin'||String(ticket.ownerId)===user.id}
function fail(message,statusCode=404){throw Object.assign(new Error(message),{statusCode})}
export async function listTickets(user,q=''){
 const filter=user.role==='admin'?{}:{ownerId:new ObjectId(user.id)};
 if(q)filter.reference=q.trim().toUpperCase();
 return (await getDB().collection('supportTickets').find(filter,{projection:{messages:0}}).sort({updatedAt:-1}).limit(100).toArray()).map(t=>({...t,id:String(t._id),_id:undefined,ownerId:undefined}));
}
export async function getTicket(user,id){
 if(!ObjectId.isValid(id))fail('Ticket not found.');
 const t=await getDB().collection('supportTickets').findOne({_id:new ObjectId(id)});
 if(!t||!ticketAccess(t,user))fail('Ticket not found.');
 return {...t,id:String(t._id),_id:undefined,ownerId:undefined};
}
export async function createTicket(user,input){
 const data=ticketSchema.parse(input),db=getDB();
 if(await db.collection('supportTickets').countDocuments({ownerId:new ObjectId(user.id),createdAt:{$gte:new Date(Date.now()-3600000)}})>=5)fail('Please wait before opening another ticket.',429);
 const id=new ObjectId(),now=new Date();
 await db.collection('supportTickets').insertOne({_id:id,reference:'SUP-'+id.toHexString().toUpperCase(),ownerId:new ObjectId(user.id),ownerName:user.name,ownerRole:user.role,subject:data.subject,status:'open',createdAt:now,updatedAt:now,messages:[{id:new ObjectId().toString(),senderName:user.name,senderRole:user.role,text:data.message,createdAt:now}]});
 return getTicket(user,id.toString());
}
export async function replyTicket(user,id,input){
 const data=replySchema.parse(input);await getTicket(user,id);
 const result=await getDB().collection('supportTickets').updateOne({_id:new ObjectId(id),status:'open','messages.499':{$exists:false}},{$push:{messages:{id:new ObjectId().toString(),senderName:user.name,senderRole:user.role,text:data.message,createdAt:new Date()}},$set:{updatedAt:new Date()}});
 if(!result.modifiedCount)fail('This ticket is closed or has reached its message limit. Open a new ticket if needed.',409);
 return getTicket(user,id);
}
export async function closeTicket(user,id){
 if(user.role!=='admin')fail('Only administrators can close tickets.',403);
 await getTicket(user,id);await getDB().collection('supportTickets').updateOne({_id:new ObjectId(id)},{$set:{status:'closed',closedAt:new Date(),closedBy:new ObjectId(user.id),updatedAt:new Date()}});
 return getTicket(user,id);
}
export async function inspectConversation(user, id) {
  if (user.role !== 'admin') fail('Administrator access required.', 403);
  if (!ObjectId.isValid(id)) fail('Enter a valid conversation ID.', 400);
  const db = getDB();
  const c = await db.collection('conversations').findOne({ _id: new ObjectId(id) });
  if (!c) fail('Conversation not found.');
  const messages = await db.collection('messages').find({ conversationId: c._id }).sort({ createdAt: 1 }).limit(500).toArray();
  await db.collection('auditLogs').insertOne({ actorId: new ObjectId(user.id), actorRole: 'admin', action: 'SUPPORT_CONVERSATION_VIEW', targetId: c._id, createdAt: new Date() });
  return {
    id,
    readOnly: true,
    conversation: {
      id: String(c._id),
      customerName: c.customerName || 'Customer',
      customerEmail: c.customerEmail || '',
      farmerBusinessName: c.farmerBusinessName || 'Grower Stall',
      farmerContactPerson: c.farmerContactPerson || '',
      relatedProductName: c.relatedProductName || '',
      relatedOrderNumber: c.relatedOrderNumber || '',
      status: c.status || 'active',
      createdAt: c.createdAt,
    },
    messages: messages.map((m) => ({
      id: String(m._id),
      senderId: m.senderId ? String(m.senderId) : '',
      senderName: m.senderName || (m.senderRole === 'customer' ? (c.customerName || 'Customer') : (c.farmerBusinessName || 'Grower')),
      senderRole: m.senderRole || 'user',
      text: m.body || m.text || m.message || '',
      body: m.body || m.text || m.message || '',
      createdAt: m.createdAt,
      readAt: m.readAt,
    })),
  };
}
