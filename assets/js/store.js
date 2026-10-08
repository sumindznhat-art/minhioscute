var ADMIN_EMAIL = 'leminhdz@gmail.com';
var AVATAR_KEY = 'bonsicola_avatar';
var SESS_KEY = 'bonsicola_session';
var DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect fill='%23e0f2fe' width='200' height='200'/><text x='50%25' y='56%25' font-size='90' text-anchor='middle' dominant-baseline='middle'>🎀</text></svg>";

function now() { return Date.now(); }
function fmt(n) { return (Number(n) || 0).toLocaleString('vi-VN') + 'đ'; }
function esc(s) { return String(s || '').replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function getToolImage(t) { return t ? (t.image || '') : ''; }

function api(action, params, method) {
  params = params || {}; method = method || 'POST';
  return new Promise(function(resolve) {
    var base = (window.CONFIG && window.CONFIG.API_BASE) ? window.CONFIG.API_BASE : '/api';
    if (base.indexOf('http') !== 0) base = window.location.origin + base;
    var url = base.replace(/\/$/, '') + '/index.php?action=' + encodeURIComponent(action);
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 20000;
    xhr.onload = function() {
      var text = xhr.responseText || '';
      if (!text) return resolve({ success: false, error: 'Server rỗng' });
      try { resolve(JSON.parse(text)); } catch(e) { resolve({ success: false, error: 'Server lỗi' }); }
    };
    xhr.onerror = function() { resolve({ success: false, error: 'Không kết nối' }); };
    xhr.ontimeout = function() { resolve({ success: false, error: 'Timeout' }); };
    if (method === 'POST') { try { xhr.send(JSON.stringify(params)); } catch(e) { resolve({ success: false, error: e.message }); } }
    else xhr.send();
  });
}

function getSession() {
  try { var r = localStorage.getItem(SESS_KEY); if (!r) return null; var s = JSON.parse(r); return (s && s.email) ? s : null; } catch(e) { return null; }
}
function setSessionData(email, pass, user) { try { localStorage.setItem(SESS_KEY, JSON.stringify({ email: email, password: pass, user: user })); } catch(e) {} }
function clearSession() { localStorage.removeItem(SESS_KEY); }
function currentUser() { var s = getSession(); return s ? s.user : null; }
function refreshUser(user) { var s = getSession(); if (s) { s.user = user; localStorage.setItem(SESS_KEY, JSON.stringify(s)); } }

function apiGetUser() {
  var s = getSession(); if (!s) return Promise.resolve({ success: false });
  return api('get_user', { email: s.email, password: s.password }).then(function(res) {
    if (res && res.success && res.user) { if (s.email.toLowerCase() === ADMIN_EMAIL) res.user.is_admin = 1; refreshUser(res.user); }
    return res;
  });
}
function apiBuyPackage(days, price) { var s = getSession(); if (!s) return Promise.resolve({ success: false }); return api('buy_package', { email: s.email, password: s.password, days: days, price: price }); }
function apiUpdateLastApi(apiUrl, toolName) { var s = getSession(); if (!s) return Promise.resolve(); return api('update_last_api', { email: s.email, password: s.password, api: apiUrl, tool: toolName }); }

function applyAvatarEverywhere(src) { ['loginAvatarImg', 'hdrAvatar', 'profAvatar', 'drawerAvatar'].forEach(function(id) { var el = document.getElementById(id); if (el && src) el.src = src; }); }
function getAvatarFromStorage() { try { return localStorage.getItem(AVATAR_KEY); } catch(e) { return null; } }
function setAvatarToStorage(src) { try { if (src) localStorage.setItem(AVATAR_KEY, src); else localStorage.removeItem(AVATAR_KEY); } catch(e) {} }

window.api = api;
window.apiGetUser = apiGetUser;
window.apiBuyPackage = apiBuyPackage;
window.apiUpdateLastApi = apiUpdateLastApi;
window.getSession = getSession;
window.setSessionData = setSessionData;
window.clearSession = clearSession;
window.currentUser = currentUser;
window.refreshUser = refreshUser;
window.applyAvatarEverywhere = applyAvatarEverywhere;
window.getAvatarFromStorage = getAvatarFromStorage;
window.setAvatarToStorage = setAvatarToStorage;
window.getToolImage = getToolImage;
window.fmt = fmt;
window.esc = esc;
window.now = now;
window.DEFAULT_AVATAR = DEFAULT_AVATAR;
window.ADMIN_EMAIL = ADMIN_EMAIL;
window.SESS_KEY = SESS_KEY;
window.AVATAR_KEY = AVATAR_KEY;
