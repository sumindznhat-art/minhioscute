/* ============================================================
   ADMIN.JS — QUẢN TRỊ HOÀN CHỈNH
   Duyệt tiền • Users • Tools • Cấu hình (Ảnh/QR/Logo/Nhạc) • Keys
   ============================================================ */

/* ==================== MỞ ADMIN PANEL ==================== */
function openAdmin() {
  var s = getSession();
  if (!s) { alert('Chưa đăng nhập'); return; }
  var u = s.user;
  var isAdmin = (s.email === ADMIN_EMAIL) || (u && u.is_admin == 1);
  if (!isAdmin) { alert('Không có quyền Admin!'); return; }

  ['adminPendingView','adminUsersView','adminToolsView','adminKeysView','adminHistoryView']
    .forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">⏳ Đang tải...</p>';
    });

  openModal('adminPanel');

  renderAdminPending();
  renderAdminUsers();
  renderAdminTools();
  renderAdminKeys();
  renderAdminHistory();
}

function switchAdminTab(t) {
  document.querySelectorAll('.admin-tab').forEach(function(x) {
    x.classList.toggle('active', x.dataset.atab === t);
  });
  var map = {
    pending: 'adminPendingView',
    users: 'adminUsersView',
    tools: 'adminToolsView',
    keys: 'adminKeysView',
    history: 'adminHistoryView'
  };
  Object.keys(map).forEach(function(k) {
    var el = document.getElementById(map[k]);
    if (el) el.style.display = 'none';
  });
  var target = document.getElementById(map[t]);
  if (target) target.style.display = '';
}

/* ============================================================
   NÉN ẢNH TRƯỚC KHI UPLOAD
   ============================================================ */
function fileToBase64(file, maxSize, quality) {
  maxSize = maxSize || 800;
  quality = quality || 0.8;
  return new Promise(function(resolve) {
    if (!file) return resolve('');
    if (file.type.indexOf('image/') !== 0) {
      alert('⚠️ File không phải ảnh!');
      return resolve('');
    }

    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }

        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);

        var result = canvas.toDataURL('image/jpeg', quality);

        if (result.length > 1024 * 1024) {
          result = canvas.toDataURL('image/jpeg', 0.6);
        }
        if (result.length > 1024 * 1024) {
          var c2 = document.createElement('canvas');
          c2.width = Math.round(w * 0.6);
          c2.height = Math.round(h * 0.6);
          c2.getContext('2d').drawImage(img, 0, 0, c2.width, c2.height);
          result = c2.toDataURL('image/jpeg', 0.7);
        }

        console.log('📸 Nén ảnh:', file.name, '→', Math.round(result.length / 1024) + 'KB');
        resolve(result);
      };
      img.onerror = function() { alert('❌ Không đọc được ảnh!'); resolve(''); };
      img.src = e.target.result;
    };
    reader.onerror = function() { alert('❌ Lỗi đọc file!'); resolve(''); };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   1. DUYỆT TIỀN
   ============================================================ */
function renderAdminPending() {
  var s = getSession();
  if (!s) return;
  var el = document.getElementById('adminPendingView');
  if (!el) return;

  api('deposit_pending', { email: s.email, password: s.password })
    .then(function(res) {
      var deps = (res && res.success) ? (res.deposits || []) : [];

      if (!deps.length) {
        el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:30px">🎉 Không có yêu cầu nào chờ duyệt</p>';
        var b = document.getElementById('pendBadge');
        if (b) b.style.display = 'none';
        return;
      }

      var html = '<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Có <b style="color:#dc2626">' + deps.length + '</b> yêu cầu chờ duyệt</p>';

      deps.forEach(function(d) {
        var time = new Date(Number(d.created_at)).toLocaleString('vi-VN');
        html += '<div class="adm-row" style="border:2px solid #fde68a;background:#fffbeb">' +
          '<div><b>' + esc(d.email) + '</b>' + (d.user_name ? ' — ' + esc(d.user_name) : '') + '</div>' +
          '<div style="font-size:16px;color:#dc2626;font-weight:800;margin:4px 0">💵 ' + fmt(d.amount) + '</div>' +
          '<div class="info">🌐 IP: <code>' + esc(d.ip || '—') + '</code></div>' +
          '<div class="info">📝 ' + esc(d.note || '(không có ghi chú)') + '</div>' +
          '<div style="font-size:11px;color:#94a3b8;margin-top:2px">🕐 ' + time + '</div>' +
          '<div style="display:flex;gap:6px;margin-top:8px">' +
            '<button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a);flex:1;margin:0" onclick="approveDeposit(\'' + d.id + '\')">✅ DUYỆT</button>' +
            '<button class="adm-btn" style="background:linear-gradient(135deg,#ef4444,#dc2626);flex:1;margin:0" onclick="rejectDeposit(\'' + d.id + '\')">❌ TỪ CHỐI</button>' +
          '</div>' +
        '</div>';
      });

      el.innerHTML = html;
      var badge = document.getElementById('pendBadge');
      if (badge) { badge.textContent = deps.length; badge.style.display = 'inline-block'; }
    });
}

