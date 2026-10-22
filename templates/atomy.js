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
function tabSales(M){
  const y=yoyOf(S.f,S.t);
  const d0=F(R,{noMk:true,noLn:true});
  K.progress(M,F(R),{note:'애터미는 주문 건별로 크게 들어와 날짜별 편차가 큽니다.'+(S.mk||S.ln?` 필터: ${[S.mk,S.ln].filter(Boolean).join(' · ')}.`:''),
    donut:{mode:S.dmode,setMode:k=>{S.dmode=k;K.render(true)},modes:[
      {k:'ln',l:'제품별',rows:inR(d0,S.f,S.t),prevRows:y?inR(d0,y.f,y.t):null,key:'ln',name:k=>k,sel:S.ln,onPick:k=>{S.ln=S.ln===k?'':k;K.render(true)},hint:'조각을 누르면 그 제품만 봅니다. 오른쪽 끝은 전년 동기 대비.'},
      {k:'mk',l:'시장별',rows:inR(d0,S.f,S.t),prevRows:y?inR(d0,y.f,y.t):null,key:'mk',name:k=>k,sel:S.mk,onPick:k=>{S.mk=S.mk===k?'':k;K.render(true)},hint:'조각을 누르면 그 시장만 봅니다. 오른쪽 끝은 전년 동기 대비.'}]}});
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
  K.top10(M,F(R,{noMk:true}),{title:'상위 10개 시장 집중 관리',key:'mk',name:k=>k,onRow:k=>mkDrawer(k),unitLab:'시장',scope:'애터미'});
  const mp=panel('월별 매출',`${S.cust!==''?D.custs[+S.cust]:'애터미 전체'}${S.mk?' · '+S.mk:''} · 막대를 누르면 그 달로`);
  mp.append(K.legend([['var(--accent)',`${+S.t.slice(0,4)}년`],['var(--ghost)',`${+S.t.slice(0,4)-1}년`]]));
  const mc=el('div',{class:'pb'});mp.append(mc);M.append(mp);requestAnimationFrame(()=>K.monthly(mc,F(R)));
  // 시장별
  const fr=inR(F(R,{noMk:true}),S.f,S.t),fpr=y?inR(F(R,{noMk:true}),y.f,y.t):null,ft=sum(fr);
  const mm=groupBy(fr,'mk'),pm=fpr?groupBy(fpr,'mk'):null;
  const keys=[...new Set([...mm.keys(),...(pm?pm.keys():[])])];
  const mrows=keys.map(k=>{const all=F(R,{noMk:true}).filter(r=>r.mk===k);const cad=cadence(all);return{k,a:mm.get(k)?.a||0,q:mm.get(k)?.q||0,p:pm?(pm.get(k)?.a||0):null,last:cad.last,since:cad.since,gap:cad.gap,next:cad.next,late:cad.late,n:cad.n}});
  const sp=panel('시장(국가)별',`${perName(S.f,S.t)} · 품명의 괄호(러시아용 등)로 구분, 괄호 없으면 국내 · 행을 누르면 그 시장만`);const sd=el('div');sp.append(sd);
  table(sd,{id:'mk',rows:mrows,maxH:460,sort:{k:'a',d:-1},rowCls:r=>S.mk===r.k?'on':'',onRow:r=>{S.mk=S.mk===r.k?'':r.k;K.render(true)},
    sumRow:{k:'합계',a:amt(ft),p:fpr?amt(sum(fpr)):'',ch:dCell(ft,fpr?sum(fpr):null),q:nf(sum(fr,'q'))},
    cols:[{k:'k',l:'시장',cls:'name'},{k:'a',l:'매출',n:1,f:r=>amt(r.a),title:r=>won(r.a)},{k:'p',l:'전년 동기',n:1,f:r=>r.p==null?'—':amt(r.p)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.a,r.p),nosort:1},{k:'s',l:'비중',n:1,f:r=>shareCell(r.a,ft),nosort:1},
      {k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'since',l:'마지막 주문',n:1,f:r=>r.last?`${md(r.last)} (${r.since}일 전)`:'—'},{k:'gap',l:'평균 간격',n:1,f:r=>r.gap?r.gap+'일':'—'},
      {k:'next',l:'다음 예상',n:1,f:r=>r.next?el('span',{class:r.late?'st-late':'',text:md(r.next)+(r.late?' 지남':'')}):'—'},{k:'x',l:'',f:r=>el('button',{class:'chip',text:'상세',onclick:e=>{e.stopPropagation();mkDrawer(r.k)}}),nosort:1}]});
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
  M.append(el('div',{class:'note',text:`기준일 ${MAX.replace(/-/g,'.')} 기준 · 기간 선택과 무관하게 최근 3개월·12개월로 판단합니다. 시장 단위.`}));
  K.actions(M,F(R,{noMk:true}),{key:'mk',name:k=>k,onRow:k=>mkDrawer(k),unitLab:'시장',items:{label:'주요 제품',fn:rs=>{const g=groupBy(rs.filter(r=>r.d>=addD(MAX,-364)),'ln');return [...g.values()].sort((a,b)=>b.a-a.a).slice(0,3).map(o=>o.k).join(', ')}}});
}

