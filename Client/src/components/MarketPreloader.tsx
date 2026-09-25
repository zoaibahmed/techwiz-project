import { BrandMark } from "./BrandMark";
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export function MarketPreloader() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let alive = true;
    const image = new Image(); image.src = '/images/market-arrival.jpg';
    const timeout = window.setTimeout(() => setVisible(false), 2200);
    Promise.allSettled([document.fonts.ready, image.decode(), new Promise(resolve => window.setTimeout(resolve, 1350))]).then(() => {
      if (alive) setVisible(false);
    });
    return () => { alive = false; clearTimeout(timeout); };
  }, []);
  return <AnimatePresence>{visible && !reduced && <motion.div className="market-preloader" initial={{opacity:1}} exit={{clipPath:'inset(0 0 100% 0)'}} transition={{duration:.8,ease:[.76,0,.24,1]}} role="status">
    <div className="preloader-orbit" aria-hidden="true"><motion.div className="preloader-ring" initial={{rotate:-100,scale:.7}} animate={{rotate:80,scale:1}} transition={{duration:1.5,ease:"easeInOut"}}/><motion.div initial={{y:20,scale:.7,opacity:0}} animate={{y:0,scale:1,opacity:1}} transition={{duration:.7}}><BrandMark size={74}/></motion.div>{[0,1,2].map(i=><motion.i key={i} className={`preloader-seed seed-${i}`} initial={{y:-65,opacity:0}} animate={{y:[-65,-20,0],opacity:[0,1,0]}} transition={{delay:i*.18,duration:.9}}/>)}</div>
    <div className="preloader-name"><motion.span initial={{y:"110%"}} animate={{y:0}} transition={{duration:.75,delay:.2,ease:[.22,1,.36,1]}}>Gather & Grow</motion.span></div><small>Good food. A little closer.</small>
    <button onClick={() => setVisible(false)}>Continue to the market →</button>
  </motion.div>}</AnimatePresence>;
}
