// 공통: 데이터 풀기, 날짜·숫자, 상단 컨트롤, 막대그래프, 표, 달력, 서랍, 기간 실적·원형도표, 상위 10·영업 액션·매출 감소 현황
(function(){
const D=JSON.parse(document.getElementById('data').textContent);
const MAX=D.meta.base, MIN=D.meta.min;
const R=D.rows.map(r=>({d:D.dates[r[0]],t:D.types[r[1]],c:r[2],s:r[3],i:r[4],p:D.reps[r[5]],x:D.exps[r[6]],doc:r[7],q:r[8],a:r[9]}));
const STAFF=D.meta.staff||[];
const curRep=c=>D.reps[D.custRep[c]];
R.forEach(r=>{r.y=+r.d.slice(0,4);r.m=+r.d.slice(5,7);r.ym=r.d.slice(0,7);r.cp=curRep(r.c)});

// ── 날짜
const pad=n=>String(n).padStart(2,'0');
const pd=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))};
const fd=dt=>dt.toISOString().slice(0,10);
const addD=(s,n)=>{const x=pd(s);x.setUTCDate(x.getUTCDate()+n);return fd(x)};
const days=(a,b)=>Math.round((pd(b)-pd(a))/864e5)+1;
const eom=(y,m)=>fd(new Date(Date.UTC(y,m,0)));
const shiftY=(s,n=-1)=>{let y=+s.slice(0,4)+n,md=s.slice(5);if(md==='02-29')md='02-28';return `${y}-${md}`};
const BY=+MAX.slice(0,4),BM=+MAX.slice(5,7),BD=+MAX.slice(8);
const wk=s=>pd(s).getUTCDay();
function perName(f,t){
  const [fy,fm,fdd]=f.split('-').map(Number),[ty,tm,tdd]=t.split('-').map(Number);
  const yp=(fy===ty&&fy===BY)?'':`${fy}년 `;
  if(f===t)return `${yp}${fm}월 ${fdd}일`;
  const full=fdd===1&&(t===eom(ty,tm)||t===MAX);
  if(full&&fy===ty){
    if(fm===tm)return `${yp}${fm}월`+(t===MAX&&t!==eom(ty,tm)?` (1~${tdd}일)`:'');
    if(fm===1&&tm===12)return `${fy}년 전체`;
    if(fm===1&&t===MAX)return `${yp}누계 (1/1~${tm}/${tdd})`;
    if((fm-1)%3===0&&tm===fm+2)return `${yp}${(fm+2)/3}분기`;
    return `${yp}${fm}~${tm}월`;
  }
  return fy===ty?`${yp}${fm}/${fdd} ~ ${tm}/${tdd}`:`${fy}.${fm}.${fdd} ~ ${ty}.${tm}.${tdd}`;
}
const yoyOf=(f,t)=>{const a=shiftY(f),b=shiftY(t);return a<MIN?null:{f:a,t:b}};

// ── 숫자
const won=n=>Math.round(n).toLocaleString('ko-KR')+'원';
function amt(n){if(n==null)return '—';const a=Math.abs(n),s=n<0?'−':'';
  if(a>=1e8)return s+(a/1e8).toFixed(a>=1e10?0:a>=1e9?1:2)+'억';
  if(a>=1e4)return s+Math.round(a/1e4).toLocaleString('ko-KR')+'만';
  return a===0?'0':s+Math.round(a).toLocaleString('ko-KR')+'원'}
const nf=n=>n==null?'—':Math.round(n).toLocaleString('ko-KR');
function delta(cur,prev){
  if(prev==null)return{t:'—',c:'flat',p:null};
  if(!prev)return cur>0?{t:'전년 없음',c:'up',p:null}:{t:'—',c:'flat',p:null};
  const p=(cur-prev)/Math.abs(prev)*100;
  if(Math.abs(p)>=999)return{t:(p>0?'▲ ':'▼ ')+'999%+',c:p>0?'up':'down',p};
  if(Math.abs(p)<0.05)return{t:'0%',c:'flat',p};
  return{t:(p>=0?'▲ ':'▼ ')+Math.abs(p).toFixed(Math.abs(p)<10?1:0)+'%',c:p>0.05?'up':p<-0.05?'down':'flat',p};
}
const el=(tag,attrs={},...kids)=>{const e=document.createElement(tag);for(const k in attrs){const v=attrs[k];if(v==null||v===false)continue;if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k==='style')e.setAttribute('style',v);else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v)}kids.flat().forEach(k=>k!=null&&k!==false&&e.append(k.nodeType?k:document.createTextNode(k)));return e};
const sum=(rows,f='a')=>{let s=0;for(const r of rows)s+=r[f];return s};
function groupBy(rows,key){const m=new Map();for(const r of rows){const k=typeof key==='function'?key(r):r[key];let o=m.get(k);if(!o){o={k,a:0,q:0,neg:0,n:0,rows:[]};m.set(k,o)}o.a+=r.a;o.q+=r.q;if(r.a<0)o.neg+=r.a;o.n++;o.rows.push(r)}return m}
const inR=(rows,f,t)=>rows.filter(r=>r.d>=f&&r.d<=t);
const dCell=(cur,prev)=>{const x=delta(cur,prev);return el('span',{class:x.c,text:x.t})};
const shareCell=(v,tot)=>{const p=tot?v/tot*100:0;return el('span',{},p.toFixed(1)+'%',el('span',{class:'share'},el('i',{style:`width:${Math.max(0,Math.min(100,p))}%`})))};
const md=s=>s?`${+s.slice(5,7)}/${+s.slice(8)}`:'—';

// 주문 주기: 최근 1년 주문일(매출>0) 간격 평균, 1.5배 넘게 주문 없으면 '지연'
function cadence(rows){
  const from=addD(MAX,-364);
  const ds=[...new Set(rows.filter(r=>r.a>0&&r.d>=from).map(r=>r.d))].sort();
  const lastAll=rows.filter(r=>r.a>0).reduce((m,r)=>r.d>m?r.d:m,'');
  const o={n:ds.length,last:lastAll||null,since:lastAll?days(lastAll,MAX)-1:null,gap:null,next:null,late:false};
  if(ds.length>=3){o.gap=Math.round((days(ds[0],ds[ds.length-1])-1)/(ds.length-1));o.next=addD(ds[ds.length-1],o.gap);o.late=o.since>Math.max(o.gap*1.5,o.gap+10)}
  return o;
}

// ── 상태
const S={f:`${BY}-${pad(BM)}-01`,t:MAX,tab:null,q:{}};
const K={D,R,STAFF,curRep,MAX,MIN,BY,BM,BD,S,pad,pd,fd,addD,days,eom,shiftY,perName,yoyOf,won,amt,nf,delta,el,sum,groupBy,inR,dCell,shareCell,md,cadence,page:null};
window.K=K;

