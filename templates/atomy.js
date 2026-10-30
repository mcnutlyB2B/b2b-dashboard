// 애터미 전용 대시보드 (애터미 + 애터미_수출)
(function(){
const {D,R,MAX,MIN,BY,BM,S,pad,addD,days,eom,perName,yoyOf,won,amt,nf,delta,el,sum,groupBy,inR,dCell,shareCell,md,cadence,table,panel}=K;
Object.assign(S,{cust:'',mk:'',ln:'',metric:'a',iq:'',dmode:'ln',act:''});
R.forEach(r=>{const it=D.items[r.i];r.mk=it[7]||'국내';r.ln=it[8]||it[1]});
const CUSTS=D.custs.map((n,i)=>i);
const CC=['var(--accent)','#16866b'];
const F=(rows,o={})=>rows.filter(r=>(o.noCust||S.cust===''||r.c===+S.cust)&&(o.noMk||!S.mk||r.mk===S.mk)&&(o.noLn||!S.ln||r.ln===S.ln));
const unit=rs=>{const pos=rs.filter(r=>r.a>0&&r.q>0),q=sum(pos,'q');return q?sum(pos)/q:null};

function controls(ctl){
  const cr=el('div',{class:'row'},el('span',{class:'lab',text:'거래처'}));
  [['','전체'],...CUSTS.map(i=>[String(i),D.custs[i]])].forEach(([k,l])=>cr.append(el('button',{class:'chip'+(S.cust===k?' on':''),text:l,onclick:()=>{S.cust=k;K.render()}})));
  if(S.mk)cr.append(el('button',{class:'chip x',text:`시장: ${S.mk} ✕`,onclick:()=>{S.mk='';K.render(true)}}));
  if(S.ln)cr.append(el('button',{class:'chip x',text:`제품: ${S.ln} ✕`,onclick:()=>{S.ln='';K.render(true)}}));
  ctl.append(cr);
}

// ══ 매출 현황
let CC0={};
function counts(){const k=[S.cust,!!K.P].join('|');if(CC0.k===k)return CC0;
  const rows=F(R,{noMk:true,noLn:true});const al=K.actionList(rows,'mk');const lc=K.lostCalc(F(R),'i');const by=t=>al.filter(o=>o.st===t).length;
  CC0={k,plan:by('발주 예정'),late:by('주기 초과'),long:by('장기 미발주'),lost:lc?lc.out.length:null,neg:K.profitNeg(PFILT,'item')};return CC0}
function todo(M){const c=counts();
  K.todo(M,[{l:'발주 예정 시장',n:c.plan,u:'개',cls:'ok',tip:'다음 발주 예상일이 7일 이내',go:()=>K.go('action',{act:'발주 예정'})},
    {l:'주기 초과 시장',n:c.late,u:'개',cls:'late',tip:'평균 발주 주기의 1.5배 넘게 주문 없음',go:()=>K.go('action',{act:'주기 초과'})},
    {l:'장기 미발주 시장',n:c.long,u:'개',cls:'warn',tip:'평균 발주 주기의 3배 이상 주문 없음',go:()=>K.go('action',{act:'장기 미발주'})},
    c.lost!=null?{l:'전년 대비 매출 감소 품목',n:c.lost,u:'개',cls:'warn',tip:'금년 판매 중단 또는 전년 동기 50% 미만',go:()=>K.go('action',{act:''},'lostp')}:null,
    c.neg?{l:`적자 품목 (${+c.neg.ym.slice(5)}월)`,n:c.neg.n,u:'개',cls:'warn',tip:'손익 분석 최근 달 기준',go:()=>K.go('profit',{pm:c.neg.ym,pc:null,pi:null})}:null])}
function tabSales(M){
  todo(M);
  const y=yoyOf(S.f,S.t);
  const d0=F(R,{noMk:true,noLn:true});
  K.progress(M,F(R),{note:'애터미는 주문 건별로 크게 들어와 날짜별 편차가 큽니다.'+(S.mk||S.ln?` 필터: ${[S.mk,S.ln].filter(Boolean).join(' · ')}.`:''),
    donut:{mode:S.dmode,setMode:k=>{S.dmode=k;K.render(true)},modes:[
      {k:'ln',l:'제품별',rows:inR(d0,S.f,S.t),prevRows:y?inR(d0,y.f,y.t):null,key:'ln',name:k=>k,sel:S.ln,onPick:k=>{S.ln=S.ln===k?'':k;K.render(true)},hint:'※ 항목을 클릭하면 해당 제품만 조회되며, 한 번 더 클릭하면 전체 보기로 돌아갑니다. 우측 증감률은 전년 동기 대비입니다.'},
      {k:'mk',l:'시장별',rows:inR(d0,S.f,S.t),prevRows:y?inR(d0,y.f,y.t):null,key:'mk',name:k=>k,sel:S.mk,onPick:k=>{S.mk=S.mk===k?'':k;K.render(true)},hint:'※ 항목을 클릭하면 해당 시장만 조회되며, 한 번 더 클릭하면 전체 보기로 돌아갑니다. 우측 증감률은 전년 동기 대비입니다.'}]}});
  const base=F(R,{noCust:true}),cur=inR(base,S.f,S.t),prev=y?inR(base,y.f,y.t):null;
  const g=el('div',{class:'grid5'});
  const card=(lab,v,a,pa,on,click,big,fmt=amt)=>{const dx=delta(a,pa);return el('button',{class:'card'+(big?' big':'')+(on?' sel':'')+(click?'':' static'),onclick:click,title:fmt===amt?won(a):null},
    el('div',{class:'k',text:lab}),el('div',{class:'v',text:v}),el('div',{class:'d'},el('span',{class:dx.c,text:y?dx.t:''}),el('span',{class:'flat',text:y?`전년 ${fmt(pa)}`:''})))};
  g.append(card('애터미 합계',amt(sum(cur)),sum(cur),prev?sum(prev):null,S.cust==='',()=>{S.cust='';K.render(true)},true));
  CUSTS.forEach(i=>{const a=sum(cur.filter(r=>r.c===i)),pa=prev?sum(prev.filter(r=>r.c===i)):null;g.append(card(D.custs[i],amt(a),a,pa,S.cust===String(i),()=>{S.cust=S.cust===String(i)?'':String(i);K.render(true)}))});
  const fc=F(cur),fp=prev?F(prev):null;
  const docs=s=>new Set(s.filter(r=>r.a>0).map(r=>r.doc)).size;
  g.append(card('판매 수량',nf(sum(fc,'q')),sum(fc,'q'),fp?sum(fp,'q'):null,false,null,false,nf),
           card('주문 전표',nf(docs(fc))+'건',docs(fc),fp?docs(fp):null,false,()=>{S.tab='order';K.render()},false,v=>nf(v)+'건'));
  M.append(g);
  // 시장 / 제품 순위
  const fr=inR(F(R,{noMk:true}),S.f,S.t),fpr=y?inR(F(R,{noMk:true}),y.f,y.t):null,ft=sum(fr);
  const rank=(rows,prows,key,tot)=>{const m=groupBy(rows,key),pm=prows?groupBy(prows,key):null;return [...m.values()].map(o=>({k:o.k,a:o.a,q:o.q,p:pm?(pm.get(o.k)?.a||0):null,s:tot}))};
  const rcols=lab=>[{l:'#',f:(r,i)=>i+1,cls:'rk'},{k:'k',l:lab,cls:'name',title:r=>r.k},{k:'a',l:'매출',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'p',l:'전년 동기',n:1,f:r=>r.p==null?'—':amt(r.p)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.a,r.p),nosort:1},{k:'sh',l:'비중',n:1,f:r=>shareCell(r.a,r.s),nosort:1}];
  const g2=el('div',{class:'grid2'});
  const cp=panel('시장 순위',`${perName(S.f,S.t)} · ※ 행을 클릭하면 시장 상세`);const cd=el('div');cp.append(cd);
  table(cd,{id:'rmk',maxH:420,sort:{k:'a',d:-1},rows:rank(fr,fpr,'mk',ft),onRow:r=>mkDrawer(r.k),cols:rcols('시장')});
  const lr0=inR(F(R),S.f,S.t),lp0=y?inR(F(R),y.f,y.t):null;
  const ip=panel('제품 순위',`${perName(S.f,S.t)} · 시장 합산 · ※ 행을 클릭하면 해당 제품만 조회`);const idv=el('div');ip.append(idv);
  table(idv,{id:'rln',maxH:420,sort:{k:'a',d:-1},rows:rank(lr0,lp0,'ln',sum(lr0)),rowCls:r=>S.ln===r.k?'on':'',onRow:r=>{S.ln=S.ln===r.k?'':r.k;K.render(true)},cols:rcols('제품')});
  g2.append(cp,ip);M.append(g2);
  const mp=panel('월별 매출',`${S.cust!==''?D.custs[+S.cust]:'애터미 전체'}${S.mk?' · '+S.mk:''} · ※ 막대를 클릭하면 해당 월로 조회 기간이 변경됩니다`);
  mp.append(K.legend([['var(--accent)',`${+S.t.slice(0,4)}년`],['var(--ghost)',`${+S.t.slice(0,4)-1}년`]]));
  const mc=el('div',{class:'pb'});mp.append(mc);M.append(mp);requestAnimationFrame(()=>K.monthly(mc,F(R)));
}
// 시장·품목 탭 상단: 시장별 / 제품별 상세 표
function marketTables(M){
  const y=yoyOf(S.f,S.t);
  // 시장별
  const fr=inR(F(R,{noMk:true}),S.f,S.t),fpr=y?inR(F(R,{noMk:true}),y.f,y.t):null,ft=sum(fr);
  const mm=groupBy(fr,'mk'),pm=fpr?groupBy(fpr,'mk'):null;
  const keys=[...new Set([...mm.keys(),...(pm?pm.keys():[])])];
  const mrows=keys.map(k=>{const all=F(R,{noMk:true}).filter(r=>r.mk===k);const cad=cadence(all);return{k,a:mm.get(k)?.a||0,q:mm.get(k)?.q||0,p:pm?(pm.get(k)?.a||0):null,last:cad.last,since:cad.since,gap:cad.gap,next:cad.next,late:cad.late,n:cad.n}});
  const sp=panel('시장(국가)별',`${perName(S.f,S.t)} · 품명의 괄호(러시아용 등)로 구분, 괄호 없으면 국내 · ※ 행을 클릭하면 해당 시장만 조회되며, 한 번 더 클릭하면 전체 보기로 돌아갑니다`);const sd=el('div');sp.append(sd);
  table(sd,{id:'mk',rows:mrows,maxH:460,sort:{k:'a',d:-1},rowCls:r=>S.mk===r.k?'on':'',onRow:r=>{S.mk=S.mk===r.k?'':r.k;K.render(true)},
    sumRow:{k:'합계',a:amt(ft),p:fpr?amt(sum(fpr)):'',ch:dCell(ft,fpr?sum(fpr):null),q:nf(sum(fr,'q'))},
    cols:[{k:'k',l:'시장',cls:'name'},{k:'a',l:'매출',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'p',l:'전년 동기',n:1,f:r=>r.p==null?'—':amt(r.p)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.a,r.p),nosort:1},{k:'s',l:'비중',n:1,f:r=>shareCell(r.a,ft),nosort:1},
      {k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'since',l:'최종 주문일',n:1,f:r=>r.last?`${md(r.last)} (${r.since}일 전)`:'—'},{k:'gap',l:'평균 간격',n:1,f:r=>r.gap?r.gap+'일':'—'},
      {k:'next',l:'차기 발주 예상일',n:1,f:r=>r.next?el('span',{class:r.late?'st-late':'',text:md(r.next)+(r.late?' 지남':'')}):'—'},{k:'x',l:'',f:r=>el('button',{class:'chip',text:'상세',onclick:e=>{e.stopPropagation();mkDrawer(r.k)}}),nosort:1}]});
  M.append(sp);
  // 제품 라인별
  const lr=inR(F(R),S.f,S.t),lp=y?inR(F(R),y.f,y.t):null;const lm=groupBy(lr,'ln'),lpm=lp?groupBy(lp,'ln'):null,lt=sum(lr);
  const lp2=panel('제품별 (시장 합산)',perName(S.f,S.t));const ld=el('div');lp2.append(ld);
  table(ld,{id:'ln',maxH:400,sort:{k:'a',d:-1},rows:[...new Set([...lm.keys(),...(lpm?lpm.keys():[])])].map(k=>{const o=lm.get(k);const po=lpm?.get(k);const u=o?unit(o.rows):null,pu=po?unit(po.rows):null;return{k,a:o?.a||0,q:o?.q||0,p:lpm?(po?.a||0):null,pq:po?.q||0,u,uc:u&&pu?(u-pu)/pu:null}}),
    cols:[{k:'k',l:'제품',cls:'name'},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'qc',l:'수량 증감',n:1,f:r=>lpm?dCell(r.q,r.pq):'—',nosort:1},{k:'a',l:'매출',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'p',l:'전년 동기',n:1,f:r=>r.p==null?'—':amt(r.p)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.a,r.p),nosort:1},{k:'s',l:'비중',n:1,f:r=>shareCell(r.a,lt),nosort:1},
      {k:'u',l:'평균 단가',n:1,f:r=>r.u?nf(r.u)+'원':'—'},{k:'uc',l:'단가 변동',n:1,f:r=>r.uc==null?'—':el('span',{class:Math.abs(r.uc)<0.005?'flat':r.uc>0?'up':'down',text:(r.uc>0?'+':'')+(r.uc*100).toFixed(1)+'%'})}]});
  M.append(lp2);
}

