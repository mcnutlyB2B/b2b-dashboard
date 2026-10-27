// B2B 채널 대시보드 (애터미 제외)
(function(){
const {D,R,MAX,MIN,BY,BM,S,pad,addD,days,eom,perName,yoyOf,won,amt,nf,delta,el,sum,groupBy,inR,dCell,shareCell,md,cadence,table,panel}=K;
Object.assign(S,{type:'',rep:'',custSt:'',cq:'',iq:'',cat:'',basis:'cur',dmode:'cat',act:''});
const catOf=r=>D.items[r.i][4]||'기타';
// 유형 버튼: 최근 12개월 매출 큰 순
const TYPES=[...groupBy(R,'t').values()].map(o=>({k:o.k,a:sum(o.rows.filter(r=>r.d>addD(MAX,-365)))})).sort((a,b)=>b.a-a.a).map(o=>o.k);
// 상단 담당 버튼은 재직자만 (나머지 화면은 실제 이름 그대로)
const REPS=K.STAFF.filter(p=>R.some(r=>r.cp===p)).sort((a,b)=>sum(R.filter(r=>r.cp===b&&r.y===BY))-sum(R.filter(r=>r.cp===a&&r.y===BY)));
const PAL=['#2a5db0','#16866b','#c27a12','#8a4fc4','#c8417a','#2b8fa8','#9a8a2e','#6b7a8f','#c4573a','#4a7d3a','#7a5c46','#5b6bd6'];
const TCOL=Object.fromEntries(TYPES.map((t,i)=>[t,PAL[i%PAL.length]]));
const dot=t=>el('span',{style:`display:inline-block;width:8px;height:8px;border-radius:50%;background:${TCOL[t]};flex:none`});
const F=(rows,o={})=>rows.filter(r=>(o.noType||!S.type||r.t===S.type)&&(o.noRep||!S.rep||r.cp===S.rep)&&(o.noCat||!S.cat||catOf(r)===S.cat));
const firstPos={};R.forEach(r=>{if(r.a>0&&(!firstPos[r.c]||r.d<firstPos[r.c]))firstPos[r.c]=r.d});
const newOK=()=>S.f>=addD(MIN,365);

function controls(ctl){
  const tr=el('div',{class:'row'},el('span',{class:'lab',text:'유형'}));
  ['',...TYPES].forEach(t=>tr.append(el('button',{class:'chip'+(S.type===t?' on':''),onclick:()=>{S.type=t;K.render()}},t?dot(t):null,t?' '+t:'전체')));
  const rr=el('div',{class:'row'},el('span',{class:'lab',text:'담당'}));
  ['',...REPS].forEach(p=>rr.append(el('button',{class:'chip'+(S.rep===p?' on':''),text:p||'전체',title:p?'지금 이 담당자가 맡은 거래처 기준':null,onclick:()=>{S.rep=p;K.render()}})));
  if(S.cat)rr.append(el('button',{class:'chip x',text:`품목 분류: ${S.cat} ✕`,onclick:()=>{S.cat='';K.render(true)}}));
  ctl.append(tr,rr);
}

// 거래처 집계 (현재 필터)
function custRows(){
  const y=yoyOf(S.f,S.t);const rows=F(R);const by=groupBy(rows,'c');const out=[];
  by.forEach((o,c)=>{const rs=o.rows;
    const cur=sum(inR(rs,S.f,S.t)),prev=y?sum(inR(rs,y.f,y.t)):null,ly=sum(rs.filter(r=>r.y===BY-1)),ytd=sum(rs.filter(r=>r.y===BY));
    const cad=cadence(R.filter(r=>r.c===c));
    let st;
    if(cur>0&&newOK()&&firstPos[c]>=S.f)st='신규';
    else if(cur>0)st=!prev||prev<=0?(y?'신규':'거래'):cur>prev*1.1?'성장':cur<prev*0.9?'감소':'유지';
    else st=prev>0?'이탈':'미거래';
    if(st==='신규'&&!(firstPos[c]>=S.f))st='재거래';
    out.push({id:c,name:D.custs[c],type:D.types[D.custType[c]],rep:K.curRep(c),cur,prev,ly,ytd,ch:prev?(cur-prev)/Math.abs(prev):null,
      n:cad.n,gap:cad.gap,last:cad.last,since:cad.since,next:cad.next,late:cad.late&&cad.since<=365,st})});
  return out;
}
const STC={'신규':'st-new','재거래':'st-new','성장':'st-up','유지':'st-keep','거래':'st-keep','감소':'st-down','이탈':'st-risk','미거래':'st-dorm'};
const pill=(s,c)=>el('span',{class:'pill '+(c||STC[s]),text:s});

// ══ 매출 현황
function tabSales(M){
  const y=yoyOf(S.f,S.t);
  const dr0=F(R,{noCat:true});
  K.progress(M,F(R),{note:S.type||S.rep||S.cat?`필터: ${[S.type,S.rep,S.cat].filter(Boolean).join(' · ')}.`:'',
    donut:{mode:S.dmode,setMode:k=>{S.dmode=k;K.render(true)},modes:[
      {k:'cat',l:'품목 분류',rows:inR(dr0,S.f,S.t),prevRows:y?inR(dr0,y.f,y.t):null,key:catOf,name:k=>k,sel:S.cat,onPick:k=>{S.cat=S.cat===k?'':k;K.render(true)},hint:'※ 항목을 클릭하면 해당 분류만 조회되며, 한 번 더 클릭하면 전체 보기로 돌아갑니다. 우측 증감률은 전년 동기 대비입니다.'},
      {k:'item',l:'상위 품목',rows:inR(dr0,S.f,S.t),prevRows:y?inR(dr0,y.f,y.t):null,key:'i',name:k=>D.items[k][1],onPick:k=>itemDrawer(k),hint:'※ 항목을 클릭하면 품목 상세 정보가 열립니다. 우측 증감률은 전년 동기 대비입니다.'}]}});
  // 유형세부 카드 (유형 필터 무관, 담당 필터 반영)
  const base=F(R,{noType:true}),cur=inR(base,S.f,S.t),prev=y?inR(base,y.f,y.t):null,tot=sum(cur);
  const g=el('div',{class:'grid5'});
  const card=(lab,t,a,pa,big)=>{const dx=delta(a,pa);return el('button',{class:'card'+(big?' big':'')+((t&&S.type===t)||(big&&!S.type)?' sel':''),title:big?'클릭 시 유형 필터 해제':won(a),onclick:t?()=>{S.type=S.type===t?'':t;K.render(true)}:()=>{S.type='';K.render(true)}},
    el('div',{class:'k'},t?dot(t):null,lab),el('div',{class:'v',text:amt(a)}),
    el('div',{class:'d'},el('span',{class:dx.c,text:y?dx.t:''}),el('span',{class:'flat',text:y?`전년 ${amt(pa)}`:''})),
    el('div',{class:'bar'},el('i',{style:`width:${tot?Math.max(0,Math.min(100,a/tot*100)):0}%;background:${t?TCOL[t]:'var(--accent)'}`})))};
  g.append(card('B2B 합계',null,tot,prev?sum(prev):null,true));
  const tm=groupBy(cur,'t'),pm=prev?groupBy(prev,'t'):new Map();
  TYPES.filter(t=>tm.has(t)||pm.has(t)).sort((a,b)=>(tm.get(b)?.a||0)-(tm.get(a)?.a||0)).forEach(t=>g.append(card(t,t,tm.get(t)?.a||0,y?(pm.get(t)?.a||0):null)));
  M.append(g);
  K.top10(M,F(R),{title:'상위 10대 거래처 집중 관리',key:'c',name:k=>D.custs[k],sub:k=>K.curRep(k),onRow:k=>custDrawer(k)});
  // 월별
  const mp=panel('월별 매출',`${S.type||'B2B 전체'}${S.rep?' · '+S.rep:''} · ※ 막대를 클릭하면 해당 월로 조회 기간이 변경됩니다`);
  mp.append(K.legend([['var(--accent)',`${+S.t.slice(0,4)}년`],['var(--ghost)',`${+S.t.slice(0,4)-1}년`]]));
  const mc=el('div',{class:'pb'});mp.append(mc);M.append(mp);
  requestAnimationFrame(()=>K.monthly(mc,F(R)));
  // 거래처 / 품목 순위
  const fr=inR(F(R),S.f,S.t),fp=y?inR(F(R),y.f,y.t):null,ft=sum(fr);
  const g2=el('div',{class:'grid2'});
  const cm=groupBy(fr,'c'),cpm=fp?groupBy(fp,'c'):null;
  const cp=panel('거래처 순위',perName(S.f,S.t));const cd=el('div');cp.append(cd);
  table(cd,{id:'topc',maxH:420,sort:{k:'a',d:-1},rows:[...cm.values()].map(o=>({id:o.k,name:D.custs[o.k],a:o.a,p:cpm?(cpm.get(o.k)?.a||0):null,rep:K.curRep(o.k)})),onRow:r=>custDrawer(r.id),
    cols:[{l:'#',f:(r,i)=>i+1,cls:'rk'},{k:'name',l:'거래처',cls:'name',title:r=>r.name},{k:'rep',l:'담당'},{k:'a',l:'매출',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'p',l:'전년 동기',n:1,f:r=>r.p==null?'—':amt(r.p)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.a,r.p),nosort:1},{k:'s',l:'비중',n:1,f:r=>shareCell(r.a,ft),nosort:1}]});
  const im=groupBy(fr,'i'),ipm=fp?groupBy(fp,'i'):null;
  const ip=panel('품목 순위',perName(S.f,S.t));const idv=el('div');ip.append(idv);
  table(idv,{id:'topi',maxH:420,sort:{k:'a',d:-1},rows:[...im.values()].map(o=>({id:o.k,name:D.items[o.k][1],a:o.a,q:o.q,p:ipm?(ipm.get(o.k)?.a||0):null})),onRow:r=>itemDrawer(r.id),
    cols:[{l:'#',f:(r,i)=>i+1,cls:'rk'},{k:'name',l:'품목',cls:'name',title:r=>r.name},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'매출',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.a,r.p),nosort:1},{k:'s',l:'비중',n:1,f:r=>shareCell(r.a,ft),nosort:1}]});
  g2.append(cp,ip);M.append(g2);
}

