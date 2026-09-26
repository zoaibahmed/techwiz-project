import { ObjectId } from 'mongodb';
import { hashPassword } from '../utils/token.js';
import { env } from '../config/env.js';
import { firstBookableDate } from '../services/metrics.service.js';

/**
 * MarketLink seed dataset (Lahore pilot).
 *
 * Every date is computed relative to "now" so the next market day is always
 * upcoming, and history covers the previous eight weeks. All derived values
 * (reserved stock, pickup-window counts, ratings) are computed from the
 * generated orders and reviews, so every screen and report agrees.
 * A seeded PRNG keeps the dataset identical between runs.
 */

const TZ_OFFSET_HOURS = 5; // Asia/Karachi (no DST)
const HISTORY_WEEKS = 8;

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

/** YYYY-MM-DD of `date` in Pakistan time. */
function pkDate(date) {
  return new Date(date.getTime() + TZ_OFFSET_HOURS * 3600000).toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const weekday = (isoDate) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();

/** A Pakistan-local wall-clock time on a date, as a UTC Date. */
function pkTime(isoDate, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(...isoDate.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))), h - TZ_OFFSET_HOURS, m));
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

const MARKETS = [
  {
    n: 1,
    name: 'The Orchard Market',
    slug: 'the-orchard-market',
    locality: 'Model Town',
    address: 'Model Town Park, Gate 3, Lahore',
    lngLat: [74.3214, 31.4822],
    days: [6],
    open: '08:00',
    close: '13:00',
    description: 'A shaded Saturday market under the old neem trees of Model Town Park. The city’s longest-running growers’ morning.',
    imageUrl: '/images/market.jpg',
  },
  {
    n: 2,
    name: 'Liberty Green Market',
    slug: 'liberty-green-market',
    locality: 'Gulberg III',
    address: 'Liberty Roundabout, Main Boulevard, Gulberg III, Lahore',
    lngLat: [74.3446, 31.5102],
    days: [6, 0],
    open: '08:30',
    close: '14:00',
    description: 'A weekend market in the heart of Gulberg with orchard fruit, dairy and a lively Sunday crowd.',
    imageUrl: '/images/market-arrival.jpg',
  },
  {
    n: 3,
    name: 'Sunday at the Grove',
    slug: 'sunday-at-the-grove',
    locality: 'DHA Phase 5',
    address: 'Sector J Park, DHA Phase 5, Lahore',
    lngLat: [74.4086, 31.4636],
    days: [0],
    open: '08:00',
    close: '12:30',
    description: 'A calm Sunday gathering for bakers, herb growers and small dairies, a short walk from the lake.',
    imageUrl: '/images/harvest.jpg',
  },
  {
    n: 4,
    name: 'Canal Bank Morning Market',
    slug: 'canal-bank-morning-market',
    locality: 'Johar Town',
    address: 'Canal Bank Road near Emporium, Johar Town, Lahore',
    lngLat: [74.2667, 31.4697],
    days: [6],
    open: '07:30',
    close: '11:30',
    description: 'An early market along the canal. Come at opening for the best orchard fruit.',
    imageUrl: '/images/market-person.jpg',
  },
  {
    n: 5,
    name: 'Margalla Sunday Bazaar',
    slug: 'margalla-sunday-bazaar',
    locality: 'F-9 Park',
    city: 'Islamabad',
    region: 'Islamabad Capital Territory',
    address: 'F-9 Fatima Jinnah Park, East Gate, Islamabad',
    lngLat: [73.0243, 33.7018],
    days: [0],
    open: '08:00',
    close: '12:30',
    description: 'A Sunday market at the foot of the Margalla Hills, known for hill honey and cool-season greens.',
    imageUrl: '/images/harvest.jpg',
  },
  {
    n: 6,
    name: 'Blue Area Growers Market',
    slug: 'blue-area-growers-market',
    locality: 'Blue Area',
    city: 'Islamabad',
    region: 'Islamabad Capital Territory',
    address: 'Jinnah Avenue Plaza, Blue Area, Islamabad',
    lngLat: [73.0629, 33.7104],
    days: [6],
    open: '08:30',
    close: '13:00',
    description: 'A Saturday market for the city centre, with office-friendly early pickup windows.',
    imageUrl: '/images/market.jpg',
  },
  {
    n: 7,
    name: 'Clifton Seaside Market',
    slug: 'clifton-seaside-market',
    locality: 'Clifton Block 5',
    city: 'Karachi',
    region: 'Sindh',
    address: 'Bagh Ibn-e-Qasim, Clifton Block 5, Karachi',
    lngLat: [67.0291, 24.8138],
    days: [6, 0],
    open: '07:30',
    close: '12:00',
    description: 'A breezy weekend market by the sea, strong on Sindhi mangoes, dates and bakery.',
    imageUrl: '/images/market-arrival.jpg',
  },
  {
    n: 8,
    name: 'Bahadurabad Morning Market',
    slug: 'bahadurabad-morning-market',
    locality: 'Bahadurabad',
    city: 'Karachi',
    region: 'Sindh',
    address: 'Bahadurabad Chowrangi, Karachi',
    lngLat: [67.0702, 24.8826],
    days: [0],
    open: '07:00',
    close: '11:00',
    description: 'An early Sunday market for families in central Karachi.',
    imageUrl: '/images/market-person.jpg',
  },
];

