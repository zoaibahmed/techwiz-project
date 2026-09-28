import {Fragment} from 'react';
function Inline({text}:{text:string}){return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part,i)=>part.startsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:<Fragment key={i}>{part}</Fragment>)}</>}
export function ChatText({text}:{text:string}){
 const lines=text.replace(/\s+(?=\d+\.\s+\*\*)/g,'\n').split('\n');
 return <div className="chat-prose">{lines.map((line,i)=>!line.trim()?null:/^(?:[-*]|\d+\.)\s/.test(line)?<div className="chat-list-line" key={i}><span aria-hidden="true">•</span><p><Inline text={line.replace(/^(?:[-*]|\d+\.)\s+/,'')}/></p></div>:<p key={i}><Inline text={line.replace(/^#{1,4}\s+/,'')}/></p>)}</div>
}
