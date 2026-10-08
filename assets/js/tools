/* ============================================================
   TOOLS.JS — MỞ GAME + HIỆN TOOL AI PHÂN TÍCH NGAY
   ============================================================ */

let activeTool = null, toolInterval = null;
let _engine = null, _lastSid = null, _lastGy = null, _im = false;
let _blobUrl = null;

function getToolImage(t){ return t ? (t.image || t.image_base64 || '') : ''; }

function setStatus(state, text){
  const el = document.getElementById('gsStatus');
  const txt = document.getElementById('gsStatusText');
  if(!el || !txt) return;
  el.classList.remove('err','wait');
  if(state === 'err') el.classList.add('err');
  else if(state === 'wait') el.classList.add('wait');
  txt.textContent = text;
}

/* ============================================================
   MỞ GAME — ẤN VÔ LÀ HIỆN TOOL NGAY
   ============================================================ */
function openTool(slugOrId){
  const ports = window.CONFIG.ports || [];
  const tool = ports.find(x => x.slug === slugOrId || x.name === slugOrId);
  if(!tool) return alert('Tool không tồn tại!');
  if(!tool.enabled) return alert('🚫 Tool đã bị tắt!');
  if(tool.maintenance) return alert('🚧 Tool đang bảo trì!');

  const s = getSession();
  if(!s) return alert('Vui lòng đăng nhập!');
  const u = s.user;

  /* Check VIP */
  const isAdmin = (u.email === ADMIN_EMAIL) || (u.is_admin == 1);
  const isVIP = isAdmin || (tool.vip == 0) || (Number(u.key_expiry) > Date.now());

  if(!isVIP){
    const hasMoney = u.balance > 0;
    const msg = '🔒 CẦN KÍCH HOẠT VIP ĐỂ MỞ TOOL\n\n' +
                '💰 Số dư: ' + fmt(u.balance) + '\n' +
                '📅 Key: ' + (u.key_expiry ? 'HẾT HẠN ' + fmtDate(u.key_expiry) : 'Chưa kích hoạt') + '\n\n' +
                'Bạn muốn:\n' +
                '• OK → ' + (hasMoney ? 'Mua gói VIP ngay' : 'Nạp tiền vào ví') + '\n' +
                '• Cancel → Nhập key có sẵn';
    const goBuy = confirm(msg);
    if(goBuy){
      if(hasMoney) showPage('vip');
      else showPage('deposit');
    } else openKeyModal();
    return;
  }

  /* Mở game screen */
  activeTool = tool;
  _engine = new TEEngine.Yq();
  _lastSid = null; _lastGy = null; _im = false;

  document.getElementById('gsName').textContent = tool.name;
  document.getElementById('gsLogo').src = getToolImage(tool) || '';
  document.getElementById('panelTitle').textContent = 
    tool.cat === 'baccarat' ? 'BACCARAT AI' : 
    (tool.name.toLowerCase().includes('md5') ? 'MD5' : 'TÀI XỈU');

  const card = document.querySelector('.predict-card');
  if(card){
    card.classList.toggle('md5', tool.name.toLowerCase().includes('md5'));
    card.style.display = 'block';
  }

  setStatus('wait', 'Đang kết nối');

  /* Load iframe */
  const frame = document.getElementById('gameFrame');
  const frameWrap = document.querySelector('.game-frame');
  if(_blobUrl){ try{ URL.revokeObjectURL(_blobUrl); }catch(e){} _blobUrl = null; }

  if(tool.kind === 'panel' || !tool.game_url){
    // Chỉ panel, không có game → ẩn iframe
    if(frame){ frame.src = 'about:blank'; frame.style.display = 'none'; }
    document.getElementById('game-screen').classList.add('show');
  } else {
    // Có game → hiện iframe
    if(frame){
      frame.style.display = 'block';
      frame.src = tool.game_url;
    }
    document.getElementById('game-screen').classList.add('show');
  }

  if(tool.api_url && typeof apiUpdateLastApi === 'function') apiUpdateLastApi(tool.api_url, tool.name).catch(()=>{});

  if(toolInterval){ clearInterval(toolInterval); toolInterval = null; }
  resetPanel();

  /* Chạy phân tích NGAY LẬP TỨC */
  if(tool.api_url){
    setStatus('wait', 'Đang phân tích...');
    tickApi();
    toolInterval = setInterval(tickApi, 4000);
  } else {
    setStatus('ok', 'OK');
    const st = document.getElementById('statusText');
    if(st) st.textContent = 'Chế độ xem';
  }
}

function closeGame(){
  document.getElementById('game-screen').classList.remove('show');
  const frame = document.getElementById('gameFrame');
  if(frame){ frame.src = 'about:blank'; frame.style.display = 'block'; }
  if(_blobUrl){ try{ URL.revokeObjectURL(_blobUrl); }catch(e){} _blobUrl = null; }
  if(toolInterval){ clearInterval(toolInterval); toolInterval = null; }
  activeTool = null;
}