// ══ 영업 액션
function tabAction(M){
  M.append(el('div',{class:'note',text:`기준일 ${MAX.replace(/-/g,'.')} 기준 · 기간 선택과 무관하게 시장별 발주 주기(최근 1년)로 판단합니다.`}));
  K.actions(M,F(R,{noMk:true}),{key:'mk',name:k=>k,onRow:k=>mkDrawer(k),unitLab:'시장',items:{label:'주요 제품',fn:rs=>{const g=groupBy(rs.filter(r=>r.d>=addD(MAX,-364)),'ln');return [...g.values()].sort((a,b)=>b.a-a.a).slice(0,3).map(o=>o.k).join(', ')}}});
  K.top10(M,F(R,{noMk:true}),{title:'상위 10개 시장 집중 관리',key:'mk',name:k=>k,onRow:k=>mkDrawer(k),unitLab:'시장',win:6});
  K.lost(M,F(R),{key:'i',name:k=>D.items[k][1],onRow:k=>itemDrawer(k),unitLab:'품목'});
  newLaunch(M);
}


// ── (가) 매출 증감 요인: 전년 동기 → 물량 → 단가 → 신규 제품 → 판매 중단 → 금년 (품목=시장별 SKU 기준)
function factors(M){
  const y=yoyOf(S.f,S.t);if(!y)return;
  const cur=inR(F(R),S.f,S.t),prev=inR(F(R),y.f,y.t);const A1=sum(cur),A0=sum(prev);
  const g1=groupBy(cur,'i'),g0=groupBy(prev,'i');let vol=0,price=0,neu=0,drop=0,etc=0;
  new Set([...g1.keys(),...g0.keys()]).forEach(k=>{const a=g1.get(k),b=g0.get(k);const q1=a?a.q:0,q0=b?b.q:0,a1=a?a.a:0,a0=b?b.a:0;
    if(q1>0&&q0>0){const p0=a0/q0,p1=a1/q1;vol+=(q1-q0)*p0;price+=(p1-p0)*q1}
    else if(q1>0&&q0<=0&&a0===0)neu+=a1;else if(q0>0&&q1<=0&&a1===0)drop-=a0;else etc+=a1-a0});
  // 평균 단가 변동 (양쪽 모두 판매된 품목)
  let q1s=0,v1=0,v0=0;g1.forEach((o,k)=>{const b=g0.get(k);if(b&&o.q>0&&b.q>0){q1s+=o.q;v1+=o.a;v0+=b.a/b.q*o.q}});
  const pc=v0?(v1-v0)/v0:null;
  const steps=[['전년 동기',A0,'base'],['물량 효과',vol],['단가 효과',price],['신규 제품',neu],['판매 중단',drop]];
  if(Math.abs(etc)>=1e4)steps.push(['기타 조정',etc]);steps.push(['금년',A1,'end']);
  const p=K.panel('매출 증감 요인',`${perName(S.f,S.t)} vs 전년 동기 · 시장별 품목 기준`);
  const dx=delta(A1,A0);
  p.append(el('div',{class:'fsum'},el('span',{},'매출 ',el('b',{class:dx.c,text:`${A1-A0>=0?'+':''}${amt(A1-A0)} (${dx.t})`})),
    el('span',{},'물량 효과 ',el('b',{class:vol>=0?'up':'down',text:`${vol>=0?'+':''}${amt(vol)}`})),
    el('span',{},'단가 효과 ',el('b',{class:price>=0?'up':'down',text:`${price>=0?'+':''}${amt(price)}`}),pc!=null?el('span',{class:'note',text:` (평균 단가 ${pc>=0?'+':''}${(pc*100).toFixed(1)}%)`}):null),
    el('span',{},'신규·중단 ',el('b',{class:neu+drop>=0?'up':'down',text:`${neu+drop>=0?'+':''}${amt(neu+drop)}`}))));
  const host=el('div',{class:'pb'});p.append(host);
  requestAnimationFrame(()=>{
    const W=Math.max(300,host.clientWidth),H=210,pt=24,pb=26,n=steps.length,slot=W/n,bw=Math.min(70,slot*.6);
    let run=0,vals=[];steps.forEach(([l,v,t])=>{if(t==='base'){vals.push([0,v]);run=v}else if(t==='end')vals.push([0,v]);else{vals.push([run,run+v]);run+=v}});
    const mx=Math.max(1,...vals.flat()),mn=Math.min(0,...vals.flat());
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('width','100%');svg.style.display='block';
    const yy=v=>pt+(H-pt-pb)*(mx-v)/(mx-mn);const mk=(t,a,txt)=>{const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;svg.append(e);return e};
    mk('line',{x1:0,x2:W,y1:yy(0),y2:yy(0),stroke:'var(--line)'});
    steps.forEach(([l,v,t],i)=>{const[a,b]=vals[i];const cx=slot*i+slot/2,top=yy(Math.max(a,b)),h=Math.max(1,Math.abs(yy(a)-yy(b)));
      const col=t==='base'?'var(--ghost)':t==='end'?'var(--accent)':v>=0?'var(--up)':'var(--down)';
      const r=mk('rect',{x:cx-bw/2,y:top,width:bw,height:h,fill:col,rx:2,opacity:t?1:.85});
      const tt=document.createElementNS(ns,'title');tt.textContent=`${l} ${won(v)}`;r.append(tt);
      mk('text',{x:cx,y:top-6,'text-anchor':'middle','font-size':12,'font-weight':600,fill:'var(--fg)'},t?amt(v):`${v>=0?'+':''}${amt(v)}`);
      mk('text',{x:cx,y:H-7,'text-anchor':'middle','font-size':12,fill:'var(--muted)'},l);
      if(i<n-1&&!t||t==='base'){const e=t==='base'?b:b;mk('line',{x1:cx+bw/2,x2:cx+slot-bw/2,y1:yy(e),y2:yy(e),stroke:'var(--faint)','stroke-dasharray':'3 3'})}});
    host.append(svg)});
  p.append(el('div',{class:'foot',style:'padding:0 16px 14px',text:'※ 물량 효과 = (금년 수량 − 전년 수량) × 전년 단가, 단가 효과 = (금년 단가 − 전년 단가) × 금년 수량. 두 기간 모두 판매된 품목 기준이며, 한쪽 기간에만 판매된 품목은 신규 제품·판매 중단으로 따로 표시합니다.'}));
  M.append(p);
}
// ── (나) 신규 시장·제품 안착 현황: 금년 최초 주문된 품목(시장별 SKU)
function newLaunch(M){
  const all=F(R);const first={};all.forEach(r=>{if(r.a>0&&(!first[r.i]||r.d<first[r.i]))first[r.i]=r.d});
  const rows=Object.keys(first).filter(k=>first[k]>=`${BY}-01-01`).map(k=>{k=+k;const rs=all.filter(r=>r.i===k&&r.a>0);const ds=[...new Set(rs.map(r=>r.d))].sort();
    const it=D.items[k];const last=ds[ds.length-1];return{id:k,mk:it[7],ln:it[8],first:ds[0],n:ds.length,a:sum(all.filter(r=>r.i===k)),last,since:days(last,MAX)-1,fs:days(ds[0],MAX)-1}});
  const ok=rows.filter(r=>r.n>=2).length;
  const p=K.panel('신규 시장·제품 안착 현황',`${BY}년 처음 주문된 품목 ${rows.length}개 · 재주문 완료 ${ok}개 · 첫 주문만 ${rows.length-ok}개`);
  const d=el('div');p.append(d);
  table(d,{id:'launch',rows,maxH:460,sort:{k:'first',d:-1},onRow:r=>itemDrawer(r.id),empty:'금년 최초 주문된 품목이 없습니다.',
    cols:[{k:'mk',l:'시장'},{k:'ln',l:'제품',cls:'name'},{k:'first',l:'첫 주문일',n:1,f:r=>r.first.slice(2).replace(/-/g,'.')},{k:'n',l:'주문 횟수',n:1,f:r=>r.n+'회'},
      {k:'a',l:'누적 매출',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'last',l:'최종 주문일',n:1,f:r=>`${r.last.slice(2).replace(/-/g,'.')} (${r.since}일 전)`},
      {k:'st',l:'상태',f:r=>r.n>=2?el('span',{class:'pill st-ok',text:'재주문 완료'}):el('span',{class:'pill '+(r.fs>90?'st-risk':'st-late'),text:`첫 주문 후 ${r.fs}일째 재주문 없음`})}]});
  p.append(el('div',{class:'foot',style:'padding:8px 16px 14px',text:'※ 품목은 시장별 제품(예: 카페아라비카 50개입 러시아용) 단위입니다. 첫 주문 후 90일이 지나도 재주문이 없으면 빨간색으로 표시합니다. 행을 클릭하면 품목 상세가 열립니다.'}));
  M.append(p);
}
// ══ 시장·품목
function tabItem(M){
  factors(M);
  marketTables(M);
  const y=yoyOf(S.f,S.t);const Y=+S.t.slice(0,4);const met=S.metric;const fmt=met==='a'?amt:nf;
  const months=[];for(let m=1;m<=12;m++)if(`${Y}-${pad(m)}`<=MAX.slice(0,7))months.push(m);
  const base=F(R,{noMk:true});const yr=base.filter(r=>r.y===Y),pcut=Y===BY?K.shiftY(MAX):`${Y-1}-12-31`,pyr=base.filter(r=>r.y===Y-1&&r.d<=pcut);
  const seg=el('div',{class:'seg'},...[['a','금액'],['q','수량']].map(([k,l])=>el('button',{class:met===k?'on':'',text:l,onclick:()=>{S.metric=k;K.render(true)}})));
  const p=el('section',{class:'panel'},el('h2',{},'시장 × 월',el('span',{class:'sub',text:`${Y}년 · 누계는 전년 같은 날짜까지와 비교`}),el('span',{class:'right'},seg)));
  const d=el('div');p.append(d);
  const keys=[...new Set([...yr,...pyr].map(r=>r.mk))];
  const rows=keys.map(k=>{const x={k};months.forEach(m=>x['m'+m]=sum(yr.filter(r=>r.mk===k&&r.m===m),met));x.s=sum(yr.filter(r=>r.mk===k),met);x.ps=sum(pyr.filter(r=>r.mk===k),met);return x});
  table(d,{id:'mkm',rows,maxH:520,sort:{k:'s',d:-1},onRow:r=>mkDrawer(r.k),rowCls:r=>S.mk===r.k?'on':'',
    sumRow:Object.assign({k:'합계',s:fmt(sum(yr,met)),ps:fmt(sum(pyr,met)),ch:dCell(sum(yr,met),sum(pyr,met))},Object.fromEntries(months.map(m=>['m'+m,fmt(sum(yr.filter(r=>r.m===m),met))]))),
    cols:[{k:'k',l:'시장',cls:'name'},...months.map(m=>({k:'m'+m,l:m+'월',n:1,f:r=>r['m'+m]?fmt(r['m'+m]):el('span',{class:'flat',text:'·'})})),{k:'s',l:'누계',n:1,f:r=>fmt(r.s)},{k:'ps',l:'전년 누계',n:1,f:r=>fmt(r.ps)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.s,r.ps),nosort:1}]});
  M.append(p);
  // SKU 표
  const cur=inR(F(R),S.f,S.t),prev=y?inR(F(R),y.f,y.t):null;const im=groupBy(cur,'i'),ipm=prev?groupBy(prev,'i'):null;
  const ids=[...new Set([...im.keys(),...(ipm?ipm.keys():[])])];
  const srows=ids.map(k=>{const it=D.items[k];const o=im.get(k),po=ipm?.get(k);const cad=cadence(F(R).filter(r=>r.i===k));const u=o?unit(o.rows):null,pu=po?unit(po.rows):null;
    return{id:k,name:it[1],mk:it[7],ln:it[8],q:o?.q||0,a:o?.a||0,p:ipm?(po?.a||0):null,u,uc:u&&pu?(u-pu)/pu:null,last:cad.last,since:cad.since,gap:cad.gap,next:cad.next,late:cad.late}});
  const p2=panel('전체 품목',`${perName(S.f,S.t)} · ${srows.length}개 (전년 동기에만 있던 품목 포함)`);
  const tools=el('div',{class:'tools'});const q=el('input',{id:'iq',type:'search',placeholder:'품명·시장 검색',value:S.iq});tools.append(q);p2.append(tools);
  const td=el('div');p2.append(td);
  const draw=()=>{td.innerHTML='';const k=S.iq.toLowerCase();
    table(td,{id:'sku',rows:srows.filter(r=>!k||r.name.toLowerCase().includes(k)||r.mk.includes(k)),maxH:600,sort:{k:'a',d:-1},redraw:draw,onRow:r=>itemDrawer(r.id),
      cols:[{l:'#',f:(r,i)=>i+1,cls:'rk'},{k:'name',l:'품명',cls:'name',title:r=>r.name},{k:'mk',l:'시장'},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'매출',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'p',l:'전년 동기',n:1,f:r=>r.p==null?'—':amt(r.p)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.a,r.p),nosort:1},
        {k:'u',l:'평균 단가',n:1,f:r=>r.u?nf(r.u)+'원':'—'},{k:'uc',l:'단가 변동',n:1,f:r=>r.uc==null?'—':el('span',{class:Math.abs(r.uc)<0.005?'flat':r.uc>0?'up':'down',text:(r.uc>0?'+':'')+(r.uc*100).toFixed(1)+'%'})},
        {k:'since',l:'최종 주문일',n:1,f:r=>r.last?`${r.last.slice(2).replace(/-/g,'.')} (${r.since}일 전)`:'—'},{k:'gap',l:'평균 간격',n:1,f:r=>r.gap?r.gap+'일':'—'},
        {k:'next',l:'차기 발주 예상일',n:1,f:r=>r.next?el('span',{class:r.late?'st-late':'',text:md(r.next)+(r.late?' 지남':'')}):'—'}]})};
  q.oninput=()=>{S.iq=q.value;draw()};draw();M.append(p2);
}

