import { ObjectId } from 'mongodb';
import { hashPassword } from '../utils/token.js';
import { firstBookableDate } from '../services/metrics.service.js';

/**
 * MarketLink seed dataset (Multi-Country Global Hubs: PK, GB, US, AE).
 * 4 Countries, 2 Cities each, 2 Markets and 2 Growers per city (16 markets, 16 growers).
 *
 * Every date is computed relative to "now" so the next market day is always
 * upcoming, and history covers the previous eight weeks. All derived values
 * (reserved stock, pickup-window counts, ratings) are computed from the
 * generated orders and reviews, so every screen and report agrees.
 * A seeded PRNG keeps the dataset identical between runs.
 */

const HISTORY_WEEKS = 8;

const TZ_OFFSETS = {
  'Asia/Karachi': 5,
  'Europe/London': 1,
  'America/New_York': -4,
  'America/Los_Angeles': -7,
  'Asia/Dubai': 4,
};

const oid = (prefix, n) => new ObjectId(prefix + n.toString(16).padStart(24 - prefix.length, '0'));

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const weekday = (isoDate) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();

function localTime(isoDate, hhmm, tz = 'Asia/Karachi') {
  const offset = TZ_OFFSETS[tz] ?? 5;
  const [h, m] = hhmm.split(':').map(Number);
  const parts = isoDate.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)));
  return new Date(Date.UTC(parts[0], parts[1], parts[2], h - offset, m));
}

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** The next `count` dates from `start` (inclusive) that fall on one of `days`. */
function upcomingDates(start, days, count) {
  const out = [];
  const today = addDays(start, -1);
  for (let i = 1; out.length < count && i < 60; i++) {
    const d = addDays(today, i);
    if (days.includes(weekday(d))) out.push(d);
  }
  return out;
}

/** Market dates in the `weeks` before `start` (exclusive). */
function pastDates(start, days, weeks) {
  const today = start;
  const out = [];
  for (let i = 1; i <= weeks * 7; i++) {
    const d = addDays(today, -i);
    if (days.includes(weekday(d))) out.push(d);
  }
  return out.reverse();
}

// ─── Static reference data ────────────────────────────────────────────────────

export const MARKETS = [
  // Pakistan - Lahore
  {
    n: 1,
    name: 'The Orchard Market',
    slug: 'the-orchard-market',
    countryCode: 'PK',
    countryName: 'Pakistan',
    region: 'Punjab',
    city: 'Lahore',
    locality: 'Model Town',
    address: 'Model Town Park, Gate 3, Lahore',
    lngLat: [74.3214, 31.4822],
    days: [6],
    open: '08:00',
    close: '13:00',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    description: 'A shaded Saturday morning market under the neem trees of Model Town Park. Lahore’s longest-running growers’ market.',
    imageUrl: '/images/market.jpg',
  },
  {
    n: 2,
    name: 'Liberty Green Market',
    slug: 'liberty-green-market',
    countryCode: 'PK',
    countryName: 'Pakistan',
    region: 'Punjab',
    city: 'Lahore',
    locality: 'Gulberg III',
    address: 'Liberty Roundabout, Main Boulevard, Gulberg III, Lahore',
    lngLat: [74.3446, 31.5102],
    days: [0],
    open: '08:30',
    close: '14:00',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    description: 'A vibrant Sunday morning market in central Gulberg with fresh orchard produce and family stalls.',
    imageUrl: '/images/market-arrival.jpg',
  },
  // Pakistan - Karachi
  {
    n: 3,
    name: 'Clifton Seaside Market',
    slug: 'clifton-seaside-market',
    countryCode: 'PK',
    countryName: 'Pakistan',
    region: 'Sindh',
    city: 'Karachi',
    locality: 'Clifton Block 5',
    address: 'Bagh Ibn-e-Qasim, Clifton Block 5, Karachi',
    lngLat: [67.0291, 24.8138],
    days: [6],
    open: '07:30',
    close: '12:30',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    description: 'A breezy Saturday seaside market known for coastal papayas, Sindhi dates, and wild-flower honey.',
    imageUrl: '/images/market-arrival.jpg',
  },
  {
    n: 4,
    name: 'Bahadurabad Morning Market',
    slug: 'bahadurabad-morning-market',
    countryCode: 'PK',
    countryName: 'Pakistan',
    region: 'Sindh',
    city: 'Karachi',
    locality: 'Bahadurabad',
    address: 'Bahadurabad Chowrangi, Karachi',
    lngLat: [67.0702, 24.8826],
    days: [0],
    open: '07:00',
    close: '11:30',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    description: 'An early Sunday morning gathering for Malir growers and local family kitchens in central Karachi.',
    imageUrl: '/images/market-person.jpg',
  },
  // United Kingdom - London
  {
    n: 5,
    name: 'Borough Heritage Market',
    slug: 'borough-heritage-market',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    region: 'Greater London',
    city: 'London',
    locality: 'Southwark',
    address: '8 Southwark Street, London SE1 1TL',
    lngLat: [-0.0906, 51.5055],
    days: [6],
    open: '08:30',
    close: '14:00',
    currency: 'GBP',
    timezone: 'Europe/London',
    description: 'A historic Saturday artisanal gathering under Victorian railway arches near London Bridge.',
    imageUrl: '/images/market.jpg',
  },
  {
    n: 6,
    name: 'Hampstead Heath Green Fair',
    slug: 'hampstead-heath-green-fair',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    region: 'Greater London',
    city: 'London',
    locality: 'Hampstead',
    address: 'Parliament Hill Fields, Highgate Rd, London NW5 1QR',
    lngLat: [-0.1472, 51.5592],
    days: [0],
    open: '09:00',
    close: '14:30',
    currency: 'GBP',
    timezone: 'Europe/London',
    description: 'A relaxed Sunday morning fair on the edge of Hampstead Heath with organic estate produce and honey.',
    imageUrl: '/images/market-arrival.jpg',
  },
  // United Kingdom - Manchester
  {
    n: 7,
    name: 'Northern Quarter Artisan Market',
    slug: 'northern-quarter-artisan-market',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    region: 'Greater Manchester',
    city: 'Manchester',
    locality: 'Northern Quarter',
    address: 'Stevenson Square, Manchester M1 1DB',
    lngLat: [-2.2343, 53.4827],
    days: [6],
    open: '09:00',
    close: '14:00',
    currency: 'GBP',
    timezone: 'Europe/London',
    description: 'A bustling Saturday open-air market in Manchester’s creative quarter with smallholders and cheesemakers.',
    imageUrl: '/images/market-person.jpg',
  },
  {
    n: 8,
    name: 'Didsbury Village Produce Fair',
    slug: 'didsbury-village-produce-fair',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    region: 'Greater Manchester',
    city: 'Manchester',
    locality: 'Didsbury',
    address: 'Wilmslow Road, Didsbury, Manchester M20 2RN',
    lngLat: [-2.2325, 53.4172],
    days: [0],
    open: '09:30',
    close: '14:30',
    currency: 'GBP',
    timezone: 'Europe/London',
    description: 'A friendly suburban Sunday produce gathering bringing Peak District and Cheshire harvest to south Manchester.',
    imageUrl: '/images/harvest.jpg',
  },
  // United States - New York
  {
    n: 9,
    name: 'Union Square Greenmarket',
    slug: 'union-square-greenmarket',
    countryCode: 'US',
    countryName: 'United States',
    region: 'New York',
    city: 'New York',
    locality: 'Union Square',
    address: 'Union Square Park, E 17th St, New York, NY 10003',
    lngLat: [-73.9903, 40.7359],
    days: [6],
    open: '08:00',
    close: '14:00',
    currency: 'USD',
    timezone: 'America/New_York',
    description: 'Manhattan’s premier Saturday farmers market featuring Hudson Valley and regional family farms.',
    imageUrl: '/images/market.jpg',
  },
  {
    n: 10,
    name: 'Prospect Park Farmers Market',
    slug: 'prospect-park-farmers-market',
    countryCode: 'US',
    countryName: 'United States',
    region: 'New York',
    city: 'New York',
    locality: 'Grand Army Plaza',
    address: 'Grand Army Plaza, Brooklyn, NY 11238',
    lngLat: [-73.9698, 40.6728],
    days: [0],
    open: '08:30',
    close: '14:30',
    currency: 'USD',
    timezone: 'America/New_York',
    description: 'A vibrant Sunday morning Brooklyn market set against the historic arch at Grand Army Plaza.',
    imageUrl: '/images/market-arrival.jpg',
  },
  // United States - San Francisco
  {
    n: 11,
    name: 'Ferry Plaza Farmers Market',
    slug: 'ferry-plaza-farmers-market',
    countryCode: 'US',
    countryName: 'United States',
    region: 'California',
    city: 'San Francisco',
    locality: 'Embarcadero',
    address: '1 Ferry Building, San Francisco, CA 94111',
    lngLat: [-122.3937, 37.7955],
    days: [6],
    open: '08:00',
    close: '14:00',
    currency: 'USD',
    timezone: 'America/Los_Angeles',
    description: 'World-renowned Saturday waterfront market showcasing Northern California’s finest organic growers and artisans.',
    imageUrl: '/images/market-person.jpg',
  },
  {
    n: 12,
    name: 'Mission Community Market',
    slug: 'mission-community-market',
    countryCode: 'US',
    countryName: 'United States',
    region: 'California',
    city: 'San Francisco',
    locality: 'Mission District',
    address: 'Bartlett St between 21st and 22nd, San Francisco, CA 94110',
    lngLat: [-122.4197, 37.7554],
    days: [0],
    open: '09:00',
    close: '14:00',
    currency: 'USD',
    timezone: 'America/Los_Angeles',
    description: 'A community-focused Sunday street market celebrating local farms, artisan bakers, and Mission food culture.',
    imageUrl: '/images/harvest.jpg',
  },
  // United Arab Emirates - Dubai
  {
    n: 13,
    name: 'Alserkal Avenue Organic Market',
    slug: 'alserkal-avenue-organic-market',
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    region: 'Dubai',
    city: 'Dubai',
    locality: 'Al Quoz 1',
    address: '17th St, Al Quoz 1, Dubai',
    lngLat: [55.2285, 25.1412],
    days: [6],
    open: '08:30',
    close: '13:30',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    description: 'A modern Saturday artisanal market set within the shaded courtyards of the Alserkal creative district.',
    imageUrl: '/images/market.jpg',
  },
  {
    n: 14,
    name: 'Zabeel Park Weekend Souk',
    slug: 'zabeel-park-weekend-souk',
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    region: 'Dubai',
    city: 'Dubai',
    locality: 'Zabeel',
    address: 'Zabeel Park, Gate 2, Dubai',
    lngLat: [55.2974, 25.2345],
    days: [0],
    open: '08:00',
    close: '13:00',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    description: 'An open Sunday morning green souk under palm groves, popular with families across Dubai.',
    imageUrl: '/images/market-arrival.jpg',
  },
  // United Arab Emirates - Abu Dhabi
  {
    n: 15,
    name: 'Corniche Artisanal Gathering',
    slug: 'corniche-artisanal-gathering',
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    region: 'Abu Dhabi',
    city: 'Abu Dhabi',
    locality: 'Corniche West',
    address: 'Corniche Beach Promenade, Abu Dhabi',
    lngLat: [54.3312, 24.4715],
    days: [6],
    open: '08:00',
    close: '13:00',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    description: 'A Saturday promenade gathering alongside the Abu Dhabi Corniche featuring local date groves and desert farms.',
    imageUrl: '/images/market-person.jpg',
  },
  {
    n: 16,
    name: 'Khalifa Park Green Souk',
    slug: 'khalifa-park-green-souk',
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    region: 'Abu Dhabi',
    city: 'Abu Dhabi',
    locality: 'Al Matar',
    address: 'Khalifa Park Main Pavilion, Abu Dhabi',
    lngLat: [54.4697, 24.4239],
    days: [0],
    open: '08:30',
    close: '13:30',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    description: 'A shaded Sunday morning market pavilion showcasing fresh produce and honey from across the Emirate.',
    imageUrl: '/images/harvest.jpg',
  },
];