const CATEGORIES = [
  { n: 1, name: 'Fresh Vegetables', slug: 'fresh-vegetables', icon: 'carrot', description: 'Seasonal greens, roots and field vegetables.' },
  { n: 2, name: 'Orchard Fruits', slug: 'orchard-fruits', icon: 'apple', description: 'Tree fruit, citrus and berries picked for market day.' },
  { n: 3, name: 'Dairy & Eggs', slug: 'dairy-eggs', icon: 'egg', description: 'Fresh milk, dahi, paneer and free-range desi eggs.' },
  { n: 4, name: 'Pantry & Honey', slug: 'pantry-honey', icon: 'jar', description: 'Raw honey, dried fruit and small-batch pantry goods.' },
  { n: 5, name: 'Fresh Herbs', slug: 'fresh-herbs', icon: 'leaf', description: 'Cut-to-order herbs and aromatic bunches.' },
  { n: 6, name: 'Bakery', slug: 'bakery', icon: 'wheat', description: 'Slow-fermented loaves and traditional bakes.' },
];

// user n, profile n, business, person, email, status, markets, days, stall, bio, story, since
const FARMERS = [
  {
    user: 2, profile: 1, business: 'Greenfield Farm', person: 'Tariq Mahmood', email: 'farmer.greenfield@marketlink.com',
    phone: '+923005550101', status: 'approved', markets: [1, 2], stall: 'A-14', since: 2011,
    location: 'Bedian Road, Lahore', lngLat: [74.4671, 31.4402],
    bio: 'Three generations growing tomatoes, greens and summer vegetables on eleven acres off Bedian Road.',
    story: 'Tariq took over his father’s fields in 2011 and moved them away from synthetic sprays one plot at a time. Everything on the stall was picked the evening before market.',
    specialties: ['Heirloom tomatoes', 'Leafy greens', 'Summer vegetables'],
  },
  {
    user: 3, profile: 2, business: 'Indus Valley Orchards', person: 'Khurram Shahzad', email: 'farmer.indus@marketlink.com',
    phone: '+923005550102', status: 'approved', markets: [1, 4], stall: 'B-03', since: 2015,
    location: 'Changa Manga, Kasur', lngLat: [74.0263, 31.0822],
    bio: 'Strawberries, guavas and wild-blossom honey from the edge of the Changa Manga forest.',
    story: 'Khurram keeps forty hives among his guava trees. The honey is cold-extracted and the berries are picked at first light on market mornings.',
    specialties: ['Strawberries', 'Raw honey', 'Guavas'],
  },
  {
    user: 4, profile: 3, business: 'Margalla Dairy', person: 'Rashid Minhas', email: 'farmer.pending@marketlink.com',
    phone: '+923005550103', status: 'pending', markets: [], stall: '', since: 2019,
    location: 'Rawat, Rawalpindi', lngLat: null,
    bio: 'Small-herd dairy applying to bring fresh cheese and cream to Lahore markets.',
    story: 'A family dairy with twelve cows, applying for its first Lahore market.',
    specialties: ['Fresh cheese', 'Cream'],
  },
  {
    user: 7, profile: 4, business: 'The Kitchen Garden', person: 'Ayesha Siddiqui', email: 'farmer.kitchengarden@marketlink.com',
    phone: '+923005550104', status: 'approved', markets: [1, 3], stall: 'C-07', since: 2018,
    location: 'Raiwind Road, Lahore', lngLat: [74.2253, 31.3891],
    bio: 'Herbs and salad leaves grown in raised beds and cut to order the morning of market.',
    story: 'Ayesha started with a rooftop of mint in 2018. Today the garden supplies herbs, salad leaves and lemongrass to two markets every weekend.',
    specialties: ['Fresh herbs', 'Salad leaves'],
  },
  {
    user: 8, profile: 5, business: 'Ravi Riverside Orchards', person: 'Hamza Qureshi', email: 'farmer.ravi@marketlink.com',
    phone: '+923005550105', status: 'approved', markets: [2, 4], stall: 'D-11', since: 2008,
    location: 'Shahdara, Lahore', lngLat: [74.2871, 31.6231],
    bio: 'Kinnow, pomegranate and banana from riverside orchards north of the Ravi.',
    story: 'Hamza’s orchards sit on the old Ravi floodplain. The kinnow season is his busiest; come early on Saturdays.',
    specialties: ['Kinnow', 'Pomegranates', 'Fruit baskets'],
  },
  {
    user: 9, profile: 6, business: 'Sheikhupura Dairy Co.', person: 'Nadia Iqbal', email: 'farmer.sheikhupura@marketlink.com',
    phone: '+923005550106', status: 'approved', markets: [2, 3], stall: 'E-02', since: 2016,
    location: 'Sheikhupura Road', lngLat: [74.1127, 31.7131],
    bio: 'Buffalo milk, set dahi, handmade paneer and free-range desi eggs from a forty-animal family farm.',
    story: 'Nadia runs the dairy with her two brothers. Milk is chilled within the hour and paneer is pressed the night before market.',
    specialties: ['Fresh milk', 'Paneer', 'Desi eggs'],
  },
  {
    user: 10, profile: 7, business: 'Baker’s Hearth', person: 'Omar Farooq', email: 'farmer.hearth@marketlink.com',
    phone: '+923005550107', status: 'approved', markets: [1, 3], stall: 'F-05', since: 2020,
    location: 'Garden Town, Lahore', lngLat: [74.3190, 31.5061],
    bio: 'Slow-fermented sourdough and traditional nan khatai baked in a wood-fired oven.',
    story: 'Omar bakes through the night before each market. The sourdough starter is older than the bakery itself.',
    specialties: ['Sourdough', 'Nan khatai'],
  },
  {
    user: 11, profile: 8, business: 'Grove Harvest', person: 'Bilquis Akhtar', email: 'farmer.grove@marketlink.com',
    phone: '+923005550108', status: 'suspended', markets: [3], stall: 'G-01', since: 2021,
    location: 'Bahria Town, Lahore', lngLat: [74.1852, 31.3665],
    bio: 'Cherry tomatoes and microgreens.',
    story: 'Stall paused while documentation is reviewed.',
    specialties: ['Cherry tomatoes'],
  },
  {
    user: 22, profile: 9, business: 'Margalla Hill Honey', person: 'Sana Abbasi', email: 'farmer.margalla@marketlink.com',
    phone: '+923005550109', status: 'approved', markets: [5, 6], stall: 'H-02', since: 2014,
    location: 'Shah Allah Ditta, Islamabad', lngLat: [72.9547, 33.7236],
    bio: 'Wild-flower and acacia honey from hives in the Margalla foothills.',
    story: 'Sana moves her hives with the flowering season, from acacia in spring to wildflower in autumn. Every jar is labelled with the week it was harvested.',
    specialties: ['Raw honey', 'Beeswax'],
  },
  {
    user: 23, profile: 10, business: 'Potohar Greens', person: 'Faisal Kiani', email: 'farmer.potohar@marketlink.com',
    phone: '+923005550110', status: 'approved', markets: [5, 6], stall: 'H-07', since: 2017,
    location: 'Tarnol, Islamabad', lngLat: [72.9239, 33.6617],
    bio: 'Cool-season greens and root vegetables from the Potohar plateau.',
    story: 'Faisal grows on terraced plots outside Tarnol, where cooler nights keep the spinach and radishes sweet well into spring.',
    specialties: ['Leafy greens', 'Radishes', 'Turnips'],
  },
  {
    user: 24, profile: 11, business: 'Sindh Date Orchard', person: 'Zubair Memon', email: 'farmer.sindhdate@marketlink.com',
    phone: '+923005550111', status: 'approved', markets: [7, 8], stall: 'K-04', since: 2006,
    location: 'Khairpur, Sindh', lngLat: [68.7612, 27.5295],
    bio: 'Aseel dates and Sindhri mangoes from a third-generation orchard in Khairpur.',
    story: 'The Memon family has grown Aseel dates in Khairpur for three generations. In summer the orchard sends Sindhri mangoes to Karachi twice a week.',
    specialties: ['Aseel dates', 'Sindhri mangoes'],
  },
  {
    user: 25, profile: 12, business: 'Seaside Sourdough', person: 'Hira Baig', email: 'farmer.seaside@marketlink.com',
    phone: '+923005550112', status: 'approved', markets: [7], stall: 'K-11', since: 2019,
    location: 'DHA Phase 6, Karachi', lngLat: [67.0614, 24.7995],
    bio: 'Sourdough, focaccia and date-sweetened cakes baked in Karachi.',
    story: 'Hira left an office job to bake full-time in 2019. Her date and walnut cake uses fruit from the neighbouring Khairpur stall.',
    specialties: ['Sourdough', 'Focaccia'],
  },
  {
    user: 26, profile: 13, business: 'Malir Farm Fresh', person: 'Rehan Siddiqui', email: 'farmer.malir@marketlink.com',
    phone: '+923005550113', status: 'approved', markets: [7, 8], stall: 'K-15', since: 2012,
    location: 'Malir, Karachi', lngLat: [67.2083, 24.9456],
    bio: 'Tomatoes, gourds, chillies and papaya from Malir’s last working farms.',
    story: 'Rehan farms eight acres in Malir that have been in vegetable production since the 1970s, supplying Karachi kitchens every weekend.',
    specialties: ['Tomatoes', 'Gourds', 'Papaya'],
  },
];

