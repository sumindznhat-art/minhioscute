/* ============================================================
   APP.JS — LOGIC CHÍNH (FIX iOS)
   ============================================================ */

var _currentCat = 'all';

document.addEventListener('DOMContentLoaded', function() {
  loadRemoteConfig().then(function() {
    var s = getSession();
    if (s && s.user) {
      enterApp();
    } else {
      applyLoginBranding();
      applyMusic();
      var ls = document.getElementById('login-screen');
      if (ls) ls.style.display = '';
    }

    ['loginEmail','loginPass'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
    });
    ['regName','regEmail','regPass','regPass2'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') doRegister(); });
    });

    document.addEventListener('click', function once() {
      var audio = document.getElementById('bgMusic');
      if (audio && audio.src && audio.paused && window.CONFIG.music_url) {
        audio.volume = 0.5;
        audio.play().catch(function(){});
      }
      document.removeEventListener('click', once);
    }, { once: true });

    startClock();
  });
});

/* ==================== LOAD CONFIG ==================== */
function loadRemoteConfig() {
  return api('config_get').then(function(res) {
    if (res && res.success && res.config) {
      var remote = res.config;
      var safeKeys = ['site_name','site_desc','marquee','footer','support_link','logo','avatar','music_url','API_BASE'];
      safeKeys.forEach(function(k) {
        if (remote[k] !== undefined && remote[k] !== '') window.CONFIG[k] = remote[k];
      });
      if (remote.bank) window.CONFIG.bank = Object.assign({}, window.CONFIG.bank, remote.bank);
      if (Array.isArray(remote.packages) && remote.packages.length) window.CONFIG.packages = remote.packages;
      if (Array.isArray(remote.ports) && remote.ports.length > 0) window.CONFIG.ports = remote.ports;
    }
  }).catch(function(e) { console.warn('Load config fail', e); });
}

function saveRemoteConfig() {
  var s = getSession();
  if (!s) return Promise.resolve({ success: false, error: 'Chưa đăng nhập' });
  return api('config_save', { email: s.email, password: s.password, config: window.CONFIG });
}

/* ==================== BRANDING ==================== */
function applyLoginBranding() {
  var title = document.getElementById('loginSiteName');
  if (title && window.CONFIG.site_name) title.textContent = window.CONFIG.site_name;
  var sub = document.getElementById('subText');
  if (sub && window.CONFIG.site_desc) sub.textContent = window.CONFIG.site_desc;
  var marquee = document.getElementById('marqueeText');
  if (marquee && window.CONFIG.marquee) marquee.textContent = window.CONFIG.marquee;
  var brand = document.getElementById('hdrBrand');
  if (brand && window.CONFIG.site_name) brand.textContent = window.CONFIG.site_name;
  var footer = document.querySelector('.login-footer');
  if (footer && window.CONFIG.footer) footer.textContent = window.CONFIG.footer;
  var dFoot = document.querySelector('.drawer-foot');
  if (dFoot && window.CONFIG.footer) dFoot.textContent = window.CONFIG.footer;
  if (window.CONFIG.logo) {
    var lg = document.getElementById('loginAvatarImg');
    if (lg) lg.src = window.CONFIG.logo;
  }
}

/* ==================== MUSIC ==================== */
function applyMusic() {
  var audio = document.getElementById('bgMusic');
  if (!audio) return;
  if (window.CONFIG.music_url) {
    audio.src = window.CONFIG.music_url;
    audio.loop = true;
    audio.volume = 0.5;
  } else {
    audio.removeAttribute('src');
    try { audio.load(); } catch(e) {}
  }
}

function applyDefaultAvatar() {
  var s = getSession();
  if (!s || !s.user) return;
  var u = s.user;
  var av = u.avatar || getAvatarFromStorage() || window.CONFIG.avatar || DEFAULT_AVATAR;
  applyAvatarEverywhere(av);
}