// ══ 영업 액션
function tabAction(M){
  M.append(el('div',{class:'note',text:`기준일 ${MAX.replace(/-/g,'.')} 기준 · 기간 선택과 무관하게 거래처별 발주 주기(최근 1년)로 판단합니다.${S.rep?' 담당: '+S.rep:''}${S.type?' · 유형: '+S.type:''}`}));
  K.actions(M,F(R),{key:'c',name:k=>D.custs[k],sub:k=>K.curRep(k),onRow:k=>custDrawer(k),items:{label:'주요 구매 품목',fn:rs=>K.topItems(rs,k=>D.items[k][1])}});
}

// ══ 거래처 관리
function tabCust(M){
  K.lost(M,F(R),{key:'c',name:k=>D.custs[k],sub:k=>K.curRep(k),onRow:k=>custDrawer(k),firstOf:k=>firstPos[k]||'9999'});
  const y=yoyOf(S.f,S.t);const rows=custRows();
  const cnt={};rows.forEach(o=>{cnt[o.st]=(cnt[o.st]||0)+1});const nLate=rows.filter(o=>o.late).length;
  const nCur=rows.filter(o=>o.cur>0).length,nPrev=y?rows.filter(o=>o.prev>0).length:null;
  const lost=rows.filter(o=>o.st==='이탈'),lostAmt=lost.reduce((s,o)=>s+o.prev,0);
  const neu=rows.filter(o=>o.st==='신규'),neuAmt=neu.reduce((s,o)=>s+o.cur,0);
  const g=el('div',{class:'grid4'});
  const mini=(k,v,d,st)=>el('button',{class:'card mini'+(S.custSt===st&&st?' sel':''),onclick:()=>{setSt(S.custSt===st?'':st)}},el('div',{class:'k',text:k}),el('div',{class:'v',text:v}),el('div',{class:'d'},d));
  g.append(mini('거래 실적 거래처',nf(nCur)+'곳',y?[dCell(nCur,nPrev),el('span',{class:'flat',text:`전년 동기 ${nPrev}곳`})]:'',''),
    mini('신규 거래처',nf(neu.length)+'곳',el('span',{class:'flat',text:newOK()?`매출 ${amt(neuAmt)} · 금년 첫 거래`:'판단에 1년치 이전 자료 필요'}),'신규'),
    mini('이탈 거래처',nf(lost.length)+'곳',el('span',{class:'down',text:y?`전년 동기 매출 ${amt(lostAmt)}`:'비교 기간 없음'}),'이탈'),
    mini('주문 지연',nf(nLate)+'곳',el('span',{class:'flat',text:'평균 주문 간격의 1.5배 넘게 주문 없음'}),'지연'));
  M.append(g);
  const p=panel('거래처 관리',`${perName(S.f,S.t)}${y?' vs 전년 동기':''} · ${rows.length}곳`);
  const chips=el('div',{class:'tools'});
  [['','전체',rows.length],...['신규','재거래','성장','유지','감소','이탈','미거래'].filter(s=>cnt[s]).map(s=>[s,s,cnt[s]]),['지연','주문 지연',nLate]].forEach(([k,l,n])=>
    chips.append(el('button',{class:'chip'+(S.custSt===k?' on':''),onclick:()=>setSt(S.custSt===k?'':k)},`${l} ${n}`)));
  p.append(chips);
  p.append(el('div',{class:'note',style:'padding:6px 16px 0',text:'성장·감소: 전년 동기 대비 ±10% · 이탈: 전년 동기엔 거래, 이번 기간엔 없음 · 재거래: 전년 동기엔 없었지만 예전 거래 있음 · 주문 지연: 최근 1년 3회 이상 주문한 거래처 중 평균 간격의 1.5배(최소 +10일) 넘게 주문 없음 · 담당은 현재 담당'}));
  const tools=el('div',{class:'tools'});const q=el('input',{id:'cq',type:'search',placeholder:'거래처 검색',value:S.cq});tools.append(q);p.append(tools);
  const td=el('div');p.append(td);
  const draw=()=>{td.innerHTML='';const k=S.cq.toLowerCase();
    const rs=rows.filter(o=>(!S.custSt||(S.custSt==='지연'?o.late:o.st===S.custSt))&&(!k||o.name.toLowerCase().includes(k)));
    table(td,{id:'cust',rows:rs,maxH:600,onRow:r=>custDrawer(r.id),redraw:draw,
      cols:[{l:'#',f:(r,i)=>i+1,cls:'rk'},{k:'name',l:'거래처',cls:'name',title:r=>r.name},{k:'type',l:'유형'},{k:'rep',l:'담당'},
        {k:'cur',l:'기간 매출',n:1,f:r=>amt(r.cur),title:r=>won(r.cur)},{k:'prev',l:'전년 동기',n:1,f:r=>r.prev==null?'—':amt(r.prev)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.cur,r.prev)},
        {k:'ly',l:`${BY-1}년`,n:1,f:r=>r.ly?amt(r.ly):'—'},{k:'ytd',l:`${BY}년 누계`,n:1,f:r=>r.ytd?amt(r.ytd):'—'},
        {k:'n',l:'주문(1년)',n:1,f:r=>r.n?r.n+'회':'—',tip:'최근 1년 주문한 날 수'},{k:'gap',l:'평균 간격',n:1,f:r=>r.gap?r.gap+'일':'—'},
        {k:'since',l:'최종 주문일',n:1,f:r=>r.last?el('span',{class:r.late?'st-late':'',text:`${r.last.slice(2).replace(/-/g,'.')} (${r.since}일 전)`}):'—'},
        {k:'next',l:'차기 발주 예상일',n:1,f:r=>r.next?el('span',{class:r.late?'st-late':'',text:md(r.next)+(r.late?' 지남':'')}):'—'},
        {k:'st',l:'상태',f:r=>el('span',{},pill(r.st),r.late?[' ',pill('지연','st-late')]:null)}]})};
  q.oninput=()=>{S.cq=q.value;draw()};draw();M.append(p);
}
function setSt(st){S.custSt=st;const sk={'이탈':'prev','미거래':'ly','지연':'ly'}[st]||'cur';S.q.cust={k:sk,d:-1};K.render(true)}

