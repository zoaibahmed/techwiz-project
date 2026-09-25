import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown } from 'lucide-react';
import './MarketHero.css';

gsap.registerPlugin(ScrollTrigger);

export function MarketHero({headline, lead, children}:{headline:string;lead:string;children:ReactNode}) {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.timeline({defaults:{ease:'power3.out'},delay:.15})
          .from('.market-cinema-mask > span', {yPercent:110,rotateX:-35,stagger:.055,duration:1.1})
          .from('.market-cinema-intro', {opacity:0,duration:.7},.55)
          .from('.market-cinema-photo', {clipPath:'inset(12% 18% 12% 18%)',duration:1.4},0);
        const small = window.matchMedia('(max-width: 700px)').matches;
        gsap.timeline({scrollTrigger:{trigger:root.current,start:'top top',end:'bottom bottom',scrub:.8},defaults:{ease:'none'}})
          .to('.market-cinema-photo', {scale:1.18,z:100,rotateX:small?0:5,duration:1},0)
          .to('.market-cinema-title', {yPercent:-35,z:180,scale:small?1.04:1.13,opacity:.12,duration:.8},0)
          .to('.market-cinema-intro', {opacity:0,y:-35,duration:.35},0)
          .fromTo('.market-cinema-side-left',{xPercent:-12,z:30},{xPercent:-65,z:260,rotateY:small?0:12,duration:1},0)
          .fromTo('.market-cinema-side-right',{xPercent:12,z:20},{xPercent:65,z:220,rotateY:small?0:-12,duration:1},0)
          .fromTo('.market-cinema-next',{opacity:0,y:45},{opacity:1,y:0,duration:.45},.5);
      },root);
      return () => context.revert();
    });
    return () => media.revert();
  },[headline]);
  return <section className="market-cinema" ref={root} aria-label="The Living Market">
    <div className="market-cinema-stage">
      <div className="market-cinema-depth" aria-hidden="true">
        <div className="market-cinema-photo"><img src="/images/market-arrival.jpg" alt="" fetchPriority="high"/></div>
        <div className="market-cinema-side market-cinema-side-left"><img src="/images/grower.jpg" alt=""/></div>
        <div className="market-cinema-side market-cinema-side-right"><img src="/images/tomatoes.jpg" alt=""/></div>
      </div>
      <div className="market-cinema-shade" aria-hidden="true"/>
      <div className="market-cinema-heading">
        <p className="market-cinema-brand">Gather & Grow / The Living Market</p>
        <h1 className="market-cinema-title" tabIndex={-1}>{headline.split(' ').map((word,i)=><span className="market-cinema-mask" key={i}><span>{word}&nbsp;</span></span>)}</h1>
        <p className="market-cinema-intro">{lead}</p>
      </div>
      <div className="market-cinema-next" aria-hidden="true"><span>From the people who grow it.</span><span>To the morning you make of it.</span></div>
      <div className="market-cinema-bottom"><div className="market-cinema-finder">{children}</div><div className="market-cinema-footnote"><span>Editorial market photography · not a live market feed</span><span>Scroll into the market <ArrowDown size={15}/></span></div></div>
    </div>
  </section>;
}
