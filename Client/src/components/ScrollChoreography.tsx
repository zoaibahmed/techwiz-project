import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ScrollChoreography.css';

gsap.registerPlugin(ScrollTrigger);

// Animate editorial surfaces only. Inputs, maps and operational records remain stationary.
export function ScrollChoreography({children}:{children:ReactNode}) {
  const root=useRef<HTMLDivElement>(null);
  const {pathname}=useLocation();
  useEffect(()=>{
    const media=gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      const host=root.current;
      if(!host) return;
      const seen=new WeakSet<Element>();
      const narrow=window.matchMedia('(max-width: 700px)').matches;
      const context=gsap.context(()=>{},host);
      let frame=0;
      const presets: [string,gsap.TweenVars][] = [
        ['.global-grower-photo', {rotationY:narrow?-4:-12,xPercent:-5,scale:.94}],
        ['.global-product-image > img, .global-product-image > div > img', {rotationX:9,scale:.9,yPercent:5}],
        ['.harvest-index-picture', {rotationY:narrow?4:12,scale:.92,xPercent:4}],
        ['.pickup-visual', {rotationX:10,scale:.92,yPercent:5}],
        ['.scene-markets .scene-photo', {rotationY:10,scale:.94}],
        ['.scene-growers .scene-photo', {rotationX:9,scale:1.06}],
        ['.scene-produce .scene-photo', {rotationY:-10,scale:.93}],
        ['.grower-editorial-row figure', {rotationY:10,scale:.94}],
        ['.harvest-detail .pe-detail-gallery', {rotationY:-7,scale:.96}],
        ['.story > img, .story > figure, .auth-visual', {rotationY:8,scale:.95}],
        ['.product-photo > a', {rotationX:8,scale:.96}],
      ];
      const scan=()=>context.add(()=>{
        for(const [selector,pose] of presets){
          host.querySelectorAll<HTMLElement>(selector).forEach(el=>{
            if(seen.has(el)) return; seen.add(el);
            gsap.fromTo(el,{...pose,transformPerspective:1200,transformOrigin:'50% 50%'},{rotationX:0,rotationY:0,xPercent:0,yPercent:0,scale:1,ease:'none',scrollTrigger:{trigger:el,start:'top 96%',end:'center 65%',scrub:.7,invalidateOnRefresh:true}});
          });
        }
        host.querySelectorAll<HTMLElement>('h2').forEach(el=>{
          if(seen.has(el)||el.closest('[role="dialog"],.market-cinema,.market-chapter')) return; seen.add(el);
          gsap.fromTo(el,{rotationX:12,y:15,transformPerspective:900,transformOrigin:'center bottom'},{rotationX:0,y:0,ease:'none',scrollTrigger:{trigger:el,start:'top 97%',end:'top 70%',scrub:.5}});
        });
      });
      scan();
      const observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(scan)});
      observer.observe(host,{childList:true,subtree:true});
      return ()=>{observer.disconnect();cancelAnimationFrame(frame);context.revert()};
    });
    return ()=>media.revert();
  },[pathname]);
  return <div ref={root} className="scroll-choreography">{children}</div>;
}