// ══ 담당자
function tabRep(M){
  const y=yoyOf(S.f,S.t);const key=S.basis==='cur'?'cp':'p';
  const base=F(R,{noRep:true}),cur=inR(base,S.f,S.t),prev=y?inR(base,y.f,y.t):null,tot=sum(cur);
  const seg=el('div',{class:'seg'},...[['cur','현재 담당 기준'],['act','실적 담당 기준']].map(([k,l])=>el('button',{class:S.basis===k?'on':'',text:l,onclick:()=>{S.basis=k;K.render(true)}})));
  M.append(el('div',{class:'row'},seg,el('span',{class:'note',text:S.basis==='cur'?'거래처를 지금 담당자(마지막 거래 담당)에게 모아 전년과 비교합니다. 담당 이관 영향이 빠집니다.':'전표에 찍힌 담당자 그대로 집계합니다.'})));
  const reps=[...new Set([...cur,...(prev||[])].map(r=>r[key]))];
  const custs=custRows();
  const data=reps.map(p=>{const rs=cur.filter(r=>r[key]===p);return{p,a:sum(rs),pa:prev?sum(prev.filter(r=>r[key]===p)):null,nc:new Set(rs.filter(r=>r.a>0).map(r=>r.c)).size,late:S.basis==='cur'?custs.filter(o=>o.rep===p&&o.late).length:null}}).sort((a,b)=>b.a-a.a);
  const g=el('div',{class:'grid4'});
  data.forEach(o=>{const dx=delta(o.a,o.pa);g.append(el('button',{class:'card'+(S.rep===o.p?' sel':''),onclick:()=>repDrawer(o.p),title:won(o.a)},
    el('div',{class:'k',text:o.p}),el('div',{class:'v',text:amt(o.a)}),el('div',{class:'d'},el('span',{class:dx.c,text:y?dx.t:''}),el('span',{class:'flat',text:y?`전년 ${amt(o.pa)}`:''})),
    el('div',{class:'d'},el('span',{class:'flat',text:`거래처 ${o.nc}곳`}),o.late?el('span',{class:'st-late',text:`· 주문 지연 ${o.late}곳`}):null),
    el('div',{class:'bar'},el('i',{style:`width:${tot?Math.max(0,o.a/tot*100):0}%`}))))});
  M.append(g);
  // 월별 실적표
  const Y=+S.t.slice(0,4);const months=[];for(let m=1;m<=12;m++){if(`${Y}-${pad(m)}`<=MAX.slice(0,7))months.push(m)}
  const yr=base.filter(r=>r.y===Y),pyr=base.filter(r=>r.y===Y-1);
  const lastM=months[months.length-1];const pcut=Y===BY?K.shiftY(MAX):`${Y-1}-12-31`;
  const p2=panel('월별 실적표',`${Y}년 · 누계는 전년 같은 날짜까지와 비교 · ※ 월 제목을 클릭하면 해당 월로 조회 기간이 변경됩니다`);const d2=el('div');p2.append(d2);
  const mrow=data.map(o=>{const x={p:o.p};months.forEach(m=>x['m'+m]=sum(yr.filter(r=>r[key]===o.p&&r.m===m)));x.s=sum(yr.filter(r=>r[key]===o.p));x.ps=sum(pyr.filter(r=>r[key]===o.p&&r.d<=pcut));return x});
  table(d2,{id:'rmon',rows:mrow,onRow:r=>repDrawer(r.p),maxH:460,sort:{k:'s',d:-1},
    sumRow:Object.assign({p:'합계',s:amt(sum(yr)),ps:amt(sum(pyr.filter(r=>r.d<=pcut))),ch:dCell(sum(yr),sum(pyr.filter(r=>r.d<=pcut)))},Object.fromEntries(months.map(m=>['m'+m,amt(sum(yr.filter(r=>r.m===m)))]))),
    cols:[{k:'p',l:'담당자',cls:'name'},...months.map(m=>({k:'m'+m,l:m+'월',n:1,f:r=>r['m'+m]?amt(r['m'+m]):el('span',{class:'flat',text:'·'})})),{k:'s',l:'누계',n:1,f:r=>amt(r.s)},{k:'ps',l:'전년 누계',n:1,f:r=>amt(r.ps)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.s,r.ps),nosort:1}]});
  const ths=d2.querySelectorAll('th');months.forEach((m,i)=>{const th=ths[i+1];if(!th)return;th.onclick=()=>K.setPer(`${Y}-${pad(m)}-01`,eom(Y,m));th.title='이 달로 기간 변경'});
  M.append(p2);
  // 담당자 × 유형
  const types=[...groupBy(cur,'t').values()].sort((a,b)=>b.a-a.a).map(o=>o.k);
  const p=panel('담당자 × 유형',perName(S.f,S.t));const d1=el('div');p.append(d1);
  table(d1,{id:'rxt',rows:data.map(o=>{const x={p:o.p,a:o.a};types.forEach(t=>x[t]=sum(cur.filter(r=>r[key]===o.p&&r.t===t)));return x}),onRow:r=>repDrawer(r.p),maxH:420,
    sumRow:Object.assign({p:'합계',a:amt(tot)},Object.fromEntries(types.map(t=>[t,amt(sum(cur.filter(r=>r.t===t)))]))),
    cols:[{k:'p',l:'담당자',cls:'name'},{k:'a',l:'합계',n:1,f:r=>amt(r.a)},...types.map(t=>({k:t,l:t,n:1,f:r=>r[t]?amt(r[t]):el('span',{class:'flat',text:'·'})}))]});
  M.append(p);
}

