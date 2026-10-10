/* ============================================================
   APP.JS — KÉO THẢ ROBOT + MAIN LOOP (KHÔNG LOGIN)
   ============================================================ */

/* ============ KÉO THẢ ROBOT ============ */
const robot = document.getElementById("robot");
let drag = false, sx = 0, sy = 0;

robot.addEventListener("mousedown", e => {
    drag = true;
    sx = e.clientX - robot.offsetLeft;
    sy = e.clientY - robot.offsetTop;
    robot.style.cursor = 'grabbing';
});

robot.addEventListener("touchstart", e => {
    drag = true;
    const t = e.touches[0];
    sx = t.clientX - robot.offsetLeft;
    sy = t.clientY - robot.offsetTop;
    robot.style.cursor = 'grabbing';
}, { passive: true });

document.addEventListener("mousemove", e => {
    if (!drag) return;
    robot.style.left = e.clientX - sx + "px";
    robot.style.top = e.clientY - sy + "px";
    robot.style.bottom = 'auto';
    robot.style.right = 'auto';
});

document.addEventListener("touchmove", e => {
    if (!drag) return;
    const t = e.touches[0];
    robot.style.left = t.clientX - sx + "px";
    robot.style.top = t.clientY - sy + "px";
    robot.style.bottom = 'auto';
    robot.style.right = 'auto';
}, { passive: false });

document.addEventListener("mouseup", () => { drag = false; robot.style.cursor = 'grab'; });
document.addEventListener("touchend", () => { drag = false; robot.style.cursor = 'grab'; });

/* ============ MỞ / ẨN PANEL ============ */
const statsPanel = document.getElementById('stats-panel');
const toggleBtn = document.getElementById('toggle-stats');
const openBtn = document.getElementById('stats-toggle-btn');

toggleBtn.addEventListener('click', () => {
    statsPanel.classList.add('hidden');
    openBtn.classList.add('show');
});
openBtn.addEventListener('click', () => {
    statsPanel.classList.remove('hidden');
    openBtn.classList.remove('show');
});

/* ============ API ============ */
const API_URL = "https://wtxmd52.tele68.com/v1/txmd5/lite-sessions?cp=R&cl=R&pf=web&at=3959701241b686f12e01bfe9c3a319b8";

async function fetchSafe() {
    try {
        const c = new AbortController();
        setTimeout(() => c.abort(), 4000);
        const r = await fetch(API_URL, { signal: c.signal, cache: "no-store" });
        if (r.ok) return await r.json();
    } catch (e) {}
    return null;
}

let phienHienTai = 0;
let trangThaiDangHienKetQua = false;
let historyGears = [];
let rawHistory = [];
let doLechChuanToanCuc = 0;

/* ============ THỐNG KÊ ============ */
let stats = { total: 0, wins: 0, losses: 0 };
let lastPrediction = "";

function updateStats(isWin) {
    stats.total++;
    if (isWin) stats.wins++; else stats.losses++;
    renderStats();
}

function renderStats() {
    document.getElementById('total-games').textContent = stats.total;
    document.getElementById('wins').textContent = stats.wins;
    document.getElementById('losses').textContent = stats.losses;
    let rate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
    document.getElementById('win-rate').textContent = rate + '%';
}

/* ============ CẬP NHẬT DỰ ĐOÁN ============ */
function capNhatDuDoan() {
    const a = superViLongAlgorithm(historyGears, rawHistory, doLechChuanToanCuc);
    if (a.pred === -1) return;
    
    const isTai = a.pred === 1;
    const phienText = isTai ? "TÀI" : "XỈU";
    const color = isTai ? "#00ff88" : "#ff4444";
    
    lastPrediction = phienText;
    
    document.getElementById('phien-text').textContent = `#${phienHienTai + 1}:`;
    document.getElementById('prediction-text').textContent = phienText;
    document.getElementById('prediction-text').style.color = color;
    document.getElementById('confidence-text').textContent = 'Tỉ lệ: ' + a.rate + '%';
    
    const el = document.getElementById('prediction-text');
    el.style.transition = 'transform 0.15s';
    el.style.transform = 'scale(1.1)';
    setTimeout(() => el.style.transform = 'scale(1)', 150);
}

