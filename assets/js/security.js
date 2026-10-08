/* ============================================================
   SECURITY.JS v5 — CHỈ NHẬN DIỆN IP, KHÔNG CHẶN GÌ
   Chạy hoàn toàn ngầm, user không thấy gì cả
   ============================================================ */

(function(){
  'use strict';

  /* ============ LẤY IP PUBLIC ============ */
  async function fetchIP() {
    const apis = [
      'https://api.ipify.org?format=json',
      'https://api64.ipify.org?format=json',
      'https://ipapi.co/json/'
    ];

    for (const url of apis) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = await res.json();
        const ip = data.ip || data.query || data.IPv4;
        if (ip && typeof ip === 'string' && ip.length > 3) return ip;
      } catch(e) {
        continue;
      }
    }
    return null;
  }

  /* ============ NHẬN DIỆN IP + LƯU VÀO SESSION ============ */
  async function detectIP() {
    try {
      const ip = await fetchIP();
      if (!ip) return;

      // Lưu IP vào localStorage để các module khác dùng
      try {
        localStorage.setItem('bonsicola_current_ip', ip);
        localStorage.setItem('bonsicola_ip_time', String(Date.now()));
      } catch(e) {}

      // Cập nhật session nếu có
      try {
        const sessRaw = localStorage.getItem('bonsicola_session');
        if (sessRaw) {
          const sess = JSON.parse(sessRaw);
          if (sess && sess.user) {
            sess.currentIP = ip;
            sess.lastCheckIP = Date.now();
            localStorage.setItem('bonsicola_session', JSON.stringify(sess));
          }
        }
      } catch(e) {}

      // Gọi API để server biết IP (nếu đã đăng nhập)
      try {
        const sessRaw = localStorage.getItem('bonsicola_session');
        if (sessRaw) {
          const sess = JSON.parse(sessRaw);
          if (sess && sess.email && sess.password) {
            // Gửi ngầm, không chặn UI
            fetch(
              ((window.CONFIG && window.CONFIG.API_BASE) || '') + '/index.php?action=ping&ip=' + encodeURIComponent(ip),
              { method: 'GET', cache: 'no-store' }
            ).catch(() => {});
          }
        }
      } catch(e) {}

    } catch(e) {
      // Bỏ qua lỗi ngầm
    }
  }

  /* ============ HÀM LẤY IP CHO CÁC MODULE KHÁC ============ */
  async function getIP() {
    // Ưu tiên lấy từ cache
    try {
      const cached = localStorage.getItem('bonsicola_current_ip');
      if (cached) return cached;
    } catch(e) {}
    
    // Chưa có → fetch mới
    const ip = await fetchIP();
    if (ip) {
      try {
        localStorage.setItem('bonsicola_current_ip', ip);
        localStorage.setItem('bonsicola_ip_time', String(Date.now()));
      } catch(e) {}
    }
    return ip || 'unknown';
  }

  /* ============ CHẠY KHI LOAD TRANG ============ */
  function start() {
    // Delay 1.5s để không ảnh hưởng load trang
    setTimeout(detectIP, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  /* ============ EXPOSE ============ */
  window.IPGuard = {
    getIP: getIP,
    detect: detectIP,
    getCached: () => {
      try { return localStorage.getItem('bonsicola_current_ip'); } catch(e) { return null; }
    },
    getLastCheck: () => {
      try { return parseInt(localStorage.getItem('bonsicola_ip_time')) || 0; } catch(e) { return 0; }
    }
  };

  // Override getIP cũ (nếu có)
  window.getIP = getIP;

})();
