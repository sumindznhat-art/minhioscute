/* ============================================================
   ENGINE.JS   THUẬT TOÁN DỰ ĐOÁN TÀI XỈU
   ============================================================ */

const TEEngine = (() => {

  /* Nhóm chuỗi liên tiếp */
  const groupRuns = (arr) => {
    if (!arr.length) return [];
    const out = [];
    let last = arr[0], count = 1;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === last) count++;
      else { out.push({ k: last, n: count }); last = arr[i]; count = 1; }
    }
    out.push({ k: last, n: count });
    return out;
  };

  class TaiXiuEngine {
    constructor() {
      this.history = [];      // Chuỗi TAI/XIU
      this.dice = [];         // Mảng [d1,d2,d3]
      this.totals = [];       // Tổng 3 xúc xắc
      this.max = 500;
      // Ngưỡng tối thiểu mẫu cho mỗi pattern length
      this.minSamples = { 1: 8, 2: 10, 3: 14, 4: 18, 5: 24, 6: 30, 7: 36, 8: 42 };
    }

    /* ====== Đọc dữ liệu từ API ====== */
    parseDice(item) {
      const maps = [
        ['dice1','dice2','dice3'],
        ['xucxac1','xucxac2','xucxac3'],
        ['d1','d2','d3'],
        ['x1','x2','x3']
      ];
      for (const [a,b,c] of maps) {
        if (item[a] != null && item[b] != null && item[c] != null) {
          const ar = [+item[a], +item[b], +item[c]];
          if (ar.every(n => n >= 1 && n <= 6)) return ar;
        }
      }
      for (const f of ['dice','dices','xucxac']) {
        if (Array.isArray(item[f]) && item[f].length >= 3) {
          const ar = item[f].slice(0,3).map(Number);
          if (ar.every(n => n >= 1 && n <= 6)) return ar;
        }
      }
      return null;
    }

    load(items) {
      this.history = [];
      this.dice = [];
      this.totals = [];
      for (const it of items) {
        const r = it.resultTruyenThong || it.result || it.ketQua;
        if (r !== 'TAI' && r !== 'XIU') continue;
        this.history.push(r);
        const d = this.parseDice(it);
        this.dice.push(d);
        this.totals.push(d ? d[0]+d[1]+d[2] : null);
      }
      if (this.history.length > this.max) {
        const cut = -this.max;
        this.history = this.history.slice(cut);
        this.dice = this.dice.slice(cut);
        this.totals = this.totals.slice(cut);
      }
    }

    /* ============================================================
       THUẬT TOÁN 1: PATTERN MATCHING — Tìm chuỗi lặp lại
       ============================================================ */
    patternMatch() {
      const c = this.history;
      if (c.length < 5) return null;
      
      const last = c[c.length-1];
      let best = null;
      
      // Thử độ dài pattern từ 6 xuống 1
      for (let len = Math.min(8, Math.floor(c.length/2)); len >= 1; len--) {
        const pattern = c.slice(-len);
        let totalT = 0, totalX = 0, matches = 0;
        
        for (let i = 0; i <= c.length - len - 1; i++) {
          let ok = true;
          for (let j = 0; j < len; j++) {
            if (c[i+j] !== pattern[j]) { ok = false; break; }
          }
          if (!ok) continue;
          // Không được có TAI/XIU trước chuỗi giống (tránh trùng overlap)
          if (i > 0 && c[i-1] === c[i]) continue;
          matches++;
          if (c[i+len] === 'TAI') totalT++;
          else totalX++;
        }
        
        const min = this.minSamples[len] || 15;
        if (matches >= min) {
          const conf = Math.max(totalT, totalX) / (totalT + totalX);
          if (!best || conf > best.conf) {
            best = {
              len, matches,
              tRatio: totalT / matches,
              xRatio: totalX / matches,
              conf,
              suggest: totalT > totalX ? 'TAI' : 'XIU'
            };
          }
        }
      }
      return best;
    }

    /* ============================================================
       THUẬT TOÁN 2: MARKOV CHAIN — Xác suất chuyển trạng thái
       ============================================================ */
    markovChain() {
      const c = this.history;
      if (c.length < 15) return null;

      const buildChain = (order) => {
        const trans = {};
        for (let i = order; i < c.length; i++) {
          const key = c.slice(i-order, i).join('');
          if (!trans[key]) trans[key] = { T: 0, X: 0 };
          if (c[i] === 'TAI') trans[key].T++;
          else trans[key].X++;
        }
        return trans;
      };

      // Thử orders 1-4
      for (let order = 4; order >= 1; order--) {
        const trans = buildChain(order);
        const curKey = c.slice(-order).join('');
        const stats = trans[curKey];
        if (!stats) continue;
        const total = stats.T + stats.X;
        if (total < 5) continue;
        const pT = stats.T / total;
        const conf = Math.abs(pT - 0.5) * 2;
        if (conf > 0.2) {
          return {
            order, total,
            pT: pT * 100,
            pX: (1 - pT) * 100,
            conf,
            suggest: pT > 0.5 ? 'TAI' : 'XIU'
          };
        }
      }
      return null;
    }

    /* ============================================================
       THUẬT TOÁN 3: BAYESIAN INFERENCE — Suy luận Bayes
       ============================================================ */
    bayesian() {
      const c = this.history;
      if (c.length < 20) return null;

      const last = c[c.length-1];
      const opposite = last === 'TAI' ? 'XIU' : 'TAI';

      // P(A|B) = P(B|A)*P(A)/P(B)
      let countA = 0, countB = 0, countAB = 0;
      for (let i = 0; i < c.length; i++) {
        if (c[i] === last) countA++;
        if (c[i] === opposite) countB++;
        if (i > 0 && c[i-1] === last && c[i] === opposite) countAB++;
      }
      if (countA < 5) return null;

      const pOppositeGivenLast = countAB / countA;
      return {
        pT: last === 'TAI' ? (1 - pOppositeGivenLast) * 100 : pOppositeGivenLast * 100,
        pX: last === 'XIU' ? (1 - pOppositeGivenLast) * 100 : pOppositeGivenLast * 100,
        conf: Math.abs(pOppositeGivenLast - 0.5) * 2,
        suggest: pOppositeGivenLast > 0.5 ? opposite : last
      };
    }

    /* ============================================================
       THUẬT TOÁN 4: DICE SUM ANALYSIS — Phân tích tổng xúc xắc
       ============================================================ */
    diceSumAnalysis() {
      const totals = this.totals.filter(t => t != null);
      if (totals.length < 20) return null;

      // Trung bình động của tổng
      const recent = totals.slice(-20);
      const avg = recent.reduce((a,b) => a+b, 0) / recent.length;
      const overall = totals.reduce((a,b) => a+b, 0) / totals.length;
      
      // Nếu avg gần 10.5 → cân bằng; xa → xu hướng
      const deviation = avg - 10.5;
      const trend = overall - 10.5;

      // Xu hướng nghịch đảo (mean reversion)
      let suggest;
      if (avg > 12) suggest = 'XIU';
      else if (avg < 9) suggest = 'TAI';
      else if (trend > 0.5) suggest = 'XIU';
      else if (trend < -0.5) suggest = 'TAI';
      else return null;

      const conf = Math.min(0.8, Math.abs(deviation) / 4);
      return { avg, overall, deviation, conf, suggest };
    }

    /* ============================================================
       THUẬT TOÁN 5: STREAK REVERSAL — Đảo chuỗi
       ============================================================ */
    streakReversal() {
      const c = this.history;
      if (c.length < 10) return null;

      let streak = 1;
      for (let i = c.length-1; i > 0; i--) {
        if (c[i] === c[i-1]) streak++;
        else break;
      }

      // Streak >= 4 → xác suất đảo tăng
      if (streak < 4) return null;

      // Xem lịch sử: khi streak >= N, xác suất đảo là bao nhiêu?
      let reverses = 0, total = 0;
      for (let i = streak; i < c.length; i++) {
        let s = 1;
        for (let j = i-1; j > 0; j--) {
          if (c[j] === c[j-1]) s++;
          else break;
        }
        if (s >= streak) {
          total++;
          if (i < c.length && c[i] !== c[i-1]) reverses++;
        }
      }

      if (total < 3) return null;
      const pReverse = reverses / total;
      const opposite = c[c.length-1] === 'TAI' ? 'XIU' : 'TAI';
      return {
        streak, total,
        pReverse: pReverse * 100,
        conf: pReverse,
        suggest: pReverse > 0.5 ? opposite : c[c.length-1]
      };
    }

    /* ============================================================
       THUẬT TOÁN 6: VOLATILITY — Độ biến động
       ============================================================ */
    volatility() {
      const c = this.history;
      if (c.length < 25) return null;

      const win = c.slice(-25);
      let changes = 0;
      for (let i = 1; i < win.length; i++) {
        if (win[i] !== win[i-1]) changes++;
      }
      const ratio = changes / (win.length - 1);

      // Ratio > 0.65 → đang đảo liên tục → sắp có bệt
      // Ratio < 0.35 → đang bệt → sắp đảo
      if (ratio > 0.65) {
        // Đang đảo → dự đoán tiếp tục theo chuỗi trước
        const last = c[c.length-1];
        return { ratio, suggest: last, conf: Math.min(0.75, ratio), type: 'high_vol' };
      }
      if (ratio < 0.35) {
        const last = c[c.length-1];
        const opposite = last === 'TAI' ? 'XIU' : 'TAI';
        return { ratio, suggest: opposite, conf: Math.min(0.75, 1-ratio), type: 'low_vol' };
      }
      return null;
    }

    /* ============================================================
       THUẬT TOÁN 7: MOMENTUM — Động lượng có trọng số
       ============================================================ */
    momentum() {
      const c = this.history;
      if (c.length < 15) return null;

      const win = c.slice(-15);
      let scoreT = 0, scoreX = 0;
      for (let i = 0; i < win.length; i++) {
        const w = Math.exp(-(win.length - 1 - i) / 5); // decay
        if (win[i] === 'TAI') scoreT += w;
        else scoreX += w;
      }
      const total = scoreT + scoreX;
      if (total < 1) return null;
      const pT = scoreT / total;
      const conf = Math.abs(pT - 0.5) * 2;
      return {
        pT: pT * 100, pX: (1-pT) * 100,
        conf,
        suggest: pT > 0.5 ? 'TAI' : 'XIU'
      };
    }

    /* ============================================================
       THUẬT TOÁN 8: KNN — K-Nearest Neighbors
       ============================================================ */
    knn() {
      const c = this.history;
      const W = 6; // window
      if (c.length < W + 20) return null;

      const cur = c.slice(-W);
      const matches = [];

      for (let i = 0; i < c.length - W - 1; i++) {
        let same = 0;
        for (let j = 0; j < W; j++) {
          if (c[i+j] === cur[j]) same++;
        }
        if (same >= W - 1) {
          matches.push({ dist: W - same, next: c[i+W] });
        }
      }

      if (matches.length < 5) return null;
      matches.sort((a,b) => a.dist - b.dist);
      const top = matches.slice(0, 12);
      
      let t = 0, x = 0;
      for (const m of top) {
        if (m.next === 'TAI') t++;
        else x++;
      }
      const conf = Math.max(t, x) / top.length;
      return {
        matches: matches.length,
        k: top.length,
        pT: t / top.length * 100,
        pX: x / top.length * 100,
        conf,
        suggest: t > x ? 'TAI' : 'XIU'
      };
    }

    /* ============================================================
       THUẬT TOÁN 9: ENTROPY — Đo độ hỗn loạn
       ============================================================ */
    entropy() {
      const c = this.history;
      if (c.length < 20) return null;

      const win = c.slice(-20);
      let t = 0, x = 0;
      for (const v of win) { if (v === 'TAI') t++; else x++; }
      const pT = t / win.length;
      const pX = x / win.length;

      // Entropy Shannon
      let H = 0;
      if (pT > 0) H -= pT * Math.log2(pT);
      if (pX > 0) H -= pX * Math.log2(pX);
      
      // H max = 1 khi 50/50, H min = 0 khi 100% một bên
      // H thấp → dự đoán được
      const conf = 1 - H;
      return {
        H,
        pT: pT * 100, pX: pX * 100,
        conf,
        suggest: pT > pX ? 'TAI' : 'XIU'
      };
    }

    /* ============================================================
       THUẬT TOÁN 10: WEIGHTED VOTING — Bầu chọn có trọng số
       ============================================================ */
    weightedVoting() {
      const algos = [
        { name: 'Pattern', weight: 2.0, result: this.patternMatch() },
        { name: 'Markov', weight: 1.8, result: this.markovChain() },
        { name: 'Bayes', weight: 1.5, result: this.bayesian() },
        { name: 'DiceSum', weight: 1.3, result: this.diceSumAnalysis() },
        { name: 'Streak', weight: 1.7, result: this.streakReversal() },
        { name: 'Volatility', weight: 1.4, result: this.volatility() },
        { name: 'Momentum', weight: 1.5, result: this.momentum() },
        { name: 'KNN', weight: 1.9, result: this.knn() },
        { name: 'Entropy', weight: 1.0, result: this.entropy() }
      ];

      let scoreT = 0, scoreX = 0, totalWeight = 0;
      const details = [];

      for (const a of algos) {
        if (!a.result) continue;
        const conf = Math.min(1, a.result.conf || 0.5);
        const w = a.weight * conf;
        if (a.result.suggest === 'TAI') scoreT += w;
        else scoreX += w;
        totalWeight += w;
        details.push({
          name: a.name,
          suggest: a.result.suggest,
          conf: Math.round(conf * 100),
          weight: w.toFixed(2)
        });
      }

      if (totalWeight < 1) return null;
      const pT = scoreT / totalWeight;
      const pX = scoreX / totalWeight;
      const total = scoreT + scoreX;
      const finalConf = Math.max(scoreT, scoreX) / total;

      return {
        pT: pT * 100,
        pX: pX * 100,
        conf: finalConf,
        suggest: scoreT > scoreX ? 'TAI' : 'XIU',
        details,
        algorithmsUsed: details.length
      };
    }

    /* ============================================================
       DỰ ĐOÁN TỔNG HỢP — Kết hợp tất cả
       ============================================================ */
    predict() {
      const voting = this.weightedVoting();
      
      if (!voting) {
        // Không đủ dữ liệu → dùng thuật toán đơn giản
        return {
          g: null,
          conf: 0,
          pT: 50,
          pX: 50,
          details: [],
          algorithmsUsed: 0,
          message: 'Đang thu thập dữ liệu...'
        };
      }

      // Điều chỉnh độ tin cậy
      let finalConf = voting.conf;
      if (voting.algorithmsUsed < 3) finalConf *= 0.7;
      else if (voting.algorithmsUsed < 5) finalConf *= 0.85;
      else if (voting.algorithmsUsed >= 7) finalConf = Math.min(0.95, finalConf * 1.1);

      return {
        g: voting.suggest,
        conf: Math.round(finalConf * 100),
        pT: voting.pT,
        pX: voting.pX,
        details: voting.details,
        algorithmsUsed: voting.algorithmsUsed
      };
    }
  }

  return { Yq: TaiXiuEngine, predict: (eng) => eng.predict() };
})();

window.TEEngine = TEEngine;
