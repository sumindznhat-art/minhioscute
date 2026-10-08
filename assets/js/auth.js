function _$(id) { return document.getElementById(id); }
function _setLoading(spin, btn, text, load) {
  var sp = _$(spin), bt = _$(btn);
  if (sp) sp.style.display = load ? 'inline-block' : 'none';
  if (bt) bt.innerHTML = text;
}
function _setError(m) { var b = _$('loginError'); if (b) b.textContent = m || ''; }
function _setKeyError(m) { var b = _$('keyErr'); if (b) b.textContent = m || ''; }

var _cachedIP = null;
function getIP() {
  if (_cachedIP) return Promise.resolve(_cachedIP);
  return new Promise(function(res) {
    var x = new XMLHttpRequest();
    x.open('GET', 'https://api.ipify.org?format=json', true);
    x.timeout = 3000;
    x.onload = function() { try { var d = JSON.parse(x.responseText); if (d.ip) { _cachedIP = d.ip; return res(d.ip); } } catch(e) {} res('unknown'); };
    x.onerror = x.ontimeout = function() { res('unknown'); };
    x.send();
  });
}

function switchTab(tab) {
  _setError('');
  var tl = _$('tabLogin'), tr = _$('tabReg');
  var fl = _$('formLogin'), fr = _$('formReg');
  if (tab === 'login') {
    if (tl) tl.classList.add('active'); if (tr) tr.classList.remove('active');
    if (fl) fl.style.display = ''; if (fr) fr.style.display = 'none';
  } else {
    if (tr) tr.classList.add('active'); if (tl) tl.classList.remove('active');
    if (fr) fr.style.display = ''; if (fl) fl.style.display = 'none';
  }
}

function doRegister() {
  _setError('');
  var name = (_$('regName') ? _$('regName').value : '').trim();
  var email = (_$('regEmail') ? _$('regEmail').value : '').trim().toLowerCase();
  var p1 = _$('regPass') ? _$('regPass').value : '';
  var p2 = _$('regPass2') ? _$('regPass2').value : '';
  if (!name || !email || !p1 || !p2) return _setError('⚠️ Nhập đầy đủ!');
  if (p1.length < 6) return _setError('⚠️ Pass từ 6 ký tự!');
  if (p1 !== p2) return _setError('⚠️ Pass không khớp!');

  _setLoading('regSpinner', 'btnRegText', '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG XỬ LÝ...', true);
  api('register', { name: name, email: email, password: p1 }).then(function(data) {
    if (data && data.success) {
      alert('✅ ĐĂNG KÝ THÀNH CÔNG!\n\nVui lòng đăng nhập.');
      switchTab('login');
    } else _setError('❌ ' + ((data && data.error) || 'Lỗi!'));
  }).catch(function(e) { _setError('❌ ' + e.message); })
    .then(function() { _setLoading('regSpinner', 'btnRegText', '<i class="fa-solid fa-user-plus"></i> ĐĂNG KÝ', false); });
}

function doLogin() {
  _setError('');
  var email = (_$('loginEmail') ? _$('loginEmail').value : '').trim().toLowerCase();
  var pass = _$('loginPass') ? _$('loginPass').value : '';
  if (!email || !pass) return _setError('⚠️ Nhập đầy đủ!');

  _setLoading('loginSpinner', 'btnLoginText', '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG ĐĂNG NHẬP...', true);
  api('login', { email: email, password: pass }).then(function(data) {
    if (data && data.success && data.user) {
      if (email === ADMIN_EMAIL) data.user.is_admin = 1;
      setSessionData(email, pass, data.user);
      if (typeof enterApp === 'function') enterApp();
    } else _setError('❌ ' + ((data && data.error) || 'Sai tài khoản!'));
  }).catch(function(e) { _setError('❌ ' + e.message); })
    .then(function() { _setLoading('loginSpinner', 'btnLoginText', '<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP', false); });
}

function doLogout() {
  if (!confirm('Đăng xuất?')) return;
  clearSession();
  location.reload();
}

function activateKey() {
  _setKeyError('');
  var key = (_$('keyInput') ? _$('keyInput').value : '').trim().toUpperCase();
  if (!key) return _setKeyError('⚠️ Nhập key!');
  var s = getSession();
  if (!s) return _setKeyError('⚠️ Đăng nhập lại!');
  api('key_activate', { email: s.email, password: s.password, code: key }).then(function(data) {
    if (data && data.success) {
      alert('✅ KÍCH HOẠT THÀNH CÔNG!\n\n+' + data.days + ' ngày');
      if (typeof closeModal === 'function') closeModal('keyModal');
      apiGetUser().then(function() { if (typeof renderAll === 'function') renderAll(); });
    } else _setKeyError('❌ ' + ((data && data.error) || 'Key sai!'));
  }).catch(function(e) { _setKeyError('❌ ' + e.message); });
}

function submitDeposit() {
  var amount = Number(_$('depAmount') ? _$('depAmount').value : 0);
  var note = _$('depNote') ? _$('depNote').value.trim() : '';
  if (!amount || amount < 10000) return alert('Tối thiểu 10,000đ');
  var s = getSession();
  if (!s) return alert('Đăng nhập lại!');
  api('deposit_create', { email: s.email, password: s.password, amount: amount, note: note }).then(function(data) {
    if (data && data.success) {
      alert('✅ ' + (data.message || 'Đã gửi!'));
      if (typeof closeModal === 'function') closeModal('depositModal');
      if (typeof renderAll === 'function') renderAll();
    } else alert('❌ ' + ((data && data.error) || 'Lỗi!'));
  }).catch(function(e) { alert('❌ ' + e.message); });
}

window.getIP = getIP;
window.switchTab = switchTab;
window.doRegister = doRegister;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.activateKey = activateKey;
window.submitDeposit = submitDeposit;