// ── 상단
function periodRow(){
  const row=el('div',{class:'row'},el('span',{class:'lab',text:'기간'}));
  const pm=BM===1?[BY-1,12]:[BY,BM-1];
  const Q=[[`당월 (${BM}월)`,`${BY}-${pad(BM)}-01`,MAX],[`전월 (${pm[1]}월)`,`${pm[0]}-${pad(pm[1])}-01`,eom(pm[0],pm[1])],['금년 누계',`${BY}-01-01`,MAX]];
  if(MIN<=`${BY-1}-01-01`)Q.push([`${BY-1}년`,`${BY-1}-01-01`,`${BY-1}-12-31`]);
  let hit=false;
  Q.forEach(([l,f,t])=>{const on=S.f===f&&S.t===t;hit=hit||on;row.append(el('button',{class:'chip'+(on?' on':''),text:l,onclick:()=>setPer(f,t)}))});
  row.append(el('button',{class:'chip'+(hit?'':' on'),text:hit?'📅 기간 선택':'📅 '+perName(S.f,S.t),onclick:openCal}));
  return row;
}
function setPer(f,t){S.f=f<MIN?MIN:f;S.t=t>MAX?MAX:t;K.page.onPeriod&&K.page.onPeriod();render()}
K.setPer=setPer;
function drawTop(){
  const y=yoyOf(S.f,S.t);
  const meta=document.getElementById('meta');meta.innerHTML='';
  meta.append('매출 기준일 ',el('b',{text:MAX.replace(/-/g,'.')}),' · 선택 ',el('b',{text:perName(S.f,S.t)}),
    y?` · 비교 전년 동기 (${perName(y.f,y.t)})`:' · 전년 자료 없음');
  const tr=document.querySelector('.titlerow');let tb=document.getElementById('tbtns');
  if(!tb){tb=el('div',{id:'tbtns',class:'tbtns'},el('a',{class:'tbtn',href:'../',text:'⌂ 메인'}),el('button',{class:'tbtn',text:'↺ 선택 초기화',title:'기간·필터·정렬을 처음 상태로 되돌립니다',onclick:()=>K.reset()}));tr.append(tb)}
  const ctl=document.getElementById('ctl');ctl.innerHTML='';ctl.append(periodRow());
  K.page.controls&&K.page.controls(ctl);
  const tabs=document.getElementById('tabs');tabs.innerHTML='';
  K.page.tabs.forEach(([k,l])=>tabs.append(el('button',{class:'tab'+(S.tab===k?' on':''),text:l,onclick:()=>{S.tab=k;try{history.replaceState(null,'','#'+k)}catch(e){}render();window.scrollTo(0,0)}})));
}
const M=document.getElementById('main');
function render(keep){
  const y=window.scrollY;drawTop();M.innerHTML='';
  K.page.draw(S.tab,M);
  M.append(el('div',{class:'foot',text:`매출 = 원화판매금액(부가세 제외, 반품·차감 포함). 자료: ERP 일일판매실적조회 (기업영업팀) ${MIN.replace(/-/g,'.')}~${MAX.replace(/-/g,'.')}. 개인소매 제외. 갱신 ${D.meta.built}`}));
  if(keep)window.scrollTo(0,y);
}
K.render=render;
K.reset=()=>{const tab=S.tab;Object.assign(S,JSON.parse(JSON.stringify(K.S0)),{tab,q:{}});document.getElementById('overlay').innerHTML='';render();window.scrollTo(0,0)};
K.selItem=(rows,name,onClose,onFull)=>{const p=el('section',{class:'panel selpanel'});
  const yr=rows.filter(r=>r.y===BY),pos=yr.filter(r=>r.a>0&&r.q>0),q=sum(pos,'q'),last=rows.filter(r=>r.a>0).reduce((m,r)=>r.d>m?r.d:m,'');
  p.append(el('h2',{},'선택 품목 월별 매출',el('span',{class:'sub',text:name}),el('span',{class:'right'},onFull?el('button',{class:'chip',text:'품목 전체 보기',onclick:onFull}):null,el('button',{class:'chip',text:'닫기 ✕',onclick:onClose}))));
  p.append(el('div',{class:'pb'},K.stats([[`${BY}년 누계`,amt(sum(yr))],[`${BY-1}년 전체`,amt(sum(rows.filter(r=>r.y===BY-1)))],['최종 주문일',last?last.slice(2).replace(/-/g,'.'):'—'],[`${BY}년 수량`,nf(sum(yr,'q'))],['평균 단가',q?nf(sum(pos)/q)+'원':'—'],['주문 횟수(금년)',new Set(yr.filter(r=>r.a>0).map(r=>r.d)).size+'회']])));
  p.append(K.legend([['var(--accent)',`${BY}년`],['var(--ghost)',`${BY-1}년`]]));const mc=el('div',{class:'pb'});p.append(mc);K.monthly2(mc,rows);
  setTimeout(()=>p.scrollIntoView({block:'start',behavior:'smooth'}),60);return p};
K.start=page=>{K.page=page;K.autoUnlock();K.S0=JSON.parse(JSON.stringify(S));const h=location.hash.slice(1);S.tab=page.tabs.some(t=>t[0]===h)?h:page.tabs[0][0];render();
  let lw=window.innerWidth,tm;window.addEventListener('resize',()=>{if(window.innerWidth===lw)return;lw=window.innerWidth;clearTimeout(tm);tm=setTimeout(()=>render(true),200)})};

// ── 막대그래프: 금년(진한 막대) 앞, 비교(연한 넓은 막대) 뒤. 막대 위 값.
const tip=el('div',{class:'tip',hidden:''});
function bars(outer,list,{onClick,hl,dimOthers=false,h=220,labels='auto',fmt=amt,curName='금년',prevName='전년',color='var(--accent)'}={}){
  outer.innerHTML='';const host=el('div',{class:'chart'});outer.append(host);
  const W=Math.max(280,host.clientWidth||outer.clientWidth||800),H=h,pt=22,pb=24;
  const max=Math.max(1,...list.map(b=>Math.max(b.cur||0,b.prev||0)));
  const n=list.length,slot=W/n,bw=Math.min(46,slot*.56),gw=Math.min(60,slot*.8);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('width','100%');
  const y=v=>pt+(H-pt-pb)*(1-Math.max(0,v)/max);
  const mk=(t,a)=>{const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);return e};
  [0.5,1].forEach(f=>svg.append(mk('line',{x1:0,x2:W,y1:y(max*f),y2:y(max*f),stroke:'var(--line)','stroke-dasharray':'2 3'})));
  svg.append(mk('line',{x1:0,x2:W,y1:y(0),y2:y(0),stroke:'var(--line)'}));
  const every=Math.ceil(n/(W/40));const roomy=slot>=40;
  list.forEach((b,i)=>{
    const cx=slot*i+slot/2,g=mk('g',{class:'bar-g'+(onClick?' click':'')});
    g.append(mk('rect',{x:cx-slot/2,y:0,width:slot,height:H,fill:'transparent'}));
    const dim=dimOthers&&hl&&hl!==b.key;
    if(b.prev!=null&&b.prev>0){const yy=y(b.prev);g.append(mk('rect',{x:cx-gw/2,y:yy,width:gw,height:Math.max(.5,y(0)-yy),fill:'var(--ghost)',rx:2,opacity:dim?.5:1}))}
    if(b.cur!=null&&b.cur>0){const yy=y(b.cur);g.append(mk('rect',{class:'cur',x:cx-bw/2,y:yy,width:bw,height:Math.max(.5,y(0)-yy),fill:b.color||color,rx:2,opacity:dim?.35:1}))}
    const show=labels==='all'||(labels==='auto'&&roomy)||b.key===hl||(Array.isArray(labels)&&labels.includes(b.key));
    if(show){const v=b.cur!=null?b.cur:b.prev;if(v!=null){const tx=mk('text',{x:cx,y:y(Math.max(b.cur||0,b.prev||0))-6,'text-anchor':'middle','font-size':slot<44?10:11.5,fill:b.cur!=null?(dim?'var(--faint)':'var(--fg)'):'var(--faint)','font-weight':b.key===hl?700:500});tx.textContent=fmt(v);g.append(tx)}}
    if(i%every===0||b.key===hl||i===n-1&&n<=31){const lx=mk('text',{x:cx,y:H-6,'text-anchor':'middle','font-size':11.5,fill:b.key===hl?'var(--fg)':'var(--muted)','font-weight':b.key===hl?700:400});lx.textContent=b.label;g.append(lx)}
    g.addEventListener('mousemove',ev=>{tip.hidden=false;tip.innerHTML='';tip.append(el('div',{class:'t',text:b.tipT||b.label}));
      if(b.cur!=null)tip.append(el('div',{},el('span',{style:`color:${b.color||color}`,text:'■ '}),`${curName} ${fmt===amt?won(b.cur):fmt(b.cur)}`));
      if(b.prev!=null)tip.append(el('div',{},el('span',{style:'color:var(--ghost)',text:'■ '}),`${prevName} ${fmt===amt?won(b.prev):fmt(b.prev)}`));
      if(b.cur!=null&&b.prev!=null){const x=delta(b.cur,b.prev);tip.append(el('div',{class:x.c,text:x.t}))}
      if(b.extra)tip.append(el('div',{class:'note',text:b.extra}));
      if(onClick)tip.append(el('div',{class:'note',text:'클릭 시 해당 기간으로 조회'}));
      const hb=host.getBoundingClientRect();let x=ev.clientX-hb.left+12;const tw=tip.offsetWidth;if(x+tw>hb.width)x=ev.clientX-hb.left-tw-12;tip.style.left=Math.max(0,x)+'px';tip.style.top=Math.max(0,ev.clientY-hb.top-10)+'px'});
    g.addEventListener('mouseleave',()=>tip.hidden=true);
    if(onClick)g.addEventListener('click',()=>{tip.hidden=true;onClick(b)});
    svg.append(g);
  });
  host.append(svg,tip);
}
K.bars=bars;
const legend=(items)=>el('div',{class:'legend'},...items.map(([c,l])=>el('span',{},el('i',{style:`background:${c}`}),l)));
K.legend=legend;

