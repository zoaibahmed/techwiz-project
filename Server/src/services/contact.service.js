import nodemailer from 'nodemailer';
import { z } from 'zod';
export const contactSchema = z.object({name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(254),subject:z.string().trim().min(3).max(120),message:z.string().trim().min(10).max(5000),website:z.string().max(200).optional()}).strict();
export async function deliverContact(input, options={}) {
 const data=contactSchema.parse(input);
 if(data.website) return {accepted:true,autoReplySent:false};
 const env=options.env??process.env;
 const user=env.SMTP_USER, pass=env.SMTP_APP_PASSWORD;
 const admin=env.CONTACT_ADMIN_EMAIL||user;
 if(!user||!pass||!admin) throw Object.assign(new Error('Contact email is not configured yet. Please try again later.'),{statusCode:503,code:'CONTACT_UNAVAILABLE'});
 const transport=options.transport??nodemailer.createTransport({host:env.SMTP_HOST||'smtp.gmail.com',port:Number(env.SMTP_PORT||465),secure:env.SMTP_SECURE!=='false',auth:{user,pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
 const from={name:'MarketLink',address:user};
 try {
  const result=await transport.sendMail({from,to:admin,replyTo:{name:data.name,address:data.email},subject:`Website enquiry: ${data.subject.replace(/[\r\n]/g,' ')}`,text:`Name: ${data.name}\nEmail: ${data.email}\nSubject: ${data.subject}\n\n${data.message}`});
  if(!result.accepted?.length)throw new Error('Not accepted');
 } catch {throw Object.assign(new Error('Your message could not be sent. Please try again later.'),{statusCode:502,code:'CONTACT_DELIVERY_FAILED'})}
 let autoReplySent=false;
 try {
  const result=await transport.sendMail({from,to:data.email,replyTo:admin,subject:'We received your message — MarketLink',text:`Hello ${data.name},\n\nThank you for contacting MarketLink. Your message has reached our team. We will review it and get back to you as soon as we can.\n\nFor pickup or order details, you can also check your account.\n\nThe MarketLink team`});
  autoReplySent=!!result.accepted?.length;
 }catch{/* Admin message is already accepted. Do not invite duplicate submissions. */}
 return {accepted:true,autoReplySent};
}