/* ============ HIỆN KẾT QUẢ ============ */
function hienKetQua(phienId, kqText, x1, x2, x3) {
    const isTai = kqText === "TÀI" || kqText === "T" || (x1 + x2 + x3 > 10);
    const phienText = isTai ? "TÀI" : "XỈU";
    const color = isTai ? "#00ff88" : "#ff4444";
    
    const isWin = (phienText === lastPrediction);
    updateStats(isWin);
    
    document.getElementById('phien-text').textContent = `#${phienId}:`;
    document.getElementById('prediction-text').textContent = phienText;
    document.getElementById('prediction-text').style.color = color;
    document.getElementById('confidence-text').textContent = 'Tỉ lệ: 100%';
}

/* ============ LỊCH SỬ 5 PHIÊN ============ */
function capNhatLichSu() {
    const items = document.querySelectorAll('.hist-dot');
    
    if (rawHistory.length < 5) {
        for (let i = 0; i < 5; i++) {
            items[i].textContent = '?';
            items[i].className = 'hist-dot wait';
        }
        return;
    }
    
    for (let i = 0; i < 5; i++) {
        const data = rawHistory[i];
        if (!data) { items[i].textContent = '?'; items[i].className = 'hist-dot wait'; continue; }
        const sum = (data.dice1 || 0) + (data.dice2 || 0) + (data.dice3 || 0);
        const isTai = sum > 10 || data.resultTruyenThong === 'TAI';
        items[i].textContent = isTai ? 'T' : 'X';
        items[i].className = `hist-dot ${isTai ? 'tai' : 'xiu'}`;
    }
}

/* ============ MAIN LOOP ============ */
async function runLoop() {
    const data = await fetchSafe();
    if (!data || !data.list || data.list.length === 0) return;
    
    const latest = data.list[0];
    
    historyGears = data.list.slice(0, 60).map(x => {
        let sum = (x.dice1 || 0) + (x.dice2 || 0) + (x.dice3 || 0);
        if (sum === 0 && x.resultTruyenThong) return x.resultTruyenThong === 'TAI' ? 1 : 0;
        return sum > 10 ? 1 : 0;
    });
    rawHistory = data.list.slice(0, 60);
    
    capNhatLichSu();
    
    if (phienHienTai === 0) {
        phienHienTai = latest.id;
        capNhatDuDoan();
        return;
    }
    
    if (latest.id > phienHienTai && !trangThaiDangHienKetQua) {
        trangThaiDangHienKetQua = true;
        let sum = (latest.dice1 || 0) + (latest.dice2 || 0) + (latest.dice3 || 0);
        let resultText = (sum > 10) ? "TÀI" : "XỈU";
        if (sum === 0 && latest.resultTruyenThong) resultText = latest.resultTruyenThong;
        
        hienKetQua(latest.id, resultText, latest.dice1 || 0, latest.dice2 || 0, latest.dice3 || 0);
        
        setTimeout(() => {
            phienHienTai = latest.id;
            capNhatDuDoan();
            trangThaiDangHienKetQua = false;
        }, 3000);
    }
}

/* ============ KHỞI ĐỘNG ============ */
(function init() {
    setInterval(runLoop, 3000);
    (async function() {
        const data = await fetchSafe();
        if (data && data.list && data.list.length > 0) {
            phienHienTai = data.list[0].id;
            historyGears = data.list.slice(0, 60).map(x => {
                let sum = (x.dice1 || 0) + (x.dice2 || 0) + (x.dice3 || 0);
                if (sum === 0 && x.resultTruyenThong) return x.resultTruyenThong === 'TAI' ? 1 : 0;
                return sum > 10 ? 1 : 0;
            });
            rawHistory = data.list.slice(0, 60);
            capNhatLichSu();
            capNhatDuDoan();
        }
    })();
})();
