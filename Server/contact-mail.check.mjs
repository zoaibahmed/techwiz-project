import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverContact} from './src/services/contact.service.js';
const input={name:'Test Visitor',email:'visitor@example.com',subject:'Pickup question',message:'Please help with my pickup.',website:''};
const env={SMTP_USER:'sender@example.com',SMTP_APP_PASSWORD:'test-only',CONTACT_ADMIN_EMAIL:'admin@example.com'};
test('rejects invalid input before sending',async()=>{await assert.rejects(deliverContact({...input,email:'bad'},{env,transport:{sendMail(){assert.fail('must not send')}}}));});
test('missing configuration is unavailable',async()=>{await assert.rejects(deliverContact(input,{env:{}}),e=>e.statusCode===503);});
test('sends admin message and fixed acknowledgement',async()=>{const messages=[];const result=await deliverContact(input,{env,transport:{async sendMail(m){messages.push(m);return {accepted:[m.to]}}}});assert.deepEqual(result,{accepted:true,autoReplySent:true});assert.equal(messages[0].to,env.CONTACT_ADMIN_EMAIL);assert.equal(messages[0].replyTo.address,input.email);assert.equal(messages[1].to,input.email);assert.equal(messages[0].from.address,env.SMTP_USER);});
test('admin failure does not send acknowledgement or expose transport error',async()=>{let calls=0;await assert.rejects(deliverContact(input,{env,transport:{async sendMail(){calls++;throw Error('private SMTP details')}}}),e=>e.code==='CONTACT_DELIVERY_FAILED'&&!e.message.includes('private'));assert.equal(calls,1);});
test('acknowledgement failure preserves accepted admin message',async()=>{let calls=0;assert.deepEqual(await deliverContact(input,{env,transport:{async sendMail(){if(++calls===2)throw Error('failed');return {accepted:['admin']}}}}),{accepted:true,autoReplySent:false});});
test('honeypot does not send email',async()=>{assert.equal((await deliverContact({...input,website:'spam'},{env,transport:{sendMail(){assert.fail('must not send')}}})).accepted,true);});