function approveDeposit(id) {
  if (!confirm('Xác nhận ĐÃ NHẬN ĐƯỢC TIỀN và duyệt?')) return;
  var s = getSession();
  api('deposit_approve', { email: s.email, password: s.password, id: id })
    .then(function(res) {
      if (res && res.success) {
        alert('✅ Đã duyệt! Số dư mới: ' + fmt(res.new_balance));
        renderAdminPending();
        renderAdminUsers();
      } else {
        alert('❌ ' + ((res && res.error) || 'Lỗi duyệt tiền'));
      }
    });
}

function rejectDeposit(id) {
  var reason = prompt('Lý do từ chối:', 'Không hợp lệ');
  if (reason === null) return;
  var s = getSession();
  api('deposit_reject', { email: s.email, password: s.password, id: id, reason: reason || 'Không hợp lệ' })
    .then(function(res) {
      if (res && res.success) {
        alert('❌ Đã từ chối');
        renderAdminPending();
      } else {
        alert('❌ ' + ((res && res.error) || 'Lỗi'));
      }
    });
}

/* ============================================================
   2. QUẢN LÝ USERS
   ============================================================ */
function renderAdminUsers() {
  var s = getSession();
  if (!s) return;
  var el = document.getElementById('adminUsersView');
  if (!el) return;

  api('user_list', { email: s.email, password: s.password })
    .then(function(res) {
      var list = (res && res.success) ? (res.users || []) : [];

      if (!list.length) {
        el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">Không có user</p>';
        return;
      }

      var html = '<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Tổng: <b>' + list.length + '</b> user</p>';

      list.forEach(function(u) {
        var exp = (u.key_expiry && Number(u.key_expiry) > 0)
          ? new Date(Number(u.key_expiry)).toLocaleDateString('vi-VN') : '—';
        var isAdm = (u.is_admin == 1);
        var balance = Number(u.balance) || 0;

        html += '<div class="adm-row">' +
          '<div class="r1">' +
            '<b>' + esc(u.name || 'Không tên') + '</b>' +
            '<span class="badge ' + (isAdm ? 'badge-admin' : 'badge-vip') + '">' + (isAdm ? '👑 ADMIN' : '👤 USER') + '</span>' +
          '</div>' +
          '<div class="info">📧 ' + esc(u.email) + '</div>' +
          '<div class="info">🌐 IP: <code>' + esc(u.ip || '—') + '</code></div>' +
          '<div class="info">💰 Số dư: <b style="color:#16a34a">' + fmt(balance) + '</b></div>' +
          '<div class="info">⏰ Hạn VIP: ' + exp + '</div>' +
          '<div class="acts">' +
            '<button class="b3" onclick="adminResetIP(\'' + esc(u.email) + '\')">🔄 Reset IP</button>' +
            '<button class="b4" onclick="adminAdjustBalance(\'' + esc(u.email) + '\',' + balance + ')">💵 Cấp tiền</button>' +
            (!isAdm ? '<button class="b5" onclick="adminDeleteUser(\'' + esc(u.email) + '\')">🗑 Xoá</button>' : '') +
          '</div>' +
        '</div>';
      });

      el.innerHTML = html;
    });
}

function adminResetIP(email) {
  if (!confirm('Reset IP cho ' + email + '?')) return;
  var s = getSession();
  api('user_reset_ip', { email: s.email, password: s.password, target_email: email })
    .then(function(res) {
      if (res && res.success) {
        alert('✅ Đã reset IP cho ' + email);
        renderAdminUsers();
      } else {
        alert('❌ ' + ((res && res.error) || 'Lỗi'));
      }
    });
}

function adminAdjustBalance(email, currentBal) {
  var input = prompt(
    '👤 User: ' + email + '\n💰 Số dư hiện tại: ' + fmt(currentBal) + '\n\n' +
    'Nhập số tiền muốn CẤP (dùng dấu - để trừ):',
    '10000'
  );
  if (input === null) return;

  var delta = Number(input);
  if (isNaN(delta) || delta === 0) return alert('⚠️ Số không hợp lệ!');

  var newBal = currentBal + delta;
  if (newBal < 0) return alert('⚠️ Số dư sẽ âm! Huỷ thao tác.');

  if (!confirm('XÁC NHẬN CẤP TIỀN\n\n👤 ' + email + '\n💰 Số dư cũ: ' + fmt(currentBal) +
    '\n➕ Thay đổi: ' + (delta > 0 ? '+' : '') + fmt(delta) + '\n💰 Số dư mới: ' + fmt(newBal))) return;

  var s = getSession();
  api('admin_set_balance', {
    email: s.email, password: s.password,
    target_email: email,
    amount: delta
  }).then(function(res) {
    if (res && res.success) {
      alert('✅ ĐÃ CẤP TIỀN!\n\n👤 ' + email + '\n💰 Số dư mới: ' + fmt(res.new_balance || newBal));
      renderAdminUsers();
    } else {
      alert('❌ ' + ((res && res.error) || 'Lỗi server'));
    }
  });
}