/* ==================== ENTER APP ==================== */
function enterApp() {
  var ls = document.getElementById('login-screen'); if (ls) ls.style.display = 'none';
  var app = document.getElementById('app'); if (app) app.style.display = 'flex';

  var s = getSession();
  if (!s) { doLogout(); return; }
  var u = s.user;

  apiGetUser().then(function(res) {
    if (res && res.success && res.user) u = res.user;
    if (!u) { doLogout(); return; }

    var isAdmin = (u.email === ADMIN_EMAIL) || (u.is_admin == 1);
    var float = document.getElementById('adminFloat');
    var diAdm = document.getElementById('diAdmin');
    if (float) float.style.display = isAdmin ? 'flex' : 'none';
    if (diAdm) diAdm.style.display = isAdmin ? '' : 'none';

    var av = u.avatar || getAvatarFromStorage() || window.CONFIG.avatar || DEFAULT_AVATAR;
    applyAvatarEverywhere(av);

    var dn = document.getElementById('drawerName'); if (dn) dn.textContent = u.name || 'User';
    var de = document.getElementById('drawerEmail'); if (de) de.textContent = u.email;

    if (isAdmin) {
      api('deposit_pending', { email: s.email, password: s.password }).then(function(r) {
        var cnt = r && r.success ? (r.deposits || []).length : 0;
        var b = document.getElementById('pendBadge');
        if (b) { b.textContent = cnt; b.style.display = cnt ? 'inline-block' : 'none'; }
      });
    }

    applyLoginBranding();
    applyMusic();
    buildBankInfo();
    buildPackages();
    buildCatTabs();
    buildPorts();
    renderAll();
    showPage('home');
  });
}

/* ==================== ĐIỀU HƯỚNG ==================== */
function showPage(p) {
  document.querySelectorAll('.page').forEach(function(x) { x.classList.remove('active'); });
  var el = document.getElementById('page-' + p);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.toggle('active', b.dataset.page === p); });
  var c = document.getElementById('appContent');
  if (c) c.scrollTop = 0;
  if (p === 'deposit' || p === 'vip' || p === 'profile') renderAll();
}

/* ==================== ĐỒNG HỒ ==================== */
function startClock() {
  setInterval(function() {
    var d = new Date();
    var t = d.toLocaleTimeString('vi-VN', { hour12: false });
    var dt = d.toLocaleDateString('vi-VN');
    var a = document.getElementById('liveClock'); if (a) a.textContent = t;
    var b = document.getElementById('liveDate'); if (b) b.textContent = dt;
  }, 1000);
}

/* ==================== RENDER ==================== */
function renderAll() {
  var s = getSession();
  if (!s || !s.user) return;
  var u = s.user;

  var bal = fmt(u.balance || 0);
  ['hdrBalance','curBalance','depBalance','vipBalance','profBalance'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.textContent = bal;
  });

  var pn = document.getElementById('profName');       if (pn) pn.textContent = u.name || 'User';
  var pr = document.getElementById('profRole');       if (pr) pr.textContent = (u.is_admin == 1 || u.email === ADMIN_EMAIL) ? 'ADMIN' : 'THÀNH VIÊN';
  var pj = document.getElementById('profJoined');     if (pj) pj.textContent = u.created_at ? new Date(Number(u.created_at)).toLocaleDateString('vi-VN') : '—';
  var pl = document.getElementById('profLastLogin');  if (pl) pl.textContent = u.last_login ? new Date(Number(u.last_login)).toLocaleString('vi-VN') : '—';
  var pi = document.getElementById('profIP');         if (pi) pi.textContent = u.ip || '—';

  var hasVip = Number(u.key_expiry) > Date.now();
  var cp = document.getElementById('curPackage');     if (cp) cp.textContent = hasVip ? 'VIP' : 'Chưa có';
  var ve = document.getElementById('vipExpiry');      if (ve) ve.textContent = hasVip ? new Date(Number(u.key_expiry)).toLocaleString('vi-VN') : 'Chưa kích hoạt';
  var ds = document.getElementById('depStatus');      if (ds) ds.textContent = hasVip ? 'VIP đến ' + new Date(Number(u.key_expiry)).toLocaleDateString('vi-VN') : 'Chưa có key';
}

/* ==================== BANK ==================== */
function buildBankInfo() {
  var el = document.getElementById('bankInfo');
  if (!el) return;
  var b = window.CONFIG.bank || {};
  el.innerHTML =
    '<div class="section-title">Thông tin chuyển khoản</div>' +
    '<div class="pay-method" style="cursor:default">' +
      '<div class="pay-icon"><i class="fa-solid fa-building-columns"></i></div>' +
      '<div class="pay-info">' +
        '<div class="name">' + esc(b.name || '—') + '</div>' +
        '<div class="desc">STK: <b>' + esc(b.account || '—') + '</b> — ' + esc(b.owner || '—') + '</div>' +
      '</div>' +
    '</div>' +
    (b.qr ? '<div class="bank-qr"><img src="' + b.qr + '" alt="QR"><div class="hint">📱 Quét mã QR</div></div>' : '');
}

