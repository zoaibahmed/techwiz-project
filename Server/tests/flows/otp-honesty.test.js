import {describe,it,expect,vi} from 'vitest';
import {ObjectId} from 'mongodb';
const mock=vi.hoisted(()=>({findOne:vi.fn(),send:vi.fn(),compare:vi.fn(async()=>true)}));
vi.mock('../../src/config/db.js',()=>({getDB:()=>({collection:()=>({findOne:mock.findOne})})}));
vi.mock('../../src/config/env.js',()=>({env:{}}));
vi.mock('../../src/utils/token.js',()=>({comparePassword:mock.compare,hashPassword:async()=>'',signToken:()=> 'test-token'}));
vi.mock('../../src/services/email.service.js',()=>({sendLoginOtpEmail:mock.send,sendPasswordResetOtpEmail:mock.send}));
import {sendLoginOtpService,verifyLoginOtpService} from '../../src/services/auth.service.js';
describe('Email verification without demo bypasses',()=>{
 it('returns no code; emailed code is required and cannot be replayed',async()=>{
  const email='isolated-login@example.test';mock.findOne.mockResolvedValue({_id:new ObjectId(),role:'customer',name:'Test',email,passwordHash:'test'});mock.send.mockResolvedValue(undefined);
  const response=await sendLoginOtpService(email,'test-password');expect(response).toEqual({otpSent:true,email});
  const code=mock.send.mock.calls.at(-1)[1];expect(code).toMatch(/^\d{6}$/);
  await expect(verifyLoginOtpService(email,'wrong')).rejects.toMatchObject({statusCode:400});
  expect((await verifyLoginOtpService(email,code)).token).toBe('test-token');
  await expect(verifyLoginOtpService(email,code)).rejects.toMatchObject({statusCode:400});
 });
 it('does not claim email was sent when transport fails',async()=>{
  mock.findOne.mockResolvedValue({_id:new ObjectId(),role:'customer',passwordHash:'test'});mock.send.mockRejectedValue(Object.assign(new Error('Email unavailable'),{statusCode:503}));
  await expect(sendLoginOtpService('isolated-failure@example.test','test-password')).rejects.toMatchObject({statusCode:503});
 });
 it('allows only the designated administrator after password validation',async()=>{
  mock.send.mockClear();mock.compare.mockResolvedValue(true);
  mock.findOne.mockResolvedValue({_id:new ObjectId(),role:'admin',email:'admin@marketlink.com',passwordHash:'test'});
  const result=await sendLoginOtpService('admin@marketlink.com','correct-password');
  expect(result.otpSent).toBe(false);expect(result.user.role).toBe('admin');expect(result.token).toBe('test-token');expect(mock.send).not.toHaveBeenCalled();
  mock.compare.mockResolvedValueOnce(false);
  await expect(sendLoginOtpService('admin@marketlink.com','wrong-password')).rejects.toMatchObject({statusCode:401});
 });
 it('does not grant the exception to a non-admin with that email',async()=>{
  mock.send.mockResolvedValue(undefined);mock.compare.mockResolvedValue(true);
  mock.findOne.mockResolvedValue({_id:new ObjectId(),role:'customer',email:'admin@marketlink.com',passwordHash:'test'});
  const result=await sendLoginOtpService('admin@marketlink.com','correct-password');expect(result.otpSent).toBe(true);expect(result.token).toBeUndefined();
 });

});