function adminDeleteUser(email) {
  if (!confirm('⚠️ XOÁ VĨNH VIỄN user ' + email + '?\nKhông thể hoàn tác!')) return;
  var s = getSession();
  api('user_delete', { email: s.email, password: s.password, target_email: email })
    .then(function(res) {
      if (res && res.success) {
        alert('✅ Đã xoá user');
        renderAdminUsers();
      } else {
        alert('❌ ' + ((res && res.error) || 'Lỗi xoá user'));
      }
    });
}

/* ============================================================
   3. TOOLS + CẤU HÌNH CHUNG
   ============================================================ */
function renderAdminTools() {
  var el = document.getElementById('adminToolsView');
  if (!el) return;
  var ports = window.CONFIG.ports || [];
  var bank = window.CONFIG.bank || {};
  var logo = window.CONFIG.logo || '';
  var avatar = window.CONFIG.avatar || '';
  var musicUrl = window.CONFIG.music_url || '';

  var html = '';

  /* ===== CẤU HÌNH CHUNG ===== */
  html += '<div class="adm-section" style="border-color:#93c5fd;background:#eff6ff">' +
    '<h4>⚙️ CẤU HÌNH CHUNG</h4>' +

    '<label style="font-size:11px;font-weight:700">🌐 API Base URL</label>' +
    '<input class="adm-input" id="cfgApiBase" value="' + esc(window.CONFIG.API_BASE || '') + '">' +

    '<label style="font-size:11px;font-weight:700">📝 Tên Site</label>' +
    '<input class="adm-input" id="cfgSiteName" value="' + esc(window.CONFIG.site_name || '') + '">' +

    '<label style="font-size:11px;font-weight:700">📄 Mô tả</label>' +
    '<input class="adm-input" id="cfgSiteDesc" value="' + esc(window.CONFIG.site_desc || '') + '">' +

    '<label style="font-size:11px;font-weight:700">📢 Chữ chạy</label>' +
    '<input class="adm-input" id="cfgMarquee" value="' + esc(window.CONFIG.marquee || '') + '">' +

    '<label style="font-size:11px;font-weight:700">© Footer</label>' +
    '<input class="adm-input" id="cfgFooter" value="' + esc(window.CONFIG.footer || '') + '">' +

    /* LOGO */
    '<div style="background:#fff;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #bfdbfe">' +
      '<div style="font-size:12px;font-weight:800;color:#1e40af;margin-bottom:8px">🖼️ ẢNH LOGO</div>' +
      '<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">' +
        '<div style="width:70px;height:70px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid #cbd5e1;flex-shrink:0;font-size:28px">' +
          (logo ? '<img src="' + logo + '" style="width:100%;height:100%;object-fit:cover">' : '🎀') +
        '</div>' +
        '<div style="flex:1;min-width:180px">' +
          '<label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">📤 Upload file</label>' +
          '<input type="file" id="cfgLogoFile" accept="image/*" class="adm-input" style="padding:5px;margin-bottom:5px;font-size:11px">' +
          '<label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">🔗 Hoặc dán URL</label>' +
          '<input class="adm-input" id="cfgLogoUrl" value="' + (logo && logo.indexOf('data:') !== 0 ? esc(logo) : '') + '" placeholder="https://..." style="font-size:11px">' +
          '<button class="adm-btn" style="padding:5px;font-size:10px;margin-top:5px;background:#ef4444" onclick="clearLogo()">🗑 Xoá logo</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* AVATAR */
    '<div style="background:#fff;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #bfdbfe">' +
      '<div style="font-size:12px;font-weight:800;color:#1e40af;margin-bottom:8px">👤 AVATAR MẶC ĐỊNH</div>' +
      '<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">' +
        '<div style="width:70px;height:70px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid #cbd5e1;flex-shrink:0;font-size:28px">' +
          (avatar ? '<img src="' + avatar + '" style="width:100%;height:100%;object-fit:cover">' : '🎀') +
        '</div>' +
        '<div style="flex:1;min-width:180px">' +
          '<label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">📤 Upload file</label>' +
          '<input type="file" id="cfgAvatarFile" accept="image/*" class="adm-input" style="padding:5px;margin-bottom:5px;font-size:11px">' +
          '<label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">🔗 Hoặc dán URL</label>' +
          '<input class="adm-input" id="cfgAvatarUrl" value="' + (avatar && avatar.indexOf('data:') !== 0 ? esc(avatar) : '') + '" placeholder="https://..." style="font-size:11px">' +
          '<button class="adm-btn" style="padding:5px;font-size:10px;margin-top:5px;background:#ef4444" onclick="clearAvatar()">🗑 Xoá avatar</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* NHẠC */
    '<div style="background:#fff;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #bfdbfe">' +
      '<div style="font-size:12px;font-weight:800;color:#1e40af;margin-bottom:8px">🎵 NHẠC NỀN</div>' +
      '<label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">🔗 URL file nhạc (.mp3)</label>' +
      '<input class="adm-input" id="cfgMusicUrl" value="' + esc(musicUrl) + '" placeholder="https://.../music.mp3">' +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
        '<button class="adm-btn" style="padding:8px;font-size:11px;background:linear-gradient(135deg,#10b981,#059669);flex:1;margin:0" onclick="testMusic()">▶️ Nghe thử</button>' +
        '<button class="adm-btn" style="padding:8px;font-size:11px;background:#f59e0b;flex:1;margin:0" onclick="stopMusic()">⏸ Dừng</button>' +
        '<button class="adm-btn" style="padding:8px;font-size:11px;background:#ef4444;flex:1;margin:0" onclick="clearMusic()">🗑 Xoá</button>' +
      '</div>' +
      '<div id="musicStatus" style="font-size:11px;color:#64748b;margin-top:6px;text-align:center"></div>' +
    '</div>' +

    /* BANK + QR */
    '<div style="background:#fff;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #bfdbfe">' +
      '<div style="font-size:12px;font-weight:800;color:#1e40af;margin-bottom:8px">🏦 NGÂN HÀNG + QR</div>' +
      '<label style="font-size:11px;font-weight:700">Tên ngân hàng</label>' +
      '<input class="adm-input" id="cfgBankName" value="' + esc(bank.name || '') + '">' +
      '<label style="font-size:11px;font-weight:700">Số tài khoản</label>' +
      '<input class="adm-input" id="cfgBankAcc" value="' + esc(bank.account || '') + '">' +
      '<label style="font-size:11px;font-weight:700">Chủ tài khoản</label>' +
      '<input class="adm-input" id="cfgBankOwner" value="' + esc(bank.owner || '') + '">' +
      '<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-top:8px">' +
        '<div style="width:90px;height:90px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid #cbd5e1;flex-shrink:0;font-size:28px">' +
          (bank.qr ? '<img src="' + bank.qr + '" style="width:100%;height:100%;object-fit:contain">' : '📱') +
        '</div>' +
        '<div style="flex:1;min-width:180px">' +
          '<label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">📤 Upload ảnh QR</label>' +
          '<input type="file" id="cfgQRFile" accept="image/*" class="adm-input" style="padding:5px;margin-bottom:5px;font-size:11px">' +
          '<label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">🔗 Hoặc dán URL QR</label>' +
          '<input class="adm-input" id="cfgQRUrl" value="' + (bank.qr && bank.qr.indexOf('data:') !== 0 ? esc(bank.qr) : '') + '" placeholder="https://..." style="font-size:11px">' +
          '<button class="adm-btn" style="padding:5px;font-size:10px;margin-top:5px;background:#ef4444" onclick="clearQR()">🗑 Xoá QR</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a);margin-top:12px;padding:14px;font-size:14px" onclick="saveSiteConfig()">💾 LƯU TOÀN BỘ CẤU HÌNH</button>' +
  '</div>';

  /* ===== THÊM TOOL ===== */
  html += '<div class="adm-section">' +
    '<h4>➕ THÊM GAME / TOOL MỚI</h4>' +
    '<label style="font-size:11px;font-weight:700">Tên tool *</label>' +
    '<input class="adm-input" id="ntName" placeholder="VD: Sunwin Tài Xỉu">' +

    '<label style="font-size:11px;font-weight:700">Danh mục *</label>' +
    '<select class="adm-input" id="ntCat">' +
      '<option value="taixiu">🎲 Tài Xỉu</option>' +
      '<option value="sicbo">🎰 Sicbo</option>' +
      '<option value="baccarat">🃏 Baccarat</option>' +
    '</select>' +

    '<label style="font-size:11px;font-weight:700">Loại *</label>' +
    '<select class="adm-input" id="ntKind">' +
      '<option value="view">👁 View (vào game + panel)</option>' +
      '<option value="panel">📊 Panel (chỉ panel AI)</option>' +
      '<option value="baccarat">🃏 Baccarat</option>' +
    '</select>' +

    '<label style="font-size:11px;font-weight:700">URL Game</label>' +
    '<input class="adm-input" id="ntGameUrl" placeholder="https://...">' +

    '<label style="font-size:11px;font-weight:700">API URL *</label>' +
    '<input class="adm-input" id="ntApiUrl" placeholder="https://.../sessions">' +

    '<label style="font-size:11px;font-weight:700">Thứ tự</label>' +
    '<input class="adm-input" id="ntSort" type="number" value="99">' +

    '<label style="font-size:11px;font-weight:700">Ảnh đại diện</label>' +
    '<input type="file" id="ntImage" accept="image/*" class="adm-input" style="padding:5px">' +

    '<div style="display:flex;gap:14px;margin:10px 0;flex-wrap:wrap">' +
      '<label style="font-size:12px;font-weight:700"><input type="checkbox" id="ntHot"> 🔥 HOT</label>' +
      '<label style="font-size:12px;font-weight:700"><input type="checkbox" id="ntNew"> ✨ NEW</label>' +
      '<label style="font-size:12px;font-weight:700"><input type="checkbox" id="ntVip" checked> 👑 VIP</label>' +
    '</div>' +

    '<button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a)" onclick="addNewTool()">➕ THÊM TOOL</button>' +
  '</div>';

  /* ===== DANH SÁCH TOOL ===== */
  html += '<p style="text-align:center;font-size:12px;color:#64748b;margin:14px 0 8px">📦 Tổng: <b>' + ports.length + '</b> tool</p>';

  if (!ports.length) {
    html += '<p style="text-align:center;color:#94a3b8;padding:20px">Chưa có tool nào</p>';
  } else {
    ports.forEach(function(t, i) {
      var img = getToolImage(t);
      var badges = [];
      if (t.hot == 1) badges.push('🔥');
      if (t.is_new == 1) badges.push('✨');
      if (t.vip == 1) badges.push('👑');
      if (t.maintenance == 1) badges.push('🚧');
      if (!t.enabled) badges.push('❌');

      html += '<div class="adm-row" style="' + (t.maintenance == 1 ? 'opacity:.65' : '') + '">' +
        '<div style="display:flex;gap:10px;align-items:center">' +
          '<div style="width:44px;height:44px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">' +
            (img ? '<img src="' + img + '" style="width:100%;height:100%;object-fit:cover">' : '<i class="fa-solid fa-cube" style="color:#a855f7"></i>') +
          '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:800;font-size:13px">' + esc(t.name) + ' ' + badges.join(' ') + '</div>' +
            '<div class="info" style="font-size:11px">📁 ' + esc(t.cat || '') + ' • ' + esc(t.kind || '') + ' • sort: ' + (t.sort || 0) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="acts">' +
          '<button class="b2" onclick="editTool(' + i + ')">✏️ Sửa</button>' +
          '<button class="b3" onclick="toggleTool(' + i + ',\'enabled\')">' + (t.enabled ? '🚫 Tắt' : '✅ Bật') + '</button>' +
          '<button class="b4" onclick="toggleTool(' + i + ',\'maintenance\')">' + (t.maintenance ? '🔧 Mở' : '🚧 Bảo trì') + '</button>' +
          '<button class="b5" onclick="deleteTool(' + i + ')">🗑 Xoá</button>' +
        '</div>' +
      '</div>';
    });
  }

  el.innerHTML = html;
}