// 월별 막대 (금년 vs 전년), 누르면 그 달
K.monthly=function(host,rows,{year}={}){
  const Y=year||+S.t.slice(0,4);
  const list=[];for(let m=1;m<=12;m++){const k=`${Y}-${pad(m)}`;const cr=rows.filter(r=>r.ym===k),pr=rows.filter(r=>r.ym===`${Y-1}-${pad(m)}`);
    const has=k<=MAX.slice(0,7)&&`${Y}-${pad(m)}-01`>=MIN.slice(0,8)+'01';
    const pHas=`${Y-1}-${pad(m)}`>=MIN.slice(0,7);
    list.push({key:k,label:m+'월',tipT:`${Y}년 ${m}월`+(k===MAX.slice(0,7)?` (1~${BD}일)`:''),cur:has?sum(cr):null,prev:pHas?sum(pr):null})}
  const sel=S.f.slice(0,7)===S.t.slice(0,7)?S.f.slice(0,7):null;
  bars(host,list,{hl:sel,curName:`${Y}년`,prevName:`${Y-1}년`,onClick:b=>{if(b.cur==null)return;const[y,m]=b.key.split('-').map(Number);setPer(`${b.key}-01`,eom(y,m))}});
};

// ── 표
function table(host,{id,cols,rows,onRow,maxH=440,sort,sumRow,redraw,rowCls,empty='해당하는 자료가 없습니다.'}){
  const st=S.q[id]||(S.q[id]=Object.assign({},sort||{k:cols.find(c=>c.n&&c.k)?.k,d:-1}));
  const rs=[...rows].sort((a,b)=>{const x=a[st.k],y=b[st.k];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (typeof x==='string'?x.localeCompare(y,'ko'):x-y)*st.d});
  if(!rs.length){host.append(el('div',{class:'empty',text:empty}));return}
  const tw=el('div',{class:'tw',style:`max-height:${maxH}px`});
  const tb=el('table',{class:'t'}),tr=el('tr');
  cols.forEach(c=>tr.append(el('th',{class:c.n?'n':'',title:c.tip,onclick:c.k&&!c.nosort?()=>{st.d=st.k===c.k?-st.d:(c.n?-1:1);st.k=c.k;redraw?redraw():render(true)}:null},c.l,st.k===c.k?el('span',{class:'ar',text:st.d<0?'↓':'↑'}):null)));
  tb.append(el('thead',{},tr));const body=el('tbody');
  if(sumRow){const s=el('tr',{class:'sum'});cols.forEach(c=>s.append(el('td',{class:c.n?'n':''},sumRow[c.k]??'')));body.append(s)}
  rs.forEach((r,i)=>{const row=el('tr',{class:(onRow?'click ':'')+(rowCls?rowCls(r)||'':''),onclick:onRow?()=>onRow(r):null});cols.forEach(c=>{const v=c.f?c.f(r,i):r[c.k];row.append(el('td',{class:(c.n?'n ':'')+(c.cls||''),title:c.title?c.title(r):null},v==null?'—':v))});body.append(row)});
  tb.append(body);tw.append(tb);host.append(tw);
}
K.table=table;
K.panel=(title,sub,...kids)=>el('section',{class:'panel'},el('h2',{},title,sub?el('span',{class:'sub',text:sub}):null),...kids);