export const CATEGORIES = [
  { n: 1, name: 'Fresh Vegetables', slug: 'fresh-vegetables', icon: 'carrot', description: 'Seasonal greens, roots and field vegetables.' },
  { n: 2, name: 'Orchard Fruits', slug: 'orchard-fruits', icon: 'apple', description: 'Tree fruit, citrus and berries picked for market day.' },
  { n: 3, name: 'Dairy & Eggs', slug: 'dairy-eggs', icon: 'egg', description: 'Fresh milk, dahi, cheeses and pastured farm eggs.' },
  { n: 4, name: 'Pantry & Honey', slug: 'pantry-honey', icon: 'jar', description: 'Raw honey, artisan oils and small-batch pantry provisions.' },
  { n: 5, name: 'Fresh Herbs', slug: 'fresh-herbs', icon: 'leaf', description: 'Cut-to-order herbs and aromatic bunches.' },
  { n: 6, name: 'Bakery', slug: 'bakery', icon: 'wheat', description: 'Slow-fermented loaves and traditional hearth bakes.' },
];

export const FARMERS = [
  // Pakistan - Lahore (Markets 1 & 2)
  {
    user: 2, profile: 1, business: 'Greenfield Farm', person: 'Tariq Mahmood', email: 'farmer.greenfield@marketlink.com',
    phone: '+923005550101', status: 'approved', countryCode: 'PK', countryName: 'Pakistan', city: 'Lahore',
    markets: [1, 2], stall: 'A-14', since: 2011, location: 'Bedian Road, Lahore', lngLat: [74.4671, 31.4402],
    bio: 'Three generations growing heirloom tomatoes, spinach and field vegetables on eleven acres off Bedian Road.',
    story: 'Tariq took over his father’s fields in 2011 and moved them away from synthetic sprays one plot at a time. Everything on the stall was picked the evening before market.',
    specialties: ['Heirloom tomatoes', 'Leafy greens', 'Summer vegetables'],
  },
  {
    user: 3, profile: 2, business: 'The Kitchen Garden', person: 'Ayesha Siddiqui', email: 'farmer.kitchengarden@marketlink.com',
    phone: '+923005550102', status: 'approved', countryCode: 'PK', countryName: 'Pakistan', city: 'Lahore',
    markets: [1, 2], stall: 'B-03', since: 2018, location: 'Raiwind Road, Lahore', lngLat: [74.2253, 31.3891],
    bio: 'Herbs and salad leaves grown in raised beds and cut to order the morning of market.',
    story: 'Ayesha started with a rooftop of mint in 2018. Today the garden supplies herbs, salad leaves and lemongrass to two markets every weekend.',
    specialties: ['Fresh herbs', 'Salad leaves'],
  },
  // Pakistan - Karachi (Markets 3 & 4)
  {
    user: 4, profile: 3, business: 'Indus Valley Orchards', person: 'Khurram Shahzad', email: 'farmer.indus@marketlink.com',
    phone: '+923005550103', status: 'approved', countryCode: 'PK', countryName: 'Pakistan', city: 'Karachi',
    markets: [3, 4], stall: 'K-02', since: 2015, location: 'Gharo Orchards, Thatta-Karachi Hwy', lngLat: [67.5833, 24.7417],
    bio: 'Strawberries, coastal guavas and wild sidr honey from orchards along the lower Indus delta.',
    story: 'Khurram maintains sixty hives across his fruit orchards. Berries are picked at dawn and transported in chilled crates for market mornings.',
    specialties: ['Strawberries', 'Raw honey', 'Guavas'],
  },
  {
    user: 5, profile: 4, business: 'Malir Farm Fresh', person: 'Rehan Siddiqui', email: 'farmer.malir@marketlink.com',
    phone: '+923005550104', status: 'approved', countryCode: 'PK', countryName: 'Pakistan', city: 'Karachi',
    markets: [3, 4], stall: 'K-15', since: 2012, location: 'Malir River Basin, Karachi', lngLat: [67.2083, 24.9456],
    bio: 'Tomatoes, gourds, chillies and sweet papaya from Malir’s heritage agriculture belt.',
    story: 'Rehan farms eight fertile acres that have provided seasonal field vegetables to Karachi markets for over forty years.',
    specialties: ['Tomatoes', 'Bottle gourds', 'Papaya'],
  },
  // United Kingdom - London (Markets 5 & 6)
  {
    user: 6, profile: 5, business: 'Surrey Hills Organics', person: 'Oliver Bennett', email: 'farmer.surrey@marketlink.com',
    phone: '+442079460111', status: 'approved', countryCode: 'GB', countryName: 'United Kingdom', city: 'London',
    markets: [5, 6], stall: 'L-04', since: 2013, location: 'Dorking Farm, Surrey RH4 1ND', lngLat: [-0.3341, 51.2325],
    bio: 'Soil Association certified organic heritage vegetables and orchard apples from the North Downs.',
    story: 'Oliver revitalized an abandoned 15-acre Victorian walled kitchen garden into a bio-intensive organic market farm.',
    specialties: ['Heritage beetroot', 'Cavolo nero', 'English apples'],
  },
  {
    user: 7, profile: 6, business: 'Thames Valley Apiary & Bakery', person: 'Emma Richardson', email: 'farmer.thames@marketlink.com',
    phone: '+442079460112', status: 'approved', countryCode: 'GB', countryName: 'United Kingdom', city: 'London',
    markets: [5, 6], stall: 'L-12', since: 2017, location: 'Henley-on-Thames, Oxfordshire RG9 1BF', lngLat: [-0.9028, 51.5367],
    bio: 'Wood-fired sourdough loaves and cold-extracted raw blossom honey from river meadow apiaries.',
    story: 'Emma combines natural beekeeping with long-fermentation stoneground baking, using flour milled from single-origin British grain.',
    specialties: ['Artisan sourdough', 'Raw honey', 'Rye bread'],
  },
  // United Kingdom - Manchester (Markets 7 & 8)
  {
    user: 8, profile: 7, business: 'Cheshire Meadow Organics', person: 'George Davenport', email: 'farmer.cheshire@marketlink.com',
    phone: '+441614960201', status: 'approved', countryCode: 'GB', countryName: 'United Kingdom', city: 'Manchester',
    markets: [7, 8], stall: 'M-02', since: 2010, location: 'Knutsford Plain, Cheshire WA16 8ER', lngLat: [-2.3739, 53.3031],
    bio: 'High-welfare pastured eggs and handmade raw-milk Cheshire farmhouse butter and cheese.',
    story: 'George manages forty Jersey cross cows on species-rich herbal leys, churning traditional butter by hand every Friday.',
    specialties: ['Farmhouse butter', 'Free-range eggs', 'Cheshire cheese'],
  },
  {
    user: 9, profile: 8, business: 'Peak District Pastures', person: 'Hannah Wright', email: 'farmer.peak@marketlink.com',
    phone: '+441614960202', status: 'approved', countryCode: 'GB', countryName: 'United Kingdom', city: 'Manchester',
    markets: [7, 8], stall: 'M-09', since: 2016, location: 'Hope Valley, Derbyshire S33 6RB', lngLat: [-1.7456, 53.3489],
    bio: 'Moorland heather honey, cold-pressed rapeseed oil, and heritage root crops from the High Peak.',
    story: 'Hannah relocates fifty bee colonies onto the flowering heather plateaus each August, producing rich, jelly-like dark honey.',
    specialties: ['Heather honey', 'Cold-pressed oil', 'Heritage potatoes'],
  },
  // United States - New York (Markets 9 & 10)
  {
    user: 10, profile: 9, business: 'Hudson Valley Harvest Co.', person: 'Samuel Miller', email: 'farmer.hudson@marketlink.com',
    phone: '+12125550301', status: 'approved', countryCode: 'US', countryName: 'United States', city: 'New York',
    markets: [9, 10], stall: 'US-11', since: 2009, location: 'Red Hook, Dutchess County, NY 12571', lngLat: [-73.8746, 41.9945],
    bio: 'Certified organic vegetables, crisp cider apples and sweet corn harvested along the Hudson River corridor.',
    story: 'Samuel’s family has cultivated fertile Hudson river terrace soils for over thirty years, delivering directly to New York city markets weekly.',
    specialties: ['Honeycrisp apples', 'Lacinato kale', 'Sweet corn'],
  },
  {
    user: 11, profile: 10, business: 'Catskill Mountain Apiaries', person: 'Clara Jenkins', email: 'farmer.catskill@marketlink.com',
    phone: '+12125550302', status: 'approved', countryCode: 'US', countryName: 'United States', city: 'New York',
    markets: [9, 10], stall: 'US-24', since: 2014, location: 'Woodstock, Ulster County, NY 12498', lngLat: [-74.1182, 42.0409],
    bio: 'Pure mountain wildflower honey, raw honeycomb and wood-evaporated amber maple syrup from Catskill forests.',
    story: 'Clara taps 800 sugar maples each spring and tends mountain hives that forage on basswood and wild raspberry blooms.',
    specialties: ['Wildflower honey', 'Pure maple syrup', 'Raw honeycomb'],
  },
  // United States - San Francisco (Markets 11 & 12)
  {
    user: 12, profile: 11, business: 'Sonoma Valley Sunshine Farm', person: 'Mateo Ramirez', email: 'farmer.sonoma@marketlink.com',
    phone: '+14155550401', status: 'approved', countryCode: 'US', countryName: 'United States', city: 'San Francisco',
    markets: [11, 12], stall: 'SF-03', since: 2015, location: 'Sebastopol, Sonoma County, CA 95472', lngLat: [-122.8239, 38.4021],
    bio: 'Sun-drenched Meyer lemons, Haas avocados, and heirloom purple garlic nurtured under Sonoma sunshine.',
    story: 'Mateo grows dry-farmed heirloom varieties that intensify sweetness and complex natural aroma without wasteful irrigation.',
    specialties: ['Meyer lemons', 'California avocados', 'Heirloom garlic'],
  },
  {
    user: 13, profile: 12, business: 'Napa Valley Grove & Herbs', person: 'Chloe Laurent', email: 'farmer.napa@marketlink.com',
    phone: '+14155550402', status: 'approved', countryCode: 'US', countryName: 'United States', city: 'San Francisco',
    markets: [11, 12], stall: 'SF-18', since: 2018, location: 'St. Helena, Napa Valley, CA 94574', lngLat: [-122.4678, 38.5063],
    bio: 'Cold-pressed extra virgin Mission olive oil, fragrant culinary herbs and slow-crafted sourdough boules.',
    story: 'Chloe presses estate olives within four hours of morning picking, preserving vivid polyphenols and herbaceous notes.',
    specialties: ['Extra virgin olive oil', 'Fresh herbs', 'Sourdough boule'],
  },
  // United Arab Emirates - Dubai (Markets 13 & 14)
  {
    user: 14, profile: 13, business: 'Al Rawabi Desert Greens', person: 'Rashid Al Mansoori', email: 'farmer.rawabi@marketlink.com',
    phone: '+971501230501', status: 'approved', countryCode: 'AE', countryName: 'United Arab Emirates', city: 'Dubai',
    markets: [13, 14], stall: 'DXB-01', since: 2019, location: 'Al Khawaneej Agriculture Zone, Dubai', lngLat: [55.4528, 25.2139],
    bio: 'Closed-loop hydroponic leafy greens and snack cucumbers grown locally with solar-powered precision climate control.',
    story: 'Rashid established an energy-efficient controlled-environment greenhouse yielding pesticide-free crisp greens year-round.',
    specialties: ['Butterhead lettuce', 'Snack cucumbers', 'Vine tomatoes'],
  },
  {
    user: 15, profile: 14, business: 'Liwa Oasis Palmstead', person: 'Sultan Al Zaabi', email: 'farmer.liwa@marketlink.com',
    phone: '+971501230502', status: 'approved', countryCode: 'AE', countryName: 'United Arab Emirates', city: 'Dubai',
    markets: [13, 14], stall: 'DXB-08', since: 2008, location: 'Liwa Desert Basin, Abu Dhabi/Dubai', lngLat: [53.7667, 23.1333],
    bio: 'Prized Khalas dates, wild mountain sidr honey, and farm-fresh organic camel milk.',
    story: 'The Al Zaabi family preserves ancient dune farming techniques, pollinating mature date palms by hand across four generations.',
    specialties: ['Khalas dates', 'Camel milk', 'Sidr honey'],
  },
  // United Arab Emirates - Abu Dhabi (Markets 15 & 16)
  {
    user: 16, profile: 15, business: 'Al Ain Oasis Farm', person: 'Fatima Al Dhaheri', email: 'farmer.alain@marketlink.com',
    phone: '+971501230601', status: 'approved', countryCode: 'AE', countryName: 'United Arab Emirates', city: 'Abu Dhabi',
    markets: [15, 16], stall: 'AUH-03', since: 2012, location: 'Al Ain UNESCO Oasis, Abu Dhabi', lngLat: [55.7606, 24.2192],
    bio: 'Traditional falaj spring-irrigated culinary herbs, ripe honey figs, and artisanal date syrup.',
    story: 'Fatima produces aromatic herbs and orchard figs using ancient shaded multi-tiered cultivation under towering date palms.',
    specialties: ['Fresh mint & coriander', 'Oasis figs', 'Pure date syrup'],
  },
  {
    user: 17, profile: 16, business: 'Emirates Date Palms & Pasture', person: 'Hamad Al Mazrouei', email: 'farmer.emirates@marketlink.com',
    phone: '+971501230602', status: 'approved', countryCode: 'AE', countryName: 'United Arab Emirates', city: 'Abu Dhabi',
    markets: [15, 16], stall: 'AUH-11', since: 2014, location: 'Madinat Zayed, Al Dhafra, Abu Dhabi', lngLat: [53.6558, 23.6569],
    bio: 'Golden Barhi dates, herb-marinated goat milk cheese, and roasted date pit coffee.',
    story: 'Hamad combines heritage date farming with artisanal desert goat husbandry, crafting seasonal small-batch pasture cheese.',
    specialties: ['Golden Barhi dates', 'Artisan goat cheese', 'Date pit coffee'],
  },
  // Pending farmer for admin verification testing
  {
    user: 18, profile: 17, business: 'Margalla Dairy', person: 'Rashid Minhas', email: 'farmer.pending@marketlink.com',
    phone: '+923005550199', status: 'pending', countryCode: 'PK', countryName: 'Pakistan', city: 'Lahore',
    markets: [], stall: '', since: 2021, location: 'Rawat, Rawalpindi', lngLat: null,
    bio: 'Small-herd dairy applying to bring fresh cheese and buffalo milk to markets.',
    story: 'A family dairy applying for its first market.',
    specialties: ['Fresh cheese', 'Buffalo milk'],
  },
];

