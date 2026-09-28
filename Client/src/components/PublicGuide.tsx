import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {Leaf,X,ArrowUp,ArrowUpRight,MapPin,AlertCircle,CheckCircle2,FileText} from 'lucide-react';
import {askPublicGuideApi,type PublicProductCard} from '../data/api';
import {useVisitor} from '../data/visitor-context';
import {ChatText} from './ChatText';
import './assistant-experience.css';

type Answer = Awaited<ReturnType<typeof askPublicGuideApi>> & {question:string};

export function PublicGuide(){
  const [open,setOpen]=useState(false);
  return <>
    <button className="market-guide-launcher" onClick={()=>setOpen(true)}>
      <Leaf size={19}/>
      <span>Ask Market Guide</span>
    </button>
    {open&&<GuidePanel onClose={()=>setOpen(false)}/>}
  </>;
}

function ProductCard({p,onClose}:{p:PublicProductCard;onClose:()=>void}){
  const priceLabel = p.price&&p.price!=='—' ? `${p.currency} ${p.price}/${p.unit}` : 'Price on request';
  const getInitialImg = () => {
    if (p.image && !p.image.includes('/images/produce/')) return p.image;
    const n = (p.name || '').toLowerCase();
    if (/tomato/i.test(n)) return '/images/tomatoes.jpg';
    if (/apple/i.test(n)) return '/images/apples.jpg';
    if (/carrot/i.test(n)) return '/images/carrots.jpg';
    if (/honey/i.test(n)) return '/images/honey.jpg';
    if (/bread|sourdough/i.test(n)) return '/images/bread.jpg';
    if (/egg/i.test(n)) return '/images/eggs.jpg';
    return '/images/harvest.jpg';
  };
  const [imgSrc, setImgSrc] = useState(getInitialImg);

  return (
    <Link to={p.href} onClick={onClose} className="guide-product-card">
      <img
        src={imgSrc}
        alt={p.name}
        className="guide-product-img"
        loading="lazy"
        onError={() => {
          const n = (p.name || '').toLowerCase();
          if (/tomato/i.test(n)) setImgSrc('/images/tomatoes.jpg');
          else if (/apple/i.test(n)) setImgSrc('/images/apples.jpg');
          else if (/carrot/i.test(n)) setImgSrc('/images/carrots.jpg');
          else if (/honey/i.test(n)) setImgSrc('/images/honey.jpg');
          else setImgSrc('/images/harvest.jpg');
        }}
      />
      <div className="guide-product-info">
        <strong className="guide-product-name">{p.name}</strong>
        <span className="guide-product-price">{priceLabel}</span>
        {p.farmerName && <span className="guide-product-farmer">by {p.farmerName}</span>}
        {p.available && p.date && <span className="guide-product-date">Available {p.date}</span>}
        {!p.available && <span className="guide-product-unavailable">Not currently available</span>}
      </div>
      <ArrowUpRight size={14} className="guide-product-arrow"/>
    </Link>
  );
}