// ══ 품목
function tabItem(M){
  const y=yoyOf(S.f,S.t);const cur=inR(F(R,{noCat:true}),S.f,S.t),prev=y?inR(F(R,{noCat:true}),y.f,y.t):null;
  const cat=catOf;const cm=groupBy(cur,cat),pcm=prev?groupBy(prev,cat):new Map(),tot=sum(cur);
  const p=panel('품목 중분류',`${perName(S.f,S.t)} · 세로선은 전년 동기 · ※ 항목을 클릭하면 해당 분류만 조회되며, 한 번 더 클릭하면 전체 보기로 돌아갑니다`);
  const hb=el('div',{class:'hbar pb'});const ks=[...new Set([...cm.keys(),...pcm.keys()])];const mx=Math.max(1,...ks.map(k=>Math.max(cm.get(k)?.a||0,pcm.get(k)?.a||0)));
  ks.sort((a,b)=>(cm.get(b)?.a||0)-(cm.get(a)?.a||0)).forEach(k=>{const a=cm.get(k)?.a||0,pa=y?(pcm.get(k)?.a||0):null;const dx=delta(a,pa);
    hb.append(el('div',{class:'hr'+(S.cat===k?' on':''),onclick:()=>{S.cat=S.cat===k?'':k;K.render(true)},title:`${won(a)}${pa!=null?' / 전년 '+won(pa):''}`},el('span',{class:'nm',text:k}),
      el('span',{class:'tr'},el('i',{style:`width:${Math.max(0,a/mx*100)}%`}),pa!=null&&pa>0?el('s',{style:`left:${Math.min(99.5,pa/mx*100)}%`}):null),
      el('span',{class:'vv'},amt(a)+' ',el('span',{class:dx.c,text:y?dx.t:''}))))});
  p.append(hb);M.append(p);
  const im=groupBy(cur.filter(r=>!S.cat||cat(r)===S.cat),'i'),ipm=prev?groupBy(prev,'i'):null;
  const unit=rs=>{const pos=rs.filter(r=>r.a>0&&r.q>0),q=sum(pos,'q');return q?sum(pos)/q:null};
  const rows=[...im.values()].map(o=>{const it=D.items[o.k];const pr=ipm?.get(o.k);const u=unit(o.rows),pu=pr?unit(pr.rows):null;
    return{id:o.k,code:it[0],name:it[1],spec:it[2],c2:it[5],q:o.q,a:o.a,p:ipm?(pr?.a||0):null,u,pu,uc:u&&pu?(u-pu)/pu:null,nc:new Set(o.rows.filter(r=>r.a>0).map(r=>r.c)).size}});
  const p2=panel('전체 품목',`${rows.length}개${S.cat?' · '+S.cat:''}`);
  const tools=el('div',{class:'tools'});const q=el('input',{id:'iq',type:'search',placeholder:'품명·품번 검색',value:S.iq});tools.append(q);p2.append(tools);
  const td=el('div');p2.append(td);
  const draw=()=>{td.innerHTML='';const k=S.iq.toLowerCase();
    table(td,{id:'items',rows:rows.filter(r=>!k||r.name.toLowerCase().includes(k)||r.code.includes(k)),maxH:600,onRow:r=>itemDrawer(r.id),redraw:draw,sort:{k:'a',d:-1},
      cols:[{l:'#',f:(r,i)=>i+1,cls:'rk'},{k:'name',l:'품명',cls:'name',title:r=>r.name+' · '+r.code},{k:'spec',l:'규격'},{k:'c2',l:'소분류'},
        {k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'매출',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'p',l:'전년 동기',n:1,f:r=>r.p==null?'—':amt(r.p)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.a,r.p),nosort:1},
        {k:'u',l:'평균 단가',n:1,f:r=>r.u?nf(r.u)+'원':'—'},{k:'uc',l:'단가 변동',n:1,tip:'전년 동기 평균 단가 대비',f:r=>r.uc==null?'—':el('span',{class:Math.abs(r.uc)<0.005?'flat':r.uc>0?'up':'down',text:(r.uc>0?'+':'')+(r.uc*100).toFixed(1)+'%'})},
        {k:'nc',l:'거래처',n:1,f:r=>r.nc+'곳'}]})};
  q.oninput=()=>{S.iq=q.value;draw()};draw();M.append(p2);
}