/* ============================================================
   LƯU CẤU HÌNH
   ============================================================ */
function saveSiteConfig() {
  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  var apiBase = val('cfgApiBase');
  if (apiBase) window.CONFIG.API_BASE = apiBase;

  window.CONFIG.site_name = val('cfgSiteName') || 'TOOL MINHIOS';
  window.CONFIG.site_desc = val('cfgSiteDesc');
  window.CONFIG.marquee = val('cfgMarquee');
  window.CONFIG.footer = val('cfgFooter');
  window.CONFIG.music_url = val('cfgMusicUrl');

  window.CONFIG.bank = window.CONFIG.bank || {};
  window.CONFIG.bank.name = val('cfgBankName');
  window.CONFIG.bank.account = val('cfgBankAcc');
  window.CONFIG.bank.owner = val('cfgBankOwner');

  var chain = Promise.resolve();

  /* Logo */
  var logoFile = document.getElementById('cfgLogoFile').files[0];
  if (logoFile) {
    chain = chain.then(function() {
      return fileToBase64(logoFile, 300, 0.85).then(function(b64) {
        if (b64) window.CONFIG.logo = b64;
      });
    });
  } else {
    var logoUrl = val('cfgLogoUrl');
    if (logoUrl) window.CONFIG.logo = logoUrl;
  }

  /* Avatar */
  var avatarFile = document.getElementById('cfgAvatarFile').files[0];
  if (avatarFile) {
    chain = chain.then(function() {
      return fileToBase64(avatarFile, 300, 0.85).then(function(b64) {
        if (b64) window.CONFIG.avatar = b64;
      });
    });
  } else {
    var avatarUrl = val('cfgAvatarUrl');
    if (avatarUrl) window.CONFIG.avatar = avatarUrl;
  }

  /* QR */
  var qrFile = document.getElementById('cfgQRFile').files[0];
  if (qrFile) {
    chain = chain.then(function() {
      return fileToBase64(qrFile, 600, 0.85).then(function(b64) {
        if (b64) window.CONFIG.bank.qr = b64;
      });
    });
  } else {
    var qrUrl = val('cfgQRUrl');
    if (qrUrl) window.CONFIG.bank.qr = qrUrl;
  }

  chain.then(function() {
    var sizeKB = Math.round(JSON.stringify(window.CONFIG).length / 1024);
    console.log('📦 Config size:', sizeKB + 'KB');

    if (sizeKB > 1500) {
      return alert('⚠️ Config quá lớn (' + sizeKB + 'KB). Dùng ảnh nhỏ hơn!');
    }

    return saveRemoteConfig().then(function(res) {
      if (res && res.success) {
        alert('✅ ĐÃ LƯU CẤU HÌNH!');
        if (typeof applyLoginBranding === 'function') applyLoginBranding();
        if (typeof buildBankInfo === 'function') buildBankInfo();
        if (typeof applyMusic === 'function') applyMusic();
        if (typeof applyDefaultAvatar === 'function') applyDefaultAvatar();
        renderAdminTools();
      } else {
        alert('❌ ' + ((res && res.error) || 'Lỗi lưu'));
      }
    });
  }).catch(function(e) {
    alert('❌ Lỗi: ' + e.message);
  });
}

