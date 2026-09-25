import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './MarketChapter.css';

gsap.registerPlugin(ScrollTrigger);
const chapters = {
  discover: {number:'01', title:'Find your gathering.', note:'A place for your next market morning.',image:'/images/market-arrival.jpg',detail:'/images/market.jpg'},
  grow: {number:'02', title:'Meet the hands behind it.',note:'People first. Produce with a story.',image:'/images/market-person.jpg',detail:'/images/grower.jpg'},
  harvest: {number:'03',title:'Make room for the harvest.',note:'Choose what is available. Plan your pickup.',image:'/images/harvest.jpg',detail:'/images/tomatoes.jpg'},
};
export function MarketChapter({kind}:{kind:keyof typeof chapters}){
 const root=useRef<HTMLDivElement>(null);
 const chapter=chapters[kind];
 useLayoutEffect(()=>{
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
   const context=gsap.context(()=>{
    const mobile=window.matchMedia('(max-width:700px)').matches;
    const timeline=gsap.timeline({scrollTrigger:{trigger:root.current,start:'top 80%',end:'bottom 35%',scrub:.7},defaults:{ease:'none'}});
    if(kind==='discover'){
     timeline.fromTo('.chapter-picture-main',{rotationX:38,scale:.72,yPercent:12},{rotationX:0,scale:1,yPercent:0,duration:1},0)
      .fromTo('.chapter-picture-detail',{xPercent:40,rotationY:-30,z:-120},{xPercent:0,rotationY:0,z:40,duration:1},0);
    }else if(kind==='grow'){
     timeline.fromTo('.chapter-picture-main',{rotationY:-28,xPercent:-12,scale:.88},{rotationY:0,xPercent:0,scale:1,duration:1},0)
      .fromTo('.chapter-picture-detail',{rotationY:35,xPercent:20,z:-100},{rotationY:0,xPercent:0,z:80,duration:1},0);
    }else{
     timeline.fromTo('.chapter-picture-main',{clipPath:'inset(0 38% 0 38%)',rotationX:12,scale:1.08},{clipPath:'inset(0 0% 0 0%)',rotationX:0,scale:1,duration:1},0)
      .fromTo('.chapter-picture-detail',{xPercent:-30,yPercent:20,rotationZ:-8},{xPercent:0,yPercent:0,rotationZ:0,duration:1},0);
    }
    timeline.fromTo('.chapter-statement',{yPercent:20,z:120},{yPercent:mobile?-8:-20,z:0,duration:1},0)
      .fromTo('.chapter-line',{scaleX:0},{scaleX:1,duration:1},0);
   },root);
   return ()=>context.revert();
  });
  return ()=>media.revert();
 },[kind]);
 return <div className={`market-chapter chapter-${kind}`} ref={root}>
  <div className="chapter-stage">
   <div className="chapter-label"><span>{chapter.number} / Your market day</span><span>Scroll to explore</span></div>
   <div className="chapter-depth">
    <figure className="chapter-picture chapter-picture-main"><img src={chapter.image} alt="" loading="lazy"/></figure>
    <figure className="chapter-picture chapter-picture-detail"><img src={chapter.detail} alt="" loading="lazy"/></figure>
    <h2 className="chapter-statement">{chapter.title}</h2>
   </div>
   <div className="chapter-foot"><p>{chapter.note}</p><small>Editorial photography · browse the actual listings below</small><span className="chapter-line"/></div>
  </div>
 </div>;
}
