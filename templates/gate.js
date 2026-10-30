// ── 입장 비밀번호 (메인·애터미·B2B 공통). 맞으면 이 브라우저에 30일 기억.
// 손익 데이터 복호화에도 같은 비밀번호를 쓴다. chk = 'ok'를 암호화한 값(scripts/profit_pack.py).
const GATE=(()=>{const KEY='mcgate',DAYS=30;
  const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  async function dec(e,pw){const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(e.salt),iterations:e.iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(e.iv)},key,b64(e.ct))))}
  function saved(){try{const o=JSON.parse(localStorage.getItem(KEY)||'null');if(o&&o.exp>Date.now())return o.pw}catch(x){}try{return sessionStorage.getItem(KEY)}catch(x){}return null}
  function save(pw){try{localStorage.setItem(KEY,JSON.stringify({pw,exp:Date.now()+DAYS*864e5}))}catch(x){}try{sessionStorage.setItem(KEY,pw)}catch(x){}}
  function clear(){try{localStorage.removeItem(KEY)}catch(x){}try{sessionStorage.removeItem(KEY)}catch(x){}}
  async function ok(chk,pw){if(!pw)return false;if(!chk)return true;try{await dec(chk,pw);return true}catch(x){return false}}
  function show(chk,done){const st=document.createElement('style');st.textContent=`
#gate{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:#f3f5f8;font-family:"IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#16202c}
#gate form{background:#fff;border:1px solid #e1e6ed;border-radius:12px;padding:28px 24px;width:100%;max-width:340px;box-shadow:0 6px 24px rgba(0,0,0,.06)}
#gate h2{margin:0 0 4px;font-size:18px}#gate p{margin:0 0 16px;color:#5d6978;font-size:13px}
#gate input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cfd6df;border-radius:8px;font:inherit;font-size:15px;background:#fff;color:inherit}
#gate button{margin-top:10px;width:100%;padding:10px;border:0;border-radius:8px;background:#1f4f9c;color:#fff;font:inherit;font-weight:600;cursor:pointer}
#gate .m{min-height:18px;margin-top:8px;font-size:13px;color:#c0392b}
@media (prefers-color-scheme:dark){#gate{background:#0f141b;color:#e7ecf2}#gate form{background:#171e27;border-color:#2a3441}#gate p{color:#a2adbb}#gate input{background:#0f141b;border-color:#2a3441}#gate button{background:#3d6fc4}}`;
    document.head.append(st);const g=document.createElement('div');g.id='gate';
    g.innerHTML='<form autocomplete="off"><h2>기업영업팀 대시보드</h2><p>내부용 페이지입니다. 비밀번호를 입력하세요.</p><input type="password" placeholder="비밀번호" aria-label="비밀번호"><button type="submit">확인</button><div class="m"></div></form>';
    document.body.append(g);const inp=g.querySelector('input'),m=g.querySelector('.m');setTimeout(()=>inp.focus(),50);
    g.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();m.textContent='확인 중…';const pw=inp.value;
      if(await ok(chk,pw)){save(pw);g.remove();st.remove();done(pw)}else{m.textContent='비밀번호가 맞지 않습니다.';inp.select()}})}
  async function run(chk,done){const pw=saved();if(await ok(chk,pw)){save(pw);done(pw);return}clear();show(chk,done)}
  return{run,dec,saved,clear}})();
