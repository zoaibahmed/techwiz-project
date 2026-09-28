import test from 'node:test';
import assert from 'node:assert/strict';
import {ObjectId} from 'mongodb';
import {generateSubmissionData,localInstant} from '../src/seed/submissionData.js';

test('submission hierarchy, identities and matching bookable offers remain consistent',()=>{
  const admin={_id:new ObjectId(),role:'admin',passwordHash:'unchanged'};
  const d=generateSubmissionData({admin,farmerPasswordHash:'not-a-real-password',now:new Date('2026-09-28T12:00:00Z')});
  assert.equal(d.users[0],admin);
  assert.equal(d.users.length,321);
  assert.equal(d.markets.length,80);assert.equal(d.farmerProfiles.length,320);assert.equal(d.products.length,1280);
  const countries=new Set(d.markets.map(m=>m.countryCode));assert.equal(countries.size,10);
  for(const country of countries) {
    const markets=d.markets.filter(m=>m.countryCode===country);
    const cities=new Set(markets.map(m=>m.city));assert.equal(cities.size,4);
    for(const city of cities) assert.equal(markets.filter(m=>m.city===city).length,2);
  }
  for(const m of d.markets) assert.equal(d.farmerProfiles.filter(f=>f.marketIds[0].equals(m._id)).length,4);
  for(const f of d.farmerProfiles) assert.equal(d.products.filter(p=>p.farmerId.equals(f._id)).length,4);
  const keys=new Set(d.pickupWindows.map(w=>`${w.farmerId}|${w.marketId}|${w.date}`));
  for(const offer of d.stockOffers) {
    assert.ok(keys.has(`${offer.farmerId}|${offer.marketId}|${offer.date}`));
    assert.equal(offer.availableQuantity,offer.totalQuantity-offer.reservedQuantity);
    assert.ok(d.products.some(p=>p._id.equals(offer.productId)&&p.farmerId.equals(offer.farmerId)&&p.currency===offer.currency));
  }
  for(const w of d.pickupWindows) assert.ok(w.cutoffAt>new Date('2026-09-28T12:00:00Z'));
  assert.equal(d.orders,undefined);assert.equal(d.reviews,undefined);
});
test('local cutoffs respect half hour offsets and daylight saving',()=>{
  assert.equal(localInstant('2026-10-03','06:00','Asia/Kolkata').toISOString(),'2026-10-03T00:30:00.000Z');
  assert.equal(localInstant('2026-10-03','06:00','Europe/London').toISOString(),'2026-10-03T05:00:00.000Z');
  assert.equal(localInstant('2026-12-05','06:00','Europe/London').toISOString(),'2026-12-05T06:00:00.000Z');
});
