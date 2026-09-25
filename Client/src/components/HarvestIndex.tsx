import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Product } from '../data/market';

export function HarvestIndex({products}:{products:Product[]}) {
 const categories = [...new Set(products.map(p=>p.category))];
 const [chosen,setChosen] = useState('');
 const category = categories.includes(chosen) ? chosen : categories[0];
 const items = products.filter(p=>p.category===category);
 const reduced=useReducedMotion();
 if (!categories.length) return null;
 return <section className="harvest-index"><div className="harvest-index-copy"><span className="eyebrow">A closer look at the harvest</span><h2>Follow your appetite.</h2><p>Explore the produce listed for your selected market day. Availability belongs to each grower, not a seasonal promise.</p><div className="harvest-index-tabs">{categories.map((c,i)=><button key={c} aria-pressed={category===c} onClick={()=>setChosen(c)}><span>0{i+1}</span>{c}<b>↗</b></button>)}</div></div><div className="harvest-index-picture"><AnimatePresence mode="wait"><motion.figure key={category} initial={reduced?false:{clipPath:'inset(0 100% 0 0)'}} animate={{clipPath:'inset(0 0% 0 0)'}} exit={{clipPath:'inset(0 0 0 100%)'}} transition={{duration:.55,ease:[.76,0,.24,1]}}><img src={items[0]?.image} alt={items[0]?.name}/><figcaption><span>{items.length} listed {items.length===1?'product':'products'}</span><Link to={`/products?category=${encodeURIComponent(category)}`}>Explore {category} →</Link></figcaption></motion.figure></AnimatePresence></div></section>;
}
export function MarketPackingGuide() {
 const [checked,setChecked]=useState<string[]>([]);
 const reduced=useReducedMotion();
 const entries=['Check the collection window','Bring your reusable market bag','Have your order details ready','Pay the farmer at pickup'];
 return <section className="packing-guide"><div><span className="eyebrow">Before you leave</span><h2>Less rushing.<br/><em>More market.</em></h2><p>A small checklist for a smoother collection. This guide stays on this page; your order’s actual details remain in your planner.</p><Link to="/customer/market-day" className="button">Open my market day ↗</Link></div><div className="packing-list">{entries.map((entry,i)=><button key={entry} aria-pressed={checked.includes(entry)} onClick={()=>setChecked(old=>old.includes(entry)?old.filter(x=>x!==entry):[...old,entry])}><span className="packing-number">{checked.includes(entry)?'✓':`0${i+1}`}</span><span>{entry}</span><svg viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true"><motion.path d="M0 1H100" stroke="currentColor" initial={false} animate={{pathLength:checked.includes(entry)?1:0}} transition={{duration:reduced?0:.35}}/></svg></button>)}<p aria-live="polite">{checked.length} of 4 ready · your personal preparation checklist</p></div></section>;
}