// ── 선택 기간 실적 (기간을 따라감) + 매출 비중 원형도표
const isCurMonth=()=>S.t===MAX&&S.f===`${BY}-${pad(BM)}-01`;
const isYTD=()=>S.t===MAX&&S.f===`${BY}-01-01`;
K.progress=function(host,rows,{note,donut}={}){
  const y=yoyOf(S.f,S.t);const cur=sum(inR(rows,S.f,S.t)),ly=y?sum(inR(rows,y.f,y.t)):null;
  let ref=null,refLab='',ongoing=false,me=null;
  if(y&&isCurMonth()){me=eom(BY,BM);ref=sum(inR(rows,shiftY(S.f),eom(BY-1,BM)));refLab=`전년 ${BM}월 전체`;ongoing=true}
  else if(y&&isYTD()){me=`${BY}-12-31`;ref=sum(inR(rows,`${BY-1}-01-01`,`${BY-1}-12-31`));refLab=`${BY-1}년 연간`;ongoing=true}
  else if(y){ref=ly;refLab='전년 동기'}
  const pan=el('section',{class:'panel'});
  pan.append(el('h2',{},'선택 기간 실적',el('span',{class:'sub',text:`${perName(S.f,S.t)}${y?` · 전년 동기 ${perName(y.f,y.t)}와 비교`:''}`})));
  const body=el('div',{class:'prog'});pan.append(body);
  const nums=el('div',{class:'nums'});
  const dx=delta(cur,ly);
  nums.append(el('div',{class:'hero'},el('small',{text:`${perName(S.f,S.t)} 매출`}),el('b',{text:amt(cur),title:won(cur)})),
    el('div',{class:'hero'},el('small',{text:y?`전년 동기 (${perName(y.f,y.t)})`:'전년 동기'}),el('b',{class:'ly',text:y?amt(ly):'자료 없음',title:y?won(ly):null}),' ',el('span',{class:'dx '+dx.c,text:y?dx.t:''})));
  const pr=ref>0?cur/ref:null;
  if(pr!=null){const sc=Math.max(1,pr);const bar=el('div',{class:'pbar',title:`${refLab} 대비 ${(pr*100).toFixed(1)}%`},el('i',{style:`width:${pr/sc*100}%`}),el('em',{text:`${refLab} ${amt(ref)} = 100%`}));
    if(sc>1)bar.append(el('u',{style:`left:${100/sc}%`},el('span',{text:'100%'})));
    if(ongoing&&ly!=null)bar.append(el('u',{class:'ly',style:`left:${Math.min(100,ly/ref/sc*100)}%`},el('span',{text:`▲ 전년 동기 진척률 ${(ly/ref*100).toFixed(0)}%`})));
    nums.append(bar)}
  const g=el('div',{class:'mini3'});
  g.append(el('div',{},el('small',{text:ongoing?`${refLab} 대비 진척률`:'전년 동기 대비 달성률'}),el('b',{text:pr!=null?(pr*100).toFixed(1)+'%':'—'})));
  if(ongoing){let rem=0;for(let d=addD(MAX,1);d<=me;d=addD(d,1)){const w=wk(d);if(w&&w<6)rem++}
    g.append(el('div',{},el('small',{text:`${refLab} 대비 잔여액`}),el('b',{text:cur>=ref?'달성':amt(ref-cur)}),el('span',{class:'note',text:` · 잔여 영업일 ${rem}일`})))}
  else g.append(el('div',{},el('small',{text:'전년 동기와 차이'}),el('b',{class:dx.c,text:y?(cur-ly>=0?'+':'')+amt(cur-ly):'—'})));
  if(!isYTD()){const ytd=sum(inR(rows,`${BY}-01-01`,MAX)),lytd=sum(inR(rows,`${BY-1}-01-01`,shiftY(MAX))),dy=delta(ytd,`${BY-1}-01-01`>=MIN?lytd:null);
    g.append(el('div',{},el('small',{text:`금년 누계 (1/1~${+MAX.slice(5,7)}/${BD})`}),el('b',{text:amt(ytd)}),' ',el('span',{class:dy.c,text:dy.t==='—'?'':dy.t})))}
  nums.append(g);
  if(isCurMonth()){const shares=[];for(let k=1;k<=6;k++){let yy=BY,m=BM-k;while(m<1){m+=12;yy--}const mf=`${yy}-${pad(m)}-01`;if(mf<MIN)break;const e=eom(yy,m),tot=sum(inR(rows,mf,e));if(tot>0)shares.push(sum(inR(rows,e,e))/tot)}
    const ls=shares.length?shares.reduce((a,b)=>a+b,0)/shares.length:null;
    if(note||ls!=null)nums.append(el('div',{class:'callout'},note||'',ls!=null?el('span',{},note?' ':'','최근 6개월은 월 매출의 평균 ',el('b',{text:(ls*100).toFixed(0)+'%'}),'가 말일에 잡혔습니다.'):null))}
  else if(note)nums.append(el('div',{class:'callout',text:note}));
  body.append(nums);
  if(donut)body.append(K.donutBox(donut));
  host.append(pan);
};
// 원형도표: donut={modes:[{k,l,rows,prevRows,key,name,sel,onPick}], mode, setMode}
const DPAL=['#2a5db0','#16866b','#c27a12','#8a4fc4','#c8417a','#2b8fa8','#9a8a2e','#7a8594'];
K.donutBox=function(dn){
  const box=el('div',{class:'donut'});
  const m=dn.modes.find(x=>x.k===dn.mode)||dn.modes[0];
  box.append(el('div',{class:'dh2'},el('span',{class:'dt',text:'매출 비중'}),el('div',{class:'seg'},...dn.modes.map(x=>el('button',{class:x.k===m.k?'on':'',text:x.l,onclick:()=>dn.setMode(x.k)})))));
  const gm=groupBy(m.rows,m.key),pm=m.prevRows?groupBy(m.prevRows,m.key):null;
  let list=[...gm.values()].map(o=>({k:o.k,a:Math.max(0,o.a),p:pm?(pm.get(o.k)?.a||0):null})).filter(o=>o.a>0).sort((a,b)=>b.a-a.a);
  const N=m.top||7;
  if(list.length>N){const rest=list.slice(N-1);list=list.slice(0,N-1);list.push({k:'__etc',a:sum(rest,'a'),p:pm?rest.reduce((s,o)=>s+(o.p||0),0):null,etc:rest.length})}
  const tot=sum(list,'a');
  if(!tot){box.append(el('div',{class:'empty',text:'선택 기간 매출이 없습니다.'}));return box}
  const ns='http://www.w3.org/2000/svg',S0=180,R0=80,R1=50,svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox',`0 0 ${S0} ${S0}`);svg.setAttribute('class','dsvg');
  let ang=-Math.PI/2;
  const pt=(r,a)=>[S0/2+r*Math.cos(a),S0/2+r*Math.sin(a)];
  list.forEach((o,i)=>{o.color=o.k==='__etc'?'var(--ghost)':DPAL[i%DPAL.length];
    const da=o.a/tot*Math.PI*2,a1=ang+Math.min(da,Math.PI*2-1e-4);const big=da>Math.PI?1:0;
    const[x0,y0]=pt(R0,ang),[x1,y1]=pt(R0,a1),[x2,y2]=pt(R1,a1),[x3,y3]=pt(R1,ang);
    const p=document.createElementNS(ns,'path');
    p.setAttribute('d',`M${x0},${y0}A${R0},${R0} 0 ${big} 1 ${x1},${y1}L${x2},${y2}A${R1},${R1} 0 ${big} 0 ${x3},${y3}Z`);
    p.setAttribute('fill',o.color);p.setAttribute('stroke','var(--panel)');p.setAttribute('stroke-width','1.5');
    const on=m.sel&&m.sel===o.k;p.setAttribute('opacity',m.sel&&!on?.35:1);
    if(o.k!=='__etc'){p.style.cursor='pointer';p.addEventListener('click',()=>m.onPick(o.k))}
    const t=document.createElementNS(ns,'title');t.textContent=`${o.k==='__etc'?'기타':m.name(o.k)} ${won(o.a)} (${(o.a/tot*100).toFixed(1)}%)`;p.append(t);
    svg.append(p);ang+=da});
  const c1=document.createElementNS(ns,'text');c1.setAttribute('x',S0/2);c1.setAttribute('y',S0/2-2);c1.setAttribute('text-anchor','middle');c1.setAttribute('font-size','17');c1.setAttribute('font-weight','700');c1.setAttribute('fill','var(--fg)');c1.textContent=amt(tot);
  const c2=document.createElementNS(ns,'text');c2.setAttribute('x',S0/2);c2.setAttribute('y',S0/2+16);c2.setAttribute('text-anchor','middle');c2.setAttribute('font-size','11');c2.setAttribute('fill','var(--muted)');c2.textContent=m.k==='mk'?'시장 합계':'합계';
  svg.append(c1,c2);
  const lg=el('div',{class:'dleg'});
  list.forEach(o=>{const dx=delta(o.a,o.p);const nm=o.k==='__etc'?`기타 ${o.etc}개`:m.name(o.k);
    lg.append(el('div',{class:'dr'+(m.sel===o.k?' on':'')+(o.k==='__etc'?'':' click'),onclick:o.k==='__etc'?null:()=>m.onPick(o.k),title:won(o.a)},
      el('i',{style:`background:${o.color}`}),el('span',{class:'nm',text:nm}),el('span',{class:'pc',text:(o.a/tot*100).toFixed(0)+'%'}),el('span',{class:'av',text:amt(o.a)}),el('span',{class:'dx '+dx.c,text:o.p==null?'':dx.t})))});
  box.append(el('div',{class:'dbody'},svg,lg));
  if(m.hint)box.append(el('div',{class:'note',text:m.hint}));
  return box;
};