/* ==================== PACKAGES ==================== */
function buildPackages() {
  var el = document.getElementById('pkgList');
  if (!el) return;
  var pkgs = window.CONFIG.packages || [];
  el.innerHTML = pkgs.map(function(p) {
    return '<div class="pay-method" onclick="buyPackage(\'' + p.id + '\')">' +
      '<div class="pay-icon yellow"><i class="fa-solid fa-crown"></i></div>' +
      '<div class="pay-info">' +
        '<div class="name">' + esc(p.name) + '</div>' +
        '<div class="desc">' + p.days + ' ngày • <b>' + fmt(p.price) + '</b></div>' +
      '</div>' +
      '<i class="fa-solid fa-chevron-right pay-arrow"></i>' +
    '</div>';
  }).join('');
}

function buyPackage(id) {
  var pkg = (window.CONFIG.packages || []).filter(function(x) { return x.id === id; })[0];
  if (!pkg) return;
  var s = getSession();
  if (!s) return alert('Vui lòng đăng nhập lại!');
  var u = s.user;
  if ((u.balance || 0) < pkg.price) { alert('Số dư không đủ!'); showPage('deposit'); return; }
  if (!confirm('Mua ' + pkg.name + ' với giá ' + fmt(pkg.price) + '?')) return;

  apiBuyPackage(pkg.days, pkg.price).then(function(res) {
    if (res && res.success) {
      alert('✅ Mua thành công!');
      apiGetUser().then(function() { renderAll(); });
    } else alert('❌ ' + ((res && res.error) || 'Lỗi'));
  });
}

/* ==================== CATEGORY TABS ==================== */
function buildCatTabs() {
  var el = document.getElementById('catTabs');
  if (!el) return;
  var ports = window.CONFIG.ports || [];

  var cats = {
    all: ports.filter(function(p) { return p.enabled; }).length,
    taixiu: ports.filter(function(p) { return p.enabled && p.cat === 'taixiu'; }).length,
    sicbo: ports.filter(function(p) { return p.enabled && p.cat === 'sicbo'; }).length,
    baccarat: ports.filter(function(p) { return p.enabled && p.cat === 'baccarat'; }).length,
    hot: ports.filter(function(p) { return p.enabled && p.hot == 1; }).length
  };

  var tabs = [
    { key: 'all', label: '🎯 Tất cả', count: cats.all },
    { key: 'taixiu', label: '🎲 Tài Xỉu', count: cats.taixiu },
    { key: 'sicbo', label: '🎰 Sicbo', count: cats.sicbo },
    { key: 'baccarat', label: '🃏 Baccarat', count: cats.baccarat },
    { key: 'hot', label: '🔥 HOT', count: cats.hot }
  ];

  el.innerHTML = tabs.map(function(t) {
    return '<button class="cat-tab ' + (t.key === _currentCat ? 'active' : '') + '" data-cat="' + t.key + '" onclick="switchCat(\'' + t.key + '\')">' +
      t.label + ' <span style="opacity:.7;font-size:10px">(' + t.count + ')</span></button>';
  }).join('');
}

function switchCat(cat) {
  _currentCat = cat;
  document.querySelectorAll('.cat-tab').forEach(function(x) { x.classList.toggle('active', x.dataset.cat === cat); });
  buildPorts();
}