// ══ 주문 내역
function docRows(rows){const dm=groupBy(rows,'doc');return [...dm.values()].map(o=>({doc:o.k,d:o.rows[0].d,c:o.rows[0].c,cust:D.custs[o.rows[0].c],mks:[...new Set(o.rows.map(r=>r.mk))].join(', '),n:o.rows.length,q:o.q,a:o.a,rows:o.rows}))}
function tabOrder(M){
  const y=yoyOf(S.f,S.t);const cur=inR(F(R),S.f,S.t),prev=y?inR(F(R),y.f,y.t):null;
  const docs=docRows(cur),pdocs=prev?docRows(prev):null;const pos=docs.filter(d=>d.a>0);
  const g=el('div',{class:'grid4'});
  const mini=(k,v,d)=>el('div',{class:'card mini static'},el('div',{class:'k',text:k}),el('div',{class:'v',text:v}),el('div',{class:'d'},d||''));
  const avg=pos.length?sum(pos)/pos.length:0,pavg=pdocs&&pdocs.filter(d=>d.a>0).length?sum(pdocs.filter(d=>d.a>0))/pdocs.filter(d=>d.a>0).length:null;
  g.append(mini('주문 전표',nf(docs.length)+'건',pdocs?[dCell(docs.length,pdocs.length),el('span',{class:'flat',text:` 전년 ${pdocs.length}건`})]:null),
    mini('전표당 평균',amt(avg),pavg!=null?[dCell(avg,pavg),el('span',{class:'flat',text:` 전년 ${amt(pavg)}`})]:null),
    mini('가장 큰 주문',pos.length?amt(Math.max(...pos.map(d=>d.a))):'—',el('span',{class:'flat',text:pos.length?md(pos.reduce((m,d)=>d.a>m.a?d:m).d):''})),
    mini('주문한 날',nf(new Set(pos.map(d=>d.d)).size)+'일'));
  M.append(g);
  const p=panel('주문 전표',`${perName(S.f,S.t)} · ※ 행을 클릭하면 품목 내역이 열립니다`);const td=el('div');p.append(td);
  table(td,{id:'docs',rows:docs,maxH:640,sort:{k:'d',d:-1},onRow:r=>docDrawer(r),
    cols:[{k:'d',l:'일자',f:r=>r.d.slice(2).replace(/-/g,'.')},{k:'cust',l:'거래처'},{k:'mks',l:'시장',cls:'name',title:r=>r.mks},{k:'n',l:'품목 수',n:1},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'금액',n:1,f:r=>amt(r.a),title:r=>won(r.a)}]});
  M.append(p);
}