// n, profile, name, category, unit, price (Rs), qty per market day, description
const PRODUCTS = [
  [1, 1, 'Heirloom Beefsteak Tomatoes', 1, 'kg', 350, 40, 'Vine-ripened heritage tomatoes with a deep, sweet flavour. Picked the evening before market.'],
  [2, 1, 'Desi Spinach (Palak)', 1, 'bunch', 80, 30, 'Tender, dark-green leaves, washed and bundled. Ideal for saag and palak paneer.'],
  [3, 1, 'Salad Cucumbers', 1, 'kg', 150, 30, 'Crunchy, thin-skinned cucumbers for raita and summer salads.'],
  [9, 1, 'Lady Finger (Bhindi)', 1, 'kg', 220, 20, 'Young, tender okra picked small so it stays crisp in the pan.'],
  [10, 1, 'Rainbow Carrots', 1, 'bunch', 120, 25, 'Purple, orange and yellow carrots with their tops on. Sweet enough to eat raw.'],
  [4, 2, 'Field Strawberries', 2, 'box', 450, 20, 'Fragrant strawberries picked at first light and packed in 500 g card punnets.'],
  [5, 2, 'Wild-Blossom Honey', 4, 'jar', 1250, 15, 'Raw, cold-extracted honey from hives among guava and sidr trees. 500 g jar.'],
  [11, 2, 'Guavas', 2, 'kg', 180, 30, 'Pink-fleshed Larkana-type guavas, ripe for eating within two days.'],
  [12, 2, 'Sun-Dried Apricots', 4, 'pack', 600, 18, 'Hunza-style apricots, sun-dried without sulphur. 250 g pack.'],
  [13, 4, 'Fresh Mint (Podina)', 5, 'bunch', 50, 40, 'Cut-to-order garden mint for chutney, raita and chai.'],
  [14, 4, 'Coriander (Dhania)', 5, 'bunch', 40, 40, 'Fragrant coriander with roots on, cut the morning of market.'],
  [15, 4, 'Sweet Basil', 5, 'bunch', 90, 20, 'Italian sweet basil for pesto, salads and pasta.'],
  [16, 4, 'Lemongrass', 5, 'bunch', 70, 20, 'Aromatic stalks for tea, curries and soups.'],
  [17, 4, 'Mixed Salad Leaves', 1, 'bag', 260, 20, 'A washed 250 g mix of lettuces, rocket and baby spinach.'],
  [18, 5, 'Kinnow Mandarins', 2, 'dozen', 320, 30, 'Juicy, easy-peel kinnow from the new-season harvest.'],
  [19, 5, 'Pomegranates', 2, 'kg', 480, 25, 'Deep-red Kandhari-type pomegranates with sweet, jewel-like seeds.'],
  [20, 5, 'Bananas', 2, 'dozen', 180, 30, 'Small, sweet riverside bananas, ripening over three to four days.'],
  [21, 5, 'Seasonal Fruit Basket', 2, 'basket', 1400, 10, 'A 4 kg basket of the week’s best orchard fruit. Contents vary with the season.'],
  [22, 6, 'Fresh Buffalo Milk', 3, 'litre', 220, 40, 'Whole buffalo milk, chilled within the hour of milking. Bring a bottle or buy one at the stall.'],
  [23, 6, 'Desi Eggs', 3, 'dozen', 480, 25, 'Free-range desi eggs from hens raised on open ground.'],
  [24, 6, 'Handmade Paneer', 3, 'pack', 650, 15, 'Soft paneer pressed the night before market. 500 g pack.'],
  [25, 6, 'Set Dahi (Yoghurt)', 3, 'kg', 260, 20, 'Thick, clay-pot set dahi made from whole buffalo milk.'],
  [26, 7, 'Country Sourdough Loaf', 6, 'loaf', 900, 16, 'A 900 g naturally leavened loaf with a crackling, dark crust.'],
  [27, 7, 'Multigrain Sandwich Bread', 6, 'loaf', 450, 20, 'Soft multigrain loaf with flax, sunflower and oats.'],
  [28, 7, 'Nan Khatai', 6, 'box', 550, 20, 'Traditional cardamom shortbread, baked in a wood-fired oven. Box of 12.'],
  [29, 7, 'Banana Walnut Loaf', 6, 'loaf', 800, 12, 'A moist banana loaf with toasted walnuts and a touch of jaggery.'],
  [30, 8, 'Cherry Tomatoes', 1, 'box', 300, 0, 'Sweet cherry tomatoes. 250 g box.'],
  [31, 9, 'Acacia Honey', 4, 'jar', 1400, 14, 'Light, floral acacia honey from spring hives in the Margalla foothills. 500 g jar.'],
  [32, 9, 'Wildflower Honey', 4, 'jar', 1150, 16, 'A darker autumn honey with notes of wild thyme. 500 g jar.'],
  [33, 9, 'Beeswax Candles', 4, 'pack', 700, 10, 'Hand-poured beeswax candles from the same hives. Pack of 2.'],
  [34, 10, 'Winter Spinach', 1, 'bunch', 90, 30, 'Sweet, cold-grown spinach with thick leaves.'],
  [35, 10, 'White Radishes (Mooli)', 1, 'kg', 120, 25, 'Crisp mooli for parathas and salads.'],
  [36, 10, 'Purple Turnips (Shaljam)', 1, 'kg', 110, 20, 'Tender shaljam, ideal for winter curries.'],
  [37, 10, 'Fresh Coriander', 5, 'bunch', 45, 30, 'Cut the morning of market, roots on.'],
  [38, 11, 'Aseel Dates', 2, 'box', 950, 20, 'Soft, caramel-sweet Aseel dates from Khairpur. 1 kg box.'],
  [39, 11, 'Sindhri Mangoes', 2, 'box', 1800, 12, 'A 5 kg box of fragrant Sindhri mangoes, in season.'],
  [40, 11, 'Date Paste', 4, 'jar', 650, 15, 'Pure date paste with nothing added. 400 g jar.'],
  [41, 12, 'Karachi Sourdough', 6, 'loaf', 950, 14, 'A tangy, open-crumb sourdough with a blistered crust.'],
  [42, 12, 'Rosemary Focaccia', 6, 'loaf', 750, 12, 'Olive-oil focaccia with rosemary and sea salt.'],
  [43, 12, 'Date & Walnut Cake', 6, 'loaf', 1100, 10, 'A dense cake sweetened with Khairpur dates.'],
  [44, 13, 'Desi Tomatoes', 1, 'kg', 180, 40, 'Field-grown tomatoes with real flavour, picked half-ripe for the drive.'],
  [45, 13, 'Bottle Gourd (Lauki)', 1, 'kg', 120, 25, 'Young, tender lauki picked the day before market.'],
  [46, 13, 'Green Chillies', 1, 'pack', 60, 30, 'Hot green chillies. 250 g pack.'],
  [47, 13, 'Papaya', 2, 'kg', 220, 18, 'Sweet red-fleshed papaya, ripe within two days.'],
];