// n, profile, name, category, unit, price (major units), qty per market day, description
export const PRODUCTS = [
  // Profile 1 (Greenfield Farm, Lahore - PKR)
  [1, 1, 'Heirloom Beefsteak Tomatoes', 1, 'kg', 350, 40, 'Vine-ripened heritage tomatoes with a deep, sweet flavour. Picked the evening before market.'],
  [2, 1, 'Desi Spinach (Palak)', 1, 'bunch', 80, 30, 'Tender, dark-green leaves, washed and bundled. Ideal for saag and palak paneer.'],
  [3, 1, 'Salad Cucumbers', 1, 'kg', 150, 30, 'Crunchy, thin-skinned cucumbers for raita and summer salads.'],
  [4, 1, 'Lady Finger (Bhindi)', 1, 'kg', 220, 25, 'Young, tender okra picked small so it stays crisp in the pan.'],

  // Profile 2 (The Kitchen Garden, Lahore - PKR)
  [5, 2, 'Fresh Mint (Podina)', 5, 'bunch', 50, 40, 'Cut-to-order garden mint for chutney, raita and chai.'],
  [6, 2, 'Coriander (Dhania)', 5, 'bunch', 40, 40, 'Fragrant coriander with roots on, cut the morning of market.'],
  [7, 2, 'Sweet Basil', 5, 'bunch', 90, 20, 'Italian sweet basil for pesto, salads and pasta.'],
  [8, 2, 'Mixed Salad Leaves', 1, 'bag', 260, 20, 'A washed 250 g mix of lettuces, rocket and baby spinach.'],

  // Profile 3 (Indus Valley Orchards, Karachi - PKR)
  [9, 3, 'Field Strawberries', 2, 'box', 450, 20, 'Fragrant strawberries picked at first light and packed in 500 g card punnets.'],
  [10, 3, 'Wild-Blossom Honey', 4, 'jar', 1250, 15, 'Raw, cold-extracted honey from hives among guava and sidr trees. 500 g jar.'],
  [11, 3, 'Larkana Guavas', 2, 'kg', 180, 30, 'Pink-fleshed Larkana-type guavas, ripe for eating within two days.'],

  // Profile 4 (Malir Farm Fresh, Karachi - PKR)
  [12, 4, 'Desi Tomatoes', 1, 'kg', 180, 40, 'Field-grown tomatoes with real flavour, picked half-ripe for the drive.'],
  [13, 4, 'Bottle Gourd (Lauki)', 1, 'kg', 120, 25, 'Young, tender lauki picked the day before market.'],
  [14, 4, 'Green Chillies', 1, 'pack', 60, 30, 'Hot green chillies. 250 g pack.'],
  [15, 4, 'Fresh Papaya', 2, 'kg', 220, 18, 'Sweet red-fleshed papaya, ripe within two days.'],

  // Profile 5 (Surrey Hills Organics, London - GBP)
  [16, 5, 'Heritage Beetroot Bunch', 1, 'bunch', 2.80, 25, 'Sweet earthy heritage beetroot with tender edible greens attached.'],
  [17, 5, 'Organic Cavolo Nero Kale', 1, 'bag', 2.50, 30, 'Dark Tuscan black kale, freshly harvested from Surrey rich loam.'],
  [18, 5, 'English Heritage Apples', 2, 'kg', 3.60, 35, 'Crisp Cox’s Orange Pippin apples with aromatic honey notes.'],
  [19, 5, 'Rainbow Chard', 1, 'bunch', 2.40, 20, 'Vibrant red, gold and white chard picked the evening before market.'],

  // Profile 6 (Thames Valley Apiary & Bakery, London - GBP)
  [20, 6, 'Artisan Sourdough Loaf', 6, 'loaf', 4.50, 24, '36-hour slow-fermented organic country loaf with a dark blistered crust.'],
  [21, 6, 'Raw Heather & Blossom Honey', 4, 'jar', 7.50, 18, 'Unpasteurized Thames Valley summer honey with floral notes. 340 g jar.'],
  [22, 6, 'Seeded Rye Loaf', 6, 'loaf', 4.20, 16, 'Dense Scandinavian-style rye loaf packed with pumpkin and flax seeds.'],
  [23, 6, 'Pure Beeswax Block', 4, 'pack', 5.00, 12, 'Natural hand-poured beeswax blocks for polishing or wraps.'],

  // Profile 7 (Cheshire Meadow Organics, Manchester - GBP)
  [24, 7, 'Cheshire Farmhouse Butter', 3, 'pack', 3.80, 25, 'Cultured lightly salted butter churned from pastured Jersey cow cream. 250 g pack.'],
  [25, 7, 'Pastured Free-Range Eggs', 3, 'dozen', 3.90, 30, 'Rich golden-yolk eggs from hens roaming clover-rich Cheshire pastures.'],
  [26, 7, 'Crumbly Cheshire Raw Milk Cheese', 3, 'pack', 5.50, 15, 'Traditional unpasteurized clothbound Cheshire cheese aged 3 months. 200 g pack.'],

  // Profile 8 (Peak District Pastures, Manchester - GBP)
  [27, 8, 'Peak Heather Honey', 4, 'jar', 7.20, 20, 'Intense dark moorland heather honey harvested high in Hope Valley. 340 g jar.'],
  [28, 8, 'Cold-Pressed Rapeseed Oil', 4, 'bottle', 5.80, 18, 'Extra virgin cold-pressed oil with a nutty aroma and high smoke point. 500 ml bottle.'],
  [29, 8, 'Heritage Maris Piper Potatoes', 1, 'kg', 1.80, 45, 'Fluffy soil-grown potatoes ideal for perfect roasts and mash.'],

  // Profile 9 (Hudson Valley Harvest Co., New York - USD)
  [30, 9, 'Crisp Honeycrisp Apples', 2, 'kg', 4.50, 35, 'Sweet, juicy and explosive crunch apples from Hudson Valley orchards.'],
  [31, 9, 'Organic Lacinato Kale', 1, 'bunch', 3.25, 25, 'Tender dinosaur kale harvested fresh from Red Hook river terraces.'],
  [32, 9, 'Hudson Valley Sweet Corn', 1, 'dozen', 6.00, 30, 'Bicolor sweet corn picked the morning of market.'],
  [33, 9, 'Fingerling Potatoes', 1, 'kg', 3.80, 25, 'Firm, buttery gourmet fingerling potatoes for roasting.'],

  // Profile 10 (Catskill Mountain Apiaries, New York - USD)
  [34, 10, 'Raw Basswood Honey', 4, 'jar', 12.00, 18, 'Delicate, minty-sweet light honey from Catskill basswood trees. 1 lb jar.'],
  [35, 10, 'Catskill Pure Maple Syrup', 4, 'bottle', 14.50, 20, 'Wood-fired Grade A amber maple syrup from Ulster County sugarbush. 500 ml bottle.'],
  [36, 10, 'Honeycomb Chunk in Jar', 4, 'jar', 15.00, 12, 'Raw comb floating in wildflower honey. Pure unprocessed hive goodness.'],

  // Profile 11 (Sonoma Valley Sunshine Farm, San Francisco - USD)
  [37, 11, 'Sonoma Meyer Lemons', 2, 'dozen', 5.00, 30, 'Thin-skinned, sweet-tart citrus with an intoxicating floral scent.'],
  [38, 11, 'California Haas Avocados', 2, 'bag', 6.50, 25, 'Buttery, rich Haas avocados ripened on the tree. Bag of 4.'],
  [39, 11, 'Heirloom Purple Garlic', 1, 'bunch', 4.00, 25, 'Spicy, complex heirloom garlic braided with roots intact.'],
  [40, 11, 'Sweet Summer Strawberries', 2, 'box', 5.50, 24, 'Coast-kissed sweet strawberries picked ripe at sunrise. 1 pint punnet.'],

  // Profile 12 (Napa Valley Grove & Herbs, San Francisco - USD)
  [41, 12, 'Mission Extra Virgin Olive Oil', 4, 'bottle', 18.00, 16, 'Cold-pressed early harvest Mission olive oil with peppery finish. 500 ml bottle.'],
  [42, 12, 'Fresh French Tarragon & Rosemary', 5, 'bunch', 3.50, 30, 'Fragrant culinary herb bundle for roasting and vinegars.'],
  [43, 12, 'San Francisco Sourdough Boule', 6, 'loaf', 7.00, 20, 'Classic open-crumb tangy Bay Area sourdough boule with blistered crust.'],

  // Profile 13 (Al Rawabi Desert Greens, Dubai - AED)
  [44, 13, 'Hydroponic Butterhead Lettuce', 1, 'bunch', 9.00, 30, 'Crisp living lettuce head with roots attached, grown in solar greenhouse.'],
  [45, 13, 'Greenhouse Snack Cucumbers', 1, 'kg', 8.50, 35, 'Sweet mini snacking cucumbers with tender skin and refreshing bite.'],
  [46, 13, 'Cherry Vine Tomatoes', 1, 'box', 14.00, 25, 'Super-sweet cluster tomatoes on the vine. 500 g box.'],
  [47, 13, 'Crisp Sweet Bell Peppers', 1, 'kg', 12.00, 25, 'Glossy red and yellow sweet peppers grown locally with minimal water.'],

  // Profile 14 (Liwa Oasis Palmstead, Dubai - AED)
  [48, 14, 'Premium Khalas Dates', 2, 'box', 28.00, 30, 'Soft, buttery golden Khalas dates from ancient Liwa oasis palms. 1 kg box.'],
  [49, 14, 'Fresh Camel Milk', 3, 'litre', 16.00, 25, 'Pasteurized whole camel milk rich in natural electrolytes and minerals. 1 L bottle.'],
  [50, 14, 'Emirati Sidr Honey', 4, 'jar', 55.00, 15, 'Pure monofloral honey from wild desert sidr trees in the Hajar mountains. 400 g jar.'],

  // Profile 15 (Al Ain Oasis Farm, Abu Dhabi - AED)
  [51, 15, 'Organic Fresh Mint & Coriander', 5, 'bunch', 6.00, 40, 'Lush herb bunches irrigated by ancient subterranean spring falaj.'],
  [52, 15, 'Sweet Oasis Brown Turkey Figs', 2, 'box', 22.00, 20, 'Honeyed purple figs ripened under date palm shade. 500 g box.'],
  [53, 15, 'Fresh Dhibs Date Syrup', 4, 'bottle', 18.00, 20, 'Slow-extracted unrefined pure date syrup for desserts and marinades. 450 g bottle.'],

  // Profile 16 (Emirates Date Palms & Pasture, Abu Dhabi - AED)
  [54, 16, 'Fresh Golden Barhi Dates', 2, 'kg', 24.00, 30, 'Crisp, sweet yellow dates in their crunchy season.'],
  [55, 16, 'Artisan Herb Goat Cheese', 3, 'pack', 25.00, 18, 'Creamy desert pasture goat cheese rolled in zaatar. 200 g pack.'],
  [56, 16, 'Roasted Date Seed Coffee', 4, 'bag', 20.00, 20, 'Caffeine-free aromatic roasted date seed grind with cardamom. 250 g bag.'],
];

