'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════
// THEME
// ═══════════════════════════════════════
const T = {
  bg:'#f8fafc', card:'#ffffff', border:'#e2e8f0',
  primary:'#3b82f6', primaryDark:'#1d4ed8', primaryBg:'#eff6ff',
  text:'#0f172a', muted:'#64748b', mutedBg:'#f1f5f9',
  green:'#10b981', greenBg:'#ecfdf5',
  red:'#ef4444', redBg:'#fee2e2',
  shadow:'0 1px 3px rgba(0,0,0,0.08)',
  shadowMd:'0 4px 6px rgba(0,0,0,0.07)',
  shadowLg:'0 10px 25px rgba(0,0,0,0.1)',
};

const CAREER_PATHS = [
  {id:'tech',      icon:'💻', name:'التقنية',   desc:'تطوير البرمجيات، أمن المعلومات، والذكاء الاصطناعي.'},
  {id:'commerce',  icon:'📊', name:'التجارة',   desc:'إدارة الأعمال، التسويق، والتحليل المالي.'},
  {id:'design',    icon:'🎨', name:'التصميم',   desc:'تجربة المستخدم، واجهة UI، والجرافيك.'},
  {id:'education', icon:'📚', name:'التعليم',   desc:'التدريس، تطوير المناهج، والتدريب المهني.'},
  {id:'services',  icon:'🤝', name:'الخدمات',  desc:'إدارة المشاريع، الموارد البشرية، خدمة العملاء.'},
  {id:'industry',  icon:'🏭', name:'الصناعة',  desc:'الهندسة، إدارة الإنتاج، وسلاسل الإمداد.'},
  {id:'arts',      icon:'✏️', name:'الفنون',   desc:'الكتابة، الرسم، الإنتاج الفني، والسينما.'},
];

const RESOURCES = [
  {title:'Coursera',          desc:'كورسات عالمية من أفضل الجامعات.',          url:'https://www.coursera.org',          icon:'🎓', tags:['tech','commerce','design','education']},
  {title:'رواق (Rwaq)',      desc:'منصة تعليمية عربية مجانية.',                url:'https://www.rwaq.org/',              icon:'🎓', tags:['tech','commerce','design','education','arts']},
  {title:'LinkedIn Learning', desc:'مهارات مهنية وتقنية مطلوبة في سوق العمل.',url:'https://www.linkedin.com/learning/', icon:'💼', tags:['services','commerce','tech']},
  {title:'edX',               desc:'تعليم عالٍ مجاني من أفضل الجامعات.',       url:'https://www.edx.org',               icon:'🏫', tags:['tech','education','commerce']},
  {title:'Udemy',             desc:'آلاف الكورسات في جميع المجالات.',           url:'https://www.udemy.com',             icon:'📖', tags:['tech','design','arts']},
  {title:'YouTube',           desc:'أضخم مكتبة تعليمية مجانية في العالم.',     url:'https://www.youtube.com',           icon:'▶️', tags:['tech','design','arts','education']},
];

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
type Msg = { role: 'user' | 'assistant'; content: string };

function parseMessage(text: string) {
  if (/نهاية:\s*\[true\]/i.test(text))
    return { clean: text.replace(/نهاية:\s*\[true\]/i,'').trim(), options:[] as string[], isFinal:true };
  const match = text.match(/خياراتك:\s*\[([^\]]*)\]/s);
  if (!match) return { clean:text.trim(), options:[] as string[], isFinal:false };
  const options = match[1].trim()==='' ? [] : match[1].split('|').map(s=>s.trim()).filter(Boolean);
  return { clean: text.replace(/خياراتك:\s*\[([^\]]*)\]/s,'').trim(), options, isFinal:false };
}

// ✅ يتصل بـ /api/chat — المفتاح محمي في السيرفر
async function callChatStream(
  messages: Msg[],
  onChunk: (t:string)=>void,
  onDone: (t:string)=>void,
  onError: (e:string)=>void
) {
  try {
    const res = await fetch('/api/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ messages, stream:true }),
    });

    if (res.status === 429) {
      onError('تجاوزت الحد المسموح. انتظر دقيقة وأعد المحاولة.'); return;
    }
    if (!res.ok) {
      const d = await res.json().catch(()=>({}));
      onError((d as Record<string,string>).error || 'خطأ في الاتصال'); return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(l=>l.startsWith('data:'));
      for (const line of lines) {
        const data = line.replace('data:','').trim();
        if (data==='[DONE]') continue;
        try {
          const delta = JSON.parse(data)?.delta?.text || '';
          if (delta) { full+=delta; onChunk(full); }
        } catch {}
      }
    }
    onDone(full);
  } catch(e) {
    onError((e as Error).message || 'خطأ في الاتصال');
  }
}