/* ============================================================
   XOÁ ẢNH / NHẠC
   ============================================================ */
function clearLogo() {
  if (!confirm('Xoá logo?')) return;
  window.CONFIG.logo = '';
  saveRemoteConfig().then(function(res) {
    if (res && res.success) {
      if (typeof applyLoginBranding === 'function') applyLoginBranding();
      renderAdminTools();
      alert('✅ Đã xoá logo');
    }
  });
}

function clearAvatar() {
  if (!confirm('Xoá avatar?')) return;
  window.CONFIG.avatar = '';
  saveRemoteConfig().then(function(res) {
    if (res && res.success) {
      if (typeof applyDefaultAvatar === 'function') applyDefaultAvatar();
      renderAdminTools();
      alert('✅ Đã xoá avatar');
    }
  });
}

function clearQR() {
  if (!confirm('Xoá QR?')) return;
  window.CONFIG.bank = window.CONFIG.bank || {};
  window.CONFIG.bank.qr = '';
  saveRemoteConfig().then(function(res) {
    if (res && res.success) {
      if (typeof buildBankInfo === 'function') buildBankInfo();
      renderAdminTools();
      alert('✅ Đã xoá QR');
    }
  });
}

function clearMusic() {
  if (!confirm('Xoá nhạc nền?')) return;
  stopMusic();
  window.CONFIG.music_url = '';
  saveRemoteConfig().then(function(res) {
    if (res && res.success) {
      if (typeof applyMusic === 'function') applyMusic();
      renderAdminTools();
      alert('✅ Đã xoá nhạc');
    }
  });
}