/* ==================== PORTS ==================== */
function buildPorts() {
  var el = document.getElementById('toolList');
  if (!el) return;
  var ports = window.CONFIG.ports || [];

  var list = ports.filter(function(p) { return p.enabled; });
  if (_currentCat !== 'all') {
    if (_currentCat === 'hot') list = list.filter(function(p) { return p.hot == 1; });
    else list = list.filter(function(p) { return p.cat === _currentCat; });
  }

  list.sort(function(a, b) { return (a.sort || 0) - (b.sort || 0); });

  var tc = document.getElementById('toolCount');
  if (tc) tc.textContent = list.length;

  if (!list.length) {
    el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:40px 20px">Không có tool nào</p>';
    return;
  }

  var s = getSession();
  var u = s ? s.user : null;
  var hasVip = u ? (Number(u.key_expiry) > Date.now() || u.is_admin == 1 || u.email === ADMIN_EMAIL) : false;

  el.innerHTML = list.map(function(t) {
    var img = getToolImage(t);
    var badges = [];
    if (t.hot == 1) badges.push('<span class="tool-badge-hot">🔥 HOT</span>');
    if (t.is_new == 1) badges.push('<span class="tool-badge-new">✨ NEW</span>');
    if (t.maintenance == 1) badges.push('<span class="tool-badge-maint">🚧 BẢO TRÌ</span>');

    var canOpen = hasVip || t.vip == 0;
    var statusClass = canOpen && !t.maintenance ? 'ok' : '';
    var statusText = t.maintenance ? 'Bảo trì' : (canOpen ? 'Đã mở' : 'Cần VIP');
    var kindIcon = t.kind === 'panel' ? 'fa-chart-line' : (t.kind === 'baccarat' ? 'fa-diamond' : 'fa-gamepad');

    var logoHtml = img
      ? '<img src="' + img + '" alt="' + esc(t.name) + '">'
      : '<i class="fa-solid ' + kindIcon + '" style="color:#a855f7;font-size:22px"></i>';

    return '<div class="tool-card ' + (t.maintenance ? 'disabled' : '') + '" onclick="openTool(\'' + t.slug + '\')">' +
      '<div class="tool-head">' +
        '<div class="tool-logo">' + logoHtml + '</div>' +
        '<div class="tool-info">' +
          '<div class="tool-name-row">' +
            '<div class="tool-name">' + esc(t.name) + '</div>' +
            badges.join('') +
          '</div>' +
          '<div class="tool-desc">' +
            (t.kind === 'panel' ? '📊 Chỉ panel AI' :
             t.kind === 'baccarat' ? '🃏 Baccarat AI' :
             '🎮 Vào game trực tiếp') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="tool-footer">' +
        '<div class="vip-req ' + statusClass + '"><span class="dot"></span> ' + statusText + '</div>' +
        '<button class="tool-btn ' + (canOpen && !t.maintenance ? 'unlocked' : '') + '">' +
          (t.maintenance ? '<i class="fa-solid fa-hammer"></i> BẢO TRÌ' :
           (canOpen ? '<i class="fa-solid fa-play"></i> MỞ TOOL' : '<i class="fa-solid fa-lock"></i> MỞ KHOÁ')) +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* ==================== NẠP ==================== */
function openDepositModal() {
  var a = document.getElementById('depAmount'); if (a) a.value = '';
  var n = document.getElementById('depNote');   if (n) n.value = '';
  openModal('depositModal');
}

/* ==================== LỊCH SỬ ==================== */
function openHistoryDeposit() {
  var s = getSession();
  if (!s) return;
  api('history', { email: s.email, password: s.password }).then(function(res) {
    var hist = (res && res.success) ? (res.history || []) : [];
    var deps = hist.filter(function(h) { return h.type === 'deposit' || h.type === 'auto-buy'; });

    var html = deps.length ? '' : '<p style="text-align:center;color:#94a3b8">Chưa có giao dịch</p>';
    deps.forEach(function(d) {
      var amt = Number(d.amount) || 0;
      var color = amt > 0 ? '#16a34a' : '#dc2626';
      var sign = amt > 0 ? '+' : '';
      html += '<div style="border-left:3px solid ' + color + ';padding:8px;margin-bottom:6px;background:#f8fafc;border-radius:6px">' +
        '<div style="font-weight:700;color:' + color + '">' + sign + fmt(amt) + '</div>' +
        '<div style="font-size:12px;color:#64748b">' + esc(d.note || '') + '</div>' +
        '<div style="font-size:11px;color:#94a3b8">' + new Date(Number(d.at)).toLocaleString('vi-VN') + '</div>' +
      '</div>';
    });
    var t = document.getElementById('histTitle'); if (t) t.textContent = 'Lịch sử nạp tiền';
    var c = document.getElementById('histContent'); if (c) c.innerHTML = html;
    openModal('historyModal');
  });
}

function openHistoryKey() {
  var s = getSession();
  if (!s) return;
  api('history', { email: s.email, password: s.password }).then(function(res) {
    var hist = (res && res.success) ? (res.history || []) : [];
    var keys = hist.filter(function(h) { return h.type === 'key' || h.type === 'buy'; });
    var html = keys.length ? '' : '<p style="text-align:center;color:#94a3b8">Chưa có lịch sử</p>';
    keys.forEach(function(h) {
      html += '<div style="border-left:3px solid #8b5cf6;padding:8px;margin-bottom:6px;background:#f8fafc;border-radius:6px">' +
        '<div style="font-weight:700">' + esc(h.note || h.type) + '</div>' +
        '<div style="font-size:12px;color:#64748b">' + (h.amount ? (h.amount > 0 ? '+' : '') + fmt(h.amount) : '') + '</div>' +
        '<div style="font-size:11px;color:#94a3b8">' + new Date(Number(h.at)).toLocaleString('vi-VN') + '</div>' +
      '</div>';
    });
    var t = document.getElementById('histTitle'); if (t) t.textContent = 'Lịch sử mua key';
    var c = document.getElementById('histContent'); if (c) c.innerHTML = html;
    openModal('historyModal');
  });
}

/* ==================== MODAL ==================== */
function openModal(id)  { var el = document.getElementById(id); if (el) el.classList.add('show'); }
function closeModal(id) { var el = document.getElementById(id); if (el) el.classList.remove('show'); }

function openKeyModal() {
  var ki = document.getElementById('keyInput'); if (ki) ki.value = '';
  var ke = document.getElementById('keyErr');   if (ke) ke.textContent = '';
  openModal('keyModal');
}
function openAvatarModal() {
  var st = document.getElementById('avStatus'); if (st) st.textContent = '';
  var inp = document.getElementById('avBase64Input'); if (inp) inp.value = '';
  openModal('avatarModal');
}
function saveAvatar() {
  var val = document.getElementById('avBase64Input').value.trim();
  var status = document.getElementById('avStatus');
  if (!val) { if (status) status.textContent = 'Chưa có dữ liệu'; return; }
  var src = val.indexOf('data:') === 0 ? val : 'data:image/png;base64,' + val;
  setAvatarToStorage(src);
  applyAvatarEverywhere(src);
  if (status) status.textContent = '✅ Đã lưu';
  setTimeout(function() { closeModal('avatarModal'); }, 800);
}
function resetAvatar() {
  setAvatarToStorage('');
  applyAvatarEverywhere(window.CONFIG.avatar || DEFAULT_AVATAR);
  var status = document.getElementById('avStatus');
  if (status) status.textContent = '✅ Đã reset';
}

/* ==================== DRAWER ==================== */
function openDrawer() {
  var d = document.getElementById('drawer'); if (d) d.classList.add('show');
  var m = document.getElementById('drawerMask'); if (m) m.classList.add('show');
}
function closeDrawer() {
  var d = document.getElementById('drawer'); if (d) d.classList.remove('show');
  var m = document.getElementById('drawerMask'); if (m) m.classList.remove('show');
}

/* ==================== MUSIC BUTTON ==================== */
var _musicOn = false;
function toggleMusic() {
  var audio = document.getElementById('bgMusic');
  var btn = document.getElementById('musicBtn');
  if (!audio || !window.CONFIG.music_url) {
    if (btn) btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    return alert('Chưa cấu hình nhạc nền!');
  }
  if (_musicOn) {
    audio.pause();
    _musicOn = false;
    if (btn) btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
  } else {
    audio.volume = 0.5;
    audio.play().catch(function(){});
    _musicOn = true;
    if (btn) btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
  }
}

/* ==================== EXPOSE ==================== */
window.enterApp = enterApp;
window.showPage = showPage;
window.renderAll = renderAll;
window.openDepositModal = openDepositModal;
window.openHistoryDeposit = openHistoryDeposit;
window.openHistoryKey = openHistoryKey;
window.openKeyModal = openKeyModal;
window.openAvatarModal = openAvatarModal;
window.saveAvatar = saveAvatar;
window.resetAvatar = resetAvatar;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.toggleMusic = toggleMusic;
window.buyPackage = buyPackage;
window.openModal = openModal;
window.closeModal = closeModal;
window.loadRemoteConfig = loadRemoteConfig;
window.saveRemoteConfig = saveRemoteConfig;
window.buildPorts = buildPorts;
window.buildCatTabs = buildCatTabs;
window.switchCat = switchCat;
window.buildBankInfo = buildBankInfo;
window.buildPackages = buildPackages;
window.applyLoginBranding = applyLoginBranding;
window.applyMusic = applyMusic;
window.applyDefaultAvatar = applyDefaultAvatar;