const CUSTOMERS = [
  [5, 'Sarah Ahmed', 'customer.sarah@marketlink.com', '+923214440201', 'House 42, Block C, Model Town, Lahore'],
  [6, 'Bilal Khan', 'customer.bilal@marketlink.com', '+923214440202', 'Sector J, Phase 5, DHA, Lahore'],
  [12, 'Ali Raza', 'ali.raza@example.com', '+923214440203', 'Gulberg III, Lahore'],
  [13, 'Fatima Noor', 'fatima.noor@example.com', '+923214440204', 'Johar Town, Lahore'],
  [14, 'Hina Javed', 'hina.javed@example.com', '+923214440205', 'Garden Town, Lahore'],
  [15, 'Usman Tariq', 'usman.tariq@example.com', '+923214440206', 'Model Town, Lahore'],
  [16, 'Zainab Malik', 'zainab.malik@example.com', '+923214440207', 'DHA Phase 6, Lahore'],
  [17, 'Imran Aslam', 'imran.aslam@example.com', '+923214440208', 'Faisal Town, Lahore'],
  [18, 'Mariam Yousaf', 'mariam.yousaf@example.com', '+923214440209', 'Cantt, Lahore'],
  [19, 'Saad Hussain', 'saad.hussain@example.com', '+923214440210', 'Wapda Town, Lahore'],
  [20, 'Ayesha Khan', 'ayesha.khan@example.com', '+923214440211', 'Bahria Town, Lahore'],
  [21, 'Farhan Ali', 'farhan.ali@example.com', '+923214440212', 'Township, Lahore'],
  [28, 'Omer Sheikh', 'omer.sheikh@example.com', '+923214440213', 'F-8, Islamabad'],
  [29, 'Maha Qureshi', 'maha.qureshi@example.com', '+923214440214', 'G-11, Islamabad'],
  [30, 'Kashif Anwar', 'kashif.anwar@example.com', '+923214440215', 'E-7, Islamabad'],
  [31, 'Sadia Rehman', 'sadia.rehman@example.com', '+923214440216', 'Clifton, Karachi'],
  [32, 'Yasir Hamid', 'yasir.hamid@example.com', '+923214440217', 'PECHS, Karachi'],
  [33, 'Nida Farooq', 'nida.farooq@example.com', '+923214440218', 'Gulshan-e-Iqbal, Karachi'],
  [34, 'Adeel Shah', 'adeel.shah@example.com', '+923214440219', 'DHA Phase 8, Karachi'],
];