/* ============================================================
   TEST NHẠC
   ============================================================ */
var _testAudio = null;

function testMusic() {
  var urlEl = document.getElementById('cfgMusicUrl');
  var url = urlEl ? urlEl.value.trim() : '';
  if (!url) return alert('⚠️ Chưa nhập URL nhạc!');

  var status = document.getElementById('musicStatus');
  if (status) status.textContent = '⏳ Đang tải nhạc...';

  if (_testAudio) {
    _testAudio.pause();
    _testAudio = null;
  }

  _testAudio = new Audio(url);
  _testAudio.volume = 0.5;
  _testAudio.loop = true;

  _testAudio.oncanplay = function() {
    if (status) status.textContent = '✅ Nhạc hợp lệ! Đang phát...';
  };

  _testAudio.onerror = function() {
    if (status) status.textContent = '❌ Không tải được nhạc!';
    alert('❌ Không phát được nhạc!\n\nKiểm tra URL có đúng file .mp3 không?');
  };

  _testAudio.play().then(function() {
    if (status) status.textContent = '▶️ Đang phát nhạc thử...';
    setTimeout(function() {
      if (_testAudio) {
        _testAudio.pause();
        if (status) status.textContent = '⏸ Đã dừng test nhạc';
      }
    }, 20000);
  }).catch(function(e) {
    if (status) status.textContent = '❌ Lỗi phát nhạc';
    alert('❌ Không phát được!\n' + e.message);
  });
}

function stopMusic() {
  if (_testAudio) {
    _testAudio.pause();
    _testAudio.currentTime = 0;
    _testAudio = null;
  }
  var status = document.getElementById('musicStatus');
  if (status) status.textContent = '⏸ Đã dừng';
}

/* ============================================================
   TOOLS CRUD
   ============================================================ */