export const CUSTOMERS = [
  // Lahore, PK
  [20, 'Sarah Ahmed', 'customer.sarah@marketlink.com', '+923214440201', 'House 42, Block C, Model Town, Lahore, Pakistan'],
  [21, 'Bilal Khan', 'customer.bilal@marketlink.com', '+923214440202', 'Sector J, Phase 5, DHA, Lahore, Pakistan'],
  [22, 'Ali Raza', 'customer.ali@marketlink.com', '+923214440203', 'Main Boulevard, Gulberg III, Lahore, Pakistan'],
  [23, 'Fatima Noor', 'customer.fatima@marketlink.com', '+923214440204', 'Canal View Society, Johar Town, Lahore, Pakistan'],

  // Karachi, PK
  [24, 'Sadia Rehman', 'customer.sadia@marketlink.com', '+923214440205', 'Block 4, Clifton, Karachi, Pakistan'],
  [25, 'Yasir Hamid', 'customer.yasir@marketlink.com', '+923214440206', 'Bahadurabad Society, Karachi, Pakistan'],
  [26, 'Nida Farooq', 'customer.nida@marketlink.com', '+923214440207', 'Gulshan-e-Iqbal Block 13, Karachi, Pakistan'],
  [27, 'Adeel Shah', 'customer.adeel@marketlink.com', '+923214440208', 'DHA Phase 6, Karachi, Pakistan'],

  // London, GB
  [28, 'Arthur Pendelton', 'customer.arthur@marketlink.com', '+442079460221', '14 Bermondsey St, Southwark, London, United Kingdom'],
  [29, 'Charlotte Davies', 'customer.charlotte@marketlink.com', '+442079460222', '22 South End Rd, Hampstead, London, United Kingdom'],
  [30, 'George Martin', 'customer.george@marketlink.com', '+442079460223', '55 Highgate West Hill, London, United Kingdom'],
  [31, 'Eleanor Vance', 'customer.eleanor@marketlink.com', '+442079460224', '10 Park Street, Borough, London, United Kingdom'],

  // Manchester, GB
  [32, 'Liam Gallagher', 'customer.liam@marketlink.com', '+441614960331', '5 Oldham St, Northern Quarter, Manchester, United Kingdom'],
  [33, 'Jessica Taylor', 'customer.jessica@marketlink.com', '+441614960332', '18 School Lane, Didsbury, Manchester, United Kingdom'],
  [34, 'Harrison Brown', 'customer.harrison@marketlink.com', '+441614960333', '42 Tib Street, Manchester, United Kingdom'],
  [35, 'Chloe Wood', 'customer.chloe@marketlink.com', '+441614960334', '9 Barlow Moor Rd, Didsbury, Manchester, United Kingdom'],

  // New York, US
  [36, 'David Cohen', 'customer.david@marketlink.com', '+12125550411', '85 4th Ave, Manhattan, New York, United States'],
  [37, 'Emily Watson', 'customer.emily@marketlink.com', '+12125550412', '120 8th Ave, Park Slope, New York, United States'],
  [38, 'Michael Chang', 'customer.michael@marketlink.com', '+12125550413', '14 Union Square West, New York, United States'],
  [39, 'Amanda Foster', 'customer.amanda@marketlink.com', '+12125550414', '75 Prospect Park West, Brooklyn, New York, United States'],

  // San Francisco, US
  [40, 'Lucas Zhang', 'customer.lucas@marketlink.com', '+14155550521', '250 Embarcadero, San Francisco, United States'],
  [41, 'Maya Patel', 'customer.maya@marketlink.com', '+14155550522', '780 Valencia St, Mission District, San Francisco, United States'],
  [42, 'Daniel Kim', 'customer.daniel@marketlink.com', '+14155550523', '101 Market St, Financial District, San Francisco, United States'],
  [43, 'Samantha Lee', 'customer.samantha@marketlink.com', '+14155550524', '3400 24th St, Mission District, San Francisco, United States'],

  // Dubai, AE
  [44, 'Tariq Al Hashemi', 'customer.tariq@marketlink.com', '+971501230611', 'Villa 12, Al Manara, Dubai, United Arab Emirates'],
  [45, 'Sophie Dubois', 'customer.sophie@marketlink.com', '+971501230612', 'Apt 1402, Downtown Dubai, Dubai, United Arab Emirates'],
  [46, 'Omar Al Futtaim', 'customer.omar@marketlink.com', '+971501230613', 'Villa 88, Jumeirah 1, Dubai, United Arab Emirates'],
  [47, 'Layla Kassem', 'customer.layla@marketlink.com', '+971501230614', 'City Walk Residence 3, Dubai, United Arab Emirates'],

  // Abu Dhabi, AE
  [48, 'Zayed Al Nahyan', 'customer.zayed@marketlink.com', '+971501230721', 'Corniche Towers, Al Bateen, Abu Dhabi, United Arab Emirates'],
  [49, 'Mariam Al Suwaidi', 'customer.mariam@marketlink.com', '+971501230722', 'Sector 18, Al Mushrif, Abu Dhabi, United Arab Emirates'],
  [50, 'Khaled Al Ketbi', 'customer.khaled@marketlink.com', '+971501230723', 'Al Khalidiya West, Abu Dhabi, United Arab Emirates'],
  [51, 'Nour Al Nuaimi', 'customer.nour@marketlink.com', '+971501230724', 'Al Zahiyah Promenade, Abu Dhabi, United Arab Emirates'],
];