function togglePanel(){ 
  const card = document.querySelector('.predict-card');
  if(card) card.classList.toggle('collapsed'); 
}

function resetPanel(){
  const tc = document.getElementById('taiCircle'), xc = document.getElementById('xiuCircle');
  if(tc){ tc.className = 'tx-circle tai'; tc.textContent = '--%'; }
  if(xc){ xc.className = 'tx-circle xiu'; xc.textContent = '--%'; }
  const sid = document.getElementById('sidValue'); if(sid) sid.textContent = '#@hk';
  const st = document.getElementById('statusText');
  if(st){ st.textContent = 'Đang kết nối...'; st.classList.remove('analyzing'); }
}

function setCircles(gy, active, rt, rx){
  const tc = document.getElementById('taiCircle'), xc = document.getElementById('xiuCircle');
  if(!tc || !xc) return;
  tc.className = 'tx-circle tai'; xc.className = 'tx-circle xiu';
  if(rt != null && rx != null){
    tc.textContent = Math.round(rt) + '%';
    xc.textContent = Math.round(rx) + '%';
  } else {
    tc.textContent = '--%'; xc.textContent = '--%';
  }
  if(gy){ const el = gy === 'TAI' ? tc : xc; el.classList.add(active ? 'active' : 'resting'); }
}

async function tickApi(){
  if(!activeTool || !activeTool.api_url) return;
  try{
    const r = await fetch(activeTool.api_url, {cache: 'no-store'});
    if(!r.ok) throw 0;
    const data = await r.json();
    
    let list = data.list || data.data || data.sessions || data.result || data.history || data.items || data.soicau || data.results;
    if(!Array.isArray(list) && data.data && typeof data.data === 'object'){
      const first = Object.values(data.data).find(v => Array.isArray(v));
      if(first) list = first;
    }
    if(!Array.isArray(list) || !list.length) throw 0;
    
    const asc = [...list].sort((a,b) => {
      const ia = a.id ?? a.sessionId ?? a.gameId ?? 0;
      const ib = b.id ?? b.sessionId ?? b.gameId ?? 0;
      return ia - ib;
    });
    
    const nid = list[0].id ?? list[0].sessionId ?? asc[asc.length-1].id ?? Date.now();

    setStatus('ok', 'OK');
    const sid = document.getElementById('sidValue'); 
    if(sid) sid.textContent = '#' + (nid + 1);

    if(_lastSid !== null && nid !== _lastSid){
      _im = true;
      setCircles(null, false, null, null);
      const st = document.getElementById('statusText'); 
      if(st) st.textContent = 'Chờ ván mới...';
      setTimeout(() => { _im = false; analyze(asc, nid); }, 5000);
      _lastSid = nid; 
      return;
    }
    _lastSid = nid;
    if(!_im) analyze(asc, nid);
  }catch(e){
    setStatus('err', 'Lỗi kết nối');
    const st = document.getElementById('statusText'); 
    if(st) st.textContent = 'Đang kết nối lại...';
  }
}

function analyze(asc, nid){
  try{
    _engine.nap(asc);
    const qs = TEEngine.predict(_engine);
    const sid = document.getElementById('sidValue'); 
    if(sid) sid.textContent = '#' + (nid + 1);
    
    if(qs.g){
      setCircles(qs.g, true, qs.rt, qs.rx);
      const st = document.getElementById('statusText');
      if(st){ st.textContent = 'Sẵn sàng'; st.classList.add('analyzing'); }
      _lastGy = qs.g;
    } else {
      setCircles(null, false, null, null);
      const st = document.getElementById('statusText'); 
      if(st) st.textContent = 'Chờ dữ liệu...';
      _lastGy = null;
    }
  }catch(e){
    console.error('Analyze error', e);
  }
}

/* ============ DRAG PANEL ============ */
(function(){
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('dragPanel'); 
    if(!el) return;
    let drag = false, sx, sy, ix, iy;
    el.addEventListener('pointerdown', e => {
      if(e.target.closest('.toggle-btn')) return;
      drag = true; sx = e.clientX; sy = e.clientY; ix = el.offsetLeft; iy = el.offsetTop;
      try{ el.setPointerCapture(e.pointerId); }catch(_){}
    });
    el.addEventListener('pointermove', e => {
      if(!drag) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      requestAnimationFrame(() => {
        el.style.left = (ix + dx) + 'px';
        el.style.top = (iy + dy) + 'px';
        el.style.right = 'auto';
      });
    });
    const stop = () => drag = false;
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  });
})();

window.openTool = openTool;
window.closeGame = closeGame;
window.togglePanel = togglePanel;