function addNewTool() {
  var name = (document.getElementById('ntName') || {}).value;
  name = name ? name.trim() : '';
  var cat = (document.getElementById('ntCat') || {}).value || 'taixiu';
  var kind = (document.getElementById('ntKind') || {}).value || 'view';
  var gameUrl = (document.getElementById('ntGameUrl') || {}).value;
  gameUrl = gameUrl ? gameUrl.trim() : '';
  var apiUrl = (document.getElementById('ntApiUrl') || {}).value;
  apiUrl = apiUrl ? apiUrl.trim() : '';
  var sort = parseInt((document.getElementById('ntSort') || {}).value) || 99;

  if (!name) return alert('⚠️ Nhập tên tool!');

  var imgFile = document.getElementById('ntImage').files[0];

  var chain = imgFile ? fileToBase64(imgFile, 200, 0.85) : Promise.resolve('');

  chain.then(function(image) {
    var slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    var newTool = {
      name: name, slug: slug, cat: cat, kind: kind,
      game_url: gameUrl,
      api_url: apiUrl,
      image: image || '',
      hot: document.getElementById('ntHot').checked ? 1 : 0,
      vip: document.getElementById('ntVip').checked ? 1 : 0,
      is_new: document.getElementById('ntNew').checked ? 1 : 0,
      enabled: 1,
      maintenance: 0,
      sort: sort
    };

    window.CONFIG.ports = window.CONFIG.ports || [];
    window.CONFIG.ports.push(newTool);

    return saveRemoteConfig().then(function(res) {
      if (res && res.success) {
        alert('✅ Đã thêm: ' + name);
        renderAdminTools();
        if (typeof buildCatTabs === 'function') buildCatTabs();
        if (typeof buildPorts === 'function') buildPorts();
      } else {
        window.CONFIG.ports.pop();
        alert('❌ ' + ((res && res.error) || 'Lỗi'));
      }
    });
  });
}

function editTool(idx) {
  var t = window.CONFIG.ports[idx];
  if (!t) return;
  var name = prompt('Tên tool:', t.name); if (name === null) return;
  var gameUrl = prompt('URL Game:', t.game_url || ''); if (gameUrl === null) return;
  var apiUrl = prompt('API URL:', t.api_url || ''); if (apiUrl === null) return;
  var sortStr = prompt('Thứ tự:', t.sort || 99); if (sortStr === null) return;

  var old = { name: t.name, game_url: t.game_url, api_url: t.api_url, sort: t.sort };
  t.name = name.trim() || t.name;
  t.game_url = gameUrl.trim();
  t.api_url = apiUrl.trim();
  t.sort = parseInt(sortStr) || 99;

  saveRemoteConfig().then(function(res) {
    if (res && res.success) {
      alert('✅ Đã sửa: ' + t.name);
      renderAdminTools();
      if (typeof buildPorts === 'function') buildPorts();
    } else {
      Object.assign(t, old);
      alert('❌ ' + ((res && res.error) || 'Lỗi'));
    }
  });
}

function toggleTool(idx, field) {
  var t = window.CONFIG.ports[idx];
  if (!t) return;
  t[field] = t[field] ? 0 : 1;

  saveRemoteConfig().then(function(res) {
    if (res && res.success) {
      renderAdminTools();
      if (typeof buildCatTabs === 'function') buildCatTabs();
      if (typeof buildPorts === 'function') buildPorts();
    } else {
      t[field] = t[field] ? 0 : 1;
      alert('❌ ' + ((res && res.error) || 'Lỗi'));
    }
  });
}

function deleteTool(idx) {
  var t = window.CONFIG.ports[idx];
  if (!t) return;
  if (!confirm('🗑 Xoá tool "' + t.name + '"?')) return;

  var removed = window.CONFIG.ports.splice(idx, 1)[0];

  saveRemoteConfig().then(function(res) {
    if (res && res.success) {
      alert('✅ Đã xoá: ' + removed.name);
      renderAdminTools();
      if (typeof buildCatTabs === 'function') buildCatTabs();
      if (typeof buildPorts === 'function') buildPorts();
    } else {
      window.CONFIG.ports.splice(idx, 0, removed);
      alert('❌ ' + ((res && res.error) || 'Lỗi'));
    }
  });
}

/* ============================================================
   4. KEYS
   ============================================================ */