// ══ 반품·차감
function tabRet(M){
  const y=yoyOf(S.f,S.t);const cur=inR(F(R),S.f,S.t),neg=cur.filter(r=>r.a<0),gross=sum(cur.filter(r=>r.a>0)),n=sum(neg);
  const pn=y?sum(inR(F(R),y.f,y.t).filter(r=>r.a<0)):null;
  const g=el('div',{class:'grid4'});
  const mini=(k,v,x)=>el('div',{class:'card mini static'},el('div',{class:'k',text:k}),el('div',{class:'v',text:v}),el('div',{class:'d'},el('span',{class:'flat',text:x||''})));
  g.append(mini('반품·차감 금액',amt(n),pn!=null?`전년 동기 ${amt(pn)}`:''),mini('총매출 대비',gross?(Math.abs(n)/gross*100).toFixed(2)+'%':'—','총매출 '+amt(gross)),mini('건수',nf(neg.length)+'건','품목 행 기준'),mini('관련 거래처',nf(new Set(neg.map(r=>r.c)).size)+'곳'));
  M.append(g);
  const all=F(R).filter(r=>r.a<0);const Y=+S.t.slice(0,4);
  const list=[];for(let m=1;m<=12;m++){const k=`${Y}-${pad(m)}`;list.push({key:k,label:m+'월',tipT:`${m}월 반품·차감`,cur:k<=MAX.slice(0,7)?-sum(all.filter(r=>r.ym===k)):null,prev:`${Y-1}-${pad(m)}`>=MIN.slice(0,7)?-sum(all.filter(r=>r.ym===`${Y-1}-${pad(m)}`)):null})}
  const p=panel('월별 반품·차감',`${Y}년 vs ${Y-1}년 · ※ 막대를 클릭하면 해당 월로 조회 기간이 변경됩니다`);const ch=el('div',{class:'pb'});p.append(ch);M.append(p);
  requestAnimationFrame(()=>K.bars(ch,list,{h:180,color:'var(--down)',curName:`${Y}년`,prevName:`${Y-1}년`,onClick:b=>{if(b.cur==null)return;const[yy,m]=b.key.split('-').map(Number);K.setPer(b.key+'-01',eom(yy,m))}}));
  const g2=el('div',{class:'grid2'});
  const cp=panel('거래처별');const cd=el('div');cp.append(cd);
  table(cd,{id:'retc',rows:[...groupBy(neg,'c').values()].map(o=>({id:o.k,name:D.custs[o.k],a:o.a,n:o.n,rep:K.curRep(o.k)})),sort:{k:'a',d:1},onRow:r=>custDrawer(r.id),maxH:420,
    cols:[{k:'name',l:'거래처',cls:'name'},{k:'rep',l:'담당'},{k:'a',l:'금액',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'n',l:'건수',n:1}]});
  const lp=panel('상세 내역');const ld=el('div');lp.append(ld);
  table(ld,{id:'retl',rows:neg.map(r=>({d:r.d,c:r.c,name:D.custs[r.c],item:D.items[r.i][1],q:r.q,a:r.a})),sort:{k:'d',d:-1},onRow:r=>custDrawer(r.c),maxH:420,
    cols:[{k:'d',l:'일자',f:r=>md(r.d)},{k:'name',l:'거래처',cls:'name',title:r=>r.name},{k:'item',l:'품목',cls:'name',title:r=>r.item},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'금액',n:1,f:r=>amt(r.a),title:r=>won(r.a)}]});
  g2.append(cp,lp);M.append(g2);
}