// ── 신호: 최근 12개월, 최근 N개월 vs 전년 같은 N개월(B2B 3개월·애터미 6개월), 주문 주기
const D12=addD(MAX,-364);
K.sig=function(rows,win=3){
  const from=addD(MAX,-Math.round(win*30.4));
  const r12=sum(rows.filter(r=>r.d>=D12)),l3=sum(rows.filter(r=>r.d>=from)),lyf=shiftY(from),lyt=shiftY(MAX);
  const ly3=lyf>=MIN?sum(inR(rows,lyf,lyt)):null;const cad=cadence(rows);
  const ch3=ly3?(l3-ly3)/Math.abs(ly3):null;
  const s={r12,l3,ly3,ch3,cad,win,tags:[]};
  if(ly3>0&&ch3<=-0.3)s.tags.push(l3<=0?'이탈 위험':'급감');
  if(cad.late)s.tags.push('주문 지연');
  if(ly3>0&&ch3>=0.2)s.tags.push('성장');
  return s;
};
const TAGC={'이탈 위험':'st-risk','급감':'st-risk','주문 지연':'st-late','발주 예정':'st-new','주기 초과':'st-late','장기 미발주':'st-dorm','성장':'st-ok'};
K.tag=t=>el('span',{class:'pill '+(TAGC[t]||''),text:t});
const TAGD={'급감':w=>`최근 ${w}개월 매출이 전년 같은 기간보다 30% 이상 감소`,'이탈 위험':w=>`최근 ${w}개월 매출 없음 (전년 같은 기간엔 거래)`,'주문 지연':()=>'평균 주문 간격의 1.5배 넘게 주문 없음','성장':w=>`최근 ${w}개월 매출이 전년 같은 기간보다 20% 이상 증가`};
// 상위 10곳 집중 관리: 최근 12개월 매출 상위 10. 금월·금년 누계를 전년 같은 날짜까지와 비교
K.top10=function(host,rows,{title,key,name,sub,onRow,unitLab='거래처',win=3}){
  const g=groupBy(rows.filter(r=>r.d>=D12),key);
  const mf=`${BY}-${pad(BM)}-01`,yf=`${BY}-01-01`,lmf=shiftY(mf),lyf=shiftY(yf),lt=shiftY(MAX),lme=eom(BY-1,BM);
  const top=[...g.values()].sort((a,b)=>b.a-a.a).slice(0,10).map(o=>{const all=rows.filter(r=>r[key]===o.k);
    const ytd=sum(inR(all,yf,MAX)),lytd=lyf>=MIN?sum(inR(all,lyf,lt)):null;
    return{k:o.k,name:name(o.k),sub:sub?sub(o.k):'',r12:o.a,mtd:sum(inR(all,mf,MAX)),lmtd:lmf>=MIN?sum(inR(all,lmf,lt)):null,lmfull:lmf>=MIN?sum(inR(all,lmf,lme)):null,
      ytd,lytd,gr:lytd?(ytd-lytd)/Math.abs(lytd):null,s:K.sig(all,win)}});
  const p=K.panel(title,`최근 12개월 매출 상위 10${unitLab==='거래처'?'곳':'개'} · 전년 수치는 전년 같은 날짜까지`);
  p.append(el('div',{class:'siglegend'},
    el('div',{class:'lr'},el('b',{text:'성장률'}),el('span',{text:`금년 누계(1/1~${BM}/${BD})가 전년 같은 기간 누계보다 몇 % 늘었는지(▲) 줄었는지(▼)`})),
    el('div',{class:'lr'},el('b',{text:'신호'}),el('span',{class:'lgi'},...['급감','이탈 위험','주문 지연','성장'].map(t=>el('span',{class:'li'},K.tag(t),el('span',{text:TAGD[t](win)}))))) ));
  const d=el('div');p.append(d);
  table(d,{id:'top10-'+key,rows:top,maxH:560,sort:{k:'r12',d:-1},onRow:r=>onRow(r.k),
    cols:[{l:'#',f:(r,i)=>i+1,cls:'rk'},{k:'name',l:unitLab,cls:'name',title:r=>r.name},...(sub?[{k:'sub',l:'담당'}]:[]),
      {k:'mtd',l:`금월 누계 (${BM}/1~${BM}/${BD})`,n:1,f:r=>amt(r.mtd),title:r=>won(r.mtd)},
      {k:'lmtd',l:'전년 동월',n:1,f:r=>r.lmtd==null?'—':amt(r.lmtd),title:r=>r.lmfull==null?null:`전년 ${BM}/1~${BM}/${BD} ${won(r.lmtd)} · 전년 ${BM}월 전체 ${won(r.lmfull)}`},
      {k:'ytd',l:'금년 누계',n:1,f:r=>amt(r.ytd),title:r=>won(r.ytd)},
      {k:'lytd',l:'전년 누계',n:1,f:r=>r.lytd==null?'—':amt(r.lytd),title:r=>r.lytd==null?null:won(r.lytd)},
      {k:'gr',l:'성장률 (누계)',n:1,tip:'금년 누계 vs 전년 누계 (같은 날짜까지)',f:r=>dCell(r.ytd,r.lytd)},
      {k:'tg',l:'신호',f:r=>r.s.tags.length?el('span',{class:'tags'},...r.s.tags.map(t=>{const x=K.tag(t);x.title=TAGD[t]?TAGD[t](win):'';return x})):el('span',{class:'flat',text:'—'}),nosort:1}]});
  host.append(p);
};
// 영업 액션: 발주 주기 기준 (최근 1년 3회 이상 주문)
K.actions=function(host,rows,{key,name,sub,onRow,items,unitLab='거래처'}){
  const g=groupBy(rows,key);const list=[];const cw=unitLab==='거래처'?'곳':'개';
  g.forEach((o,k)=>{const c=cadence(o.rows);if(!c.gap)return;
    let st=null;
    if(c.late)st=c.since>c.gap*3?'장기 미발주':'주기 초과';
    else if(c.next&&c.next>=MAX&&c.next<=addD(MAX,7))st='발주 예정';
    if(!st)return;
    list.push({k,name:name(k),sub:sub?sub(k):'',st,gap:c.gap,last:c.last,since:c.since,over:c.since-c.gap,next:c.next,n:c.n,r12:sum(o.rows.filter(r=>r.d>=D12)),rows:o.rows})});
  const by=t=>list.filter(o=>o.st===t);
  const sel=S.act||'';
  const desc={'발주 예정':'다음 발주 예상일이 7일 이내','주기 초과':'최종 주문 후 평균 발주 주기의 1.5배~3배 경과','장기 미발주':'평균 발주 주기의 3배 이상 주문 없음 (이탈 가능성)'};
  const gr=el('div',{class:'grid3'});
  ['발주 예정','주기 초과','장기 미발주'].forEach(t=>gr.append(el('button',{class:'card mini'+(sel===t?' sel':''),onclick:()=>{S.act=sel===t?'':t;render(true)}},el('div',{class:'k'},K.tag(t)),el('div',{class:'v',text:by(t).length+cw}),el('div',{class:'d'},el('span',{class:'flat',text:desc[t]})))));
  host.append(gr);
  const cols=[{l:'#',f:(r,i)=>i+1,cls:'rk'},{k:'name',l:unitLab,cls:'name',title:r=>r.name},...(sub?[{k:'sub',l:'담당'}]:[]),{k:'st',l:'구분',f:r=>K.tag(r.st)},
    {k:'gap',l:'평균 발주 주기',n:1,f:r=>r.gap+'일',tip:'최근 1년 주문 간격 평균'},{k:'last',l:'최종 주문일',n:1,f:r=>r.last.slice(2).replace(/-/g,'.')},
    {k:'since',l:'경과일',n:1,f:r=>r.since+'일'},{k:'over',l:'주기 초과',n:1,f:r=>r.st==='발주 예정'?'—':el('span',{class:r.st==='장기 미발주'?'flat':'st-late',text:`+${r.over}일`})},
    {k:'next',l:'차기 발주 예상일',n:1,f:r=>md(r.next)},{k:'r12',l:'12개월 매출',n:1,f:r=>amt(r.r12),title:r=>won(r.r12)},
    {k:'it',l:items.label,f:r=>items.fn(r.rows),cls:'name w2',title:r=>items.fn(r.rows),nosort:1}];
  const main=list.filter(o=>o.st!=='장기 미발주'&&(!sel||o.st===sel));
  if(sel!=='장기 미발주'){
    const p=K.panel('영업 관리 대상 '+unitLab,`최근 1년 3회 이상 주문한 ${unitLab} 중 발주 예정·주기 초과 · 주기 초과 일수가 큰 순${sel?' · '+sel+'만':''}`);
    const d=el('div');p.append(d);
    table(d,{id:'act-'+key,rows:main.map(o=>Object.assign(o,{ord:o.st==='발주 예정'?-1e6+days(MAX,o.next):o.over})),maxH:640,sort:{k:'ord',d:-1},onRow:r=>onRow(r.k),empty:'해당 항목이 없습니다.',cols});
    host.append(p);
  }
  const long=by('장기 미발주');
  if(long.length){host.append(K.section(`장기 미발주 ${long.length}${cw} · 평균 발주 주기의 3배 이상 주문 없음`,sel==='장기 미발주',b=>table(b,{id:'act-long-'+key,rows:long,maxH:480,sort:{k:'r12',d:-1},onRow:r=>onRow(r.k),cols})))}
  host.append(el('div',{class:'foot',text:'※ 평균 발주 주기 = 최근 1년간 주문일 사이 평균 간격. 주기 초과 = 최종 주문 후 평균 발주 주기의 1.5배(최소 +10일)를 넘긴 경우. 표의 행을 클릭하면 상세 정보가 열립니다.'}));
};
// 전년 대비 매출 감소 현황 (금년 누계 vs 전년 같은 날짜까지, 전년 연간 기준 이상)
K.lost=function(host,rows,{key,name,sub,onRow,minAmt=12e6,unitLab='거래처',firstOf}){
  const lf=`${BY-1}-01-01`,lt=shiftY(MAX);if(lf<MIN)return;
  const g=groupBy(rows,key);const out=[];let nNew=0,newAmt=0;
  g.forEach((o,k)=>{const ly=sum(o.rows.filter(r=>r.y===BY-1)),lytd=sum(inR(o.rows,lf,lt)),ytd=sum(o.rows.filter(r=>r.y===BY));
    if(firstOf&&ytd>0&&firstOf(k)>=`${BY}-01-01`){nNew++;newAmt+=ytd}
    if(ly<minAmt)return;let st=null;if(ytd<=0)st='이탈';else if(lytd>0&&ytd<lytd*0.5)st='급감';if(!st)return;
    const last=o.rows.filter(r=>r.a>0).reduce((m,r)=>r.d>m?r.d:m,'');
    out.push({k,name:name(k),sub:sub?sub(k):'',st,ly,lytd,ytd,loss:ytd-lytd,last})});
  const L=out.filter(o=>o.st==='이탈'),Dn=out.filter(o=>o.st==='급감');
  const p=K.panel('전년 대비 매출 감소 현황',`금년 누계(1/1~${+MAX.slice(5,7)}/${BD}) vs 전년 같은 날짜까지 · 전년 연매출 ${amt(minAmt)} 이상 ${unitLab} · 기간 선택과 무관`);
  const sm=el('div',{class:'lostsum'},
    el('div',{},el('small',{text:'거래 중단 (금년 실적 없음)'}),el('b',{class:'down',text:`${L.length}${unitLab==='거래처'?'곳':'개'}`}),el('span',{class:'down',text:` ${amt(sum(L,'loss'))}`})),
    el('div',{},el('small',{text:'매출 급감 (전년 동기 50% 미만)'}),el('b',{class:'down',text:`${Dn.length}${unitLab==='거래처'?'곳':'개'}`}),el('span',{class:'down',text:` ${amt(sum(Dn,'loss'))}`})),
    firstOf?el('div',{},el('small',{text:'신규 거래처 (금년 첫 거래)'}),el('b',{class:'up',text:`${nNew}곳`}),el('span',{class:'up',text:` +${amt(newAmt)}`})):null);
  p.append(sm);const d=el('div');p.append(d);
  table(d,{id:'lost-'+key,rows:out,maxH:420,sort:{k:'loss',d:1},onRow:r=>onRow(r.k),empty:'해당 항목이 없습니다.',
    cols:[{k:'name',l:unitLab,cls:'name',title:r=>r.name},...(sub?[{k:'sub',l:'담당'}]:[]),{k:'st',l:'구분',f:r=>el('span',{class:'pill st-risk',text:r.st})},
      {k:'ly',l:`${BY-1}년 연간`,n:1,f:r=>amt(r.ly)},{k:'lytd',l:'전년 동기',n:1,f:r=>amt(r.lytd)},{k:'ytd',l:'금년 누계',n:1,f:r=>amt(r.ytd)},{k:'loss',l:'감소액',n:1,f:r=>el('span',{class:'down',text:amt(r.loss)})},
      {k:'last',l:'최종 주문일',n:1,f:r=>r.last?r.last.slice(2).replace(/-/g,'.'):'—'}]});
  host.append(p);
};
K.topItems=(rows,nameOf,n=3)=>{const g=groupBy(rows.filter(r=>r.d>=D12),'i');return [...g.values()].sort((a,b)=>b.a-a.a).slice(0,n).map(o=>nameOf(o.k)).join(', ')};