function GuidePanel({onClose}:{onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const end=useRef<HTMLDivElement>(null);
  const {visitor,openModal}=useVisitor();
  const [question,setQuestion]=useState('');
  const [answers,setAnswers]=useState<Answer[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest'})},[answers,busy]);

  async function ask(q:string){
    if(busy||!q.trim())return;
    setBusy(true);setError('');
    try{
      const history = answers.map(a => ({ question: a.question, reply: a.reply }));
      const result=await askPublicGuideApi(q,visitor.country||'',visitor.city||'',history);
      setAnswers(a=>[...a,{...result,question:q}]);
      setQuestion('');
    }catch(e){
      setError(e instanceof Error?e.message:'The guide is unavailable. You can still browse the market.');
    }finally{
      setBusy(false);
    }
  }

  function send(e:FormEvent){e.preventDefault();void ask(question);}

  const locationLabel = visitor.city
    ? `${visitor.city}${visitor.country ? ', '+visitor.country : ''}`
    : visitor.country || 'All published locations';

  return (
    <dialog ref={dialog} className="market-guide-panel" aria-labelledby="guide-title" onCancel={onClose}>
      <header>
        <div className="guide-emblem"><Leaf size={23}/></div>
        <div>
          <h2 id="guide-title">Market Guide</h2>
          <p>Your way around Gather &amp; Grow</p>
        </div>
        <button className="icon-button" aria-label="Close Market Guide" onClick={onClose}><X size={20}/></button>
      </header>

      <div className="guide-location">
        <MapPin size={14}/>
        <span>{locationLabel}</span>
        <button
          type="button"
          className="guide-location-set-btn"
          onClick={()=>{onClose();openModal();}}
          title="Change location"
        >
          Change
        </button>
        <span className="guide-location-hint">Public information only</span>
      </div>

      <div className="guide-conversation">
        <div className="guide-welcome">
          <h3>Find your next good thing.</h3>
          <p>Ask about produce, growers, markets, or send an inquiry to the administration team.</p>
        </div>

        {!answers.length&&(
          <div className="guide-prompts">
            {['Show me fresh vegetables','Which markets can I visit?','Find cheap tomatoes','Send message to admin'].map(q=>(
              <button key={q} disabled={busy} onClick={()=>void ask(q)}>
                {q}<ArrowUpRight size={15}/>
              </button>
            ))}
          </div>
        )}

        {answers.map((a,i)=>(
          <article className="guide-turn" key={i}>
            <p className="guide-question">{a.question}</p>

            {/* Location prompt banner */}
            {a.needsLocation && (
              <div className="guide-location-prompt">
                <AlertCircle size={16}/>
                <span>Please set your location to see local produce.</span>
                <button
                  type="button"
                  className="guide-location-prompt-btn"
                  onClick={()=>{onClose();openModal();}}
                >
                  Set location
                </button>
              </div>
            )}

            <ChatText text={a.reply}/>

            {/* Inquiry Success Confirmation Card */}
            {a.inquirySent && a.inquiry && (
              <div className="guide-inquiry-card">
                <div className="guide-inquiry-header">
                  <CheckCircle2 size={18} className="guide-inquiry-check" />
                  <strong>Message Delivered to Admin</strong>
                </div>
                <div className="guide-inquiry-meta">
                  <div className="guide-inquiry-row">
                    <span>Reference:</span>
                    <code>#INQ-{a.inquiry.id.slice(-6).toUpperCase()}</code>
                  </div>
                  <div className="guide-inquiry-row">
                    <span>From:</span>
                    <span>{a.inquiry.name} ({a.inquiry.email})</span>
                  </div>
                  <div className="guide-inquiry-row">
                    <span>Subject:</span>
                    <span>{a.inquiry.subject}</span>
                  </div>
                  <div className="guide-inquiry-row">
                    <span>Status:</span>
                    <span className="guide-inquiry-status">Received by Admin</span>
                  </div>
                </div>
              </div>
            )}

            {/* Template insert button when fields are missing */}
            {a.needsInquiryFields && a.needsInquiryFields.length > 0 && (
              <div className="guide-template-prompt">
                <span>Missing required details?</span>
                <button
                  type="button"
                  className="guide-template-action-btn"
                  onClick={() => {
                    setQuestion("Name: \nEmail: \nSubject: \nMessage: ");
                  }}
                >
                  <FileText size={13} />
                  <span>Insert message template</span>
                </button>
              </div>
            )}

            {/* Product cards */}
            {a.products&&a.products.length>0&&(
              <div className="guide-product-grid">
                {a.products.map(p=>(
                  <ProductCard key={p.id} p={p} onClose={onClose}/>
                ))}
              </div>
            )}

            {/* Market/Farmer source links */}
            {a.sources&&a.sources.filter(x=>/^\/(markets|farmers|products)\/[a-f0-9]{24}$/.test(x.href)).length>0&&(
              <div className="guide-results">
                {a.sources.filter(x=>/^\/(markets|farmers|products)\/[a-f0-9]{24}$/.test(x.href)).map(x=>(
                  <Link key={x.href} to={x.href} onClick={onClose}>
                    <div>
                      <strong>{x.title}</strong>
                      <span>{x.detail}</span>
                    </div>
                    <ArrowUpRight size={16}/>
                  </Link>
                ))}
              </div>
            )}

            <small>{a.engine}</small>
          </article>
        ))}


        {busy&&<p role="status" className="guide-thinking">Checking the public catalogue…</p>}
        {error&&<p role="alert" className="auth-alert">{error}</p>}
        <div ref={end}/>
      </div>

      <form onSubmit={send} className="guide-composer">
        <label className="visually-hidden" htmlFor="guide-question">Ask Market Guide</label>
        <textarea
          rows={2}
          id="guide-question"
          autoComplete="off"
          placeholder="Ask about markets, growers or fresh produce…"
          maxLength={1500}
          value={question}
          onChange={e=>setQuestion(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void ask(question);}}}
        />
        <button disabled={busy||question.trim().length<2} aria-label="Send question">
          <ArrowUp size={20}/>
        </button>
      </form>
      <p className="guide-policy">Stock and pickup availability are checked again when you reserve.</p>
    </dialog>
  );
}