// ── 서랍
const brk=(rows,prevRows,key,lab,name,onRow)=>{const m=groupBy(rows,key),pm=prevRows?groupBy(prevRows,key):null,tt=sum(rows);
  const keys=new Set([...m.keys(),...(pm?[...pm.keys()]:[])]);
  return{rows:[...keys].map(k=>({id:k,name:name(k),a:m.get(k)?.a||0,q:m.get(k)?.q||0,p:pm?(pm.get(k)?.a||0):null})).filter(r=>r.a||r.p),
    cols:[{k:'name',l:lab,cls:'name',title:r=>r.name},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'매출',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'p',l:'전년 동기',n:1,f:r=>r.p==null?'—':amt(r.p)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.a,r.p),nosort:1},{k:'s',l:'비중',n:1,f:r=>shareCell(r.a,tt),nosort:1}],onRow}};
function docList(rows,nameOf){const dm=groupBy(rows,'doc');return [...dm.values()].map(o=>({d:o.rows[0].d,name:nameOf(o.rows[0]),a:o.a,items:o.rows.map(r=>D.items[r.i][1]).slice(0,3).join(', ')+(o.rows.length>3?` 외 ${o.rows.length-3}`:'')}))}
function common(dr,all,id,kindRows){
  const y=yoyOf(S.f,S.t);const cur=inR(all,S.f,S.t),prev=y?inR(all,y.f,y.t):null;
  const a=sum(cur),pa=prev?sum(prev):null,dx=delta(a,pa);const cad=cadence(all);
  dr.append(K.stats([[perName(S.f,S.t),amt(a),'',won(a)],['전년 동기 대비',y?dx.t:'—',dx.c],[`${BY}년 누계`,amt(sum(all.filter(r=>r.y===BY)))],[`${BY-1}년 전체`,amt(sum(all.filter(r=>r.y===BY-1)))],
    ['최종 주문일',cad.last?`${md(cad.last)} (${cad.since}일 전)`:'—',cad.late?'st-late':''],['주문 간격 · 차기 발주 예상일',cad.gap?`${cad.gap}일 · ${md(cad.next)}`:'—',cad.late?'st-late':'']]));
  const mp=panel('월별 매출',`${BY}년 vs ${BY-1}년`);mp.append(K.legend([['var(--accent)',`${BY}년`],['var(--ghost)',`${BY-1}년`]]));const mc=el('div',{class:'pb'});mp.append(mc);dr.append(mp);K.monthly2(mc,all);
  return{cur,prev};
}
function custDrawer(id,sel){const all=R.filter(r=>r.c===id);
  K.drawer(D.custs[id],`${D.types[D.custType[id]]} · 현재 담당 ${K.curRep(id)}`,dr=>{const{cur,prev}=common(dr,all,id);const pl=K.profitLine(D.custs[id]);if(pl)dr.append(pl);
    const x=brk(cur,prev,'i','품목',k=>D.items[k][1],r=>custDrawer(id,sel===r.id?null:r.id));dr.append(K.section(`품목별 (${perName(S.f,S.t)}) · ※ 품목을 클릭하면 이 거래처의 월별 매출이 보입니다`,true,b=>table(b,{id:'dci',...x,maxH:320,sort:{k:'a',d:-1},rowCls:r=>r.id===sel?'on':'',redraw:()=>custDrawer(id,sel)})));
    if(sel!=null)dr.append(K.selItem(all.filter(r=>r.i===sel),`${D.custs[id]} · ${D.items[sel][1]}`,()=>custDrawer(id),()=>itemDrawer(sel)));
    const sx=brk(cur,prev,'s','사업장',k=>D.subs[k]);if(sx.rows.length>1)dr.append(K.section('사업장별',false,b=>table(b,{id:'dcs',...sx,maxH:320,sort:{k:'a',d:-1},redraw:()=>custDrawer(id)})));
    const docs=docList(all.filter(r=>r.d>=addD(MAX,-364)),r=>D.subs[r.s]);
    dr.append(K.section(`최근 1년 출고 전표 ${docs.length}건`,false,b=>table(b,{id:'dcd',rows:docs,maxH:340,sort:{k:'d',d:-1},redraw:()=>custDrawer(id),cols:[{k:'d',l:'일자',f:r=>r.d.slice(2).replace(/-/g,'.')},{k:'name',l:'사업장',cls:'name',title:r=>r.name},{k:'items',l:'품목',cls:'name',title:r=>r.items},{k:'a',l:'금액',n:1,f:r=>amt(r.a),title:r=>won(r.a)}]})));
  })}