// ── 수익성 (ERP 수익성분석지수, 비밀번호로 암호화된 데이터)
const PC=['qty','real','sales','cogs','gp','sga','op'];
K.P=null;
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
K.unlock=async pw=>{const e=D.penc;if(!e)return false;
  try{const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(e.salt),iterations:e.iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
    const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(e.iv)},key,b64(e.ct));
    K.P=JSON.parse(new TextDecoder().decode(pt));try{sessionStorage.setItem('pp',pw)}catch(x){}return true}catch(x){return false}};
K.autoUnlock=async()=>{if(K.P||!D.penc)return;let pw=null;try{pw=sessionStorage.getItem('pp')}catch(x){}if(pw)await K.unlock(pw)};
const pRow=(arr,off)=>{const o={};PC.forEach((k,j)=>o[k]=arr[off+j]);o.gpr=o.sales>0?o.gp/o.sales:null;o.opr=o.sales>0?o.op/o.sales:null;return o};
K.profitMonths=()=>K.P?Object.keys(K.P.months).sort():[];
K.profitCust=ym=>((K.P?.months[ym]||{}).cust||[]).map(r=>Object.assign({name:r[0]},pRow(r,1)));
K.profitItem=ym=>((K.P?.months[ym]||{}).item||[]).map(r=>Object.assign({code:r[0],name:r[1],spec:r[2]},pRow(r,3)));
const pct=v=>v==null?'—':(v*100).toFixed(1)+'%';
const opCell=v=>el('span',{class:v<0?'loss':'',text:amt(v)});
const gprCell=v=>el('span',{class:v!=null&&v<0?'loss':v!=null&&v<0.1?'st-late':'',text:pct(v)});
K.profitLine=(name)=>{const ms=K.profitMonths();if(!ms.length)return null;const ym=ms[ms.length-1];const r=K.profitCust(ym).find(x=>x.name===name);if(!r)return null;
  return el('div',{class:'callout pline'},el('b',{text:`${+ym.slice(5)}월 손익 `}),`매출 ${amt(r.sales)} · 매출총이익 ${amt(r.gp)} (${pct(r.gpr)}) · 영업이익 `,opCell(r.op),` (${pct(r.opr)})`)};
