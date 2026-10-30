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
  (D.meta.tx||[]).forEach(t=>meta.append(' ',el('span',{class:'pill st-late',title:'매출 마감 전이라 이 달은 출고 실적(거래명세서)으로 집계합니다. 매출 마감 후 매출 기준으로 바뀝니다.',text:`${+t.m.slice(5)}월: 실적구분 '거래명세서' 기준 (마감 전)`})));
  const tr=document.querySelector('.titlerow');let tb=document.getElementById('tbtns');
  if(!tb){tb=el('div',{id:'tbtns',class:'tbtns'},el('a',{class:'tbtn',href:'../',text:'⌂ 메인'}),el('button',{class:'tbtn',text:'↺ 선택 초기화',title:'기간·필터·정렬을 처음 상태로 되돌립니다',onclick:()=>K.reset()}));tr.append(tb)}
  const ctl=document.getElementById('ctl');ctl.innerHTML='';const pr=periodRow();ctl.append(pr);
  const curTab=K.page.tabs.find(t=>t[0]===S.tab)||[];
  if(curTab[2]&&curTab[2].noPer){pr.classList.add('dimper');pr.append(el('span',{class:'note',text:`이 탭은 기준일 ${MAX.slice(5).replace('-','.')} 기준 (기간 선택 무관)`}))}
  K.page.controls&&K.page.controls(ctl);
  const tabs=document.getElementById('tabs');tabs.innerHTML='';
  K.page.tabs.forEach(([k,l,o])=>{const n=o&&o.badge?o.badge():null;
    tabs.append(el('button',{class:'tab'+(S.tab===k?' on':''),onclick:()=>K.go(k)},l,n?el('span',{class:'tbadge'+(o.warn?' warn':''),title:o.badgeTip||'',text:n}):null))});
}
const M=document.getElementById('main');
function render(keep){
  const y=window.scrollY;drawTop();M.innerHTML='';
  K.page.draw(S.tab,M);
  M.append(el('div',{class:'foot',text:`매출 = 원화판매금액(부가세 제외, 반품·차감 포함). 자료: ERP 일일판매실적조회 (기업영업팀) ${MIN.replace(/-/g,'.')}~${MAX.replace(/-/g,'.')}. 개인소매 제외.${(D.meta.tx||[]).map(t=>` ${+t.m.slice(5)}월은 매출 마감 전이라 실적구분 '거래명세서'(출고) 기준.`).join('')} 갱신 ${D.meta.built}`}));
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
K.start=page=>GATE.run(D.chk,pw=>{K.pw=pw;K.start0(page)});
K.go=(tab,patch,anchor)=>{Object.assign(S,patch||{});S.tab=tab;try{history.replaceState(null,'','#'+tab)}catch(e){}render();window.scrollTo(0,0);
  if(anchor)setTimeout(()=>document.getElementById(anchor)?.scrollIntoView({block:'start',behavior:'smooth'}),120)};
// 오늘 확인할 것: [{l,n,cls,go:()=>{}}]
K.todo=(host,items)=>{const its=items.filter(x=>x&&x.n!=null);if(!its.length)return;
  host.append(el('div',{class:'todo'},el('span',{class:'tl'},el('b',{text:'오늘 확인할 것'}),el('span',{class:'note',text:` 기준일 ${MAX.slice(5).replace('-','.')}`})),
    ...its.map(x=>el('button',{class:'ti '+(x.cls||''),title:x.tip||'',onclick:x.go},el('span',{text:x.l}),el('b',{text:x.n+(x.u||'')})))))};
K.start0=page=>{K.page=page;K.autoUnlock().then(()=>{if(K.P)render(true)});K.S0=JSON.parse(JSON.stringify(S));const h=location.hash.slice(1);S.tab=page.tabs.some(t=>t[0]===h)?h:page.tabs[0][0];render();
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
  nums.append(el('div',{class:'hero'},el('small',{text:`${perName(S.f,S.t)} 매출`+((D.meta.tx||[]).some(t=>t.m>=S.f.slice(0,7)&&t.m<=S.t.slice(0,7))?' (거래명세서 포함)':'')}),el('b',{text:amt(cur),title:won(cur)})),
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
  p.id='top10p';
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
K.actionList=(rows,key)=>{const g=groupBy(rows,key);const list=[];
  g.forEach((o,k)=>{const c=cadence(o.rows);if(!c.gap)return;
    let st=null;
    if(c.late)st=c.since>c.gap*3?'장기 미발주':'주기 초과';
    else if(c.next&&c.next>=MAX&&c.next<=addD(MAX,7))st='발주 예정';
    if(!st)return;
    list.push({k,st,gap:c.gap,last:c.last,since:c.since,over:c.since-c.gap,next:c.next,n:c.n,r12:sum(o.rows.filter(r=>r.d>=D12)),rows:o.rows})});
  return list};
K.actions=function(host,rows,{key,name,sub,onRow,items,unitLab='거래처'}){
  const cw=unitLab==='거래처'?'곳':'개';
  const list=K.actionList(rows,key).map(o=>Object.assign(o,{name:name(o.k),sub:sub?sub(o.k):''}));
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
K.lostCalc=(rows,key,minAmt=12e6,firstOf)=>{
  const lf=`${BY-1}-01-01`,lt=shiftY(MAX);if(lf<MIN)return null;
  const g=groupBy(rows,key);const out=[];let nNew=0,newAmt=0;
  g.forEach((o,k)=>{const ly=sum(o.rows.filter(r=>r.y===BY-1)),lytd=sum(inR(o.rows,lf,lt)),ytd=sum(o.rows.filter(r=>r.y===BY));
    if(firstOf&&ytd>0&&firstOf(k)>=`${BY}-01-01`){nNew++;newAmt+=ytd}
    if(ly<minAmt)return;let st=null;if(ytd<=0)st='이탈';else if(lytd>0&&ytd<lytd*0.5)st='급감';if(!st)return;
    const last=o.rows.filter(r=>r.a>0).reduce((m,r)=>r.d>m?r.d:m,'');
    out.push({k,st,ly,lytd,ytd,loss:ytd-lytd,last})});
  return{out,nNew,newAmt}};
K.lost=function(host,rows,{key,name,sub,onRow,minAmt=12e6,unitLab='거래처',firstOf}){
  const lc=K.lostCalc(rows,key,minAmt,firstOf);if(!lc)return;const {nNew,newAmt}=lc;
  const out=lc.out.map(o=>Object.assign(o,{name:name(o.k),sub:sub?sub(o.k):''}));
  const L=out.filter(o=>o.st==='이탈'),Dn=out.filter(o=>o.st==='급감');
  const p=K.panel('전년 대비 매출 감소 현황',`금년 누계(1/1~${+MAX.slice(5,7)}/${BD}) vs 전년 같은 날짜까지 · 전년 연매출 ${amt(minAmt)} 이상 ${unitLab} · 기간 선택과 무관`);
  p.id='lostp';
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

// ── 수익성 (ERP 수익성분석지수 기반, 비밀번호로 암호화) — 적자 거래처 → 적자 품목 → 개선 포인트
K.P=null;
K.unlock=async pw=>{const e=D.penc;if(!e||!pw)return false;try{K.P=await GATE.dec(e,pw);return true}catch(x){return false}};
K.autoUnlock=async()=>{if(K.P||!D.penc)return;await K.unlock(K.pw||GATE.saved())};
const pct=v=>v==null||!isFinite(v)?'—':(v*100).toFixed(1)+'%';
const opCell=v=>el('span',{class:v<0?'loss':'',text:amt(v)});
const gprCell=v=>el('span',{class:v!=null&&v<0?'loss':v!=null&&v<0.1?'st-late':'',text:pct(v)});
const wonU=v=>v==null||!isFinite(v)?'—':nf(v)+'원';
// 기간(월 목록)별 집계
function pAgg(ms){
  const P=K.P,C=new Map(),I=new Map(),CI=new Map(),MON=new Map();
  const gc=n=>{let o=C.get(n);if(!o){o={name:n,a:0,cogs:0,sgaI:0,direct:0,erp:false,nm:0};C.set(n,o)}return o};
  ms.forEach(ym=>{const per=new Map();
    (P.ci[ym]||[]).forEach(([c,code,q,a,cogs,sga])=>{if(cogs==null)return;const o=gc(c);o.a+=a;o.cogs+=cogs;o.sgaI+=sga;
      const k=c+'\u0001'+code;let x=CI.get(k);if(!x){x={c,code,q:0,a:0,cogs:0,sga:0};CI.set(k,x)}x.q+=q;x.a+=a;x.cogs+=cogs;x.sga+=sga;
      let it=I.get(code);if(!it){it={code,q:0,a:0,cogs:0,sga:0,cs:new Set()};I.set(code,it)}it.q+=q;it.a+=a;it.cogs+=cogs;it.sga+=sga;it.cs.add(c);
      const pm=per.get(c)||{a:0,cogs:0,sga:0};pm.a+=a;pm.cogs+=cogs;pm.sga+=sga;per.set(c,pm)});
    (P.ca[ym]||[]).forEach(([c,real,cogs,sga,op])=>{const o=gc(c);const pm=per.get(c)||{a:0,cogs:0,sga:0};const d=sga-pm.sga;o.direct+=d;o.erp=true;pm.direct=d;per.set(c,pm)});
    per.forEach((pm,c)=>{const m=MON.get(c)||{};m[ym]=pm.a-pm.cogs-pm.sga-(pm.direct||0);MON.set(c,m)});
  });
  C.forEach(o=>{o.gp=o.a-o.cogs;o.opI=o.gp-o.sgaI;o.op=o.opI-o.direct;o.gpr=o.a>0?o.gp/o.a:null;o.opr=o.a>0?o.op/o.a:null;o.mon=MON.get(o.name)||{}});
  const fin=x=>{x.gp=x.a-x.cogs;x.opI=x.gp-x.sga;x.gpr=x.a>0?x.gp/x.a:null;x.price=x.q>0?x.a/x.q:null;x.ucost=x.q>0?x.cogs/x.q:null;x.be=x.q>0?(x.cogs+x.sga)/x.q:null;x.need=x.price&&x.be>x.price?x.be/x.price-1:null};
  I.forEach(fin);CI.forEach(fin);
  return{C,I,CI};
}
// 최근 달 적자 거래처(또는 품목) 수 — 탭 숫자·오늘 확인할 것
K.profitNeg=(filter,kind='cust')=>{if(!K.P||!K.P.ci||!K.P.months.length)return null;const ym=K.P.months[K.P.months.length-1];const {C,CI}=pAgg([ym]);
  if(kind==='item'){const IT=new Map();CI.forEach(x=>{if(!filter(x.c))return;IT.set(x.code,(IT.get(x.code)||0)+x.a-x.cogs-x.sga)});return{n:[...IT.values()].filter(v=>v<0).length,ym}}
  return{n:[...C.values()].filter(o=>filter(o.name)&&o.op<0).length,ym}};
function cause(o){if(o.op>=0)return null;if(o.a<=0)return '매출 없음';const m=o.opI<0,d=o.direct>0&&o.direct>=Math.abs(o.op)*0.3;return m&&d?'마진+비용':m?'마진 부족':d?'거래처 비용':'마진 부족'}
const CAUSEC={'마진 부족':'st-risk','거래처 비용':'st-late','마진+비용':'st-risk','매출 없음':'st-dorm'};
function streak(mon,ms){let n=0;for(let i=ms.length-1;i>=0;i--){const v=mon[ms[i]];if(v!=null&&v<0)n++;else break}return n}
function sparkOp(mon,ms){const ns='http://www.w3.org/2000/svg',W=ms.length*12,H=26,svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('class','spark');svg.style.width=W+'px';
  const vs=ms.map(m=>mon[m]||0),mx=Math.max(1,...vs.map(Math.abs));const mid=H/2;
  vs.forEach((v,i)=>{const h=Math.max(1,Math.abs(v)/mx*(mid-1));const r=document.createElementNS(ns,'rect');r.setAttribute('x',i*12+2);r.setAttribute('width',8);r.setAttribute('y',v>=0?mid-h:mid);r.setAttribute('height',h);r.setAttribute('fill',v<0?'var(--bad)':'var(--ghost)');svg.append(r)});
  const t=document.createElementNS(ns,'title');t.textContent=ms.map((m,i)=>`${+m.slice(5)}월 ${amt(vs[i])}`).join(' · ');svg.append(t);return svg}
K.profitLine=(name)=>{if(!K.P)return null;const ms=K.P.months;if(!ms.length)return null;const ym=ms[ms.length-1];const o=pAgg([ym]).C.get(name);if(!o)return null;
  return el('div',{class:'callout pline'},el('b',{text:`${+ym.slice(5)}월 손익 `}),`매출 ${amt(o.a)} · 매출총이익 ${amt(o.gp)} (${pct(o.gpr)}) · 영업이익 `,opCell(o.op),` (${pct(o.opr)})`)};
// 탭 화면
K.profitTab=async function(M0,{custFilter,custInfo,onCust,itemId,onItem,docCount,custLab='거래처'}){
  const M=el('div',{class:'pwrap'});M0.append(M);
  await K.autoUnlock();
  if(!D.penc){M.append(el('div',{class:'empty',text:'수익성 자료가 아직 없습니다.'}));return}
  if(!K.P||!K.P.ci){K.P=null;M.append(el('section',{class:'panel lock'},el('h2',{},'손익 분석',el('span',{class:'sub',text:'손익 자료를 열 수 없습니다. 비밀번호가 바뀌었을 수 있습니다.'})),
    el('div',{class:'pb lockrow'},el('button',{class:'btn pri',text:'비밀번호 다시 입력',onclick:()=>{GATE.clear();location.reload()}}))));return}
  const all=K.P.months;if(!S.pm||(S.pm!=='all'&&!all.includes(S.pm)))S.pm=all[all.length-1];
  const ms=S.pm==='all'?all:[S.pm];const plab=S.pm==='all'?`${+all[0].slice(5)}~${+all[all.length-1].slice(5)}월 누계`:`${+S.pm.slice(5)}월`;
  const erpMs=Object.keys(K.P.ca||{});
  M.append(el('div',{class:'row'},el('span',{class:'lab',text:'기간'}),...all.map(m=>el('button',{class:'chip'+(S.pm===m?' on':''),text:`${+m.slice(5)}월`,onclick:()=>{S.pm=m;K.render(true)}})),
    el('button',{class:'chip'+(S.pm==='all'?' on':''),text:`${+all[0].slice(5)}~${+all[all.length-1].slice(5)}월 누계`,onclick:()=>{S.pm='all';K.render(true)}})));
  const {C,I,CI}=pAgg(ms);const allMon=pAgg(all).C;
  const cs=[...C.values()].filter(o=>custFilter(o.name)).map(o=>Object.assign(o,custInfo(o.name),{cause:cause(o),streak:streak((allMon.get(o.name)||{}).mon||{},all),monAll:(allMon.get(o.name)||{}).mon||{}}));
  const keep=new Set(cs.map(o=>o.name));
  const tot=cs.reduce((t,o)=>{t.a+=o.a;t.gp+=o.gp;t.op+=o.op;return t},{a:0,gp:0,op:0});
  const negC=cs.filter(o=>o.op<0);
  // 페이지 품목 집계 (필터된 거래처만)
  const IT=new Map();CI.forEach(x=>{if(!keep.has(x.c))return;let it=IT.get(x.code);if(!it){it={code:x.code,q:0,a:0,cogs:0,sga:0,nc:0,negc:0};IT.set(x.code,it)}it.q+=x.q;it.a+=x.a;it.cogs+=x.cogs;it.sga+=x.sga;it.nc++;if(x.opI<0)it.negc++});
  IT.forEach(x=>{x.gp=x.a-x.cogs;x.opI=x.gp-x.sga;x.gpr=x.a>0?x.gp/x.a:null;x.name=K.P.iname[x.code]||x.code});
  const negI=[...IT.values()].filter(x=>x.opI<0);
  const g=el('div',{class:'grid5'});
  const card=(k,v,d,cls)=>el('div',{class:'card static'},el('div',{class:'k',text:k}),el('div',{class:'v '+(cls||''),text:v}),el('div',{class:'d'},el('span',{class:'flat',text:d||''})));
  g.append(card('매출',amt(tot.a),plab),card('매출총이익',amt(tot.gp),`총이익률 ${pct(tot.a?tot.gp/tot.a:null)}`),card('영업이익',amt(tot.op),`영업이익률 ${pct(tot.a?tot.op/tot.a:null)}`,tot.op<0?'loss':''),
    card(`적자 ${custLab}`,`${negC.length}곳`,`합계 ${amt(negC.reduce((s,o)=>s+o.op,0))}`,negC.length?'loss':''),card('적자 품목',`${negI.length}개`,`합계 ${amt(negI.reduce((s,x)=>s+x.opI,0))}`,negI.length?'loss':''));
  M.append(g);
  M.append(el('div',{class:'note',text:`※ 품목 원가·판관비는 그 달 ERP 품목별 수익성 기준으로 거래처 판매실적에 배분했습니다. 거래처 직접 비용(ERP 거래처 판관비 − 품목 기준 판관비)은 ERP 거래처별 파일이 있는 달(${erpMs.map(m=>+m.slice(5)+'월').join('·')||'없음'})만 반영됩니다.`}));
  // ① 적자 거래처
  const p1=K.panel(`① 적자 ${custLab}`,`${plab} · 영업이익 낮은 순 · 행을 클릭하면 ② 품목별 원인 분석으로 이동`);
  const cf=S.pcf||(negC.length?'neg':'all');p1.append(el('div',{class:'tools'},...[['neg',`적자 ${negC.length}`],['all',`전체 ${cs.length}`]].map(([k,l])=>el('button',{class:'chip'+(cf===k?' on':''),text:l,onclick:()=>{S.pcf=k;K.render(true)}}))));
  const d1=el('div');p1.append(d1);
  table(d1,{id:'pc1',rows:cf==='neg'?negC:cs,maxH:440,sort:{k:'op',d:1},onRow:r=>{S.pc=r.name;S.pi=null;K.render(true);setTimeout(()=>document.getElementById('p2')?.scrollIntoView({block:'start',behavior:'smooth'}),80)},rowCls:r=>r.name===S.pc?'on':'',empty:'적자 거래처가 없습니다.',
    cols:[{k:'name',l:custLab,cls:'name',title:r=>r.name},...(cs.some(r=>r.rep)?[{k:'rep',l:'담당'}]:[]),{k:'a',l:'매출',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'gpr',l:'총이익률',n:1,f:r=>gprCell(r.gpr)},
      {k:'op',l:'영업이익',n:1,f:r=>opCell(r.op),title:r=>won(r.op)},{k:'cause',l:'적자 원인',f:r=>r.cause?el('span',{class:'pill '+CAUSEC[r.cause],text:r.cause}):'—'},
      {k:'streak',l:'연속 적자',n:1,f:r=>r.streak?el('span',{class:r.streak>=3?'loss':'',text:r.streak+'개월'}):'—',tip:'최근 달부터 거꾸로 영업이익이 마이너스인 달 수'},
      {k:'sp',l:`월별 영업이익 (${+all[0].slice(5)}~${+all[all.length-1].slice(5)}월)`,f:r=>sparkOp(r.monAll,all),nosort:1}]});
  M.append(p1);
  M.append(el('div',{class:'legend-row note'},'적자 원인: ',el('span',{class:'pill st-risk',text:'마진 부족'}),' 품목 판매단가가 원가+판관비보다 낮음 · ',el('span',{class:'pill st-late',text:'거래처 비용'}),' 품목은 흑자인데 이 거래처에만 붙는 비용(배송·수수료 등)으로 적자 · ',el('span',{class:'pill st-dorm',text:'매출 없음'}),' 매출 없이 비용만 배분'));
  // ② 선택 거래처
  const sel=S.pc&&C.get(S.pc);
  if(sel){const o=Object.assign({},sel,custInfo(sel.name));
    const rows=[...CI.values()].filter(x=>x.c===o.name);
    const other=code=>{let q=0,a=0;CI.forEach(x=>{if(x.code===code&&x.c!==o.name&&x.q>0&&x.a>0){q+=x.q;a+=x.a}});return q?a/q:null};
    rows.forEach(x=>{x.name=K.P.iname[x.code]||x.code;x.oth=other(x.code);x.vs=x.price&&x.oth?x.price/x.oth-1:null});
    const p2=el('section',{class:'panel selpanel',id:'p2'});
    p2.append(el('h2',{},`② ${o.name} 손익 분석`,el('span',{class:'sub',text:plab}),el('span',{class:'right'},o.id!=null&&onCust?el('button',{class:'chip',text:'거래처 상세',onclick:()=>onCust(o.id)}):null,el('button',{class:'chip',text:'닫기 ✕',onclick:()=>{S.pc=null;K.render(true)}}))));
    // 손익 흐름
    const step=(l,v,cls)=>el('div',{class:'fstep '+(cls||'')},el('small',{text:l}),el('b',{class:v<0&&cls!=='minus'?'loss':'',text:amt(v)}));
    p2.append(el('div',{class:'flow'},step('매출',o.a),el('span',{class:'arr',text:'−'}),step('매출원가',o.cogs,'minus'),el('span',{class:'arr',text:'='}),step(`매출총이익 ${pct(o.gpr)}`,o.gp),
      el('span',{class:'arr',text:'−'}),step('품목 판관비',o.sgaI,'minus'),el('span',{class:'arr',text:'−'}),step(o.erp?'거래처 직접 비용':'거래처 직접 비용 (자료 없음)',o.direct,'minus'),el('span',{class:'arr',text:'='}),step(`영업이익 ${pct(o.opr)}`,o.op,o.op<0?'neg':'')));
    // 개선 포인트
    const tips=[];const lossItems=rows.filter(x=>x.opI<0).sort((a,b)=>a.opI-b.opI);
    lossItems.slice(0,4).forEach(x=>tips.push(x.price==null?['정산',`${x.name}: 매출 ${amt(x.a)} 대비 원가 ${amt(x.cogs)}·판관비 ${amt(x.sga)} (수량 없는 금액 기준 항목) · 손실 ${amt(x.opI)} → 할인·정산 조건 확인`]:[x.need!=null?'단가':'품목',`${x.name}: 판매단가 ${wonU(x.price)} → 손익분기 단가 ${wonU(x.be)}`+(x.need!=null?` (+${(x.need*100).toFixed(1)}% 인상 필요)`:'')+(x.oth?` · 다른 거래처 평균 ${wonU(x.oth)}${x.vs!=null?` (이 거래처가 ${x.vs<0?(-x.vs*100).toFixed(0)+'% 낮음':(x.vs*100).toFixed(0)+'% 높음'})`:''}`:' · 다른 거래처 판매 없음')+` · 품목 손실 ${amt(x.opI)}`]));
    if(o.erp&&o.direct>0&&o.direct>=Math.abs(Math.min(0,o.op))*0.3){const dc=docCount?docCount(o.name,ms):null;tips.push(['비용',`거래처 직접 비용 ${amt(o.direct)} (매출의 ${pct(o.a?o.direct/o.a:null)})`+(dc?` · 출고 ${dc.n}건, 건당 평균 ${amt(dc.avg)}`:'')+' → 배송비·수수료 조건, 최소 주문 금액(소량 다회 주문) 검토'])}
    if(o.gpr!=null&&o.gpr<0.1)tips.push(['마진',`전체 총이익률 ${pct(o.gpr)}로 판관비(매출의 ${pct(o.a?o.sgaI/o.a:null)})를 감당하기 어려움 → 원가 상승분 단가 반영 또는 고마진 품목 비중 확대`]);
    if(o.streak>=2)tips.push(['추세',`${o.streak}개월 연속 적자`]);
    if(!tips.length)tips.push(['—',o.op<0?'품목별로 뚜렷한 적자 원인이 없습니다. 소액 적자 품목을 아래 표에서 확인하세요.':'흑자 거래처입니다. 저마진 품목만 아래 표에서 확인하세요.']);
    p2.append(el('div',{class:'tips'},el('b',{text:'개선 포인트'}),el('ul',{},...tips.map(([k,t])=>el('li',{},el('span',{class:'tk',text:k}),t)))));
    const d2=el('div');p2.append(d2);
    table(d2,{id:'pc2',rows,maxH:420,sort:{k:'opI',d:1},onRow:r=>{S.pi=r.code;K.render(true);setTimeout(()=>document.getElementById('p3')?.scrollIntoView({block:'start',behavior:'smooth'}),80)},rowCls:r=>r.code===S.pi?'on':'',
      cols:[{k:'name',l:'품목',cls:'name',title:r=>r.name},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'매출',n:1,f:r=>amt(r.a)},{k:'price',l:'판매단가',n:1,f:r=>wonU(r.price)},{k:'ucost',l:'원가단가',n:1,f:r=>wonU(r.ucost)},
        {k:'gpr',l:'총이익률',n:1,f:r=>gprCell(r.gpr)},{k:'opI',l:'품목 영업이익',n:1,f:r=>opCell(r.opI),title:r=>won(r.opI)},{k:'be',l:'손익분기 단가',n:1,f:r=>wonU(r.be),tip:'(원가+판관비) ÷ 수량'},
        {k:'need',l:'필요 인상률',n:1,f:r=>r.need!=null?el('span',{class:'loss',text:'+'+(r.need*100).toFixed(1)+'%'}):'—'},{k:'oth',l:'타 거래처 평균단가',n:1,f:r=>r.oth?el('span',{},wonU(r.oth),r.vs!=null?el('span',{class:r.vs<-0.03?'loss':'flat',text:` (${r.vs>=0?'+':''}${(r.vs*100).toFixed(0)}%)`}):null):'—',tip:'같은 기간 다른 거래처 평균 판매단가 (괄호: 이 거래처 단가 차이)'}]});
    p2.append(el('div',{class:'foot',style:'padding:8px 16px 12px',text:'※ 품목 영업이익 = 매출 − 원가 − 품목 판관비(거래처 직접 비용 제외). 행을 클릭하면 ③ 그 품목의 거래처별 단가·손익을 봅니다.'}));
    M.append(p2);
  }
  // ③ 적자 품목 / 선택 품목
  const p3=el('section',{class:'panel',id:'p3'});
  if(S.pi&&IT.get(S.pi)){const x=IT.get(S.pi);const rs=[...CI.values()].filter(r=>r.code===S.pi&&keep.has(r.c)).map(r=>Object.assign({},r,custInfo(r.c)));
    const be=x.q>0?(x.cogs+x.sga)/x.q:null;
    p3.append(el('h2',{},`③ ${x.name} — ${custLab}별 단가·손익`,el('span',{class:'sub',text:`${plab} · 손익분기 단가 ${wonU(be)} · 평균 판매단가 ${wonU(x.q>0?x.a/x.q:null)}`}),el('span',{class:'right'},itemId&&itemId(S.pi)!=null?el('button',{class:'chip',text:'품목 상세',onclick:()=>onItem(itemId(S.pi))}):null,el('button',{class:'chip',text:'적자 품목 목록',onclick:()=>{S.pi=null;K.render(true)}}))));
    const d3=el('div');p3.append(d3);
    table(d3,{id:'pc3',rows:rs,maxH:420,sort:{k:'opI',d:1},onRow:r=>{S.pc=r.c;K.render(true);setTimeout(()=>document.getElementById('p2')?.scrollIntoView({block:'start',behavior:'smooth'}),80)},
      cols:[{k:'c',l:custLab,cls:'name',title:r=>r.c},...(rs.some(r=>r.rep)?[{k:'rep',l:'담당'}]:[]),{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'매출',n:1,f:r=>amt(r.a)},{k:'price',l:'판매단가',n:1,f:r=>wonU(r.price)},
        {k:'gpr',l:'총이익률',n:1,f:r=>gprCell(r.gpr)},{k:'opI',l:'품목 영업이익',n:1,f:r=>opCell(r.opI)},{k:'need',l:'필요 인상률',n:1,f:r=>r.need!=null?el('span',{class:'loss',text:'+'+(r.need*100).toFixed(1)+'%'}):'—'}]});
  }else{
    p3.append(el('h2',{},'③ 적자 품목',el('span',{class:'sub',text:`${plab} · 품목 영업이익 기준 · 행을 클릭하면 거래처별 단가·손익`})));
    const d3=el('div');p3.append(d3);
    table(d3,{id:'pc4',rows:[...IT.values()].filter(x=>S.pif==='all'?true:x.opI<0),maxH:440,sort:{k:'opI',d:1},onRow:r=>{S.pi=r.code;K.render(true);setTimeout(()=>document.getElementById('p3')?.scrollIntoView({block:'start',behavior:'smooth'}),80)},empty:'적자 품목이 없습니다.',
      cols:[{k:'name',l:'품목',cls:'name',title:r=>r.name},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'매출',n:1,f:r=>amt(r.a)},{k:'gpr',l:'총이익률',n:1,f:r=>gprCell(r.gpr)},{k:'opI',l:'품목 영업이익',n:1,f:r=>opCell(r.opI)},
        {k:'nc',l:`구매 ${custLab}`,n:1,f:r=>r.nc+'곳'},{k:'negc',l:`적자 ${custLab}`,n:1,f:r=>r.negc?el('span',{class:'loss',text:r.negc+'곳'}):'—'}]});
    p3.prepend();p3.insertBefore(el('div',{class:'tools'},...[['neg',`적자 ${negI.length}`],['all',`전체 ${IT.size}`]].map(([k,l])=>el('button',{class:'chip'+((S.pif||'neg')===k?' on':''),text:l,onclick:()=>{S.pif=k;K.render(true)}}))),d3);
  }
  M.append(p3);
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
