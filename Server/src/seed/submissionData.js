import { ObjectId } from 'mongodb';

// These are city-centre reference pins, not verified trading venues.
export const regions = [
  ['PK','Pakistan','PKR','Asia/Karachi',[['Karachi',24.8607,67.0011],['Lahore',31.5204,74.3587],['Islamabad',33.6844,73.0479],['Faisalabad',31.4504,73.135]]],
  ['GB','United Kingdom','GBP','Europe/London',[['London',51.5074,-0.1278],['Manchester',53.4808,-2.2426],['Birmingham',52.4862,-1.8904],['Bristol',51.4545,-2.5879]]],
  ['US','United States','USD','America/New_York',[['New York',40.7128,-74.006],['Boston',42.3601,-71.0589],['Philadelphia',39.9526,-75.1652],['Washington',38.9072,-77.0369]]],
  ['CA','Canada','CAD','America/Toronto',[['Toronto',43.6532,-79.3832],['Ottawa',45.4215,-75.6972],['Montreal',45.5017,-73.5673],['Quebec City',46.8139,-71.208]]],
  ['AU','Australia','AUD','Australia/Sydney',[['Sydney',-33.8688,151.2093],['Newcastle',-32.9283,151.7817],['Wollongong',-34.4278,150.8931],['Canberra',-35.2809,149.13]]],
  ['DE','Germany','EUR','Europe/Berlin',[['Berlin',52.52,13.405],['Munich',48.1351,11.582],['Hamburg',53.5511,9.9937],['Cologne',50.9375,6.9603]]],
  ['FR','France','EUR','Europe/Paris',[['Paris',48.8566,2.3522],['Lyon',45.764,4.8357],['Marseille',43.2965,5.3698],['Toulouse',43.6047,1.4442]]],
  ['AE','United Arab Emirates','AED','Asia/Dubai',[['Dubai',25.2048,55.2708],['Abu Dhabi',24.4539,54.3773],['Sharjah',25.3463,55.4209],['Ajman',25.4052,55.5136]]],
  ['IN','India','INR','Asia/Kolkata',[['Mumbai',19.076,72.8777],['Delhi',28.6139,77.209],['Bengaluru',12.9716,77.5946],['Jaipur',26.9124,75.7873]]],
  ['ZA','South Africa','ZAR','Africa/Johannesburg',[['Cape Town',-33.9249,18.4241],['Johannesburg',-26.2041,28.0473],['Durban',-29.8587,31.0218],['Pretoria',-25.7479,28.2293]]],
];

export function localInstant(date, time, timezone) {
  const target = Date.parse(`${date}T${time}:00Z`);
  let guess = target;
  const fmt = new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for(let i=0;i<3;i++) {
    const p=Object.fromEntries(fmt.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));
    const rendered=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    guess += target-rendered;
  }
  return new Date(guess);
}

export function generateSubmissionData({admin,farmerPasswordHash,now=new Date()}) {
  if(admin?.role!=='admin'||!admin._id||!farmerPasswordHash) throw new Error('Admin and disabled-login password hash required');
  const data=Object.fromEntries(['users','farmerProfiles','markets','categories','products','pickupWindows','stockOffers'].map(k=>[k,[]]));
  data.users.push(admin);
  const stamp={createdAt:now,updatedAt:now,isSample:true};
  data.categories=[['Vegetables','vegetables'],['Fruit','fruit'],['Bakery','bakery']].map(([name,slug])=>({_id:new ObjectId(),name,slug,description:`${name} available for market pickup`,isActive:true}));
  const produce=[['Tomatoes','kg','tomatoes',0],['Carrots','kg','carrots',0],['Apples','kg','apples',1],['Bread','loaf','bread',2]];
  // A future fortnight keeps both weekend occurrences bookable in every timezone.
  const dates=[];
  for(let d=2;dates.length<4;d++) {
    const day=new Date(now.getTime()+d*86400000);
    if([0,6].includes(day.getUTCDay())) dates.push(day.toISOString().slice(0,10));
  }
  for(const [countryCode,countryName,currency,timezone,cities] of regions) for(const [city,lat,lng] of cities) for(let m=1;m<=2;m++) {
    const market={_id:new ObjectId(),name:`${city} Sample Market ${m}`,slug:`${countryCode}-${city}-${m}`.toLowerCase().replaceAll(' ','-'),description:'Sample venue for project evaluation. City-centre pin and opening times are illustrative; this is not a verified real market.',imageUrl:'/images/market.jpg',countryCode,countryName,city,region:city,locality:'Sample venue',address:`Illustrative city-centre location, ${city}`,timezone,currency,coordinates:{type:'Point',coordinates:[lng+(m-1)*0.005,lat]},operatingDays:[0,6],operatingHours:{open:'08:00',close:'13:00'},mapProvider:'osm',isActive:true,...stamp};
    data.markets.push(market);
    for(let g=1;g<=4;g++) {
      const n=data.farmerProfiles.length+1;
      const email=`sample-grower-${n}@example.test`;
      const user={_id:new ObjectId(),email,passwordHash:farmerPasswordHash,role:'farmer',name:`Sample Grower ${n}`,phone:'',address:market.address,isActive:true,...stamp};
      data.users.push(user);
      const farmer={_id:new ObjectId(),userId:user._id,businessName:`${city} Sample Grower ${m}-${g}`,contactPerson:user.name,phone:'',email,address:market.address,countryCode,countryName,city,bio:'Illustrative grower for project evaluation. Not a verified business.',story:'Sample profile showing how a grower sells produce at a selected market.',specialties:['Vegetables','Fruit','Bread'],stallNumber:`S${g}`,profileImageUrl:'/images/grower.jpg',coverImageUrl:'/images/harvest.jpg',stallCoordinates:market.coordinates,approvalStatus:'approved',onboardingStatus:'submitted',approvedAt:now,approvedBy:admin._id,suspensionReason:null,marketIds:[market._id],operatingDays:[0,6],metrics:{rating:0,reviewCount:0},...stamp};
      data.farmerProfiles.push(farmer);
      const scale={PKR:250,INR:100,AED:12,ZAR:35}[currency]||3;
      const products=produce.map(([name,unit,img,cat],i)=>({_id:new ObjectId(),farmerId:farmer._id,name,description:`Sample ${name.toLowerCase()} listing. Price, stock and pickup availability are illustrative evaluation data.`,categoryId:data.categories[cat]._id,unit,basePriceMinor:Math.round(scale*(1+i*0.2)*100),currency,imageUrl:`/images/${img}.jpg`,status:'active',isArchived:false,metrics:{rating:0,reviewCount:0},...stamp}));
      data.products.push(...products);
      for(const date of dates) {
        for(const [startTime,endTime] of [['08:00','10:00'],['10:00','12:00']]) data.pickupWindows.push({_id:new ObjectId(),farmerId:farmer._id,marketId:market._id,date,startTime,endTime,cutoffAt:localInstant(date,'06:00',timezone),maxCapacity:25,currentReservations:0,reservedOrdersCount:0,...stamp});
        for(const p of products) data.stockOffers.push({_id:new ObjectId(),farmerId:farmer._id,marketId:market._id,productId:p._id,date,priceMinor:p.basePriceMinor,currency,unit:p.unit,totalQuantity:40,reservedQuantity:0,availableQuantity:40,status:'available',version:1,...stamp});
      }
    }
  }
  return data;
}