// ══ 시장·품목
function tabItem(M){
  K.lost(M,F(R),{key:'i',name:k=>D.items[k][1],onRow:k=>itemDrawer(k),unitLab:'품목'});
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
        {k:'since',l:'마지막 주문',n:1,f:r=>r.last?`${r.last.slice(2).replace(/-/g,'.')} (${r.since}일 전)`:'—'},{k:'gap',l:'평균 간격',n:1,f:r=>r.gap?r.gap+'일':'—'},
        {k:'next',l:'다음 예상',n:1,f:r=>r.next?el('span',{class:r.late?'st-late':'',text:md(r.next)+(r.late?' 지남':'')}):'—'}]})};
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
  const p=panel('주문 전표',`${perName(S.f,S.t)} · 행을 누르면 품목 내역`);const td=el('div');p.append(td);
  table(td,{id:'docs',rows:docs,maxH:640,sort:{k:'d',d:-1},onRow:r=>docDrawer(r),
    cols:[{k:'d',l:'일자',f:r=>r.d.slice(2).replace(/-/g,'.')},{k:'cust',l:'거래처'},{k:'mks',l:'시장',cls:'name',title:r=>r.mks},{k:'n',l:'품목 수',n:1},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'금액',n:1,f:r=>amt(r.a),title:r=>won(r.a)}]});
  M.append(p);
}

// ── 서랍
function common(dr,all){
  const y=yoyOf(S.f,S.t);const cur=inR(all,S.f,S.t),prev=y?inR(all,y.f,y.t):null;const a=sum(cur),pa=prev?sum(prev):null,dx=delta(a,pa);const cad=cadence(all);
  dr.append(K.stats([[perName(S.f,S.t),amt(a),'',won(a)],['전년 동기 대비',y?dx.t:'—',dx.c],[`${BY}년 누계`,amt(sum(all.filter(r=>r.y===BY)))],[`${BY-1}년 전체`,amt(sum(all.filter(r=>r.y===BY-1)))],
    ['마지막 주문',cad.last?`${md(cad.last)} (${cad.since}일 전)`:'—',cad.late?'st-late':''],['주문 간격 · 다음 예상',cad.gap?`${cad.gap}일 · ${md(cad.next)}`:'—',cad.late?'st-late':'']]));
  const mp=panel('월별 매출',`${BY}년 vs ${BY-1}년`);mp.append(K.legend([['var(--accent)',`${BY}년`],['var(--ghost)',`${BY-1}년`]]));const mc=el('div',{class:'pb'});mp.append(mc);dr.append(mp);K.monthly2(mc,all);
  return{cur,prev};
}
const docCols=[{k:'d',l:'일자',f:r=>r.d.slice(2).replace(/-/g,'.')},{k:'cust',l:'거래처'},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'금액',n:1,f:r=>amt(r.a),title:r=>won(r.a)}];
function mkDrawer(mk){const all=F(R,{noMk:true}).filter(r=>r.mk===mk);
  K.drawer(`${mk} 시장`,S.cust!==''?D.custs[+S.cust]:'애터미 전체',dr=>{const{cur,prev}=common(dr,all);
    const im=groupBy(cur,'i'),pm=prev?groupBy(prev,'i'):null;const ids=[...new Set([...im.keys(),...(pm?pm.keys():[])])];
    dr.append(K.section(`품목별 (${perName(S.f,S.t)})`,true,b=>table(b,{id:'dmi',maxH:320,sort:{k:'a',d:-1},redraw:()=>mkDrawer(mk),onRow:r=>itemDrawer(r.id),
      rows:ids.map(k=>({id:k,name:D.items[k][1],q:im.get(k)?.q||0,a:im.get(k)?.a||0,p:pm?(pm.get(k)?.a||0):null})),
      cols:[{k:'name',l:'품목',cls:'name',title:r=>r.name},{k:'q',l:'수량',n:1,f:r=>nf(r.q)},{k:'a',l:'매출',n:1,f:r=>amt(r.a)},{k:'p',l:'전년 동기',n:1,f:r=>r.p==null?'—':amt(r.p)},{k:'ch',l:'증감',n:1,f:r=>dCell(r.a,r.p),nosort:1}]})));
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

K.start({tabs:[['sales','매출 현황'],['action','영업 액션'],['item','시장·품목'],['order','주문 내역']],controls,
  draw:(tab,M)=>({sales:tabSales,action:tabAction,item:tabItem,order:tabOrder})[tab](M)});
})();
