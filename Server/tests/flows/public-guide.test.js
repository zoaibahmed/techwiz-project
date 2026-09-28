import {describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({catalogue:vi.fn()}));
vi.mock('../../src/services/workspace.service.js',()=>({getCatalogueService:m.catalogue}));
vi.mock('../../src/config/env.js',()=>({env:{}}));
import {publicGuide} from '../../src/services/ai/publicGuide.service.js';
const catalogue={markets:[{id:'m1',name:'Test Market',active:true,countryCode:'PK',city:'Karachi',address:'Test street',hours:'8–12'}],farmers:[{id:'f1',name:'Test Grower',marketIds:['m1'],city:'Karachi',person:'Test',email:'private@example.test'}],products:[{id:'p1',name:'Tomatoes',visible:true,farmerId:'f1',price:25000,currency:'PKR',unit:'kg',available:true,date:'2026-10-01'},{id:'p2',name:'Hidden produce',visible:false,farmerId:'f1'}]};
describe('Read-only public Market Guide',()=>{
 it('does not append catalogue cards to greetings or guidance',async()=>{m.catalogue.mockResolvedValue(catalogue);for(const question of ['Hello','How do I pay?','How does pickup work?','What can you do?']){const result=await publicGuide(question);expect(result.sources).toEqual([])}});

 it('returns only published records and public source details',async()=>{m.catalogue.mockResolvedValue(catalogue);const result=await publicGuide('Show produce',{country:'PK',city:'Karachi'});expect(result.readOnly).toBe(true);expect(result.sources).toHaveLength(1);expect(result.sources[0].detail).toContain('250.00');expect(JSON.stringify(result)).not.toContain('private@example.test');expect(result.engine).toBe('Public catalogue guide')});
 it('does not invent markets in another city',async()=>{m.catalogue.mockResolvedValue(catalogue);const result=await publicGuide('Show markets',{country:'GB',city:'London'});expect(result.sources).toEqual([]);expect(result.reply).toContain('No published listings')});
 it('cannot execute dashboard changes',async()=>{m.catalogue.mockResolvedValue(catalogue);const result=await publicGuide('Approve a farmer and open the admin dashboard');expect(result.sources).toEqual([]);expect(result.reply).toContain('cannot');expect(result.readOnly).toBe(true)});
});