function generatePDF(content: string) {
  const clean = content.replace(/\*\*(.*?)\*\*/g,'$1').replace(/##+ /g,'');
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
<title>تقرير مسارك المهني</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
body{font-family:'Cairo',sans-serif;padding:40px;color:#0f172a;direction:rtl}
.header{background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;padding:32px;border-radius:16px;margin-bottom:32px;text-align:center}
.header h1{margin:0 0 8px;font-size:28px;font-weight:900}
.content{font-size:15px;line-height:1.9;white-space:pre-wrap}
.footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:20px;color:#64748b;font-size:12px;text-align:center}
</style></head><body>
<div class="header"><h1>🧭 تقرير مسارك المهني</h1><p>${new Date().toLocaleDateString('ar-SA')}</p></div>
<div class="content">${clean}</div>
<div class="footer">منصة مسارك © ${new Date().getFullYear()} أنور جعفر</div>
</body></html>`;
  const win = window.open(URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),'_blank');
  if (win) win.onload = ()=>win.print();
}

// ═══════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════
function Btn({children,onClick,variant='primary',style,disabled}:{children:React.ReactNode,onClick?:()=>void,variant?:string,style?:React.CSSProperties,disabled?:boolean}) {
  type V = Record<string,React.CSSProperties>;
  const v:V = {
    primary:{background:T.primary,color:'#fff',border:'none',boxShadow:T.shadowMd},
    outline:{background:'transparent',color:T.primary,border:`1.5px solid ${T.primary}`,boxShadow:'none'},
    ghost:  {background:'transparent',color:T.muted,border:`1px solid ${T.border}`,boxShadow:'none'},
    white:  {background:'#fff',color:T.primary,border:'3px solid rgba(255,255,255,0.3)',boxShadow:'0 8px 24px rgba(0,0,0,0.2)'},
    green:  {background:T.green,color:'#fff',border:'none',boxShadow:T.shadowMd},
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...(v[variant]||v.primary),borderRadius:50,padding:'10px 24px',
      fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:14,
      cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,
      transition:'all 0.2s',...style,
    }}
      onMouseEnter={e=>{if(!disabled){(e.currentTarget as HTMLButtonElement).style.transform='scale(1.04)';(e.currentTarget as HTMLButtonElement).style.filter='brightness(1.08)';}}}
      onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform='scale(1)';(e.currentTarget as HTMLButtonElement).style.filter='none';}}
    >{children}</button>
  );
}

function Card({children,style,onMouseEnter,onMouseLeave}:{children:React.ReactNode,style?:React.CSSProperties,onMouseEnter?:(e:React.MouseEvent<HTMLDivElement>)=>void,onMouseLeave?:(e:React.MouseEvent<HTMLDivElement>)=>void}) {
  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{
      background:T.card,border:`1px solid ${T.border}`,
      borderRadius:16,padding:'24px',
      boxShadow:T.shadow,transition:'all 0.2s',...style,
    }}>{children}</div>
  );
}

function Badge({children}:{children:React.ReactNode}) {
  return <span style={{background:T.primaryBg,color:T.primary,border:`1px solid ${T.primary}20`,borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:700}}>{children}</span>;
}

function StreamText({text,done}:{text:string,done:boolean}) {
  return (
    <span style={{whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
      <span dangerouslySetInnerHTML={{__html:
        text
          .replace(/\*\*(.*?)\*\*/g,`<strong style="color:${T.primary}">$1</strong>`)
          .replace(/## (.*?)(\n|$)/g,`<h3 style="color:${T.text};font-size:17px;font-weight:900;margin:18px 0 6px 0">$1</h3>`)
          .replace(/### (.*?)(\n|$)/g,`<h4 style="color:${T.primary};font-size:14px;font-weight:800;margin:12px 0 4px 0">$1</h4>`)
          .replace(/\n/g,'<br/>')
      }}/>
      {!done && <span style={{display:'inline-block',width:2,height:'1em',background:T.primary,marginRight:2,animation:'mscursor 0.8s ease-in-out infinite',verticalAlign:'text-bottom'}}/>}
    </span>
  );
}

// ═══════════════════════════════════════
// HEADER — dropdown
// ═══════════════════════════════════════
function Header({page,setPage}:{page:string,setPage:(p:string)=>void}) {
  const [open,setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const nav = [
    {id:'explore',     icon:'🗺️', l:'استكشف المسارات'},
    {id:'resources',   icon:'📚', l:'مركز المصادر'},
    {id:'methodology', icon:'🧠', l:'عن المنهجية'},
    {id:'profile',     icon:'👤', l:'ملفي الشخصي'},
    {id:'assessment',  icon:'🚀', l:'ابدأ التقييم'},
  ];
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(menuRef.current&&!menuRef.current.contains(e.target as Node))setOpen(false);};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);
  return (
    <header style={{background:T.card,borderBottom:`1px solid ${T.border}`,height:64,position:'sticky',top:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',boxShadow:T.shadow}}>
      <button onClick={()=>setPage('home')} style={{background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:8,color:T.primary,fontFamily:'Cairo,sans-serif',fontWeight:900,fontSize:22}}>
        🧭 مسارك
      </button>
      <div ref={menuRef} style={{position:'relative'}}>
        <button onClick={()=>setOpen(o=>!o)} style={{background:open?T.primaryBg:'transparent',border:`1px solid ${open?T.primary:T.border}`,borderRadius:12,padding:'9px 14px',color:open?T.primary:T.muted,fontFamily:'Cairo,sans-serif',fontWeight:600,fontSize:13,cursor:'pointer',transition:'all 0.15s',display:'flex',alignItems:'center',gap:6}}>
          <span>القائمة</span>
          <span style={{fontSize:10,transition:'transform 0.2s',transform:open?'rotate(180deg)':'rotate(0)'}}>▼</span>
        </button>
        {open && (
          <div style={{position:'absolute',top:'calc(100% + 8px)',left:0,background:T.card,border:`1px solid ${T.border}`,borderRadius:16,boxShadow:T.shadowLg,minWidth:220,overflow:'hidden',animation:'msdropdown 0.18s ease',zIndex:300}}>
            {nav.map((item,i)=>(
              <button key={item.id} onClick={()=>{setPage(item.id);setOpen(false);}} style={{width:'100%',background:page===item.id?T.primaryBg:'transparent',border:'none',borderBottom:i<nav.length-1?`1px solid ${T.border}`:'none',padding:'13px 18px',color:page===item.id?T.primary:T.text,fontFamily:'Cairo,sans-serif',fontWeight:600,fontSize:14,cursor:'pointer',transition:'all 0.12s',display:'flex',alignItems:'center',gap:10,textAlign:'right',direction:'rtl'}}
                onMouseEnter={e=>{if(page!==item.id)(e.currentTarget as HTMLButtonElement).style.background=T.mutedBg;}}
                onMouseLeave={e=>{if(page!==item.id)(e.currentTarget as HTMLButtonElement).style.background='transparent';}}
              >
                <span style={{fontSize:18}}>{item.icon}</span>{item.l}
                {page===item.id&&<span style={{marginRight:'auto',fontSize:10,color:T.primary}}>●</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

function Footer({setPage}:{setPage:(p:string)=>void}) {
  return (
    <footer style={{background:T.card,borderTop:`1px solid ${T.border}`,padding:'20px 24px'}}>
      <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <p style={{color:T.muted,fontSize:13,margin:0}}>© {new Date().getFullYear()} أنور جعفر – جميع الحقوق محفوظة</p>
        <nav style={{display:'flex',gap:20}}>
          {[['explore','المسارات'],['methodology','المنهجية'],['resources','المصادر']].map(([id,l])=>(
            <button key={id} onClick={()=>setPage(id)} style={{background:'none',border:'none',color:T.muted,fontSize:13,cursor:'pointer',fontFamily:'Cairo,sans-serif',transition:'color 0.15s'}}
              onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.color=T.primary}
              onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.color=T.muted}
            >{l}</button>
          ))}
        </nav>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════
// HOME
// ═══════════════════════════════════════
function HomePage({setPage}:{setPage:(p:string)=>void}) {
  return (
    <div style={{minHeight:'calc(100vh - 64px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px 24px',textAlign:'center',background:T.bg,animation:'msfadein 0.7s ease'}}>
      <img src="https://cdn-icons-png.flaticon.com/512/854/854894.png" alt="" style={{width:80,height:80,marginBottom:24,animation:'msfloat 4s ease-in-out infinite'}}/>
      <h1 style={{color:T.text,fontSize:'clamp(28px,5vw,48px)',fontWeight:900,lineHeight:1.3,marginBottom:12}}>
        🌟 منصّة <span style={{color:T.primary}}>مسارك</span>
      </h1>
      <p style={{color:T.muted,fontSize:'clamp(15px,2.5vw,20px)',fontStyle:'italic',marginBottom:40}}>
        🌱 "اختر طريقك... وابدأ بخطوة اليوم قبل الغد"
      </p>
      <Btn onClick={()=>setPage('assessment')} style={{padding:'18px 52px',fontSize:18,borderRadius:50}}>
        ← 🚀 ابدأ رحلتك الآن
      </Btn>
    </div>
  );
}

// ═══════════════════════════════════════
// VOICE MODE
// ═══════════════════════════════════════
function VoiceMode({onTranscript,onBotReply,history,setHistory}:{
  onTranscript:(t:string)=>void,
  onBotReply:(clean:string,isFinal:boolean)=>void,
  history:Msg[],
  setHistory:(h:Msg[])=>void,
}) {
  const [phase,setPhase] = useState<'idle'|'listening'|'thinking'|'speaking'>('idle');
  const recRef = useRef<InstanceType<typeof window.SpeechRecognition>|null>(null);
  const supported = typeof window!=='undefined'&&('SpeechRecognition' in window||'webkitSpeechRecognition' in window);

  const speak = (text:string)=>{
    const synth = window.speechSynthesis;
    synth.cancel();
    const clean = text.replace(/خياراتك:\s*\[([^\]]*)\]/s,'').replace(/نهاية:\s*\[true\]/i,'').replace(/\*\*(.*?)\*\*/g,'$1').replace(/##+ /g,'').replace(/\n/g,' ').trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang='ar-SA'; utt.rate=0.95;
    const arVoice = synth.getVoices().find(v=>v.lang.startsWith('ar'));
    if (arVoice) utt.voice=arVoice;
    utt.onstart=()=>{setPhase('speaking');};
    utt.onend=()=>setPhase('idle');
    utt.onerror=()=>setPhase('idle');
    synth.speak(utt);
  };

  const startListening=()=>{
    if(!supported)return;
    window.speechSynthesis.cancel();
    const SR = (window.SpeechRecognition||window.webkitSpeechRecognition) as typeof window.SpeechRecognition;
    const rec = new SR();
    rec.lang='ar-SA'; rec.interimResults=false; rec.maxAlternatives=1;
    rec.onstart=()=>setPhase('listening');
    rec.onresult=async e=>{
      const transcript = e.results[0][0].transcript;
      onTranscript(transcript);
      setPhase('thinking');
      const newHistory:Msg[] = [...history,{role:'user',content:transcript}];
      setHistory(newHistory);
      await callChatStream(
        newHistory,
        ()=>{},
        (full)=>{ const{clean,isFinal}=parseMessage(full); const fh=[...newHistory,{role:'assistant' as const,content:full}]; setHistory(fh); onBotReply(clean,isFinal); speak(clean); },
        ()=>setPhase('idle')
      );
    };
    rec.onerror=()=>setPhase('idle');
    rec.onend=()=>{if(phase==='listening')setPhase('idle');};
    recRef.current=rec; rec.start();
  };

  const stop=()=>{recRef.current?.stop();window.speechSynthesis.cancel();setPhase('idle');};
  useEffect(()=>()=>{recRef.current?.stop();window.speechSynthesis?.cancel();},[]);

  const cols:{[k:string]:{bg:string,ring:string}} = {
    idle:     {bg:T.primary,    ring:'rgba(59,130,246,0.25)'},
    listening:{bg:T.red,        ring:'rgba(239,68,68,0.3)'},
    thinking: {bg:T.muted,      ring:'rgba(100,116,139,0.2)'},
    speaking: {bg:T.green,      ring:'rgba(16,185,129,0.3)'},
  };
  const col = cols[phase];
  const labels:{[k:string]:string} = {idle:'اضغط للتحدث',listening:'أنا أستمع...',thinking:'المرشد يفكر...',speaking:'المرشد يتحدث...'};
  const subs:{[k:string]:string} = {idle:'اضغط الزر وابدأ الحديث بالعربية',listening:'اضغط للإيقاف',thinking:'يرجى الانتظار...',speaking:'انتظر حتى ينتهي'};
  const icons:{[k:string]:string} = {idle:'🎙️',listening:'⏹️',thinking:'⏳',speaking:'🔊'};

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'32px 20px',gap:24}}>
      <div style={{cursor:phase==='thinking'?'not-allowed':'pointer'}} onClick={phase==='idle'?startListening:phase==='listening'?stop:undefined}>
        <div style={{width:110,height:110,borderRadius:'50%',background:col.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:42,boxShadow:`0 0 0 16px ${col.ring}, ${T.shadowLg}`,transition:'all 0.3s',animation:phase==='listening'?'msripple 1.2s ease-in-out infinite':phase==='speaking'?'mspulse 0.8s ease-in-out infinite':'none'}}>
          {icons[phase]}
        </div>
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{color:T.text,fontSize:17,fontWeight:800,marginBottom:5}}>{labels[phase]}</div>
        <div style={{color:T.muted,fontSize:13}}>{subs[phase]}</div>
      </div>
      {!supported&&<div style={{background:T.redBg,border:`1px solid ${T.red}30`,borderRadius:12,padding:'12px 18px',color:T.red,fontSize:13,textAlign:'center'}}>متصفحك لا يدعم الصوت. استخدم Chrome أو Edge.</div>}
    </div>
  );
}

// ═══════════════════════════════════════
// ASSESSMENT
// ═══════════════════════════════════════
function YouTubeIntro({onStart}:{onStart:()=>void}) {
  const VIDEO_ID='CFGLoQIhmow';
  return (
    <div style={{width:'100%',height:'78vh',minHeight:400,position:'relative',borderRadius:24,overflow:'hidden',boxShadow:T.shadowLg,animation:'msfadein 0.8s ease'}}>
      <iframe src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=0&controls=0&rel=0&showinfo=0&loop=1&playlist=${VIDEO_ID}&modestbranding=1`}
        allow="autoplay; encrypted-media" allowFullScreen
        style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none',transform:'scale(1.08)',pointerEvents:'none'}}
        title="مقدمة مسارك"
      />
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.45) 50%,rgba(0,0,0,0.2) 100%)',zIndex:2}}/>
      <div style={{position:'absolute',inset:0,zIndex:3,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 24px',textAlign:'center',color:'#fff'}}>
        <div style={{background:'rgba(255,255,255,0.15)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'50%',padding:16,marginBottom:28,animation:'mspulse 2s ease-in-out infinite'}}>🔊</div>
        <h1 style={{fontSize:'clamp(26px,5vw,60px)',fontWeight:900,textShadow:'0 2px 20px rgba(0,0,0,0.5)',marginBottom:18,lineHeight:1.2,animation:'msslidein 0.6s ease 0.3s both'}}>مرحباً بك في رحلة اكتشافك</h1>
        <div style={{animation:'msslidein 0.6s ease 0.5s both'}}>
          <p style={{fontSize:'clamp(15px,2.5vw,24px)',color:'rgba(255,255,255,0.9)',lineHeight:1.7,maxWidth:560,marginBottom:10}}>استرخِ، خذ نفساً عميقاً، واستعد لبدء محادثة قصيرة.</p>
          <p style={{fontSize:'clamp(16px,3vw,28px)',fontWeight:700,textShadow:'0 2px 10px rgba(0,0,0,0.4)'}}>لا توجد إجابات صحيحة أو خاطئة، فقط كن على طبيعتك.</p>
        </div>
        <div style={{animation:'msslidein 0.6s ease 0.7s both',marginTop:36}}>
          <button onClick={onStart} style={{background:'#fff',color:T.primary,border:'4px solid rgba(255,255,255,0.25)',borderRadius:50,padding:'20px 60px',fontSize:'clamp(17px,2.5vw,24px)',fontWeight:900,cursor:'pointer',fontFamily:'Cairo,sans-serif',boxShadow:'0 8px 32px rgba(0,0,0,0.3)',transition:'all 0.2s'}}
            onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.transform='scale(1.08)'}
            onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.transform='scale(1)'}
          >▶ أنا مستعد، لنبدأ!</button>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({question,options,onAnswer,isStreaming,streamText,qNum,isDeep,cardKey}:{
  question:string,options:string[],onAnswer:(a:string)=>void,
  isStreaming:boolean,streamText:string,qNum:number,isDeep:boolean,cardKey:number
}) {
  const [visible,setVisible]=useState(false);
  const [text,setText]=useState('');
  const taRef=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{setText('');setVisible(false);const t=setTimeout(()=>{setVisible(true);if(!isStreaming&&options.length===0&&taRef.current)taRef.current.focus();},60);return()=>clearTimeout(t);},[cardKey]);
  useEffect(()=>{if(!isStreaming&&options.length===0&&taRef.current)taRef.current.focus();},[isStreaming]);
  const submit=(val?:string)=>{const v=(val||text).trim();if(!v||isStreaming)return;setText('');onAnswer(v);};
  return (
    <div style={{opacity:visible?1:0,transform:visible?'translateY(0)':'translateY(22px)',transition:'opacity 0.45s ease, transform 0.45s cubic-bezier(0.34,1.2,0.64,1)'}}>
      <Card style={{border:isDeep?`2px solid ${T.primary}35`:`1px solid ${T.border}`,boxShadow:isDeep?`0 0 0 4px ${T.primary}08,${T.shadowLg}`:T.shadowLg,position:'relative',overflow:'hidden'}}>
        {isDeep&&<div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.primary},${T.primaryDark})`}}/>}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
          <div style={{width:46,height:46,borderRadius:13,background:isDeep?T.primary:T.primaryBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,transition:'all 0.4s'}}>{isDeep?'🔍':'🧭'}</div>
          <div style={{flex:1}}>
            <div style={{color:isDeep?T.primary:T.muted,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase'}}>{isDeep?'تحقيق معمّق':'مرشد مسارك'}</div>
            {qNum>0&&<div style={{color:T.muted,fontSize:11,marginTop:2}}>سؤال {qNum}</div>}
          </div>
          {isDeep&&<div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:7,height:7,borderRadius:'50%',background:T.primary,animation:'mspulse 1.5s ease-in-out infinite'}}/><span style={{color:T.primary,fontSize:10,fontWeight:700,letterSpacing:2}}>تحليل نشط</span></div>}
        </div>
        <div style={{color:T.text,fontSize:'clamp(15px,3vw,20px)',fontWeight:800,lineHeight:1.7,marginBottom:22,direction:'rtl',textAlign:'right',minHeight:40}}>
          {isStreaming?<StreamText text={streamText} done={false}/>:question}
        </div>
        {!isStreaming&&options.length>0&&(
          <div style={{display:'flex',flexDirection:'column',gap:9,marginBottom:16}}>
            {options.map((opt,i)=>(
              <button key={i} onClick={()=>submit(opt)} style={{background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:12,padding:'13px 18px',color:T.text,fontSize:14,fontWeight:600,textAlign:'right',direction:'rtl',cursor:'pointer',fontFamily:'Cairo,sans-serif',transition:'all 0.18s',display:'flex',alignItems:'center',gap:10}}
                onMouseEnter={e=>{const b=e.currentTarget as HTMLButtonElement;b.style.background=T.primaryBg;b.style.borderColor=T.primary;b.style.color=T.primary;b.style.transform='translateX(-3px)';}}
                onMouseLeave={e=>{const b=e.currentTarget as HTMLButtonElement;b.style.background=T.bg;b.style.borderColor=T.border;b.style.color=T.text;b.style.transform='translateX(0)';}}
              >
                <span style={{width:26,height:26,borderRadius:8,background:T.mutedBg,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:T.muted,fontWeight:700,flexShrink:0}}>{i+1}</span>
                {opt}
              </button>
            ))}
          </div>
        )}
        {!isStreaming&&options.length>0&&<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}><div style={{flex:1,height:1,background:T.border}}/><span style={{color:T.muted,fontSize:11,fontWeight:700,letterSpacing:1.5,whiteSpace:'nowrap'}}>أو اكتب بحرية</span><div style={{flex:1,height:1,background:T.border}}/></div>}
        {!isStreaming&&(
          <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
            <textarea ref={taRef} value={text} onChange={e=>setText(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}}}
              placeholder={options.length>0?'اكتب إجابة مختلفة...':'اكتب إجابتك هنا...'}
              rows={2} style={{flex:1,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:12,padding:'11px 14px',color:T.text,fontSize:14,fontFamily:'Cairo,sans-serif',resize:'none',direction:'rtl',lineHeight:1.6,outline:'none',transition:'border-color 0.2s'}}
              onFocus={e=>e.target.style.borderColor=T.primary}
              onBlur={e=>e.target.style.borderColor=T.border}
            />
            <button onClick={()=>submit()} disabled={!text.trim()} style={{width:44,height:44,borderRadius:12,flexShrink:0,background:text.trim()?T.primary:T.mutedBg,border:'none',cursor:text.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,transition:'all 0.2s',color:text.trim()?'#fff':T.muted,boxShadow:text.trim()?T.shadowMd:'none'}}>←</button>
          </div>
        )}
        {isStreaming&&<div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0'}}><div style={{display:'flex',gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:T.primary,animation:`msbounce 1.1s ease-in-out ${i*0.18}s infinite`}}/>)}</div><span style={{color:T.muted,fontSize:12,fontWeight:600}}>المرشد يكتب...</span></div>}
      </Card>
    </div>
  );
}

function ResultsCard({content,onRestart,setPage}:{content:string,onRestart:()=>void,setPage:(p:string)=>void}) {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{setTimeout(()=>setVisible(true),80);},[]);
  return (
    <div style={{opacity:visible?1:0,transform:visible?'translateY(0)':'translateY(16px)',transition:'all 0.5s ease'}}>
      <div style={{textAlign:'center',marginBottom:28}}>
        <div style={{fontSize:52,marginBottom:12}}>🎯</div>
        <h2 style={{color:T.text,fontSize:26,fontWeight:900,marginBottom:6}}>نتائج تحليلك المهني</h2>
        <p style={{color:T.muted,fontSize:14}}>بناءً على تحليل شخصيتك ومعطياتك الكاملة</p>
      </div>
      <Card style={{marginBottom:20,border:`2px solid ${T.primary}30`,boxShadow:`0 0 0 4px ${T.primary}06,${T.shadowLg}`}}>
        <div style={{color:T.text,fontSize:15,lineHeight:1.9,direction:'rtl',textAlign:'right'}}><StreamText text={content} done={true}/></div>
      </Card>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <Btn onClick={onRestart} variant="outline" style={{flex:1,minWidth:120}}>🔄 ابدأ من جديد</Btn>
        <Btn onClick={()=>setPage('explore')} style={{flex:1,minWidth:120}}>🗺️ استكشف المسارات</Btn>
        <Btn onClick={()=>generatePDF(content)} variant="green" style={{flex:1,minWidth:120}}>📄 حمّل PDF</Btn>
      </div>
    </div>
  );
}

function AssessmentPage({setPage}:{setPage:(p:string)=>void}) {
  const [stage,setStage]=useState<'intro'|'init'|'chat'|'results'>('intro');
  const [chatMode,setChatMode]=useState<'text'|'voice'>('text');
  const [currentQ,setCurrentQ]=useState({text:'',options:[] as string[]});
  const [history,setHistory]=useState<Msg[]>([]);
  const [isStreaming,setIsStreaming]=useState(false);
  const [streamText,setStreamText]=useState('');
  const [qNum,setQNum]=useState(0);
  const [isDeep,setIsDeep]=useState(false);
  const [finalResult,setFinalResult]=useState('');
  const [cardKey,setCardKey]=useState(0);
  const [voiceLog,setVoiceLog]=useState<{role:string,text:string}[]>([]);
  const [error,setError]=useState('');
  const topRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{topRef.current?.scrollIntoView({behavior:'smooth',block:'start'});},[cardKey,stage]);

  const handleStream=(msgs:Msg[],onSuccess:(clean:string,opts:string[],isFinal:boolean,fullH:Msg[])=>void)=>{
    setIsStreaming(true);setStreamText('');setError('');
    callChatStream(msgs,
      partial=>setStreamText(partial),
      full=>{
        const{clean,options,isFinal}=parseMessage(full);
        const fullH=[...msgs,{role:'assistant' as const,content:full}];
        setHistory(fullH);setIsStreaming(false);
        onSuccess(clean,options,isFinal,fullH);
      },
      err=>{setIsStreaming(false);setError(err);}
    );
  };

  const startChat=()=>{
    setStage('init');
    const msgs:Msg[]=[{role:'user',content:'مرحباً، ابدأ معي'}];
    handleStream(msgs,(clean,options,isFinal)=>{
      if(isFinal){setFinalResult(clean);setStage('results');}
      else{setCurrentQ({text:clean,options});setQNum(1);setCardKey(k=>k+1);setStage('chat');}
    });
  };

  const handleTextAnswer=useCallback((answer:string)=>{
    if(isStreaming)return;
    const newHistory:Msg[]=[...history,{role:'user',content:answer}];
    setCurrentQ({text:'',options:[]});setCardKey(k=>k+1);
    handleStream(newHistory,(clean,options,isFinal,fullH)=>{
      if(isFinal){setFinalResult(clean);setStage('results');}
      else{setCurrentQ({text:clean,options});setQNum(n=>n+1);setIsDeep(fullH.length>14);setCardKey(k=>k+1);}
    });
  },[history,isStreaming]);

  const handleVoiceReply=(clean:string,isFinal:boolean)=>{
    setVoiceLog(l=>[...l,{role:'bot',text:clean}]);
    if(isFinal){setFinalResult(clean);setStage('results');}
    setQNum(n=>n+1);
  };

  const restart=()=>{setStage('intro');setHistory([]);setCurrentQ({text:'',options:[]});setQNum(0);setIsDeep(false);setFinalResult('');setCardKey(0);setStreamText('');setVoiceLog([]);setError('');};

  return (
    <div style={{background:T.bg,minHeight:'calc(100vh - 64px)',padding:'32px 20px'}} ref={topRef}>
      <div style={{maxWidth:640,margin:'0 auto'}}>
        {error&&<div style={{background:T.redBg,border:`1px solid ${T.red}30`,borderRadius:12,padding:'12px 18px',color:T.red,fontSize:13,marginBottom:16,textAlign:'center'}}>{error}<button onClick={()=>setError('')} style={{background:'none',border:'none',color:T.red,cursor:'pointer',marginRight:8,fontWeight:700}}>✕</button></div>}
        {stage==='intro'&&<YouTubeIntro onStart={startChat}/>}
        {stage==='init'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80,gap:16}}><div style={{display:'flex',gap:7}}>{[0,1,2].map(i=><div key={i} style={{width:11,height:11,borderRadius:'50%',background:T.primary,animation:`msbounce 1.1s ease-in-out ${i*0.18}s infinite`}}/>)}</div><span style={{color:T.muted,fontSize:14,fontWeight:600}}>جاري تحميل المرشد...</span></div>}
        {stage==='chat'&&(
          <>
            <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:50,padding:4,display:'flex',gap:4,boxShadow:T.shadow}}>
                {[['text','⌨️ كتابة'],['voice','🎙️ صوت']].map(([mode,label])=>(
                  <button key={mode} onClick={()=>setChatMode(mode as 'text'|'voice')} style={{background:chatMode===mode?T.primary:'transparent',border:'none',borderRadius:50,padding:'8px 20px',color:chatMode===mode?'#fff':T.muted,fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.2s'}}>{label}</button>
                ))}
              </div>
            </div>
            {chatMode==='text'&&<QuestionCard key={cardKey} cardKey={cardKey} question={currentQ.text} options={currentQ.options} onAnswer={handleTextAnswer} isStreaming={isStreaming} streamText={streamText} qNum={qNum} isDeep={isDeep}/>}
            {chatMode==='voice'&&(
              <Card style={{boxShadow:T.shadowLg}}>
                <div style={{textAlign:'center',marginBottom:16}}>
                  <div style={{color:T.text,fontWeight:800,fontSize:17,marginBottom:4}}>وضع المحادثة الصوتية</div>
                  <div style={{color:T.muted,fontSize:13}}>تحدث مع المرشد مباشرة بصوتك بالعربية</div>
                </div>
                {currentQ.text&&<div style={{background:T.primaryBg,border:`1px solid ${T.primary}20`,borderRadius:12,padding:'14px 16px',marginBottom:20,direction:'rtl',textAlign:'right'}}><div style={{fontSize:11,color:T.primary,fontWeight:700,marginBottom:6,letterSpacing:1,textTransform:'uppercase'}}>🧭 مرشد مسارك</div><div style={{color:T.text,fontSize:14,lineHeight:1.7}}>{currentQ.text}</div></div>}
                <VoiceMode onTranscript={t=>setVoiceLog(l=>[...l,{role:'user',text:t}])} onBotReply={handleVoiceReply} history={history} setHistory={setHistory}/>
                {voiceLog.length>0&&<div style={{marginTop:16,maxHeight:200,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
                  {voiceLog.slice(-6).map((m,i)=>(
                    <div key={i} style={{background:m.role==='user'?T.mutedBg:T.primaryBg,border:`1px solid ${m.role==='user'?T.border:`${T.primary}20`}`,borderRadius:10,padding:'8px 12px',direction:'rtl',textAlign:'right',fontSize:12,color:T.text,lineHeight:1.6}}>
                      <span style={{fontSize:10,fontWeight:700,color:m.role==='user'?T.muted:T.primary,display:'block',marginBottom:3}}>{m.role==='user'?'أنت 👤':'المرشد 🧭'}</span>
                      {m.text.substring(0,200)}{m.text.length>200?'...':''}
                    </div>
                  ))}
                </div>}
              </Card>
            )}
          </>
        )}
        {stage==='results'&&<ResultsCard content={finalResult} onRestart={restart} setPage={setPage}/>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// EXPLORE
// ═══════════════════════════════════════
function ExplorePage({setPage}:{setPage:(p:string)=>void}) {
  return (
    <div style={{background:T.bg,minHeight:'calc(100vh - 64px)',padding:'40px 24px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <h1 style={{color:T.text,fontSize:32,fontWeight:900,marginBottom:10}}>استكشف المسارات المهنية</h1>
          <p style={{color:T.muted,fontSize:16,lineHeight:1.7,maxWidth:520,margin:'0 auto'}}>تعرف على مجموعة متنوعة من المسارات المهنية. كل مسار يمثل عالماً من الفرص.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:18,marginBottom:40}}>
          {CAREER_PATHS.map(p=>(
            <Card key={p.id} style={{textAlign:'center'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow=T.shadowLg;e.currentTarget.style.borderColor=`${T.primary}40`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow=T.shadow;e.currentTarget.style.borderColor=T.border;}}
            >
              <div style={{width:64,height:64,borderRadius:18,background:T.primaryBg,border:`1px solid ${T.primary}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 14px'}}>{p.icon}</div>
              <h3 style={{color:T.text,fontWeight:800,fontSize:15,marginBottom:8}}>{p.name}</h3>
              <p style={{color:T.muted,fontSize:13,lineHeight:1.6}}>{p.desc}</p>
            </Card>
          ))}
        </div>
        <div style={{textAlign:'center'}}><Btn onClick={()=>setPage('assessment')} style={{padding:'14px 36px',fontSize:15}}>← ابدأ التقييم الآن</Btn></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// RESOURCES
