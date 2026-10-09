/* ============================================================
   APP.JS — Login + Tool grid + Avatar + Drag
   ============================================================ */
(function(){
  'use strict';

  /* ============ APPLY CONFIG ============ */
  const CFG = window.APP_CONFIG || {};

  function applyBranding(){
    const t=document.getElementById('loginTitle');
    if(t&&CFG.site_name)t.textContent=CFG.site_name;
    const s=document.getElementById('loginSub');
    if(s&&CFG.site_desc)s.textContent=CFG.site_desc;
    const f=document.getElementById('loginFooter');
    if(f&&CFG.footer)f.textContent=CFG.footer;
    const tt=document.getElementById('tsTitle');
    if(tt&&CFG.site_name)tt.textContent='🎯 '+CFG.site_name;
    const ts=document.getElementById('tsSub');
    if(ts&&CFG.marquee)ts.textContent=CFG.marquee;
  }

  /* ============ AVATAR ============ */
  const AVATAR_KEY='bonsicola_avatar_v1';
  const DEFAULT_AVATAR="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect fill='%23e0f2fe' width='200' height='200'/><text x='50%25' y='56%25' font-size='90' text-anchor='middle' dominant-baseline='middle'>🎀</text></svg>";

  function applyAvatar(src){
    const img=document.getElementById('loginAvatarImg');
    if(img&&src)img.src=src;
  }
  function normalizeAvatar(raw){
    if(!raw)return null;raw=raw.trim();
    if(!raw)return null;
    if(/^data:image\//i.test(raw))return raw;
    if(/^https?:\/\//i.test(raw))return raw;
    let mime='image/jpeg';
    if(raw.startsWith('iVBOR'))mime='image/png';
    else if(raw.startsWith('R0lGOD'))mime='image/gif';
    else if(raw.startsWith('UklGR'))mime='image/webp';
    return `data:${mime};base64,${raw}`;
  }
  window.addEventListener('load',()=>{
    let saved=null;
    try{saved=localStorage.getItem(AVATAR_KEY);}catch(e){}
    if(saved)applyAvatar(saved);
  });

  /* Long press 1.5s để mở popup avatar */
  (function(){
    const trigger=document.getElementById('avatarTrigger');
    if(!trigger)return;
    const HOLD=1500;let timer=null,holding=false,sx=0,sy=0,moved=false;
    function start(x,y){
      sx=x;sy=y;moved=false;holding=true;
      trigger.classList.add('holding');
      timer=setTimeout(()=>{
        if(!holding||moved)return;
        trigger.classList.remove('holding');holding=false;
        try{if(navigator.vibrate)navigator.vibrate(30);}catch(e){}
        openAvatarModal();
      },HOLD);
    }
    function cancel(){holding=false;if(timer){clearTimeout(timer);timer=null;}trigger.classList.remove('holding');}
    function move(x,y){if(!holding)return;if(Math.abs(x-sx)>12||Math.abs(y-sy)>12){moved=true;cancel();}}
    trigger.addEventListener('mousedown',e=>{e.preventDefault();start(e.clientX,e.clientY);});
    trigger.addEventListener('mousemove',e=>move(e.clientX,e.clientY));
    trigger.addEventListener('mouseup',cancel);
    trigger.addEventListener('mouseleave',cancel);
    trigger.addEventListener('touchstart',e=>{const t=e.touches[0];start(t.clientX,t.clientY);},{passive:true});
    trigger.addEventListener('touchmove',e=>{const t=e.touches[0];move(t.clientX,t.clientY);},{passive:true});
    trigger.addEventListener('touchend',cancel);
    trigger.addEventListener('touchcancel',cancel);
    trigger.addEventListener('contextmenu',e=>e.preventDefault());
  })();

  function openAvatarModal(){
    const m=document.getElementById('avatar-modal');
    const inp=document.getElementById('avBase64Input');
    const st=document.getElementById('avStatus');
    const pv=document.getElementById('avPreview');
    let saved=null;
    try{saved=localStorage.getItem(AVATAR_KEY);}catch(e){}
    st.textContent='';st.style.color='#0ea5e9';
    pv.innerHTML=saved?`<img src="${saved}">`:'🎀';
    inp.value='';
    m.classList.add('show');
    setTimeout(()=>inp.focus(),100);
  }
  function closeAvatarModal(){document.getElementById('avatar-modal').classList.remove('show');}
  function saveAvatar(){
    const inp=document.getElementById('avBase64Input');
    const st=document.getElementById('avStatus');
    const pv=document.getElementById('avPreview');
    const val=inp.value.trim();
    if(!val){st.style.color='#ff4f96';st.textContent='⚠️ Vui lòng dán chuỗi Base64!';return;}
    if(val.length<20){st.style.color='#ef4444';st.textContent='⚠️ Chuỗi quá ngắn!';return;}
    const src=normalizeAvatar(val);
    if(!src){st.style.color='#ef4444';st.textContent='❌ Không nhận diện được!';return;}
    const tmp=new Image();
    tmp.onload=()=>{
      try{localStorage.setItem(AVATAR_KEY,src);}catch(e){}
      applyAvatar(src);
      pv.innerHTML=`<img src="${src}">`;
      st.style.color='#00b06b';st.textContent='✅ Đã lưu avatar!';
      setTimeout(closeAvatarModal,900);
    };
    tmp.onerror=()=>{st.style.color='#ef4444';st.textContent='❌ Base64 không hợp lệ!';};
    tmp.src=src;
  }
  function resetAvatar(){
    const st=document.getElementById('avStatus');
    const pv=document.getElementById('avPreview');
    try{localStorage.removeItem(AVATAR_KEY);}catch(e){}
    applyAvatar(DEFAULT_AVATAR);
    pv.innerHTML='🎀';
    st.style.color='#0284c7';st.textContent='↩️ Đã reset';
  }

  /* ============ LOGIN ============ */
  let attempts=0,locked=false;
  function doLogin(){
    if(locked)return;
    const keyEl=document.getElementById('keyInput');
    const key=keyEl.value.trim();
    const btn=document.getElementById('btnLogin');
    const sp=document.getElementById('loginSpinner');
    const bt=document.getElementById('btnText');
    const err=document.getElementById('loginError');
    err.textContent='';
    if(!key){
      err.textContent='⚠️ Vui lòng nhập Key!';
      keyEl.classList.add('shake');setTimeout(()=>keyEl.classList.remove('shake'),500);
      keyEl.focus();return;
    }
    sp.style.display='inline-block';
    bt.innerHTML='ĐANG KIỂM TRA...';
    btn.disabled=true;
    setTimeout(()=>{
      if(key===CFG.key_login){
        bt.innerHTML='<i class="fa-solid fa-check"></i> THÀNH CÔNG';
        err.style.color='#10b981';err.textContent='✅ Đang vào Tool...';
        keyEl.value='';
        try{sessionStorage.setItem('bonsicola_auth','ok');}catch(e){}
        setTimeout(showToolSelect,700);
      }else{
        attempts++;
        sp.style.display='none';
        bt.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP';
        btn.disabled=false;
        err.style.color='#ef4444';err.textContent='❌ Key sai! ('+attempts+')';
        keyEl.classList.add('shake');setTimeout(()=>keyEl.classList.remove('shake'),500);
        keyEl.select();
        if(attempts>=5){
          locked=true;btn.disabled=true;let sec=30;
          const iv=setInterval(()=>{
            sec--;err.textContent='🚫 Thử lại sau '+sec+'s';
            if(sec<=0){
              clearInterval(iv);locked=false;attempts=0;btn.disabled=false;err.textContent='';
              bt.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP';
            }
          },1000);
        }
      }
    },500);
  }
  function doLogout(){
    if(!confirm('Đăng xuất?'))return;
    try{sessionStorage.removeItem('bonsicola_auth');}catch(e){}
    location.reload();
  }

  /* ============ TOOL SELECT ============ */
  let currentCat='all';
  let currentBd=null;

  function buildTabs(){
    const el=document.getElementById('tsTabs');
    if(!el)return;
    const ports=(CFG.ports||[]).filter(p=>p.enabled);
    const cats={
      all:ports.length,
      hot:ports.filter(p=>p.hot==1).length,
      taixiu:ports.filter(p=>p.cat==='taixiu').length,
      sicbo:ports.filter(p=>p.cat==='sicbo').length,
      baccarat:ports.filter(p=>p.cat==='baccarat').length
    };
    const tabs=[
      {k:'all',l:'🎯 Tất cả'},
      {k:'hot',l:'🔥 HOT'},
      {k:'taixiu',l:'🎲 Tài Xỉu'},
      {k:'sicbo',l:'🎰 Sicbo'},
      {k:'baccarat',l:'🃏 Baccarat'}
    ];
    el.innerHTML=tabs.map(t=>
      `<button class="ts-tab${t.k===currentCat?' active':''}" data-cat="${t.k}" onclick="switchCat('${t.k}')">${t.l} (${cats[t.k]||0})</button>`
    ).join('');
  }
  function switchCat(cat){
    currentCat=cat;
    document.querySelectorAll('.ts-tab').forEach(x=>x.classList.toggle('active',x.dataset.cat===cat));
    buildGrid();
  }
  function buildGrid(){
    const grid=document.getElementById('tsGrid');
    if(!grid)return;
    let list=(CFG.ports||[]).filter(p=>p.enabled);
    if(currentCat==='hot')list=list.filter(p=>p.hot==1);
    else if(currentCat!=='all')list=list.filter(p=>p.cat===currentCat);
    list.sort((a,b)=>(a.sort||99)-(b.sort||99));
    if(!list.length){
      grid.innerHTML='<div class="ts-empty">Không có tool nào</div>';
      return;
    }
    grid.innerHTML=list.map(p=>{
      const img=p.image?`<img src="${p.image}" onerror="this.style.display='none';this.parentNode.innerHTML='<i class=\\'fa-solid fa-cube\\'></i>'">`:'<i class="fa-solid fa-cube"></i>';
      const badges=[];
      if(p.hot==1)badges.push('<span class="badge badge-hot">🔥 HOT</span>');
      if(p.is_new==1)badges.push('<span class="badge badge-new">✨ NEW</span>');
      if(p.maintenance==1)badges.push('<span class="badge badge-maint">🚧</span>');
      const cls='ts-item'+(p.maintenance==1?' maint':'');
      return `<div class="${cls}" onclick="openToolBySlug('${p.slug}')">
        <div class="ts-img">${img}</div>
        ${badges.join('')}
        <div class="ts-body">
          <div class="ts-name">${esc(p.name)}</div>
          <div class="ts-cat">${p.cat||'tool'} · ${p.kind||'view'}</div>
        </div>
      </div>`;
    }).join('');
  }
  function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function showToolSelect(){
    document.getElementById('login-screen').classList.add('hide');
    document.getElementById('tool-screen').classList.remove('show');
    document.getElementById('tool-select').classList.add('show');
    buildTabs();
    buildGrid();
  }

  /* ============ OPEN TOOL ============ */
  function openToolBySlug(slug){
    const port=(CFG.ports||[]).find(p=>p.slug===slug);
    if(!port)return;
    if(port.maintenance==1){alert('⚠️ Tool đang bảo trì!');return;}

    document.getElementById('tool-select').classList.remove('show');
    document.getElementById('tool-screen').classList.add('show');

    const badge=document.getElementById('tsBadge');
    badge.textContent=(port.hot==1?'🔥 ':'')+port.name;

    const frame=document.getElementById('gameFrame');
    frame.src=port.game_url||'about:blank';

    const title=document.getElementById('cardTitle');
    title.textContent='AI · '+port.name;

    const panel=document.getElementById('dragPanel');
    panel.classList.add('show');
    panel.style.top='78px';
    panel.style.right='14px';
    panel.style.left='auto';

    if(currentBd){currentBd.stop();currentBd=null;}
    if(port.api_url&&window.Bd){
      currentBd=new window.Bd(port);
      currentBd.start();
    }else{
      document.getElementById('statusText').textContent='Tool này chưa có API';
    }
  }

  function backToSelect(){
    if(currentBd){currentBd.stop();currentBd=null;}
    document.getElementById('gameFrame').src='about:blank';
    document.getElementById('tool-screen').classList.remove('show');
    document.getElementById('tool-select').classList.add('show');
  }

  /* ============ PANEL TOGGLE + DRAG ============ */
  function togglePanel(){
    const card=document.getElementById('predictCard');
    const btn=card.querySelector('.toggle-btn');
    card.classList.toggle('collapsed');
    btn.textContent=card.classList.contains('collapsed')?'+':'−';
  }
  (function drag(){
    const el=document.getElementById('dragPanel');
    if(!el)return;
    let drag=false,sx=0,sy=0,ix=0,iy=0;
    el.addEventListener('pointerdown',e=>{
      if(e.target.closest('.toggle-btn'))return;
      drag=true;sx=e.clientX;sy=e.clientY;
      const r=el.getBoundingClientRect();
      ix=r.left;iy=r.top;
      try{el.setPointerCapture(e.pointerId);}catch(_){}
    });
    el.addEventListener('pointermove',e=>{
      if(!drag)return;
      const dx=e.clientX-sx,dy=e.clientY-sy;
      el.style.left=(ix+dx)+'px';
      el.style.top=(iy+dy)+'px';
      el.style.right='auto';
    });
    const stop=()=>drag=false;
    el.addEventListener('pointerup',stop);
    el.addEventListener('pointercancel',stop);
  })();

  /* ============ INIT ============ */
  document.addEventListener('DOMContentLoaded',()=>{
    applyBranding();
    const ki=document.getElementById('keyInput');
    if(ki)ki.addEventListener('keypress',e=>{if(e.key==='Enter')doLogin();});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){
        const m=document.getElementById('avatar-modal');
        if(m&&m.classList.contains('show'))closeAvatarModal();
      }
    });
    try{
      if(sessionStorage.getItem('bonsicola_auth')==='ok')showToolSelect();
    }catch(e){}
  });

  /* ============ EXPOSE ============ */
  window.doLogin=doLogin;
  window.doLogout=doLogout;
  window.showToolSelect=showToolSelect;
  window.openToolBySlug=openToolBySlug;
  window.backToSelect=backToSelect;
  window.switchCat=switchCat;
  window.togglePanel=togglePanel;
  window.openAvatarModal=openAvatarModal;
  window.closeAvatarModal=closeAvatarModal;
  window.saveAvatar=saveAvatar;
  window.resetAvatar=resetAvatar;
})();