// 탭 화면
K.profitTab=async function(M,{custFilter,custInfo,onCust,itemId,onItem,custLab='거래처'}){
  const W=el('div',{class:'pwrap'});M.append(W);M=W;
  await K.autoUnlock();
  if(!D.penc){M.append(el('div',{class:'empty',text:'수익성 자료가 아직 없습니다.'}));return}
  if(!K.P){const box=el('section',{class:'panel lock'});const inp=el('input',{id:'ppw',type:'password',placeholder:'비밀번호',autocomplete:'off'});const msg=el('div',{class:'note'});
    const go=async()=>{msg.textContent='확인 중…';if(await K.unlock(inp.value))K.render(true);else msg.textContent='비밀번호가 맞지 않습니다.'};
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')go()});
    box.append(el('h2',{},'수익성 분석',el('span',{class:'sub',text:'원가·이익 정보가 있어 비밀번호가 필요합니다'})),el('div',{class:'pb lockrow'},inp,el('button',{class:'btn pri',text:'확인',onclick:go}),msg));
    M.append(box);setTimeout(()=>inp.focus(),50);return}
  const ms=K.profitMonths();if(!S.pm||!ms.includes(S.pm))S.pm=ms[ms.length-1];const ym=S.pm;
  const row=el('div',{class:'row'},el('span',{class:'lab',text:'월'}),...ms.map(m=>el('button',{class:'chip'+(m===ym?' on':''),text:`${m.slice(0,4)}년 ${+m.slice(5)}월`,onclick:()=>{S.pm=m;K.render(true)}})));
  M.append(row);
  let cs=K.profitCust(ym).filter(r=>custFilter(r.name));const its=K.profitItem(ym);
  const T=k=>cs.reduce((s,r)=>s+r[k],0);const tot={sales:T('sales'),cogs:T('cogs'),gp:T('gp'),sga:T('sga'),op:T('op')};
  const negC=cs.filter(r=>r.op<0),negI=its.filter(r=>r.op<0),lowI=its.filter(r=>r.sales>0&&r.gpr<0.1);
  const g=el('div',{class:'grid5'});
  const card=(k,v,d,cls)=>el('div',{class:'card static'},el('div',{class:'k',text:k}),el('div',{class:'v '+(cls||''),text:v}),el('div',{class:'d'},el('span',{class:'flat',text:d||''})));
  g.append(card('매출액',amt(tot.sales),`${custLab} ${cs.filter(r=>r.sales).length}곳`),card('매출원가',amt(tot.cogs),`원가율 ${pct(tot.sales?tot.cogs/tot.sales:null)}`),
    card('매출총이익',amt(tot.gp),`총이익률 ${pct(tot.sales?tot.gp/tot.sales:null)}`),card('판매비와관리비',amt(tot.sga),`매출 대비 ${pct(tot.sales?tot.sga/tot.sales:null)}`),
    card('영업이익',amt(tot.op),`영업이익률 ${pct(tot.sales?tot.op/tot.sales:null)} · 적자 ${custLab} ${negC.length}곳`,tot.op<0?'down':''));
  M.append(g);
  // 거래처별
  const cp=K.panel(`${custLab}별 손익`,`${+ym.slice(5)}월 · ${custLab} ${cs.length}곳 · 영업적자 ${negC.length}곳 ${amt(negC.reduce((s,r)=>s+r.op,0))}`);
  const cf=S.pcf||'neg';const cc=el('div',{class:'tools'},...[['neg',`영업적자 ${negC.length}`],['all',`전체 ${cs.length}`]].map(([k,l])=>el('button',{class:'chip'+(cf===k?' on':''),text:l,onclick:()=>{S.pcf=k;K.render(true)}})));
  cp.append(cc);const cd=el('div');cp.append(cd);
  const crow=cs.map(r=>Object.assign({},r,custInfo(r.name)));
  table(cd,{id:'pcust',rows:cf==='neg'?crow.filter(r=>r.op<0):crow,maxH:480,sort:{k:'op',d:1},onRow:r=>r.id!=null&&onCust(r.id),empty:'영업적자 거래처가 없습니다.',
    cols:[{k:'name',l:custLab,cls:'name',title:r=>r.name},...(crow.some(r=>r.rep)?[{k:'rep',l:'담당'}]:[]),{k:'sales',l:'매출액',n:1,f:r=>amt(r.sales),title:r=>won(r.sales)},{k:'cogs',l:'매출원가',n:1,f:r=>amt(r.cogs)},
      {k:'gp',l:'매출총이익',n:1,f:r=>amt(r.gp)},{k:'gpr',l:'총이익률',n:1,f:r=>gprCell(r.gpr)},{k:'sga',l:'판관비',n:1,f:r=>amt(r.sga)},{k:'op',l:'영업이익',n:1,f:r=>opCell(r.op),title:r=>won(r.op)},{k:'opr',l:'영업이익률',n:1,f:r=>pct(r.opr)},
      {k:'nt',l:'비고',f:r=>r.sales===0&&r.sga?el('span',{class:'flat',text:'매출 없이 판관비만 배분'}):'',nosort:1}]});
  M.append(cp);
  // 품목별
  const ip=K.panel('품목별 손익',`${+ym.slice(5)}월 · 품목 ${its.length}개 · 영업적자 ${negI.length}개 · 총이익률 10% 미만 ${lowI.length}개`);
  const ifl=S.pif||'neg';ip.append(el('div',{class:'tools'},...[['neg',`영업적자 ${negI.length}`],['low',`총이익률 10% 미만 ${lowI.length}`],['all',`전체 ${its.length}`]].map(([k,l])=>el('button',{class:'chip'+(ifl===k?' on':''),text:l,onclick:()=>{S.pif=k;K.render(true)}}))));
  const idv=el('div');ip.append(idv);
  table(idv,{id:'pitem',rows:ifl==='neg'?negI:ifl==='low'?lowI:its,maxH:520,sort:ifl==='low'?{k:'gpr',d:1}:{k:'op',d:1},onRow:r=>{const id=itemId(r.code);if(id!=null)onItem(id)},empty:'해당 품목이 없습니다.',
    cols:[{k:'name',l:'품명',cls:'name',title:r=>`${r.name} · ${r.code}`},{k:'spec',l:'규격'},{k:'qty',l:'수량',n:1,f:r=>nf(r.qty)},{k:'sales',l:'매출액',n:1,f:r=>amt(r.sales),title:r=>won(r.sales)},
      {k:'cogs',l:'매출원가',n:1,f:r=>amt(r.cogs)},{k:'gp',l:'매출총이익',n:1,f:r=>amt(r.gp)},{k:'gpr',l:'총이익률',n:1,f:r=>gprCell(r.gpr)},{k:'sga',l:'판관비',n:1,f:r=>amt(r.sga)},{k:'op',l:'영업이익',n:1,f:r=>opCell(r.op),title:r=>won(r.op)},{k:'opr',l:'영업이익률',n:1,f:r=>pct(r.opr)}]});
  M.append(ip);
  M.append(el('div',{class:'foot',text:'※ ERP 수익성분석지수 기준(월별). 매출액은 ERP \'1.매출액\', 판관비는 ERP 배분 기준입니다. 품목별 손익은 제외 거래처(개인소매 등) 매출이 포함된 ERP 품목 합계입니다. 거래처·품목을 클릭하면 상세 정보가 열립니다.'}));
};
// ── 서랍
K.drawer=function(title,sub,build){
  const ov=document.getElementById('overlay');ov.innerHTML='';
  const close=()=>{ov.innerHTML='';document.removeEventListener('keydown',esc)};const esc=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',esc);
  const dr=el('aside',{class:'drawer',role:'dialog','aria-label':title});
  dr.append(el('div',{class:'dh'},el('div',{},el('h3',{text:title}),el('div',{class:'note',text:sub})),el('button',{class:'x',onclick:close,'aria-label':'닫기',text:'✕'})));
  ov.append(el('div',{class:'dr-back',onclick:close}),dr);
  build(dr);
  const x=dr.querySelector('.x');x&&x.focus({preventScroll:true});
};
K.stats=items=>el('div',{class:'stats6'},...items.map(([k,v,cls,t])=>el('div',{},el('small',{text:k}),el('b',{class:cls||'',text:v,title:t||null}))));
K.section=(t,open,fill)=>{const d=el('details',{class:'panel'});if(open)d.open=true;d.append(el('summary',{text:t}));const b=el('div');d.append(b);fill(b);return d};
// 월별 2년치 막대 (서랍용)
K.monthly2=function(host,rows){const list=[];for(let m=1;m<=12;m++){const k=`${BY}-${pad(m)}`;list.push({key:k,label:m+'월',tipT:`${m}월`,cur:k<=MAX.slice(0,7)?sum(rows.filter(r=>r.ym===k)):null,prev:`${BY-1}-${pad(m)}`>=MIN.slice(0,7)?sum(rows.filter(r=>r.ym===`${BY-1}-${pad(m)}`)):null})}
  requestAnimationFrame(()=>bars(host,list,{h:170,curName:`${BY}년`,prevName:`${BY-1}년`}))};