const REVIEW_TEXT = {
  5: [
    'Everything was ready on time and the produce was beautiful. Our Saturday ritual now.',
    'The best produce we have bought all year. They even set some aside for us.',
    'Picked up in two minutes. Fresh, fairly priced and packed with care.',
    'The quality is consistently excellent. Worth the early start.',
    'Lovely stall and genuinely kind people. The kids ask to come every week.',
    'Absolutely fresh. You can taste the difference from the supermarket.',
  ],
  4: [
    'Very good quality. Queue was a little long at opening but moved quickly.',
    'Fresh and tasty. Would love a slightly later pickup window.',
    'Great produce, one item was smaller than expected but still delicious.',
    'Reliable and friendly. Prices are fair for the quality.',
  ],
  3: [
    'Good produce but my order was not ready when I arrived.',
    'Decent, although a couple of items were bruised.',
  ],
};

const REPLIES = [
  'Thank you! See you at the stall next week.',
  'Thank you for the kind words. We will keep something aside for you.',
  'Sorry about the wait at opening. We are adding a second packing table this week.',
  'Thank you for the feedback. We have adjusted our packing so it does not happen again.',
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

  const currency = env.DEFAULT_CURRENCY;
  const timezone = env.DEFAULT_TIMEZONE;
  const today = pkDate(now);
  const bookable = firstBookableDate(now); // first date still open for pre-orders
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
      name: 'Mehwish Raza', phone: '+923000000001', address: 'MarketLink Operations, Lahore',
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
  const customerIds = CUSTOMERS.map(([n]) => userId(n));
  const cityOfMarket = (m) => m.city ?? 'Lahore';
  const customersIn = (city) => {
    const local = CUSTOMERS.filter(([, , , , address]) => address.endsWith(city)).map(([n]) => userId(n));
    return local.length ? local : customerIds;
  };
  const userById = new Map(users.map((u) => [u._id.toString(), u]));

  // ── Markets & categories ──
  const markets = MARKETS.map((m) => ({
    _id: marketId(m.n), name: m.name, slug: m.slug, description: m.description, imageUrl: m.imageUrl,
    countryCode: 'PK', countryName: 'Pakistan', region: m.region ?? 'Punjab', city: m.city ?? 'Lahore', locality: m.locality,
    address: m.address, timezone, currency,
    coordinates: { type: 'Point', coordinates: m.lngLat },
    operatingDays: m.days, operatingHours: { open: m.open, close: m.close },
    mapProvider: 'osm', isActive: true, createdAt, updatedAt: createdAt,
  }));
  const marketByN = new Map(MARKETS.map((m) => [m.n, m]));

  const categories = CATEGORIES.map((c) => ({
    _id: categoryId(c.n), name: c.name, slug: c.slug, description: c.description, icon: c.icon, isActive: true,
  }));

  // ── Farmer profiles ──
  const farmerProfiles = FARMERS.map((f) => ({
    _id: profileId(f.profile), userId: userId(f.user), businessName: f.business, contactPerson: f.person,
    phone: f.phone, email: f.email, address: f.location, bio: f.bio, story: f.story,
    specialties: f.specialties, farmingSince: f.since, stallNumber: f.stall,
    profileImageUrl: '', coverImageUrl: '',
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
  const products = PRODUCTS.map(([n, prof, name, cat, unit, price, , description]) => ({
    _id: productId(n), farmerId: profileId(prof), name, description, categoryId: categoryId(cat), unit,
    basePriceMinor: price * 100, currency,
    imageUrl: `/images/produce/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`,
    status: farmerByProfile.get(prof).status === 'suspended' ? 'hidden' : 'active',
    isArchived: false,
    metrics: { rating: 0, reviewCount: 0 },
    createdAt, updatedAt: createdAt,
  }));
  const productByN = new Map(PRODUCTS.map((p) => [p[0], p]));
  const productsOf = (prof) => PRODUCTS.filter((p) => p[1] === prof);

  // ── Market occurrences ──
  // Each approved farmer attends each of their markets on every operating day.
  const approvedFarmers = FARMERS.filter((f) => f.status === 'approved');
  const occurrences = []; // { farmer, market, date, upcoming, weekIndex }
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
  const nextDates = new Map(); // market n → nearest upcoming date
  for (const m of MARKETS) nextDates.set(m.n, upcomingDates(bookable, m.days, 1)[0]);

  // ── Pickup windows & stock offers (upcoming only) ──
  const pickupWindows = [];
  const stockOffers = [];
  const windowFor = new Map(); // `${profile}|${market}|${date}` → [windows]
  const offerFor = new Map(); // `${product}|${market}|${date}` → offer
  for (const occ of occurrences.filter((o) => o.upcoming)) {
    const key = `${occ.f.profile}|${occ.m.n}|${occ.date}`;
    const cutoffAt = pkTime(occ.date, '06:00');
    const firstEnd = addMinutes(occ.m.open, 90);
    const wins = [
      [occ.m.open, firstEnd],
      [firstEnd, addMinutes(firstEnd, 90)],
    ].map(([startTime, endTime]) => ({
      _id: oid('66f5', ++windowSeq), farmerId: profileId(occ.f.profile), marketId: marketId(occ.m.n),
      date: occ.date, startTime, endTime, cutoffAt, maxCapacity: 20,
      currentReservations: 0, reservedOrdersCount: 0, createdAt, updatedAt: createdAt,
    }));
    pickupWindows.push(...wins);
    windowFor.set(key, wins);
    for (const [n, , , , unit, price, qty] of productsOf(occ.f.profile)) {
      const offer = {
        _id: oid('66f6', ++offerSeq), farmerId: profileId(occ.f.profile), marketId: marketId(occ.m.n),
        productId: productId(n), date: occ.date, priceMinor: price * 100, currency, unit,
        totalQuantity: qty, reservedQuantity: 0, availableQuantity: qty, status: 'available',
        version: 1, createdAt, updatedAt: createdAt,
      };
      stockOffers.push(offer);
      offerFor.set(`${n}|${occ.m.n}|${occ.date}`, offer);
    }
  }

  // Strawberries sell out on the next Orchard Saturday (set once reservations are known).
  const soldOut = offerFor.get(`4|1|${nextDates.get(1)}`);

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
    const cutoffAt = pkTime(occ.date, '06:00');
    const items = lines.map(([n, quantity]) => {
      const [, , name, , unit, price] = productByN.get(n);
      return { productId: productId(n), name, unit, unitPriceMinor: price * 100, quantity, subtotalMinor: price * 100 * quantity };
    });
    const total = items.reduce((s, i) => s + i.subtotalMinor, 0);
    const placed = placedAt || new Date(pkTime(occ.date, '06:00').getTime() - between(20, 100) * 3600000);

    const history = [{ status: 'placed', changedBy: customer, role: 'customer', note: 'Pre-order placed.', timestamp: placed }];
    // Status changes never land in the future, however recently the order was placed.
    const stamp = (hoursAfterPlaced, capMinutesAgo = 10) =>
      new Date(Math.min(placed.getTime() + hoursAfterPlaced * 3600000, now.getTime() - capMinutesAgo * 60000));
    if (status === 'cancelled') {
      history.push({ status: 'cancelled', changedBy: customer, role: 'customer', note: 'Plans changed.', timestamp: stamp(6) });
    } else if (status === 'declined') {
      history.push({ status: 'declined', changedBy: farmerUser._id, role: 'farmer', note: 'Harvest smaller than expected.', timestamp: stamp(3) });
    } else {
      const reach = STATUS_FLOW.indexOf(status);
      if (reach >= 1) history.push({ status: 'accepted', changedBy: farmerUser._id, role: 'farmer', note: 'Accepted.', timestamp: stamp(2, 40) });
      if (reach >= 2) history.push({ status: 'ready_for_pickup', changedBy: farmerUser._id, role: 'farmer', note: 'Packed and ready at the stall.', timestamp: occ.upcoming ? stamp(8) : pkTime(occ.date, win.startTime) });
      if (reach >= 3) history.push({ status: 'completed', changedBy: farmerUser._id, role: 'farmer', note: 'Collected and paid at the stall.', timestamp: new Date(pkTime(occ.date, win.startTime).getTime() + between(10, 80) * 60000) });
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
      marketSnapshot: { name: m.name, address: m.address, city: m.city ?? 'Lahore', countryCode: 'PK', timezone, currency },
      marketDate: occ.date,
      pickupWindow: { id: win._id.toString(), startTime: win.startTime, endTime: win.endTime, cutoffAt: cutoffAt.toISOString() },
      pickupWindowId: win._id,
      items,
      totalAmountMinor: total,
      currency,
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
      lines.push([p[0], between(1, p[5] >= 900 ? 1 : 3)]);
    }
    return lines;
  };

  // History: demand grows gently week on week, so trends reflect real orders.
  for (const occ of occurrences.filter((o) => !o.upcoming)) {
    const base = 2 + Math.round((HISTORY_WEEKS - occ.weeksAgo) * 0.45);
    const count = Math.max(1, base + between(-1, 2));
    for (let i = 0; i < count; i++) {
      const r = rand();
      const status = r < 0.06 ? 'cancelled' : r < 0.1 ? 'declined' : 'completed';
      const pool = customersIn(cityOfMarket(occ.m)).filter((c) => !c.equals(userId(5)));
      orders.push(buildOrder({ customer: pick(pool), occ, lines: randomLines(occ.f.profile), status, windowIndex: between(0, 1) }));
    }
  }

  // Upcoming: open reservations for the nearest market day at every stall.
  const nearestOccurrences = occurrences.filter((o) => o.upcoming && o.date === nextDates.get(o.m.n));
  for (const occ of nearestOccurrences) {
    const count = between(2, 4);
    for (let i = 0; i < count; i++) {
      const r = rand();
      const status = r < 0.5 ? 'placed' : r < 0.85 ? 'accepted' : 'ready_for_pickup';
      const lines = randomLines(occ.f.profile, 2).filter(([n]) => !(n === 4 && occ.m.n === 1));
      if (!lines.length) continue;
      const pool = customersIn(cityOfMarket(occ.m)).filter((c) => !c.equals(userId(5)) && !c.equals(userId(6)));
      orders.push(buildOrder({ customer: pick(pool), occ, lines, status, windowIndex: between(0, 1), placedAt: new Date(now.getTime() - between(2, 60) * 3600000) }));
    }
  }

  // Sarah: a realistic personal story (three open pickups, a steady history).
  const sarah = userId(5);
  const bilal = userId(6);
  const occOf = (profile, market, date) => occurrences.find((o) => o.f.profile === profile && o.m.n === market && o.date === date);
  const orchardNext = nextDates.get(1);
  const sarahUpcoming = [
    [occOf(1, 1, orchardNext), [[1, 2], [2, 2]], 'placed', 0],
    [occOf(4, 1, orchardNext), [[13, 2], [15, 1]], 'accepted', 0],
    [occOf(7, 1, orchardNext), [[26, 1], [28, 1]], 'ready_for_pickup', 1],
    [occOf(2, 1, orchardNext), [[4, 2]], 'accepted', 0],
  ];
  for (const [occ, lines, status, windowIndex] of sarahUpcoming) {
    if (occ) orders.push(buildOrder({ customer: sarah, occ, lines, status, windowIndex, placedAt: new Date(now.getTime() - between(3, 30) * 3600000) }));
  }
  const orchardPast = pastDates(bookable, [6], HISTORY_WEEKS);
  const sarahHistory = [
    [1, [[1, 2], [10, 1]]], [7, [[26, 1]]], [4, [[13, 2], [14, 2]]], [1, [[1, 3], [2, 2]]],
    [2, [[5, 1]]], [7, [[26, 1], [28, 1]]], [1, [[1, 2], [3, 1]]],
  ];
  sarahHistory.forEach(([profile, lines], i) => {
    const date = orchardPast[orchardPast.length - sarahHistory.length + i];
    const occ = occOf(profile, 1, date);
    if (occ) orders.push(buildOrder({ customer: sarah, occ, lines, status: 'completed', windowIndex: 0 }));
  });
  const libertyNext = nextDates.get(2);
  const bilalOcc = occOf(5, 2, libertyNext);
  if (bilalOcc) orders.push(buildOrder({ customer: bilal, occ: bilalOcc, lines: [[18, 2], [19, 1]], status: 'placed', windowIndex: 0, placedAt: new Date(now.getTime() - 5 * 3600000) }));

  // Reserve stock and pickup-window capacity from open orders only.
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
  if (soldOut) soldOut.totalQuantity = soldOut.reservedQuantity;
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
    if (sarahLatest && o._id.equals(sarahLatest._id)) continue; // left for the live review demo
    if (rand() > 0.62) continue;
    const r = rand();
    const rating = r < 0.64 ? 5 : r < 0.92 ? 4 : 3;
    // Written a few hours after pickup, but never in the future.
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
  // Two reviews waiting in the moderation queue.
  const flagSource = completed.filter((o) => !reviews.some((r) => r.orderId.equals(o._id)) && !(sarahLatest && o._id.equals(sarahLatest._id)));
  const flagged = [
    'Total scam, these people are liars and thieves. Never buying again!!!',
    'Call me on 0300-1234567 for cheaper vegetables delivered to your home.',
  ];
  flagged.forEach((comment, i) => {
    const o = flagSource[i * 3];
    if (!o) return;
    const at = new Date(o.updatedAt.getTime() + 4 * 3600000);
    reviews.push({
      _id: oid('66f8', ++reviewSeq), orderId: o._id, customerId: o.customerId, customerName: o.customerSnapshot.name,
      farmerId: o.farmerId, targetType: 'farmer', targetId: o.farmerProfileId, rating: i === 0 ? 1 : 3, comment,
      farmerReply: null, moderationStatus: 'flagged', moderationReason: i === 0 ? 'Abusive language reported by grower' : 'Contains contact details / solicitation',
      createdAt: at, updatedAt: at,
    });
  });

  // Ratings are derived from approved reviews only.
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
    { customerId: sarah, targetType: 'farmer', targetId: profileId(4), createdAt },
    { customerId: sarah, targetType: 'product', targetId: productId(1), createdAt },
    { customerId: sarah, targetType: 'product', targetId: productId(26), createdAt },
    { customerId: sarah, targetType: 'market', targetId: marketId(1), createdAt },
    { customerId: bilal, targetType: 'farmer', targetId: profileId(5), createdAt },
  ];

  const restockAlerts = soldOut
    ? [{ customerId: sarah, productId: productId(4), marketId: marketId(1), status: 'active', createdAt: now, updatedAt: now }]
    : [];

  const weeklyStockTemplates = [
    {
      farmerId: profileId(1), marketId: marketId(1), dayOfWeek: 6,
      items: productsOf(1).map(([n, , , , unit, price, qty]) => ({ productId: productId(n), defaultQuantity: qty, defaultPriceMinor: price * 100, unit })),
      createdAt, updatedAt: createdAt,
    },
  ];

  // ── Notifications ──
  const notif = (user, type, title, message, data, hoursAgo, isRead = false) => ({
    userId: user, type, title, message, data, isRead, createdAt: new Date(now.getTime() - hoursAgo * 3600000),
  });
  const sarahOrders = orders.filter((o) => o.customerId.equals(sarah) && o.marketDate === orchardNext);
  const readyOrder = sarahOrders.find((o) => o.status === 'ready_for_pickup');
  const acceptedOrder = sarahOrders.find((o) => o.status === 'accepted');
  const placedGreenfield = sarahOrders.find((o) => o.status === 'placed');
  const notifications = [
    readyOrder && notif(sarah, 'order_ready', 'Your pickup is ready', `${readyOrder.farmerSnapshot.businessName} has packed order ${readyOrder.orderNumber}.`, { orderId: readyOrder._id.toString() }, 2),
    acceptedOrder && notif(sarah, 'order_accepted', 'Order accepted', `${acceptedOrder.farmerSnapshot.businessName} accepted order ${acceptedOrder.orderNumber}.`, { orderId: acceptedOrder._id.toString() }, 9),
    soldOut && notif(sarah, 'restock_watch', 'Watching Field Strawberries', 'We will tell you if more strawberries are listed for The Orchard Market.', { productId: productId(4).toString() }, 20, true),
    placedGreenfield && notif(userId(2), 'order_received', 'New pre-order received', `Order ${placedGreenfield.orderNumber} from Sarah Ahmed needs your response.`, { orderId: placedGreenfield._id.toString() }, 4),
    notif(userId(2), 'review_received', 'New 5★ review', 'A customer left a five-star review for Greenfield Farm.', {}, 30, true),
    notif(userId(1), 'farmer_application', 'New grower application', 'Margalla Dairy has applied to join. Review their documents.', { farmerProfileId: profileId(3).toString() }, 30),
    notif(userId(1), 'review_flagged', 'Reviews waiting for moderation', 'Two reviews were flagged and need a decision.', {}, 12),
  ].filter(Boolean);

  // ── Announcements & inquiries ──
  const announcements = [
    {
      title: 'Winter hours at The Orchard Market',
      message: 'From next month The Orchard Market opens at 08:30. Pickup windows move by thirty minutes.',
      type: 'market_update', marketId: marketId(1), priority: 'normal', isActive: true,
      createdBy: userId(1), createdAt: new Date(now.getTime() - 3 * 86400000), updatedAt: new Date(now.getTime() - 3 * 86400000),
    },
    {
      title: 'Bring your own bag this month',
      message: 'Growers are cutting plastic. Bring a cloth bag and a bottle for fresh milk.',
      type: 'general', marketId: null, priority: 'normal', isActive: true,
      createdBy: userId(1), createdAt: new Date(now.getTime() - 9 * 86400000), updatedAt: new Date(now.getTime() - 9 * 86400000),
    },
    {
      title: 'Heavy rain expected on Sunday',
      message: 'Sunday at the Grove will run under the pavilion. Pickup times are unchanged.',
      type: 'weather_alert', marketId: marketId(3), priority: 'urgent', isActive: false,
      createdBy: userId(1), createdAt: new Date(now.getTime() - 30 * 86400000), updatedAt: new Date(now.getTime() - 23 * 86400000),
    },
  ];

  const contactInquiries = [
    { name: 'Rabia Anwar', email: 'rabia.anwar@example.com', phone: '', subject: 'Selling at Liberty Green', message: 'I grow organic lemons in Kasur. How do I apply for a stall at Liberty Green Market?', status: 'new', createdAt: new Date(now.getTime() - 26 * 3600000), updatedAt: new Date(now.getTime() - 26 * 3600000) },
    { name: 'Kamran Aziz', email: 'kamran.aziz@example.com', phone: '+923331112233', subject: 'Parking at The Orchard Market', message: 'Is there parking near Gate 3 on Saturday mornings?', status: 'in_progress', createdAt: new Date(now.getTime() - 4 * 86400000), updatedAt: new Date(now.getTime() - 3 * 86400000) },
  ];

  return {
    users, farmerProfiles, markets, categories, products, pickupWindows, stockOffers, orders, reviews,
    favourites, restockAlerts, weeklyStockTemplates, notifications, announcements, contactInquiries,
  };
}