function renderAdminKeys() {
  var s = getSession();
  if (!s) return;
  var el = document.getElementById('adminKeysView');
  if (!el) return;

  api('key_list', { email: s.email, password: s.password }).then(function(res) {
    var keys = (res && res.success) ? (res.keys || []) : [];

    var html = '<div class="adm-section">' +
      '<h4>🔑 Tạo Key mới</h4>' +
      '<label style="font-size:11px;font-weight:700">Số ngày</label>' +
      '<input class="adm-input" id="keyDays" type="number" value="30" min="1">' +
      '<label style="font-size:11px;font-weight:700">Số lượng</label>' +
      '<input class="adm-input" id="keyQty" type="number" value="1" min="1" max="100">' +
      '<label style="font-size:11px;font-weight:700">Ghi chú</label>' +
      '<input class="adm-input" id="keyNote" placeholder="VD: Tặng khách VIP">' +
      '<button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a)" onclick="adminGenKeys()">➕ TẠO KEY</button>' +
    '</div>' +
    '<p style="text-align:center;font-size:12px;color:#64748b;margin:14px 0 8px">📦 Tổng: <b>' + keys.length + '</b> key</p>';

    if (!keys.length) {
      html += '<p style="text-align:center;color:#94a3b8">Chưa có key nào</p>';
    } else {
      keys.forEach(function(k) {
        var used = (k.used == 1);
        html += '<div class="adm-row" style="border-left:3px solid ' + (used ? '#ef4444' : '#22c55e') + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
            '<b style="font-family:monospace;color:#0284c7;font-size:13px;word-break:break-all">' + esc(k.code) + '</b>' +
            '<span style="font-size:11px;font-weight:800;color:' + (used ? '#ef4444' : '#16a34a') + '">' + (used ? '🔴 ĐÃ DÙNG' : '🟢 CHƯA DÙNG') + '</span>' +
          '</div>' +
          '<div class="info">⏱ ' + k.days + ' ngày</div>' +
          (k.used_by ? '<div class="info">👤 ' + esc(k.used_by) + '</div>' : '') +
          '<div class="acts">' +
            '<button class="b5" onclick="adminDelKey(\'' + esc(k.code) + '\')">🗑 Xoá</button>' +
          '</div>' +
        '</div>';
      });
    }

    el.innerHTML = html;
  });
}

function adminGenKeys() {
  var days = parseInt(document.getElementById('keyDays').value) || 30;
  var qty = Math.min(100, Math.max(1, parseInt(document.getElementById('keyQty').value) || 1));
  var note = document.getElementById('keyNote').value.trim();

  if (!confirm('Tạo ' + qty + ' key loại ' + days + ' ngày?')) return;

  var s = getSession();
  api('key_create', { email: s.email, password: s.password, days: days, qty: qty, note: note })
    .then(function(res) {
      if (res && res.success) {
        alert('✅ Đã tạo ' + (res.keys || []).length + ' key:\n\n' + (res.keys || []).join('\n'));
        renderAdminKeys();
      } else {
        alert('❌ ' + ((res && res.error) || 'Lỗi'));
      }
    });
}

function adminDelKey(code) {
  if (!confirm('Xoá key ' + code + '?')) return;
  var s = getSession();
  api('key_delete', { email: s.email, password: s.password, code: code }).then(function(res) {
    if (res && res.success) {
      alert('✅ Đã xoá');
      renderAdminKeys();
    } else {
      alert('❌ ' + ((res && res.error) || 'Lỗi'));
    }
  });
}

/* ============================================================
   5. LỊCH SỬ
   ============================================================ */
function renderAdminHistory() {
  var s = getSession();
  if (!s) return;
  var el = document.getElementById('adminHistoryView');
  if (!el) return;

  api('history', { email: s.email, password: s.password }).then(function(res) {
    var hist = (res && res.success) ? (res.history || []) : [];

    if (!hist.length) {
      el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">Chưa có giao dịch</p>';
      return;
    }

    var html = '<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Hiển thị ' + Math.min(hist.length, 100) + ' / ' + hist.length + '</p>';

    hist.slice(0, 100).forEach(function(h) {
      var amt = Number(h.amount) || 0;
      var color = amt > 0 ? '#16a34a' : (amt < 0 ? '#dc2626' : '#3b5bfd');
      var sign = amt > 0 ? '+' : '';
      var time = new Date(Number(h.at)).toLocaleString('vi-VN');

      html += '<div class="adm-row" style="border-left:3px solid ' + color + '">' +
        '<div><b>' + esc((h.type || '').toUpperCase()) + '</b> — ' + esc(h.note || '') + '</div>' +
        (amt ? '<div style="font-size:12px">Số tiền: <b style="color:' + color + '">' + sign + fmt(amt) + '</b></div>' : '') +
        '<div style="font-size:11px;color:#94a3b8">🕐 ' + time + '</div>' +
      '</div>';
    });

    el.innerHTML = html;
  });
}

/* ============================================================
   EXPOSE
   ============================================================ */
window.openAdmin = openAdmin;
window.switchAdminTab = switchAdminTab;
window.renderAdminPending = renderAdminPending;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;
window.renderAdminUsers = renderAdminUsers;
window.adminResetIP = adminResetIP;
window.adminAdjustBalance = adminAdjustBalance;
window.adminDeleteUser = adminDeleteUser;
window.renderAdminTools = renderAdminTools;
window.addNewTool = addNewTool;
window.editTool = editTool;
window.toggleTool = toggleTool;
window.deleteTool = deleteTool;
window.saveSiteConfig = saveSiteConfig;
window.clearLogo = clearLogo;
window.clearAvatar = clearAvatar;
window.clearQR = clearQR;
window.clearMusic = clearMusic;
window.testMusic = testMusic;
window.stopMusic = stopMusic;
window.renderAdminKeys = renderAdminKeys;
window.adminGenKeys = adminGenKeys;
window.adminDelKey = adminDelKey;
window.renderAdminHistory = renderAdminHistory;
window.fileToBase64 = fileToBase64;
