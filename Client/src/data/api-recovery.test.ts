import {afterEach,describe,expect,it,vi} from 'vitest';
import {fetchCatalogueApi,addFavouriteApi} from './api';
import {execute} from './gateway';
import {seed} from './fixtures';
const response=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()});
describe('API restart recovery and favourites permissions',()=>{
 it('retries a transient read failure',async()=>{
  vi.useFakeTimers();const fetch=vi.fn().mockResolvedValueOnce(response(502,{})).mockResolvedValueOnce(response(200,{data:{markets:[]}}));vi.stubGlobal('fetch',fetch);
  const result=fetchCatalogueApi();await vi.runAllTimersAsync();expect(await result).toEqual({markets:[]});expect(fetch).toHaveBeenCalledTimes(2);
 });
 it('never retries a write after a gateway failure',async()=>{
  vi.stubGlobal('document',{cookie:'marketlink_csrf=test'});const fetch=vi.fn().mockResolvedValue(response(502,{}));vi.stubGlobal('fetch',fetch);
  await expect(addFavouriteApi('product','item')).rejects.toThrow('temporarily unavailable');expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('refreshes a rejected CSRF token once and retries only that rejection',async()=>{
  const doc={cookie:'marketlink_csrf=old'};vi.stubGlobal('document',doc);vi.stubGlobal('window',{});
  const fetch=vi.fn().mockResolvedValueOnce(response(403,{error:{code:'CSRF_TOKEN_INVALID'}})).mockImplementationOnce(async()=>{doc.cookie='marketlink_csrf=new';return response(200,{data:{csrfToken:'new'}})}).mockResolvedValueOnce(response(200,{data:{saved:true}}));vi.stubGlobal('fetch',fetch);
  expect(await addFavouriteApi('product','item')).toEqual({saved:true});expect(fetch).toHaveBeenCalledTimes(3);expect((fetch.mock.calls[2][1].headers as Headers).get('x-csrf-token')).toBe('new');
 });
 it('does not retry a role permission rejection',async()=>{
  vi.stubGlobal('document',{cookie:'marketlink_csrf=test'});const fetch=vi.fn().mockResolvedValue(response(403,{error:{code:'FORBIDDEN',message:'Customer access required'}}));vi.stubGlobal('fetch',fetch);
  await expect(addFavouriteApi('product','item')).rejects.toThrow('Customer access required');expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('blocks favourite commands from farmer accounts before an API mutation',()=>{
  const s=execute(seed(),{type:'role',role:'farmer'});expect(()=>execute(s,{type:'favourite',id:'demo-p1'})).toThrow();
 });
});
