/* ============================================================
   APP.JS — Login + Avatar + Drag panel
   ============================================================ */
(function(){
  'use strict';

  /* ============ AVATAR ============ */
  const AVATAR_BASE64 = '';
  const AVATAR_KEY = 'hk_avatar_v1';
  const DEFAULT_AVATAR_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%23e0f2fe'/><stop offset='100%25' stop-color='%23bae6fd'/></linearGradient></defs><rect fill='url(%23g)' width='200' height='200'/><text x='50%25' y='56%25' font-family='Segoe UI' font-size='100' text-anchor='middle' dominant-baseline='middle'>🎀</text></svg>";

  function normalizeAvatar(raw) {
    if (!raw) return null;
    raw = raw.trim();
    if (!raw) return null;
    if (/^data:image\//i.test(raw)) return raw;
    let mime = 'image/jpeg';
    if (raw.startsWith('iVBOR')) mime = 'image/png';
    else if (raw.startsWith('R0lGOD')) mime = 'image/gif';
    else if (raw.startsWith('UklGR')) mime = 'image/webp';
    else if (raw.startsWith('/9j/')) mime = 'image/jpeg';
    return `data:${mime};base64,${raw}`;
  }
  function applyAvatar(src) {
    const img = document.getElementById('loginAvatarImg');
    if (img && src) img.src = src;
  }
  window.addEventListener('load', () => {
    let saved = null;
    try { saved = localStorage.getItem(AVATAR_KEY); } catch(e){}
    if (saved) { applyAvatar(saved); return; }
    if (!AVATAR_BASE64 || AVATAR_BASE64.trim().length < 50) return;
    const src = normalizeAvatar(AVATAR_BASE64);
    if (src) {
      applyAvatar(src);
      try { localStorage.setItem(AVATAR_KEY, src); } catch(e){}
    }
  });

  /* ============ LONG-PRESS 1.5s MỞ POPUP AVATAR ============ */
  (function() {
    const trigger = document.getElementById('avatarTrigger');
    if (!trigger) return;
    const HOLD_MS = 1500;
    let holdTimer = null, holding = false, startX = 0, startY = 0, moved = false;
    const MOVE_TOL = 12;

    function start(x, y) {
      startX = x; startY = y; moved = false; holding = true;
      trigger.classList.add('holding');
      holdTimer = setTimeout(() => {
        if (!holding || moved) return;
        trigger.classList.remove('holding');
        holding = false;
        try { if (navigator.vibrate) navigator.vibrate(30); } catch(e){}
        openAvatarModal();
      }, HOLD_MS);
    }
    function cancel() {
      holding = false;
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      trigger.classList.remove('holding');
    }
    function move(x, y) {
      if (!holding) return;
      if (Math.abs(x - startX) > MOVE_TOL || Math.abs(y - startY) > MOVE_TOL) {
        moved = true;
        cancel();
      }
    }
    trigger.addEventListener('mousedown', e => { e.preventDefault(); start(e.clientX, e.clientY); });
    trigger.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    trigger.addEventListener('mouseup', cancel);
    trigger.addEventListener('mouseleave', cancel);
    trigger.addEventListener('touchstart', e => {
      const t = e.touches[0];
      start(t.clientX, t.clientY);
    }, {passive: true});
    trigger.addEventListener('touchmove', e => {
      const t = e.touches[0];
      move(t.clientX, t.clientY);
    }, {passive: true});
    trigger.addEventListener('touchend', cancel);
    trigger.addEventListener('touchcancel', cancel);
    trigger.addEventListener('contextmenu', e => e.preventDefault());
  })();

  /* ============ POPUP AVATAR ============ */
  function openAvatarModal() {
    const m = document.getElementById('avatar-modal');
    const inp = document.getElementById('avBase64Input');
    const st = document.getElementById('avStatus');
    const pv = document.getElementById('avPreview');
    let saved = null;
    try { saved = localStorage.getItem(AVATAR_KEY); } catch(e){}
    st.textContent = '';
    st.style.color = '#0ea5e9';
    if (saved) {
      pv.innerHTML = `<img src="${saved}" alt="preview">`;
      inp.value = '';
      inp.placeholder = '→ Đã có avatar. Dán base64 mới để thay thế...';
    } else {
      pv.innerHTML = '🎀';
      inp.value = '';
      inp.placeholder = 'Dán chuỗi Base64 ảnh vào đây...\nVí dụ: /9j/4AAQSkZJRg... hoặc data:image/jpeg;base64,/9j/...';
    }
    m.classList.add('show');
    setTimeout(() => inp.focus(), 100);
  }
  function closeAvatarModal() {
    document.getElementById('avatar-modal').classList.remove('show');
  }
  function saveAvatar() {
    const inp = document.getElementById('avBase64Input');
    const st = document.getElementById('avStatus');
    const pv = document.getElementById('avPreview');
    const val = inp.value.trim();
    if (!val) { st.style.color = '#ff4f96'; st.textContent = '⚠️ Vui lòng dán chuỗi Base64!'; return; }
    if (val.length < 50) { st.style.color = '#ef4444'; st.textContent = '⚠️ Chuỗi quá ngắn, không phải ảnh!'; return; }
    const src = normalizeAvatar(val);
    if (!src) { st.style.color = '#ef4444'; st.textContent = '❌ Không nhận diện được ảnh!'; return; }
    const testImg = new Image();
    testImg.onload = () => {
      try { localStorage.setItem(AVATAR_KEY, src); } catch(e){}
      applyAvatar(src);
      pv.innerHTML = `<img src="${src}" alt="preview">`;
      pv.classList.remove('ok');
      void pv.offsetWidth;
      pv.classList.add('ok');
      st.style.color = '#00b06b';
      st.textContent = '✅ Đã lưu avatar thành công!';
      setTimeout(() => { pv.classList.remove('ok'); closeAvatarModal(); }, 1200);
    };
    testImg.onerror = () => {
      st.style.color = '#ef4444';
      st.textContent = '❌ Base64 không hợp lệ — ảnh không load được!';
    };
    testImg.src = src;
  }
  function resetAvatar() {
    const inp = document.getElementById('avBase64Input');
    const st = document.getElementById('avStatus');
    const pv = document.getElementById('avPreview');
    try { localStorage.removeItem(AVATAR_KEY); } catch(e){}
    applyAvatar(DEFAULT_AVATAR_SVG);
    pv.innerHTML = '🎀';
    inp.value = '';
    inp.placeholder = 'Dán chuỗi Base64 ảnh vào đây...\nVí dụ: /9j/4AAQSkZJRg... hoặc data:image/jpeg;base64,/9j/...';
    st.style.color = '#0284c7';
    st.textContent = '↩️ Đã reset về avatar mặc định';
    setTimeout(() => { st.textContent = ''; }, 1500);
  }
  window.openAvatarModal = openAvatarModal;
  window.closeAvatarModal = closeAvatarModal;
  window.saveAvatar = saveAvatar;
  window.resetAvatar = resetAvatar;

  document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('avBase64Input');
    const pv = document.getElementById('avPreview');
    if (inp) {
      let timer = null;
      inp.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const val = inp.value.trim();
          if (val.length < 50) { pv.innerHTML = '🎀'; return; }
          const src = normalizeAvatar(val);
          const tmp = new Image();
          tmp.onload = () => { pv.innerHTML = `<img src="${src}" alt="preview">`; };
          tmp.src = src;
        }, 300);
      });
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const m = document.getElementById('avatar-modal');
        if (m && m.classList.contains('show')) closeAvatarModal();
      }
    });
  });

  /* ============ KEY VERIFY ============ */
  (function() {
    var a = [108,101,104,111], b = [103,110,97], c = [110,105,109], d = [122,100,104];
    window.___verify = function(input) {
      var arr = a.slice().concat(b.slice().reverse()).concat(c.slice().reverse()).concat(d.slice().reverse());
      var k = "";
      for (var i = 0; i < arr.length; i++) k += String.fromCharCode(arr[i]);
      if (input.length !== k.length) return false;
      var ok = 0;
      for (var j = 0; j < input.length; j++) if (input.charCodeAt(j) === k.charCodeAt(j)) ok++;
      return ok === input.length;
    };
  })();

  var loginAttempts = 0, loginLocked = false;
  function doLogin() {
    if (loginLocked) return;
    var keyEl = document.getElementById('keyInput');
    var key = keyEl.value.trim();
    var btn = document.getElementById('btnLogin');
    var sp = document.getElementById('loginSpinner');
    var bt = document.getElementById('btnText');
    var err = document.getElementById('loginError');
    err.textContent = '';
    if (!key) {
      err.textContent = '⚠️ Vui lòng nhập Key!';
      keyEl.classList.add('shake');
      setTimeout(() => keyEl.classList.remove('shake'), 500);
      keyEl.focus(); return;
    }
    sp.style.display = 'inline-block';
    bt.innerHTML = 'ĐANG KIỂM TRA...';
    btn.disabled = true;
    setTimeout(function() {
      if (window.___verify(key)) {
        bt.innerHTML = '<i class="fa-solid fa-check"></i> THÀNH CÔNG';
        err.style.color = '#10b981';
        err.textContent = '✅ Đang vào Tool...';
        keyEl.value = ''; key = null;
        try { sessionStorage.setItem('hk_auth_v1', 'ok'); } catch(e){}
        setTimeout(showToolSelect, 800);
      } else {
        loginAttempts++;
        sp.style.display = 'none';
        bt.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP';
        btn.disabled = false;
        err.style.color = '#ef4444';
        err.textContent = '❌ Key sai! (' + loginAttempts + ')';
        keyEl.classList.add('shake');
        setTimeout(() => keyEl.classList.remove('shake'), 500);
        keyEl.select();
        if (loginAttempts >= 5) {
          loginLocked = true;
          btn.disabled = true;
          var sec = 30;
          var iv = setInterval(function() {
            sec--;
            err.textContent = '🚫 Thử lại sau ' + sec + 's';
            if (sec <= 0) {
              clearInterval(iv);
              loginLocked = false; loginAttempts = 0;
              btn.disabled = false; err.textContent = '';
              bt.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP';
            }
          }, 1000);
        }
      }
    }, 600);
  }
  window.doLogin = doLogin;

  function showToolSelect() {
    document.getElementById('login-screen').classList.add('hide');
    document.getElementById('tool-select').classList.add('show');
  }
  function doLogout() {
    if (!confirm('Đăng xuất?')) return;
    try { sessionStorage.removeItem('hk_auth_v1'); } catch(e){}
    location.reload();
  }
  window.doLogout = doLogout;

  document.getElementById('keyInput').addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });

  window.addEventListener('DOMContentLoaded', () => {
    try {
      if (sessionStorage.getItem('hk_auth_v1') === 'ok') {
        showToolSelect();
      }
    } catch(e){}
  });

  /* ============ TOGGLE PANEL ============ */
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const card = document.getElementById(btn.dataset.target);
      card.classList.toggle('collapsed');
      btn.textContent = card.classList.contains('collapsed') ? '+' : '−';
    });
  });

  /* ============ DRAG PANEL ============ */
  function ganKeoTha(el) {
    let drag = false, sx, sy, ix, iy;
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('.toggle-btn')) return;
      drag = true;
      sx = e.clientX; sy = e.clientY;
      ix = el.offsetLeft; iy = el.offsetTop;
      try { el.setPointerCapture(e.pointerId); } catch(_){}
    });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
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
  }
  document.querySelectorAll('.drag-group').forEach(ganKeoTha);

})();