const REVIEW_TEXT = {
  5: [
    'Everything was ready on time and the produce was pristine. Our weekly ritual now.',
    'The best fresh produce we have bought all season. Truly exceptional quality.',
    'Picked up in two minutes flat. Fresh, fairly priced and packed with great care.',
    'Consistently outstanding harvest and lovely friendly growers. Worth the morning visit.',
    'Absolutely delicious. You can taste the difference from supermarket produce instantly.',
  ],
  4: [
    'Very good produce quality. Stall queue moved briskly and pickup was seamless.',
    'Fresh and flavourful. Would love an additional later pickup window.',
    'Great harvest, one item was slightly smaller than expected but still top grade.',
    'Reliable and courteous service. Pricing is very fair for authentic smallholder food.',
  ],
  3: [
    'Good produce quality though the packing was slightly delayed when I arrived.',
    'Decent quality produce, though one bunch had slightly bruised outer leaves.',
  ],
};

const REPLIES = [
  'Thank you! See you at the stall next market day.',
  'Thank you for supporting our farm. We will keep your favourites aside.',
  'Thank you for the kind feedback. We are expanding packing tables for even faster pickups.',
  'Much appreciated! We have refined our field harvest timing to keep quality at its peak.',
];

export async function generateSeedData({ now = new Date() } = {}) {
  const rand = mulberry32(20260926);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (min, max) => min + Math.floor(rand() * (max - min + 1));

  const [adminHash, farmerHash, customerHash] = await Promise.all([
    hashPassword('Admin123!'),
    hashPassword('Farmer123!'),
    hashPassword('Customer123!'),
  ]);

  const today = now.toISOString().slice(0, 10);
  const bookable = firstBookableDate(now);
  const createdAt = new Date(now.getTime() - 120 * 86400000);

  const userId = (n) => oid('66f0', n);
  const profileId = (n) => oid('66f1', n);
  const marketId = (n) => oid('66f2', n);
  const categoryId = (n) => oid('66f3', n);
  const productId = (n) => oid('66f4', n);
  let windowSeq = 0;
  let offerSeq = 0;
  let orderSeq = 0;
  let reviewSeq = 0;

  // ── Users ──
  const users = [
    {
      _id: userId(1), email: 'admin@marketlink.com', passwordHash: adminHash, role: 'admin',
      name: 'Mehwish Raza', phone: '+923000000001', address: 'MarketLink Central Operations',
      isActive: true, createdAt, updatedAt: createdAt,
    },
    ...FARMERS.map((f) => ({
      _id: userId(f.user), email: f.email, passwordHash: farmerHash, role: 'farmer',
      name: f.person, phone: f.phone, address: f.location,
      isActive: true, createdAt, updatedAt: createdAt,
    })),
    ...CUSTOMERS.map(([n, name, email, phone, address], i) => ({
      _id: userId(n), email, passwordHash: customerHash, role: 'customer', name, phone, address,
      isActive: true, createdAt: new Date(createdAt.getTime() + i * 5 * 86400000), updatedAt: createdAt,
    })),
  ];
  const userById = new Map(users.map((u) => [u._id.toString(), u]));

  // ── Markets ──
  const markets = MARKETS.map((m) => ({
    _id: marketId(m.n),
    name: m.name,
    slug: m.slug,
    description: m.description,
    imageUrl: m.imageUrl,
    countryCode: m.countryCode,
    countryName: m.countryName,
    region: m.region,
    city: m.city,
    locality: m.locality,
    address: m.address,
    timezone: m.timezone,
    currency: m.currency,
    coordinates: { type: 'Point', coordinates: m.lngLat },
    operatingDays: m.days,
    operatingHours: { open: m.open, close: m.close },
    mapProvider: 'osm',
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  }));
  const marketByN = new Map(MARKETS.map((m) => [m.n, m]));

  // ── Categories ──
  const categories = CATEGORIES.map((c) => ({
    _id: categoryId(c.n),
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    isActive: true,
  }));

  // ── Farmer profiles ──
  const farmerProfiles = FARMERS.map((f) => ({
    _id: profileId(f.profile),
    userId: userId(f.user),
    businessName: f.business,
    contactPerson: f.person,
    phone: f.phone,
    email: f.email,
    address: f.location,
    countryCode: f.countryCode,
    countryName: f.countryName,
    city: f.city,
    bio: f.bio,
    story: f.story,
    specialties: f.specialties,
    farmingSince: f.since,
    stallNumber: f.stall,
    profileImageUrl: '',
    coverImageUrl: '',
    stallCoordinates: f.lngLat ? { type: 'Point', coordinates: f.lngLat } : null,
    approvalStatus: f.status,
    approvedAt: f.status === 'approved' ? createdAt : null,
    approvedBy: f.status === 'approved' ? userId(1) : null,
    suspensionReason: f.status === 'suspended' ? 'Stall documentation under review.' : null,
    marketIds: f.markets.map(marketId),
    operatingDays: [...new Set(f.markets.flatMap((n) => marketByN.get(n).days))],
    metrics: { rating: 0, reviewCount: 0 },
    createdAt: f.status === 'pending' ? new Date(now.getTime() - 2 * 86400000) : createdAt,
    updatedAt: createdAt,
  }));
  const farmerByProfile = new Map(FARMERS.map((f) => [f.profile, f]));

  // ── Products ──
  const products = PRODUCTS.map(([n, prof, name, cat, unit, price, , description]) => {
    const f = farmerByProfile.get(prof);
    const m = f.markets.length ? marketByN.get(f.markets[0]) : null;
    const prodCurrency = m?.currency || 'PKR';
    return {
      _id: productId(n),
      farmerId: profileId(prof),
      name,
      description,
      categoryId: categoryId(cat),
      unit,
      basePriceMinor: Math.round(price * 100),
      currency: prodCurrency,
      imageUrl: `/images/produce/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`,
      status: f.status === 'suspended' ? 'hidden' : 'active',
      isArchived: false,
      metrics: { rating: 0, reviewCount: 0 },
      createdAt,
      updatedAt: createdAt,
    };
  });
  const productByN = new Map(PRODUCTS.map((p) => [p[0], p]));
  const productsOf = (prof) => PRODUCTS.filter((p) => p[1] === prof);

  // ── Market occurrences ──
  const approvedFarmers = FARMERS.filter((f) => f.status === 'approved');
  const occurrences = [];
  for (const f of approvedFarmers) {
    for (const mn of f.markets) {
      const m = marketByN.get(mn);
      for (const date of upcomingDates(bookable, m.days, 2 * m.days.length)) {
        occurrences.push({ f, m, date, upcoming: true });
      }
      pastDates(bookable, m.days, HISTORY_WEEKS).forEach((date) => {
        const weeksAgo = Math.ceil((new Date(`${today}T00:00:00Z`) - new Date(`${date}T00:00:00Z`)) / (7 * 86400000));
        occurrences.push({ f, m, date, upcoming: false, weeksAgo });
      });
    }
  }

  const nextDates = new Map();
  for (const m of MARKETS) nextDates.set(m.n, upcomingDates(bookable, m.days, 1)[0]);

  // ── Pickup windows & stock offers (upcoming only) ──
  const pickupWindows = [];
  const stockOffers = [];
  const windowFor = new Map();
  const offerFor = new Map();

  for (const occ of occurrences.filter((o) => o.upcoming)) {
    const key = `${occ.f.profile}|${occ.m.n}|${occ.date}`;
    const tz = occ.m.timezone || 'Asia/Karachi';
    const cutoffAt = localTime(occ.date, '06:00', tz);
    const firstEnd = addMinutes(occ.m.open, 90);
    const wins = [
      [occ.m.open, firstEnd],
      [firstEnd, addMinutes(firstEnd, 90)],
    ].map(([startTime, endTime]) => ({
      _id: oid('66f5', ++windowSeq),
      farmerId: profileId(occ.f.profile),
      marketId: marketId(occ.m.n),
      date: occ.date,
      startTime,
      endTime,
      cutoffAt,
      maxCapacity: 25,
      currentReservations: 0,
      reservedOrdersCount: 0,
      createdAt,
      updatedAt: createdAt,
    }));
    pickupWindows.push(...wins);
    windowFor.set(key, wins);

    for (const [n, , , , unit, price, qty] of productsOf(occ.f.profile)) {
      const offer = {
        _id: oid('66f6', ++offerSeq),
        farmerId: profileId(occ.f.profile),
        marketId: marketId(occ.m.n),
        productId: productId(n),
        date: occ.date,
        priceMinor: Math.round(price * 100),
        currency: occ.m.currency,
        unit,
        totalQuantity: qty,
        reservedQuantity: 0,
        availableQuantity: qty,
        status: 'available',
        version: 1,
        createdAt,
        updatedAt: createdAt,
      };
      stockOffers.push(offer);
      offerFor.set(`${n}|${occ.m.n}|${occ.date}`, offer);
    }
  }

  // ── Orders ──
  const orders = [];
  const STATUS_FLOW = ['placed', 'accepted', 'ready_for_pickup', 'completed'];

  function buildOrder({ customer, occ, lines, status, windowIndex = 0, placedAt }) {
    const f = occ.f;
    const m = occ.m;
    const farmerUser = userById.get(userId(f.user).toString());
    const cust = userById.get(customer.toString());
    const wins = windowFor.get(`${f.profile}|${m.n}|${occ.date}`);
    const win = wins
      ? wins[windowIndex]
      : { _id: new ObjectId(), startTime: m.open, endTime: addMinutes(m.open, 90) };
    const tz = m.timezone || 'Asia/Karachi';
    const curr = m.currency || 'PKR';
    const cutoffAt = localTime(occ.date, '06:00', tz);

    const items = lines.map(([n, quantity]) => {
      const [, , name, , unit, price] = productByN.get(n);
      const minor = Math.round(price * 100);
      return { productId: productId(n), name, unit, unitPriceMinor: minor, quantity, subtotalMinor: minor * quantity };
    });
    const total = items.reduce((s, i) => s + i.subtotalMinor, 0);
    const placed = placedAt || new Date(localTime(occ.date, '06:00', tz).getTime() - between(20, 100) * 3600000);

    const history = [{ status: 'placed', changedBy: customer, role: 'customer', note: 'Pre-order placed.', timestamp: placed }];
    const stamp = (hoursAfterPlaced, capMinutesAgo = 10) =>
      new Date(Math.min(placed.getTime() + hoursAfterPlaced * 3600000, now.getTime() - capMinutesAgo * 60000));

    if (status === 'cancelled') {
      history.push({ status: 'cancelled', changedBy: customer, role: 'customer', note: 'Plans changed.', timestamp: stamp(6) });
    } else if (status === 'declined') {
      history.push({ status: 'declined', changedBy: farmerUser._id, role: 'farmer', note: 'Harvest smaller than expected.', timestamp: stamp(3) });
    } else {
      const reach = STATUS_FLOW.indexOf(status);
      if (reach >= 1) history.push({ status: 'accepted', changedBy: farmerUser._id, role: 'farmer', note: 'Accepted.', timestamp: stamp(2, 40) });
      if (reach >= 2) history.push({ status: 'ready_for_pickup', changedBy: farmerUser._id, role: 'farmer', note: 'Packed and ready at the stall.', timestamp: occ.upcoming ? stamp(8) : localTime(occ.date, win.startTime, tz) });
      if (reach >= 3) history.push({ status: 'completed', changedBy: farmerUser._id, role: 'farmer', note: 'Collected and paid at the stall.', timestamp: new Date(localTime(occ.date, win.startTime, tz).getTime() + between(10, 80) * 60000) });
    }

    const updatedAt = history[history.length - 1].timestamp;
    const seq = ++orderSeq;
    return {
      _id: oid('66f7', seq),
      orderNumber: `ML-${occ.date.replace(/-/g, '')}-${(0x1a2b + seq * 7919).toString(16).toUpperCase().slice(-4).padStart(4, '0')}`,
      checkoutGroupId: `CG-${seq}`,
      customerId: customer,
      customerSnapshot: { name: cust.name, phone: cust.phone, email: cust.email },
      farmerId: farmerUser._id,
      farmerProfileId: profileId(f.profile),
      farmerSnapshot: { businessName: f.business, contactPerson: f.person, stallNumber: f.stall, phone: f.phone },
      marketId: marketId(m.n),
      marketSnapshot: { name: m.name, address: m.address, city: m.city, countryCode: m.countryCode, timezone: tz, currency: curr },
      marketDate: occ.date,
      pickupWindow: { id: win._id.toString(), startTime: win.startTime, endTime: win.endTime, cutoffAt: cutoffAt.toISOString() },
      pickupWindowId: win._id,
      items,
      totalAmountMinor: total,
      currency: curr,
      status,
      payment: {
        method: 'pay_at_pickup',
        status: status === 'completed' ? 'collected' : ['cancelled', 'declined'].includes(status) ? 'void' : 'pending_pickup',
        paidAmountMinor: status === 'completed' ? total : 0,
      },
      customerNotes: '',
      statusHistory: history,
      createdAt: placed,
      updatedAt,
    };
  }

  const randomLines = (profile, maxLines = 3) => {
    const pool = [...productsOf(profile)];
    const count = Math.min(pool.length, between(1, maxLines));
    const lines = [];
    for (let i = 0; i < count; i++) {
      const [p] = pool.splice(Math.floor(rand() * pool.length), 1);
      lines.push([p[0], between(1, p[5] >= 500 ? 1 : 3)]);
    }
    return lines;
  };

  const customersInCity = (city) => {
    const local = CUSTOMERS.filter(([, , , , address]) => address.toLowerCase().includes(city.toLowerCase())).map(([n]) => userId(n));
    return local.length ? local : CUSTOMERS.map(([n]) => userId(n));
  };

  // Past Orders: History across all markets
  for (const occ of occurrences.filter((o) => !o.upcoming)) {
    const base = 2 + Math.round((HISTORY_WEEKS - occ.weeksAgo) * 0.4);
    const count = Math.max(1, base + between(-1, 1));
    const cityPool = customersInCity(occ.m.city);
    const pool = cityPool.filter((c) => !c.equals(userId(20)));
    const activePool = pool.length ? pool : cityPool;
    for (let i = 0; i < count; i++) {
      const r = rand();
      const status = r < 0.05 ? 'cancelled' : r < 0.09 ? 'declined' : 'completed';
      orders.push(buildOrder({ customer: pick(activePool), occ, lines: randomLines(occ.f.profile), status, windowIndex: between(0, 1) }));
    }
  }

  // Upcoming Orders: Open reservations for nearest market day
  const nearestOccurrences = occurrences.filter((o) => o.upcoming && o.date === nextDates.get(o.m.n));
  for (const occ of nearestOccurrences) {
    const count = between(1, 3);
    const cityPool = customersInCity(occ.m.city);
    const pool = cityPool.filter((c) => !c.equals(userId(20)) && !c.equals(userId(21)));
    const activePool = pool.length ? pool : cityPool;
    for (let i = 0; i < count; i++) {
      const r = rand();
      const status = r < 0.5 ? 'placed' : r < 0.85 ? 'accepted' : 'ready_for_pickup';
      const lines = randomLines(occ.f.profile, 2);
      if (!lines.length) continue;
      orders.push(buildOrder({ customer: pick(activePool), occ, lines, status, windowIndex: between(0, 1), placedAt: new Date(now.getTime() - between(2, 60) * 3600000) }));
    }
  }

  // Sarah Ahmed & Bilal Khan (Lahore story)
  const sarah = userId(20);
  const bilal = userId(21);
  const occOf = (profile, market, date) => occurrences.find((o) => o.f.profile === profile && o.m.n === market && o.date === date);
  const orchardNext = nextDates.get(1);

  const sarahUpcoming = [
    [occOf(1, 1, orchardNext), [[1, 2], [2, 2]], 'placed', 0],
    [occOf(2, 1, orchardNext), [[5, 2], [7, 1]], 'accepted', 0],
  ];
  for (const [occ, lines, status, windowIndex] of sarahUpcoming) {
    if (occ) orders.push(buildOrder({ customer: sarah, occ, lines, status, windowIndex, placedAt: new Date(now.getTime() - between(3, 30) * 3600000) }));
  }

  const orchardPast = pastDates(bookable, [6], HISTORY_WEEKS);
  const sarahHistory = [
    [1, [[1, 2], [3, 1]]],
    [2, [[5, 2]]],
    [1, [[1, 3], [2, 2]]],
    [2, [[6, 2], [8, 1]]],
  ];
  sarahHistory.forEach(([profile, lines], i) => {
    const date = orchardPast[orchardPast.length - sarahHistory.length + i];
    const occ = occOf(profile, 1, date);
    if (occ) orders.push(buildOrder({ customer: sarah, occ, lines, status: 'completed', windowIndex: 0 }));
  });

  const libertyNext = nextDates.get(2);
  const bilalOcc = occOf(1, 2, libertyNext);
  if (bilalOcc) orders.push(buildOrder({ customer: bilal, occ: bilalOcc, lines: [[1, 2], [3, 1]], status: 'placed', windowIndex: 0, placedAt: new Date(now.getTime() - 5 * 3600000) }));

  // Reserve stock and pickup-window capacity from open orders only
  for (const o of orders) {
    if (!['placed', 'accepted', 'ready_for_pickup'].includes(o.status)) continue;
    const mN = MARKETS.find((m) => marketId(m.n).equals(o.marketId)).n;
    for (const item of o.items) {
      const pN = PRODUCTS.find((p) => productId(p[0]).equals(item.productId))[0];
      const offer = offerFor.get(`${pN}|${mN}|${o.marketDate}`);
      if (offer) offer.reservedQuantity += item.quantity;
    }
    const win = pickupWindows.find((w) => w._id.equals(o.pickupWindowId));
    if (win) {
      win.currentReservations += 1;
      win.reservedOrdersCount += 1;
    }
  }

  for (const offer of stockOffers) {
    offer.totalQuantity = Math.max(offer.totalQuantity, offer.reservedQuantity);
    offer.availableQuantity = offer.totalQuantity - offer.reservedQuantity;
    if (offer.availableQuantity === 0) offer.status = 'sold_out';
  }

  // ── Reviews ──
  const reviews = [];
  const completed = orders.filter((o) => o.status === 'completed');
  const sarahLatest = completed.filter((o) => o.customerId.equals(sarah)).sort((a, b) => b.marketDate.localeCompare(a.marketDate))[0];

  for (const o of completed) {
    if (sarahLatest && o._id.equals(sarahLatest._id)) continue;
    if (rand() > 0.65) continue;
    const r = rand();
    const rating = r < 0.65 ? 5 : r < 0.92 ? 4 : 3;
    const at = new Date(Math.min(o.updatedAt.getTime() + between(2, 30) * 3600000, now.getTime() - 3600000));
    const base = {
      orderId: o._id, customerId: o.customerId, customerName: o.customerSnapshot.name, farmerId: o.farmerId,
      moderationStatus: 'approved', createdAt: at, updatedAt: at,
    };
    const farmerReply = rand() < 0.45
      ? { replyText: rating === 3 ? pick(REPLIES.slice(2)) : pick(REPLIES.slice(0, 2)), repliedAt: new Date(at.getTime() + 5 * 3600000) }
      : null;
    reviews.push({ _id: oid('66f8', ++reviewSeq), ...base, targetType: 'farmer', targetId: o.farmerProfileId, rating, comment: pick(REVIEW_TEXT[rating]), farmerReply });
    if (rand() < 0.45) {
      const item = pick(o.items);
      const pr = Math.min(5, rating + (rand() < 0.3 ? 1 : 0));
      reviews.push({ _id: oid('66f8', ++reviewSeq), ...base, targetType: 'product', targetId: item.productId, rating: pr, comment: pick(REVIEW_TEXT[pr]), farmerReply: null });
    }
  }

  // Moderation flag review
  const flagSource = completed.filter((o) => !reviews.some((r) => r.orderId.equals(o._id)) && !(sarahLatest && o._id.equals(sarahLatest._id)));
  if (flagSource.length) {
    const o = flagSource[0];
    const at = new Date(o.updatedAt.getTime() + 4 * 3600000);
    reviews.push({
      _id: oid('66f8', ++reviewSeq), orderId: o._id, customerId: o.customerId, customerName: o.customerSnapshot.name,
      farmerId: o.farmerId, targetType: 'farmer', targetId: o.farmerProfileId, rating: 1,
      comment: 'Reported unsolicited commercial message at stall pickup.',
      farmerReply: null, moderationStatus: 'flagged', moderationReason: 'Contains contact details / solicitation',
      createdAt: at, updatedAt: at,
    });
  }

  // Ratings calculated from approved reviews
  const ratingOf = (targetType, id) => {
    const rs = reviews.filter((r) => r.targetType === targetType && r.targetId.equals(id) && r.moderationStatus === 'approved');
    if (!rs.length) return { rating: 0, reviewCount: 0 };
    return { rating: Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10, reviewCount: rs.length };
  };
  for (const p of farmerProfiles) p.metrics = ratingOf('farmer', p._id);
  for (const p of products) p.metrics = ratingOf('product', p._id);

  // ── Favourites, alerts, templates ──
  const favourites = [
    { customerId: sarah, targetType: 'farmer', targetId: profileId(1), createdAt },
    { customerId: sarah, targetType: 'farmer', targetId: profileId(2), createdAt },
    { customerId: sarah, targetType: 'product', targetId: productId(1), createdAt },
    { customerId: sarah, targetType: 'market', targetId: marketId(1), createdAt },
    { customerId: bilal, targetType: 'farmer', targetId: profileId(1), createdAt },
  ];

  const restockAlerts = [];

  const weeklyStockTemplates = [
    {
      farmerId: profileId(1), marketId: marketId(1), dayOfWeek: 6,
      items: productsOf(1).map(([n, , , , unit, price, qty]) => ({ productId: productId(n), defaultQuantity: qty, defaultPriceMinor: Math.round(price * 100), unit })),
      createdAt, updatedAt: createdAt,
    },
    {
      farmerId: profileId(5), marketId: marketId(5), dayOfWeek: 6,
      items: productsOf(5).map(([n, , , , unit, price, qty]) => ({ productId: productId(n), defaultQuantity: qty, defaultPriceMinor: Math.round(price * 100), unit })),
      createdAt, updatedAt: createdAt,
    },
  ];

  // ── Notifications ──
  const notif = (user, type, title, message, data, hoursAgo, isRead = false) => ({
    userId: user, type, title, message, data, isRead, createdAt: new Date(now.getTime() - hoursAgo * 3600000),
  });
  const sarahOrders = orders.filter((o) => o.customerId.equals(sarah) && o.marketDate === orchardNext);
  const acceptedOrder = sarahOrders.find((o) => o.status === 'accepted');
  const placedGreenfield = sarahOrders.find((o) => o.status === 'placed');

  const notifications = [
    acceptedOrder && notif(sarah, 'order_accepted', 'Order accepted', `${acceptedOrder.farmerSnapshot.businessName} accepted order ${acceptedOrder.orderNumber}.`, { orderId: acceptedOrder._id.toString() }, 9),
    placedGreenfield && notif(userId(2), 'order_received', 'New pre-order received', `Order ${placedGreenfield.orderNumber} from Sarah Ahmed needs your response.`, { orderId: placedGreenfield._id.toString() }, 4),
    notif(userId(2), 'review_received', 'New 5★ review', 'A customer left a five-star review for Greenfield Farm.', {}, 30, true),
    notif(userId(1), 'farmer_application', 'New grower application', 'Margalla Dairy has applied to join. Review their documents.', { farmerProfileId: profileId(17).toString() }, 30),
  ].filter(Boolean);

  // ── Announcements & inquiries ──
  const announcements = [
    {
      title: 'Global seasonal growers expansion',
      message: 'MarketLink now connects local certified growers across 4 countries with direct pre-orders and scheduled pickups.',
      type: 'market_update', marketId: null, priority: 'normal', isActive: true,
      createdBy: userId(1), createdAt: new Date(now.getTime() - 2 * 86400000), updatedAt: new Date(now.getTime() - 2 * 86400000),
    },
    {
      title: 'Zero plastic initiative at weekend markets',
      message: 'All attending growers are eliminating single-use plastic bags. Bring reusable market bags and glass bottles for milk.',
      type: 'general', marketId: null, priority: 'normal', isActive: true,
      createdBy: userId(1), createdAt: new Date(now.getTime() - 5 * 86400000), updatedAt: new Date(now.getTime() - 5 * 86400000),
    },
    {
      title: 'Winter hours at The Orchard Market',
      message: 'Saturday pickups open at 08:00 sharp. Reserve by 06:00 on Saturday morning.',
      type: 'market_update', marketId: marketId(1), priority: 'normal', isActive: true,
      createdBy: userId(1), createdAt: new Date(now.getTime() - 7 * 86400000), updatedAt: new Date(now.getTime() - 7 * 86400000),
    },
  ];

  const contactInquiries = [
    { name: 'Rabia Anwar', email: 'rabia.anwar@example.com', phone: '', subject: 'Selling at Liberty Green', message: 'I grow organic lemons in Kasur. How do I apply for a stall at Liberty Green Market?', status: 'new', createdAt: new Date(now.getTime() - 26 * 3600000), updatedAt: new Date(now.getTime() - 26 * 3600000) },
    { name: 'Kamran Aziz', email: 'kamran.aziz@example.com', phone: '+923331112233', subject: 'Parking at The Orchard Market', message: 'Is there parking near Gate 3 on Saturday mornings?', status: 'in_progress', createdAt: new Date(now.getTime() - 4 * 86400000), updatedAt: new Date(now.getTime() - 3 * 86400000) },
    { name: 'Eleanor Vance', email: 'eleanor.vance@example.co.uk', phone: '+442079460999', subject: 'London artisan produce', message: 'Do the growers at Borough Heritage offer gluten-free sourdough?', status: 'new', createdAt: new Date(now.getTime() - 12 * 3600000), updatedAt: new Date(now.getTime() - 12 * 3600000) },
  ];

  return {
    users, farmerProfiles, markets, categories, products, pickupWindows, stockOffers, orders, reviews,
    favourites, restockAlerts, weeklyStockTemplates, notifications, announcements, contactInquiries,
  };
}