// ── 서랍
function common(dr,all){
  const y=yoyOf(S.f,S.t);const cur=inR(all,S.f,S.t),prev=y?inR(all,y.f,y.t):null;const a=sum(cur),pa=prev?sum(prev):null,dx=delta(a,pa);const cad=cadence(all);
  dr.append(K.stats([[perName(S.f,S.t),amt(a),'',won(a)],['전년 동기 대비',y?dx.t:'—',dx.c],[`${BY}년 누계`,amt(sum(all.filter(r=>r.y===BY)))],[`${BY-1}년 전체`,amt(sum(all.filter(r=>r.y===BY-1)))],
    ['최종 주문일',cad.last?`${md(cad.last)} (${cad.since}일 전)`:'—',cad.late?'st-late':''],['주문 간격 · 차기 발주 예상일',cad.gap?`${cad.gap}일 · ${md(cad.next)}`:'—',cad.late?'st-late':'']]));
  const mp=panel('월별 매출',`${BY}년 vs ${BY-1}년`);mp.append(K.legend([['var(--accent)',`${BY}년`],['var(--ghost)',`${BY-1}년`]]));const mc=el('div',{class:'pb'});mp.append(mc);dr.append(mp);K.monthly2(mc,all);
  return{cur,prev};
}
const docCols=[{k:'d',l:'일자',f:r=>r.d.slice(2).replace(/-/g,'.')},{k:'cust',l:'거래처'},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'금액',n:1,f:r=>amt(r.a),title:r=>won(r.a)}];
function mkDrawer(mk,sel){const all=F(R,{noMk:true}).filter(r=>r.mk===mk);
  K.drawer(`${mk} 시장`,S.cust!==''?D.custs[+S.cust]:'애터미 전체',dr=>{const{cur,prev}=common(dr,all);
    const im=groupBy(cur,'i'),pm=prev?groupBy(prev,'i'):null;const ids=[...new Set([...im.keys(),...(pm?pm.keys():[])])];
    dr.append(K.section(`품목별 (${perName(S.f,S.t)}) · ※ 품목을 클릭하면 이 시장의 월별 매출이 보입니다`,true,b=>table(b,{id:'dmi',maxH:320,sort:{k:'a',d:-1},redraw:()=>mkDrawer(mk,sel),onRow:r=>mkDrawer(mk,sel===r.id?null:r.id),rowCls:r=>r.id===sel?'on':'',
      rows:ids.map(k=>({id:k,name:D.items[k][1],q:im.get(k)?.q||0,a:im.get(k)?.a||0,p:pm?(pm.get(k)?.a||0):null})),
      cols:[{k:'name',l:'품목',cls:'name',title:r=>r.name},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'매출',n:1,f:r=>amt(r.a)},{k:'p',l:'전년 동기',n:1,f:r=>r.p==null?'—':amt(r.p)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.a,r.p),nosort:1}]})));
    if(sel!=null)dr.append(K.selItem(all.filter(r=>r.i===sel),`${mk} · ${D.items[sel][1]}`,()=>mkDrawer(mk),()=>itemDrawer(sel)));
    const docs=docRows(all.filter(r=>r.d>=addD(MAX,-364)));
    dr.append(K.section(`최근 1년 주문 ${docs.length}건`,false,b=>table(b,{id:'dmd',rows:docs,maxH:340,sort:{k:'d',d:-1},redraw:()=>mkDrawer(mk),cols:docCols})));
  })}