// ═══════════════════════════════════════
function ResourcesPage() {
  const [filter,setFilter]=useState('all');
  const filtered=filter==='all'?RESOURCES:RESOURCES.filter(r=>r.tags.includes(filter));
  return (
    <div style={{background:T.bg,minHeight:'calc(100vh - 64px)',padding:'40px 24px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:32}}><h1 style={{color:T.text,fontSize:32,fontWeight:900,marginBottom:10}}>مركز المصادر</h1><p style={{color:T.muted,fontSize:16,lineHeight:1.7,maxWidth:520,margin:'0 auto'}}>مجموعة منتقاة من أفضل الأدوات والمصادر التعليمية لرحلتك المهنية.</p></div>
        <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8,marginBottom:28}}>
          {[{id:'all',icon:'',name:'الكل'},...CAREER_PATHS].map(p=>(
            <button key={p.id} onClick={()=>setFilter(p.id)} style={{background:filter===p.id?T.primary:T.card,border:`1.5px solid ${filter===p.id?T.primary:T.border}`,borderRadius:28,padding:'7px 16px',color:filter===p.id?'#fff':T.muted,fontFamily:'Cairo,sans-serif',fontWeight:600,fontSize:13,cursor:'pointer',transition:'all 0.15s'}}>{p.icon} {p.name}</button>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:18}}>
          {filtered.map(r=>(
            <Card key={r.title}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=T.shadowLg;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow=T.shadow;}}
            >
              <div style={{fontSize:28,marginBottom:10}}>{r.icon}</div>
              <h3 style={{color:T.text,fontWeight:800,fontSize:15,marginBottom:8}}>{r.title}</h3>
              <p style={{color:T.muted,fontSize:13,lineHeight:1.6,marginBottom:14}}>{r.desc}</p>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>{r.tags.slice(0,3).map(tag=><Badge key={tag}>{CAREER_PATHS.find(p=>p.id===tag)?.name||tag}</Badge>)}</div>
              <a href={r.url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:5,background:T.primaryBg,border:`1px solid ${T.primary}25`,borderRadius:10,padding:'7px 14px',color:T.primary,fontSize:12,fontWeight:700,textDecoration:'none',fontFamily:'Cairo,sans-serif',transition:'all 0.15s'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.background=T.primary;(e.currentTarget as HTMLAnchorElement).style.color='#fff';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.background=T.primaryBg;(e.currentTarget as HTMLAnchorElement).style.color=T.primary;}}
              >زيارة المنصة ↗</a>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// METHODOLOGY
// ═══════════════════════════════════════
function MethodologyPage() {
  const steps=[
    {icon:'🤖',title:'المحادثة الذكية',desc:'تبدأ رحلتك بمحادثة تفاعلية مع مرشدنا المهني الذكي. بدلاً من الاستبيانات التقليدية، نطرح أسئلة ديناميكية تتكيف مع إجاباتك لفهم شخصيتك، اهتماماتك، ودوافعك بشكل أعمق.'},
    {icon:'🧠',title:'التحليل بواسطة AI',desc:'يتم إرسال ملخص الحوار إلى نموذج لغوي متقدم (Claude AI). يقوم النموذج بتحليل شامل لإجاباتك وسياقها للعثور على الأنماط التي تربطك بمسارات مهنية محددة.'},
    {icon:'📋',title:'التوصيات وخطة العمل',desc:'بناءً على التحليل، يقترح النظام المسار أو المسارين الأنسب لك مع خطة عمل شخصية مفصلة تتضمن خطوات عملية ومصادر مقترحة لبدء رحلتك فوراً.'},
  ];
  const features=[
    {icon:'🎙️',title:'محادثة صوتية',desc:'تحدث مع المرشد بصوتك مباشرة بالعربية بدلاً من الكتابة.'},
    {icon:'⚡',title:'ردود فورية',desc:'النص يظهر كلمة كلمة مباشرة — تجربة محادثة طبيعية وسريعة.'},
    {icon:'📄',title:'تقرير PDF',desc:'بعد النتيجة، حمّل تقريراً كاملاً جاهزاً للطباعة أو الحفظ.'},
    {icon:'📱',title:'تطبيق موبايل PWA',desc:'أضف مسارك لشاشة هاتفك مباشرة بدون متجر تطبيقات.'},
  ];
  return (
    <div style={{background:T.bg,minHeight:'calc(100vh - 64px)',padding:'40px 24px'}}>
      <div style={{maxWidth:900,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <h1 style={{color:T.text,fontSize:32,fontWeight:900,marginBottom:10}}>عن المنهجية</h1>
          <p style={{color:T.muted,fontSize:16,lineHeight:1.8,maxWidth:600,margin:'0 auto'}}>نؤمن في "مسارك" بالشفافية والوضوح. إليك كيف نعمل على تقديم توصيات مهنية مخصصة لك.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:20,marginBottom:24}}>
          {steps.map((s,i)=>(
            <Card key={i} style={{textAlign:'center'}}>
              <div style={{width:64,height:64,borderRadius:18,background:T.primaryBg,border:`1px solid ${T.primary}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px'}}>{s.icon}</div>
              <h3 style={{color:T.text,fontWeight:800,fontSize:16,marginBottom:10}}>{s.title}</h3>
              <p style={{color:T.muted,fontSize:13,lineHeight:1.7}}>{s.desc}</p>
            </Card>
          ))}
        </div>
        <Card style={{marginBottom:24,textAlign:'center',borderColor:`${T.primary}25`,background:T.primaryBg}}>
          <p style={{color:T.muted,fontSize:14,lineHeight:1.8,margin:0}}>💡 <strong style={{color:T.text}}>ملاحظة الخصوصية:</strong> لا نحتفظ بأي بيانات شخصية. تُعالَج إجاباتك مؤقتاً فقط خلال الجلسة.</p>
        </Card>
        <div style={{marginTop:40}}>
          <h2 style={{color:T.text,fontSize:22,fontWeight:900,textAlign:'center',marginBottom:20}}>مميزات مسارك</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16}}>
            {features.map((f,i)=>(
              <Card key={i} style={{textAlign:'center'}}>
                <div style={{fontSize:32,marginBottom:10}}>{f.icon}</div>
                <h3 style={{color:T.text,fontWeight:800,fontSize:14,marginBottom:6}}>{f.title}</h3>
                <p style={{color:T.muted,fontSize:12,lineHeight:1.6}}>{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════
function ProfilePage({setPage}:{setPage:(p:string)=>void}) {
  return (
    <div style={{background:T.bg,minHeight:'calc(100vh - 64px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 24px'}}>
      <div style={{width:'100%',maxWidth:440,textAlign:'center'}}>
        <div style={{width:88,height:88,borderRadius:'50%',background:T.primaryBg,border:`2px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:38,margin:'0 auto 22px'}}>👤</div>
        <h1 style={{color:T.text,fontSize:28,fontWeight:900,marginBottom:8}}>ملفي الشخصي</h1>
        <p style={{color:T.muted,fontSize:14,lineHeight:1.7,marginBottom:28}}>نتائجك ومساراتك المهنية ستظهر هنا بعد إتمام التقييم</p>
        <Card style={{textAlign:'right'}}>
          <h3 style={{color:T.text,fontWeight:800,fontSize:16,marginBottom:8}}>لم تُكمل التقييم بعد</h3>
          <p style={{color:T.muted,fontSize:13,lineHeight:1.7,marginBottom:18}}>أكمل التقييم المهني الذكي لتحصل على مساراتك المخصصة وخطة عملك التفصيلية.</p>
          <Btn onClick={()=>setPage('assessment')} style={{width:'100%',borderRadius:14,padding:'13px',fontSize:15,display:'block'}}>🚀 ابدأ التقييم الآن</Btn>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// PWA BANNER
// ═══════════════════════════════════════
function PWABanner() {
  const [show,setShow]=useState(false);
  const [prompt,setPrompt]=useState<BeforeInstallPromptEvent|null>(null);
  useEffect(()=>{
    const h=(e:Event)=>{e.preventDefault();setPrompt(e as BeforeInstallPromptEvent);setShow(true);};
    window.addEventListener('beforeinstallprompt',h);
    return()=>window.removeEventListener('beforeinstallprompt',h);
  },[]);
  if(!show)return null;
  const install=async()=>{if(!prompt)return;prompt.prompt();const{outcome}=await prompt.userChoice;if(outcome==='accepted')setShow(false);setPrompt(null);};
  return (
    <div style={{position:'fixed',bottom:20,right:20,zIndex:999,background:T.card,border:`1px solid ${T.primary}30`,borderRadius:16,padding:'14px 18px',boxShadow:T.shadowLg,display:'flex',alignItems:'center',gap:12,animation:'msslidein 0.4s ease',maxWidth:320}}>
      <div style={{fontSize:28}}>📱</div>
      <div style={{flex:1}}><div style={{color:T.text,fontSize:13,fontWeight:700,marginBottom:3}}>ثبّت مسارك على هاتفك</div><div style={{color:T.muted,fontSize:11}}>وصول سريع بدون متجر تطبيقات</div></div>
      <div style={{display:'flex',gap:6}}>
        <button onClick={install} style={{background:T.primary,border:'none',borderRadius:10,padding:'7px 12px',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Cairo,sans-serif'}}>ثبّت</button>
        <button onClick={()=>setShow(false)} style={{background:T.mutedBg,border:'none',borderRadius:10,padding:'7px 10px',color:T.muted,fontSize:12,cursor:'pointer'}}>✕</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ROOT
// ═══════════════════════════════════════
export default function MasarakApp() {
  const [page,setPage]=useState('home');
  const pages:{[k:string]:React.ReactNode} = {
    home:<HomePage setPage={setPage}/>,
    assessment:<AssessmentPage setPage={setPage}/>,
    explore:<ExplorePage setPage={setPage}/>,
    resources:<ResourcesPage/>,
    methodology:<MethodologyPage/>,
    profile:<ProfilePage setPage={setPage}/>,
  };
  return (
    <div style={{minHeight:'100vh',background:T.bg,fontFamily:'Cairo,sans-serif',color:T.text,direction:'rtl'}}>
      <Header page={page} setPage={setPage}/>
      <div key={page} style={{animation:'msfadein 0.35s ease'}}>
        {pages[page]||pages.home}
      </div>
      <Footer setPage={setPage}/>
      <PWABanner/>
    </div>
  );
}

// Type declaration for PWA
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