// ── 달력 (두 달 보기, 확인을 눌러야 적용)
function openCal(){
  const ov=document.getElementById('overlay');ov.innerHTML='';
  let a=S.f,b=S.t,pick=0;let vm=pd(S.t);vm.setUTCDate(1);vm.setUTCMonth(vm.getUTCMonth()-1);if(fd(vm)<MIN)vm=pd(MIN);
  const back=el('div',{class:'cal-back',onclick:e=>{if(e.target===back)ov.innerHTML=''}});
  const box=el('div',{class:'cal',role:'dialog','aria-label':'기간 선택'});back.append(box);ov.append(back);
  const setR=(f,t)=>{a=f<MIN?MIN:f;b=t>MAX?MAX:t;pick=0;vm=pd(b);vm.setUTCDate(1);vm.setUTCMonth(vm.getUTCMonth()-1);draw()};
  const draw=()=>{box.innerHTML='';
    const qs=el('div',{class:'qs'});const pm=BM===1?[BY-1,12]:[BY,BM-1];
    const Q=[['지난달',`${pm[0]}-${pad(pm[1])}-01`,eom(pm[0],pm[1])],['최근 7일',addD(MAX,-6),MAX],['최근 30일',addD(MAX,-29),MAX],['최근 90일',addD(MAX,-89),MAX]];
    for(let q=1;q<=Math.ceil(BM/3);q++)Q.push([`${q}분기`,`${BY}-${pad(q*3-2)}-01`,eom(BY,q*3)]);
    Q.push(['금년 누계',`${BY}-01-01`,MAX]);
    if(MIN<=`${BY-1}-01-01`){Q.push([`전년 ${BM}월`,`${BY-1}-${pad(BM)}-01`,eom(BY-1,BM)],[`${BY-1}년 전체`,`${BY-1}-01-01`,`${BY-1}-12-31`])}
    Q.forEach(([l,f,t])=>qs.append(el('button',{class:'chip'+(a===f&&b===(t>MAX?MAX:t)?' on':''),text:l,onclick:()=>setR(f,t)})));
    box.append(qs);
    box.append(el('div',{class:'nav'},el('button',{text:'‹',onclick:()=>{vm.setUTCMonth(vm.getUTCMonth()-1);draw()},'aria-label':'이전 달'}),el('span',{class:'note',text:pick?'종료일을 누르세요':'시작일을 누르세요 · 월 이름을 누르면 그 달 전체'}),el('button',{text:'›',onclick:()=>{vm.setUTCMonth(vm.getUTCMonth()+1);draw()},'aria-label':'다음 달'})));
    const ms=el('div',{class:'ms'});
    [0,1].forEach(o=>{const m0=new Date(vm);m0.setUTCMonth(m0.getUTCMonth()+o);const Y=m0.getUTCFullYear(),Mo=m0.getUTCMonth()+1;
      const m=el('div',{class:'m'});m.append(el('h4',{text:`${Y}년 ${Mo}월`,onclick:()=>setR(`${Y}-${pad(Mo)}-01`,eom(Y,Mo))}));
      const gd=el('div',{class:'gd'});'일월화수목금토'.split('').forEach(w=>gd.append(el('div',{class:'w',text:w})));
      const first=new Date(Date.UTC(Y,Mo-1,1)).getUTCDay();for(let i=0;i<first;i++)gd.append(el('div'));
      for(let d=1;d<=+eom(Y,Mo).slice(8);d++){const s=`${Y}-${pad(Mo)}-${pad(d)}`;
        const btn=el('button',{text:d,class:(s===a||s===b)?'edge':(s>a&&s<b?'in':'')});
        if(s<MIN||s>MAX)btn.disabled=true;
        btn.onclick=()=>{if(!pick){a=b=s;pick=1}else{if(s<a){b=a;a=s}else b=s;pick=0}draw()};gd.append(btn)}
      m.append(gd);ms.append(m)});
    box.append(ms);
    box.append(el('div',{class:'ft'},el('span',{class:'note',text:'선택: '+perName(a,b)}),el('div',{class:'row'},el('button',{class:'btn',text:'취소',onclick:()=>ov.innerHTML=''}),el('button',{class:'btn pri',text:'확인',onclick:()=>{ov.innerHTML='';setPer(a,b)}}))));
  };
  draw();
}
})();