function itemDrawer(id){const it=D.items[id];const all=F(R,{noMk:true}).filter(r=>r.i===id);
  K.drawer(it[1],`${it[0]} · ${it[2]} · 시장 ${it[7]}`,dr=>{common(dr,all);
    const docs=docRows(all.filter(r=>r.d>=addD(MAX,-364)));
    dr.append(K.section(`최근 1년 주문 ${docs.length}건`,true,b=>table(b,{id:'did',rows:docs,maxH:380,sort:{k:'d',d:-1},redraw:()=>itemDrawer(id),cols:docCols})));
  })}
function docDrawer(doc){
  K.drawer(`${doc.cust} 주문`,`${doc.d.replace(/-/g,'.')} · 전표 ${D.docs[doc.doc]}`,dr=>{
    dr.append(K.stats([['금액',amt(doc.a),'',won(doc.a)],['수량',nf(doc.q)],['품목 수',doc.n+'개']]));
    const p=panel('품목');const b=el('div');p.append(b);dr.append(p);
    table(b,{id:'ddl',maxH:500,sort:{k:'a',d:-1},redraw:()=>docDrawer(doc),onRow:r=>itemDrawer(r.id),rows:doc.rows.map(r=>({id:r.i,name:D.items[r.i][1],mk:r.mk,q:r.q,a:r.a,u:r.q?r.a/r.q:null})),
      cols:[{k:'name',l:'품목',cls:'name',title:r=>r.name},{k:'mk',l:'시장'},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'u',l:'단가',n:1,f:r=>r.u?nf(r.u)+'원':'—'},{k:'a',l:'금액',n:1,f:r=>amt(r.a)}]});
  })}

// ══ 수익성 (비밀번호)
const IIDX=Object.fromEntries(D.items.map((it,i)=>[it[0],i]));
function PFILT(n){return S.cust===''||D.custs[+S.cust]===n}
function tabProfit(M){K.profitTab(M,{custFilter:PFILT,custInfo:n=>({id:null}),onCust:null,itemId:c=>IIDX[c],onItem:id=>itemDrawer(id)})}

K.start({tabs:[['sales','현황'],
  ['action','영업 관리',{noPer:true,badge:()=>{const c=counts();return c.plan+c.late||null},badgeTip:'발주 예정 + 주기 초과 시장 수'}],
  ['item','시장·품목'],['order','주문 내역'],
  ['profit','손익 분석',{warn:true,badge:()=>counts().neg?.n||null,badgeTip:'최근 달 적자 품목 수'}]],controls,
  draw:(tab,M)=>({sales:tabSales,action:tabAction,item:tabItem,order:tabOrder,profit:tabProfit})[tab](M)});
})();