function itemDrawer(id){const it=D.items[id];const all=F(R,{noType:true,noRep:true}).filter(r=>r.i===id);
  K.drawer(it[1],`${it[0]} · ${it[2]} · ${it[4]}/${it[5]}`,dr=>{const{cur,prev}=common(dr,all,id);
    const x=brk(cur,prev,'c','거래처',k=>D.custs[k],r=>custDrawer(r.id));dr.append(K.section(`거래처별 (${perName(S.f,S.t)})`,true,b=>table(b,{id:'dic',...x,maxH:360,sort:{k:'a',d:-1},redraw:()=>itemDrawer(id)})));
  })}
function repDrawer(p){const key=S.basis==='cur'?'cp':'p';const all=F(R,{noRep:true}).filter(r=>r[key]===p);
  K.drawer(p,S.basis==='cur'?'현재 담당 거래처 기준':'전표 담당자 기준',dr=>{const{cur,prev}=common(dr,all,p);
    const x=brk(cur,prev,'c','거래처',k=>D.custs[k],r=>custDrawer(r.id));dr.append(K.section(`거래처별 (${perName(S.f,S.t)})`,true,b=>table(b,{id:'drc',...x,maxH:380,sort:{k:'a',d:-1},redraw:()=>repDrawer(p)})));
    const tx=brk(cur,prev,'t','유형',k=>k);dr.append(K.section('유형별',false,b=>table(b,{id:'drt',...tx,maxH:320,sort:{k:'a',d:-1},redraw:()=>repDrawer(p)})));
  })}

// ══ 수익성 (비밀번호)
const CIDX=Object.fromEntries(D.custs.map((c,i)=>[c,i])),IIDX=Object.fromEntries(D.items.map((it,i)=>[it[0],i]));
function tabProfit(M){K.profitTab(M,{custFilter:n=>{const id=CIDX[n];if(id==null)return !S.rep&&!S.type;return (!S.rep||K.curRep(id)===S.rep)&&(!S.type||D.types[D.custType[id]]===S.type)},
  custInfo:n=>{const id=CIDX[n];return id==null?{id:null,rep:''}:{id,rep:K.curRep(id)}},onCust:id=>custDrawer(id),itemId:c=>IIDX[c],onItem:id=>itemDrawer(id),
  docCount:(n,ms)=>{const id=CIDX[n];if(id==null)return null;const rs=R.filter(r=>r.c===id&&r.a>0&&ms.includes(r.ym));const dm=groupBy(rs,'doc');return dm.size?{n:dm.size,avg:sum(rs)/dm.size}:null}})}

K.start({tabs:[['sales','매출 현황'],['action','영업 액션'],['cust','거래처 관리'],['rep','담당자'],['item','품목'],['ret','반품·차감'],['profit','손익 분석 🔒']],controls,
  draw:(tab,M)=>({sales:tabSales,action:tabAction,cust:tabCust,rep:tabRep,item:tabItem,ret:tabRet,profit:tabProfit})[tab](M)});
})();
