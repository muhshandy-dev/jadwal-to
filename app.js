/* Aplikasi Jadwal Tryout SKD: tampilan dan interaksi. Logika ada di schedule.js (Sked). */
(function () {
  'use strict';
  var S = window.Sked;
  var KEY = 'tryoutSkd.v1';
  var FIRED_KEY = 'tryoutSkd.notifTerkirim';
  var ROUTES = ['hari-ini', 'kalender', 'skor', 'catatan', 'pengaturan'];
  var memoryOnly = false;
  var state = load();
  var ui = { scoreTab: 'daftar', scoreWeek: null, series: 'twk', noteSub: 'Semua', noteTopic: '', calOpen: {}, sheet: null, shown: '' };
  var installEvent = null;
  var view = document.getElementById('view');
  var sheet = document.getElementById('sheet');
  var sheetBody = document.getElementById('sheet-body');
  var confirmDlg = document.getElementById('confirm');
  var toastEl = document.getElementById('toast');

  /* ---------- Penyimpanan ---------- */
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { memoryOnly = true; return S.newState(); }
    if (!raw) return S.newState();
    try { return S.normalizeState(JSON.parse(raw)); } catch (e) {
      try { localStorage.setItem(KEY + '.rusak', raw); } catch (e2) { /* abaikan */ }
      return S.newState();
    }
  }
  function save() {
    if (memoryOnly) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { memoryOnly = true; toast('Penyimpanan peramban tidak tersedia. Data hanya sementara, gunakan Ekspor.'); }
  }

  /* ---------- Util ---------- */
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function now() { return S.nowWita(); }
  function today() { return now().date; }
  function fmtNum(x) { return x === null ? '—' : (Math.round(x * 10) / 10).toString().replace('.', ','); }
  function shortDay(date) { return S.DAY_NAMES[S.dayIdx(date)].slice(0, 3) + ' ' + S.fmtShort(date); }
  function bar(done, total, label) {
    var pct = total ? Math.round(done * 100 / total) : 0;
    return '<div class="bar" role="progressbar" aria-label="' + esc(label) + '" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '"><span style="width:' + pct + '%"></span></div>';
  }
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('show'); }, 3500);
  }
  function currentWeek(date) {
    var w = S.weekOf(date);
    if (w) return w;
    return date < S.START_DATE ? 1 : S.WEEKS;
  }
  function byId(list) { var m = {}; list.forEach(function (t) { m[t.id] = t; }); return m; }
  function confirmDialog(title, text, okLabel) {
    return new Promise(function (resolve) {
      confirmDlg.querySelector('h2').textContent = title;
      confirmDlg.querySelector('p').textContent = text;
      confirmDlg.querySelector('[value=ok]').textContent = okLabel || 'Ya';
      confirmDlg.returnValue = '';
      confirmDlg.addEventListener('close', function h() { confirmDlg.removeEventListener('close', h); resolve(confirmDlg.returnValue === 'ok'); });
      confirmDlg.showModal();
    });
  }

  /* ---------- Peringatan (dipakai di Hari Ini dan Skor) ---------- */
  function chipBtn(t, today0) {
    var st = S.statusOf(t, today0);
    return '<button class="chip s-' + st + '" data-open="' + t.id + '" aria-label="Tryout ' + t.n + ', ' + esc(shortDay(t.date)) + ', ' + st.replace('-', ' ') + '">' + (st === 'selesai' ? '✓ ' : st === 'terlewat' ? '! ' : '') + t.n + '</button>';
  }
  function warnings(opts) {
    var d0 = today(), out = [], list = S.tryoutList(state), m = byId(list);
    if (opts.basic) {
      var miss = S.missed(state, d0);
      if (miss.length) {
        out.push('<div class="warn bad"><p>' + miss.length + ' tryout terlewat dan belum dijadwalkan ulang. Geser ke hari lain di minggu yang sama supaya total tetap 120 (ketuk nomornya).</p><div class="chips">' + miss.map(function (t) { return chipBtn(t, d0) + '<span class="sub">' + esc(shortDay(t.date)) + '</span>'; }).join(' ') + '</div></div>');
      }
      var hp = S.holidayPending(state, d0, 14);
      if (hp.length) {
        var dates = {}; hp.forEach(function (t) { (dates[t.date] = dates[t.date] || []).push(t); });
        Object.keys(dates).forEach(function (dt) {
          out.push('<div class="warn"><p>' + esc(S.HOLIDAYS[dt]) + ' jatuh pada ' + esc(S.fmtLong(dt)) + '. ' + dates[dt].length + ' tryout hari itu bisa digeser ke hari lain di minggu yang sama.</p><div class="chips">' + dates[dt].map(function (t) { return chipBtn(t, d0); }).join(' ') + '</div></div>');
        });
      }
      var as = S.afterSkd(state);
      if (as.length) out.push('<div class="warn bad"><p>Tanggal SKD (' + esc(S.fmtLong(state.settings.skdDate)) + ') jatuh sebelum tryout terakhir: ' + as.length + ' tryout yang belum selesai berada pada atau setelah hari SKD. Pertimbangkan memadatkan atau mengurangi tryout.</p></div>');
    }
    var avgs = S.weeklyAverages(state);
    ['twk', 'tkp'].forEach(function (k) {
      var p = S.plateau(avgs, k);
      if (p) out.push('<div class="warn bad"><p>Skor mentok: rata-rata ' + k.toUpperCase() + ' tidak naik dua minggu berturut-turut (minggu ' + p.weeks[0] + '–' + p.weeks[2] + ': ' + p.values.map(fmtNum).join(' → ') + '). Ganti sebagian tryout dengan belajar materi, dan utamakan pembahasan.</p></div>');
    });
    S.duplicates(state).forEach(function (g) {
      out.push('<div class="warn"><p>Paket dobel: “' + esc(g.name) + '” dipakai ' + g.ids.length + ' kali (tryout ' + g.ids.map(function (id) { return '#' + m[id].n; }).join(', ') + '). Mengulang paket yang sama membuat skor naik palsu.</p><div class="chips">' + g.ids.map(function (id) { return chipBtn(m[id], d0); }).join(' ') + '</div></div>');
    });
    return out.join('');
  }

  /* ---------- Hari Ini ---------- */
  function eventHtml(e, tmap, n, date) {
    var cls = 'ev k-' + e.kind, nowMin = n.sec / 60, isToday = date === n.date, stt = '';
    if (e.start !== null && isToday) stt = nowMin >= e.end ? ' past' : (nowMin >= e.start ? ' now' : '');
    if (e.start !== null && date < n.date) stt = ' past';
    var time = e.start === null ? 'Atur jam' : (e.kind === 'tidur' ? S.fmtTime(e.start) : S.fmtTime(e.start) + '–' + S.fmtTime(e.end));
    var t = e.toId ? tmap[e.toId] : null, sub = '', act = '';
    if (t) {
      sub = '#' + t.n + ' dari 120 · Minggu ' + t.week + (t.moved ? ' · digeser dari ' + esc(shortDay(t.baseDate)) : '') + (t.name ? ' · ' + esc(t.name) : '');
      if (e.kind === 'tryout') act = '<label class="chk"><input type="checkbox" data-done="' + t.id + '"' + (t.done ? ' checked' : '') + '><span>Selesai</span></label><button class="btn small" data-open="' + t.id + '">Buka</button>';
      else act = '<label class="chk"><input type="checkbox" data-rev="' + t.id + '"' + (t.reviewed ? ' checked' : '') + '><span>Sudah dibahas</span></label>';
    }
    if (e.kind === 'baca') act = '<a class="btn small" href="#/catatan">Buka catatan</a>';
    return '<li class="' + cls + stt + (e.conflict ? ' conflict' : '') + '"' + (stt === ' now' ? ' aria-current="true"' : '') + '><div class="time">' + time + '</div><div class="body"><div class="lbl">' + esc(e.label) + (stt === ' now' ? ' <span class="tag">sedang berjalan</span>' : '') + (e.conflict ? ' <span class="tag bad">bentrok jam</span>' : '') + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + (act ? '<div class="act">' + act + '</div>' : '') + '</div></li>';
  }
  function countdownText(sec) {
    if (sec >= 86400) { var d = Math.floor(sec / 86400), r = sec % 86400; return d + ' hari ' + Math.floor(r / 3600) + ' jam'; }
    function p(x) { return (x < 10 ? '0' : '') + x; }
    return p(Math.floor(sec / 3600)) + ':' + p(Math.floor(sec % 3600 / 60)) + ':' + p(sec % 60);
  }
  function statusKey(r, n) { return n.date + '|' + (r.current ? r.current.kind + r.current.start + (r.current.toId || '') : '-') + '|' + (r.next ? r.nextDate + r.next.start : '-'); }
  function viewToday() {
    var n = now(), r = S.statusNow(state, n), list = S.tryoutList(state), tmap = byId(list), day = r.today;
    var ts = S.totalStats(state), dts = S.daysToSkd(state, n.date), wk = S.weekOf(n.date), ws = S.weekStats(state);
    ui.shown = statusKey(r, n);
    var h = '<header class="page-h"><h1>Hari ini</h1><p>' + esc(S.fmtLong(n.date)) + ' · WITA' + (day.holiday ? ' · <span class="tag">' + esc(day.holiday) + '</span>' : '') + '</p></header>';
    h += '<section class="card"><div class="two"><div><div class="big">' + (dts > 0 ? 'H-' + dts : dts === 0 ? 'Hari SKD' : 'SKD lewat') + '</div><div class="sub">SKD ' + esc(S.fmtLong(state.settings.skdDate)) + '</div></div><div><div class="big">' + ts.done + '/' + ts.total + '</div><div class="sub">tryout selesai</div></div></div>' + bar(ts.done, ts.total, 'Progres total tryout');
    if (wk) h += '<div class="rowline"><span>Minggu ' + wk + '</span><span>' + ws[wk - 1].done + '/' + S.PER_WEEK + '</span></div>' + bar(ws[wk - 1].done, S.PER_WEEK, 'Progres minggu ' + wk);
    h += '</section>';
    var warn = warnings({ basic: true });
    if (day.phase !== 'program') h += warn;
    if (day.phase === 'program') {
      h += '<section class="card now-card" aria-live="off">';
      h += r.current ? '<div class="sub">Sedang berjalan</div><div class="big2">' + esc(r.current.label) + ' <span class="sub">' + (r.current.kind === 'tidur' ? 'sejak ' + S.fmtTime(r.current.start) : 's/d ' + S.fmtTime(r.current.end)) + '</span></div>' : '<div class="sub">Sedang jeda</div>';
      if (r.next) h += '<div class="rowline"><span>Berikutnya: ' + esc(r.next.label) + ' · ' + (r.nextDate === n.date ? '' : esc(shortDay(r.nextDate)) + ' ') + S.fmtTime(r.next.start) + '</span><span class="cd" id="cd" data-abs="' + (S.dayNum(r.nextDate) * 86400 + r.next.start * 60) + '">' + countdownText(r.nextIn) + '</span></div>';
      h += '</section>' + warn + '<ol class="timeline">' + day.events.filter(function (e) { return !e.flex; }).map(function (e) { return eventHtml(e, tmap, n, n.date); }).join('') + '</ol>';
      var flex = day.events.filter(function (e) { return e.flex; });
      if (flex.length) h += '<h2 class="sec">Tanpa jam</h2><ol class="timeline">' + flex.map(function (e) { return eventHtml(e, tmap, n, n.date); }).join('') + '</ol><p class="hint">Hari ini terlalu padat untuk jam otomatis. Buka tryoutnya lalu atur jam mulai.</p>';
      if (!day.tryouts.length) h += '<p class="hint">Tidak ada tryout hari ini.</p>';
    } else {
      var msg = { sebelum: 'Program belum dimulai. Tryout pertama: ' + S.fmtLong(S.START_DATE) + ', pukul 19.00 WITA.', tenang: 'Minggu tenang: tidak ada tryout. Cukup baca ulang buku soal salah dan jaga tidur.', skd: 'Hari ini hari SKD. Tidak ada tryout.', setelah: 'SKD sudah lewat. Jadwal tryout selesai.' }[day.phase];
      h += '<section class="card"><p>' + msg + '</p>' + (day.phase === 'tenang' ? '<a class="btn" href="#/catatan">Buka buku soal salah</a>' : '') + '</section>';
      if (r.next) h += '<section class="card now-card"><div class="rowline"><span>Berikutnya: ' + esc(r.next.label) + ' · ' + esc(shortDay(r.nextDate)) + ' ' + S.fmtTime(r.next.start) + '</span><span class="cd" id="cd" data-abs="' + (S.dayNum(r.nextDate) * 86400 + r.next.start * 60) + '">' + countdownText(r.nextIn) + '</span></div></section>';
    }
    return h;
  }

  /* ---------- Kalender ---------- */
  var WEEK_NOTES = { 1: 'Pekan pengumuman formasi: sekalian buat akun SSCASN dan siapkan berkas.', 5: 'Natal jatuh Jumat 25 Des: tryout hari itu boleh digeser ke hari lain di minggu yang sama.', 6: 'Tahun Baru jatuh Jumat 1 Jan: geser ke hari lain di minggu yang sama.', 10: 'Tryout terakhir.' };
  var RULES = ['Setiap tryout wajib dibahas. Kalau waktunya mepet, potong tryoutnya, jangan potong pembahasannya.', 'Soal yang salah dicatat per topik, lalu dibaca ulang setiap Minggu malam.', 'Pantau skor TWK dan TKP tiap minggu. Kalau dua minggu berturut-turut mentok, ganti sebagian tryout dengan belajar materi.', 'Pakai paket tryout yang berbeda dari beberapa sumber. Mengulang paket yang sama membuat skor naik palsu.', 'Kalau badan terlalu capek atau skor mentok, utamakan kesehatan dan pembahasan dulu, baru kejar targetnya.', 'Dari 1 Februari sampai hari SKD tidak ada tryout: cukup baca ulang buku soal salah dan jaga tidur.', 'Kalau ada hari yang terlewat (libur, sakit, lembur), geser tryoutnya ke hari lain di minggu yang sama supaya total tetap 120.'];
  function viewCalendar() {
    var d0 = today(), cw = S.weekOf(d0), list = S.tryoutList(state), ws = S.weekStats(state);
    var h = '<header class="page-h"><h1>Kalender</h1><p>10 minggu · 23 Nov 2026 – 31 Jan 2027</p></header>';
    h += '<p class="legend"><span class="chip s-selesai">✓ selesai</span> <span class="chip s-hari-ini">hari ini</span> <span class="chip s-terjadwal">terjadwal</span> <span class="chip s-terlewat">! terlewat</span> <span class="chip moved">↔ digeser</span></p>';
    for (var w = 1; w <= S.WEEKS; w++) {
      var start = S.weekStart(w), end = S.addDays(start, 6), open = ui.calOpen[w] !== undefined ? ui.calOpen[w] : w === cw;
      var wl = list.filter(function (t) { return t.week === w; });
      h += '<details class="week' + (w === cw ? ' current' : '') + '" data-w="' + w + '"' + (open ? ' open' : '') + '><summary><span class="wt">Minggu ' + w + '<small> ' + S.fmtShort(start) + ' – ' + S.fmtShort(end) + '</small></span><span class="wc">' + ws[w - 1].done + '/' + S.PER_WEEK + '</span></summary>';
      h += bar(ws[w - 1].done, S.PER_WEEK, 'Progres minggu ' + w);
      h += '<div class="dots" aria-hidden="true">' + wl.map(function (t) { return '<i class="dot s-' + S.statusOf(t, d0) + '"></i>'; }).join('') + '</div>';
      if (WEEK_NOTES[w]) h += '<p class="note">' + esc(WEEK_NOTES[w]) + '</p>';
      for (var k = 0; k < 7; k++) {
        var dt = S.addDays(start, k), here = wl.filter(function (t) { return t.date === dt; });
        h += '<div class="dayrow' + (dt === d0 ? ' today' : '') + '"><div class="dl">' + esc(shortDay(dt)) + (S.HOLIDAYS[dt] ? '<small class="hol">' + esc(S.HOLIDAYS[dt]) + '</small>' : '') + '</div><div class="chips">' + (here.length ? here.map(function (t) { return '<button class="chip s-' + S.statusOf(t, d0) + (t.moved ? ' moved' : '') + '" data-open="' + t.id + '" aria-label="Tryout ' + t.n + (t.moved ? ', digeser' : '') + ', ' + S.statusOf(t, d0).replace('-', ' ') + '">' + (S.statusOf(t, d0) === 'selesai' ? '✓ ' : S.statusOf(t, d0) === 'terlewat' ? '! ' : '') + t.n + (t.moved ? ' ↔' : '') + '</button>'; }).join(' ') : '<span class="sub">—</span>') + '</div></div>';
      }
      h += '</details>';
    }
    h += '<section class="card"><h2 class="sec">Minggu tenang</h2><p>1 Februari sampai hari SKD (' + esc(S.fmtLong(state.settings.skdDate)) + '): tanpa tryout. Baca ulang buku soal salah dan jaga tidur.</p></section>';
    h += '<details class="week rules"><summary><span class="wt">Aturan tetap</span></summary><ol>' + RULES.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol></details>';
    return h;
  }

  /* ---------- Skor ---------- */
  function pill(label, v, thr) {
    if (v === null) return '<span class="pill">' + label + ' —</span>';
    return '<span class="pill ' + (v >= thr ? 'ok' : 'bad') + '">' + label + ' ' + v + (v >= thr ? ' ✓' : ' ✗') + '</span>';
  }
  function viewScores() {
    var d0 = today(), h = '<header class="page-h"><h1>Skor</h1><p>Checklist tryout dan tren nilai</p></header>';
    h += '<div class="seg" role="tablist"><button role="tab" aria-selected="' + (ui.scoreTab === 'daftar') + '" data-tab="daftar">Daftar</button><button role="tab" aria-selected="' + (ui.scoreTab === 'tren') + '" data-tab="tren">Tren</button></div>';
    if (ui.scoreTab === 'daftar') {
      if (!ui.scoreWeek) ui.scoreWeek = currentWeek(d0);
      var w = ui.scoreWeek, list = S.tryoutList(state).filter(function (t) { return t.week === w; }), ws = S.weekStats(state)[w - 1], thr = state.settings.thr;
      h += '<div class="field"><label for="weeksel">Minggu</label><select id="weeksel" data-weeksel>' + Array.apply(null, Array(S.WEEKS)).map(function (_, i) { return '<option value="' + (i + 1) + '"' + (i + 1 === w ? ' selected' : '') + '>Minggu ' + (i + 1) + ' (' + S.fmtShort(S.weekStart(i + 1)) + ')</option>'; }).join('') + '</select></div>';
      h += '<div class="rowline"><span>Selesai minggu ' + w + '</span><span>' + ws.done + '/' + S.PER_WEEK + '</span></div>' + bar(ws.done, S.PER_WEEK, 'Progres minggu ' + w);
      h += '<ul class="list">' + list.map(function (t) {
        var tot = S.totalScore(t);
        return '<li class="item"><label class="chk big"><input type="checkbox" data-done="' + t.id + '"' + (t.done ? ' checked' : '') + ' aria-label="Tryout ' + t.n + ' selesai"><span></span></label><button class="main" data-open="' + t.id + '"><span class="l1">#' + t.n + ' · ' + esc(shortDay(t.date)) + (t.moved ? ' ↔' : '') + ' <span class="st s-' + S.statusOf(t, d0) + '">' + { selesai: 'selesai', terlewat: 'terlewat', 'hari-ini': 'hari ini', terjadwal: 'terjadwal' }[S.statusOf(t, d0)] + '</span></span><span class="l2">' + (t.name ? esc(t.name) : 'Belum ada nama paket') + (t.done ? (t.reviewed ? ' · dibahas' : ' · belum dibahas') : '') + '</span><span class="pills">' + pill('TWK', t.twk, thr.twk) + pill('TIU', t.tiu, thr.tiu) + pill('TKP', t.tkp, thr.tkp) + '<span class="pill tot">Total ' + (tot === null ? '—' : tot) + '</span></span></button></li>';
      }).join('') + '</ul>';
    } else {
      h += warnings({ basic: false });
      var items = [['twk', 'TWK'], ['tiu', 'TIU'], ['tkp', 'TKP'], ['total', 'Total']];
      h += '<div class="seg small">' + items.map(function (it) { return '<button aria-pressed="' + (ui.series === it[0]) + '" data-series="' + it[0] + '">' + it[1] + '</button>'; }).join('') + '</div>';
      h += chart(ui.series) + avgTable();
      h += '<p class="hint">Peringatan “skor mentok” dihitung dari rata-rata mingguan TWK dan TKP, minimal ' + S.MIN_PER_WEEK_FOR_TREND + ' tryout bernilai per minggu.</p>';
    }
    return h;
  }
  function chart(key) {
    var thr = state.settings.thr, tl = { twk: thr.twk, tiu: thr.tiu, tkp: thr.tkp, total: thr.twk + thr.tiu + thr.tkp }[key];
    var maxv = key === 'total' ? S.MAX.twk + S.MAX.tiu + S.MAX.tkp : S.MAX[key];
    var pts = S.tryoutList(state).filter(function (t) { return t.done && (key === 'total' ? S.totalScore(t) !== null : t[key] !== null); }).map(function (t) { return { n: t.n, v: key === 'total' ? S.totalScore(t) : t[key] }; });
    var label = key.toUpperCase();
    if (!pts.length) return '<div class="card empty"><p>Belum ada skor ' + label + '. Selesaikan tryout lalu isi skornya.</p></div>';
    var vals = pts.map(function (p) { return p.v; }).concat([tl]);
    var lo = Math.max(0, Math.floor((Math.min.apply(null, vals) - 8) / 10) * 10), hi = Math.min(maxv, Math.ceil((Math.max.apply(null, vals) + 8) / 10) * 10);
    if (hi - lo < 20) hi = lo + 20;
    var W = 340, H = 190, L = 34, R = 10, Tp = 12, B = 26, pw = W - L - R, ph = H - Tp - B;
    function X(i) { return L + (pts.length === 1 ? pw / 2 : pw * i / (pts.length - 1)); }
    function Y(v) { return Tp + ph * (1 - (v - lo) / (hi - lo)); }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Grafik skor ' + label + ' per tryout, ' + pts.length + ' titik, terakhir ' + pts[pts.length - 1].v + ', ambang ' + tl + '" class="chart">';
    for (var g = 0; g <= 4; g++) { var gv = lo + (hi - lo) * g / 4; svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(gv) + '" y2="' + Y(gv) + '" class="grid"/><text x="' + (L - 5) + '" y="' + (Y(gv) + 4) + '" text-anchor="end" class="ax">' + Math.round(gv) + '</text>'; }
    svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(tl) + '" y2="' + Y(tl) + '" class="thr"/><text x="' + (W - R) + '" y="' + (Y(tl) - 4) + '" text-anchor="end" class="ax thr-t">ambang ' + tl + '</text>';
    svg += '<polyline class="ln" points="' + pts.map(function (p, i) { return X(i).toFixed(1) + ',' + Y(p.v).toFixed(1); }).join(' ') + '"/>';
    pts.forEach(function (p, i) { svg += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="4" class="pt ' + (p.v >= tl ? 'ok' : 'bad') + '"><title>Tryout ' + p.n + ': ' + p.v + '</title></circle>'; });
    svg += '<text x="' + L + '" y="' + (H - 8) + '" class="ax">TO #' + pts[0].n + '</text><text x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end" class="ax">TO #' + pts[pts.length - 1].n + '</text></svg>';
    return '<div class="card chartbox"><div class="rowline"><span>' + label + ' per tryout</span><span class="sub">terakhir ' + pts[pts.length - 1].v + '</span></div>' + svg + '</div>';
  }
  function avgTable() {
    var a = S.weeklyAverages(state), rows = a.filter(function (x) { return x.n.twk || x.n.tiu || x.n.tkp || x.n.total; });
    if (!rows.length) return '';
    function arrow(cur, prev) { if (cur === null || prev === null || prev === undefined) return ''; return cur > prev ? ' <span class="up">▲</span>' : cur < prev ? ' <span class="down">▼</span>' : ' <span class="eq">＝</span>'; }
    var prev = {};
    var body = rows.map(function (x) {
      var cells = ['twk', 'tiu', 'tkp', 'total'].map(function (k) { var c = '<td>' + fmtNum(x[k]) + arrow(x[k], prev[k]) + '</td>'; prev[k] = x[k]; return c; }).join('');
      return '<tr><th scope="row">M' + x.week + '</th>' + cells + '<td class="sub">' + x.n.total + '</td></tr>';
    }).join('');
    return '<div class="card"><h2 class="sec">Rata-rata per minggu</h2><table class="avg"><thead><tr><th></th><th>TWK</th><th>TIU</th><th>TKP</th><th>Total</th><th>TO</th></tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  /* ---------- Catatan (buku soal salah) ---------- */
  function viewNotes() {
    var sub = ui.noteSub, topic = ui.noteTopic, all = state.wrong;
    var topics = {}; all.forEach(function (w) { if (sub === 'Semua' || w.subtest === sub) topics[w.topic] = 1; });
    if (topic && !topics[topic]) topic = ui.noteTopic = '';
    var shown = all.filter(function (w) { return (sub === 'Semua' || w.subtest === sub) && (!topic || w.topic === topic); }).slice().reverse();
    var h = '<header class="page-h"><h1>Buku soal salah</h1><p>Dibaca ulang tiap Minggu pukul 19.30</p></header>';
    h += '<button class="btn primary block" data-act="note-new">+ Tambah catatan</button>';
    h += '<div class="seg small">' + ['Semua'].concat(S.SUBTESTS).map(function (s) { return '<button aria-pressed="' + (sub === s) + '" data-notesub="' + s + '">' + s + '</button>'; }).join('') + '</div>';
    h += '<div class="field"><label for="topicsel">Topik</label><select id="topicsel" data-topicsel><option value="">Semua topik</option>' + Object.keys(topics).sort().map(function (t) { return '<option value="' + esc(t) + '"' + (t === topic ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>';
    if (!all.length) h += '<div class="card empty"><p>Belum ada catatan. Catat soal yang salah per topik, misalnya “TWK – Pancasila”, lalu baca ulang tiap Minggu malam.</p></div>';
    else if (!shown.length) h += '<div class="card empty"><p>Tidak ada catatan untuk filter ini.</p></div>';
    h += '<ul class="notes">' + shown.map(function (w) {
      return '<li class="note-card"><div class="rowline"><span><span class="pill sub-' + w.subtest + '">' + w.subtest + '</span> ' + esc(w.topic) + '</span><span class="sub">' + (w.created ? esc(S.fmtShort(w.created)) : '') + '</span></div><p class="ntext">' + esc(w.note) + '</p><div class="rowline"><span class="sub">' + (w.reads ? 'Dibaca ulang ' + w.reads + '×' + (w.lastRead ? ', terakhir ' + esc(S.fmtShort(w.lastRead)) : '') : 'Belum dibaca ulang') + '</span><span><button class="btn small" data-read="' + esc(w.id) + '">Sudah dibaca ulang</button> <button class="btn small" data-note="' + esc(w.id) + '">Ubah</button></span></div></li>';
    }).join('') + '</ul>';
    return h;
  }

  /* ---------- Pengaturan ---------- */
  function notifStatus() {
    if (!('Notification' in window)) return 'Peramban ini tidak mendukung notifikasi. Aplikasi tetap berfungsi penuh.';
    if (Notification.permission === 'denied') return 'Izin notifikasi ditolak di peramban. Aplikasi tetap berfungsi tanpa notifikasi.';
    if (state.settings.notify && Notification.permission === 'granted') return 'Aktif. Pengingat muncul selama aplikasi terbuka (atau masih berjalan di latar belakang).';
    return 'Nonaktif.';
  }
  function viewSettings() {
    var s = state.settings;
    var h = '<header class="page-h"><h1>Pengaturan</h1><p>Zona waktu: WITA (Asia/Makassar)</p></header>';
    h += '<section class="card"><h2 class="sec">Tanggal SKD</h2><div class="field"><label for="skd">Tanggal SKD</label><input id="skd" type="date" value="' + esc(s.skdDate) + '" data-set="skdDate"></div><p class="hint">Default 8 Februari 2027. Ikuti pengumuman resmi di sscasn.bkn.go.id.</p></section>';
    h += '<section class="card"><h2 class="sec">Ambang batas lulus</h2><div class="grid3">' + ['twk', 'tiu', 'tkp'].map(function (k) { return '<div class="field"><label for="thr-' + k + '">' + k.toUpperCase() + '</label><input id="thr-' + k + '" type="number" inputmode="numeric" min="0" max="' + S.MAX[k] + '" value="' + s.thr[k] + '" data-thr="' + k + '"></div>'; }).join('') + '</div><p class="hint">Default TWK 65, TIU 80, TKP 166. Ubah bila aturan 2026 berbeda.</p></section>';
    h += '<section class="card"><h2 class="sec">Tampilan</h2><div class="seg" role="radiogroup" aria-label="Tema">' + [['auto', 'Otomatis'], ['light', 'Terang'], ['dark', 'Gelap']].map(function (t) { return '<button role="radio" aria-checked="' + (s.theme === t[0]) + '" data-theme="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></section>';
    h += '<section class="card"><h2 class="sec">Notifikasi pengingat</h2><p class="hint" id="notif-status">' + esc(notifStatus()) + '</p><div class="field"><label for="lead">Ingatkan sebelum kegiatan</label><select id="lead" data-lead>' + [0, 5, 10, 15, 30].map(function (m) { return '<option value="' + m + '"' + (s.lead === m ? ' selected' : '') + '>' + (m ? m + ' menit' : 'Tepat waktu') + '</option>'; }).join('') + '</select></div><button class="btn" data-act="notif-toggle">' + (s.notify ? 'Matikan pengingat' : 'Aktifkan pengingat') + '</button></section>';
    h += '<section class="card"><h2 class="sec">Cadangan data</h2><p class="hint">Data hanya tersimpan di peramban ini. Ekspor berkala sebagai cadangan.</p><div class="btns"><button class="btn" data-act="export">Ekspor JSON</button><label class="btn" for="import-file">Impor JSON</label><input id="import-file" type="file" accept="application/json,.json" hidden></div></section>';
    h += '<section class="card"><h2 class="sec">Pasang di layar utama</h2><p class="hint" id="install-hint">Android (Chrome): menu ⋮ → “Tambahkan ke Layar Utama”. iPhone (Safari): Bagikan → “Tambah ke Layar Utama”.</p>' + (installEvent ? '<button class="btn" data-act="install">Pasang aplikasi</button>' : '') + '<p class="hint" id="offline-status"></p></section>';
    h += '<section class="card danger"><h2 class="sec">Reset data</h2><p class="hint">Menghapus semua skor, catatan, geseran jadwal, dan pengaturan di perangkat ini.</p><button class="btn bad" data-act="reset">Reset semua data</button></section>';
    h += '<p class="hint center">Tryout SKD · v1.0 · data lokal, tanpa akun</p>';
    return h;
  }

  /* ---------- Sheet detail tryout ---------- */
  function moveOptions(t) {
    var start = S.weekStart(t.week), list = S.tryoutList(state), o = '';
    for (var k = 0; k < 7; k++) {
      var dt = S.addDays(start, k), c = list.filter(function (x) { return x.date === dt && x.id !== t.id; }).length;
      o += '<option value="' + dt + '"' + (dt === t.date ? ' selected' : '') + '>' + esc(S.DAY_NAMES[k] + ' ' + S.fmtShort(dt)) + ' · ' + c + ' TO lain' + (S.HOLIDAYS[dt] ? ' · libur ' + esc(S.HOLIDAYS[dt]) : '') + (dt === t.baseDate ? ' · jadwal awal' : '') + '</option>';
    }
    return o;
  }
  function dupNote(t) {
    if (!t.name) return '';
    var key = S.normName(t.name);
    var same = S.tryoutList(state).filter(function (x) { return x.id !== t.id && S.normName(x.name) === key; });
    return same.length ? 'Nama paket ini juga dipakai di tryout ' + same.map(function (x) { return '#' + x.n; }).join(', ') + '. Gunakan paket yang berbeda.' : '';
  }
  function renderTryoutSheet() {
    var t = S.getTryout(state, ui.sheet.id), thr = state.settings.thr, d0 = today();
    var time = t.start !== null ? S.fmtTime(t.start).replace('.', ':') : '';
    sheetBody.innerHTML = '<div class="sh-h"><div><h2>Tryout #' + t.n + ' <small>dari 120</small></h2><p class="sub">Minggu ' + t.week + ' · ' + esc(S.fmtLong(t.date)) + (t.moved ? ' · digeser dari ' + esc(shortDay(t.baseDate)) : '') + (S.HOLIDAYS[t.date] ? ' · ' + esc(S.HOLIDAYS[t.date]) : '') + '</p></div><button class="btn small" data-act="close-sheet" aria-label="Tutup">Tutup</button></div>' +
      '<label class="chk big row"><input type="checkbox" data-f="done"' + (t.done ? ' checked' : '') + '><span>Selesai dikerjakan</span></label>' +
      '<div class="field"><label for="f-name">Nama atau sumber paket</label><input id="f-name" type="text" maxlength="120" autocomplete="off" value="' + esc(t.name) + '" data-f="name" placeholder="mis. Bimbel A – Paket 3"></div><p class="warn-inline" id="dup">' + esc(dupNote(t)) + '</p>' +
      '<div class="grid3">' + ['twk', 'tiu', 'tkp'].map(function (k) { return '<div class="field"><label for="f-' + k + '">' + k.toUpperCase() + ' <small>(maks ' + S.MAX[k] + ')</small></label><input id="f-' + k + '" type="number" inputmode="numeric" min="0" max="' + S.MAX[k] + '" step="1" value="' + (t[k] === null ? '' : t[k]) + '" data-f="' + k + '"></div>'; }).join('') + '</div>' +
      '<p class="warn-inline bad" id="err"></p><div class="pills" id="derived"></div>' +
      '<label class="chk big row"><input type="checkbox" data-f="reviewed"' + (t.reviewed ? ' checked' : '') + '><span>Pembahasan sudah dikerjakan</span></label>' +
      '<div class="move"><h3>Geser tryout</h3><p class="sub">Hanya ke hari lain di Minggu ' + t.week + ', supaya total tetap 120.</p><div class="field"><label for="f-date">Pindah ke hari</label><select id="f-date">' + moveOptions(t) + '</select></div><div class="field"><label for="f-time">Jam mulai (opsional)</label><input id="f-time" type="time" value="' + time + '"></div><div class="btns"><button class="btn primary" data-act="move">Geser</button>' + (t.moved ? '<button class="btn" data-act="unmove">Kembalikan ke jadwal awal</button>' : '') + '</div><p class="warn-inline" id="move-msg"></p></div>';
    refreshDerived();
  }
  function refreshDerived() {
    if (!ui.sheet || ui.sheet.type !== 'tryout') return;
    var t = S.getTryout(state, ui.sheet.id), thr = state.settings.thr, el = document.getElementById('derived');
    if (!el) return;
    var tot = S.totalScore(t), p = S.passInfo(t, thr);
    el.innerHTML = pill('TWK', t.twk, thr.twk) + pill('TIU', t.tiu, thr.tiu) + pill('TKP', t.tkp, thr.tkp) + '<span class="pill tot">Total ' + (tot === null ? '—' : tot) + '</span>' + (p.all === null ? '' : '<span class="pill ' + (p.all ? 'ok' : 'bad') + '">' + (p.all ? 'Lulus semua ambang' : 'Belum lulus semua ambang') + '</span>');
    var d = document.getElementById('dup'); if (d) d.textContent = dupNote(t);
  }
  function openTryout(id) { ui.sheet = { type: 'tryout', id: id }; renderTryoutSheet(); if (!sheet.open) sheet.showModal(); }

  function openNote(id) {
    var w = id ? state.wrong.filter(function (x) { return x.id === id; })[0] : null;
    ui.sheet = { type: 'note', id: id || null, sub: w ? w.subtest : 'TWK' };
    var sub = ui.sheet.sub;
    sheetBody.innerHTML = '<div class="sh-h"><h2>' + (w ? 'Ubah catatan' : 'Catatan baru') + '</h2><button class="btn small" data-act="close-sheet" aria-label="Tutup">Batal</button></div>' +
      '<div class="field"><label for="n-sub">Subtes</label><select id="n-sub">' + S.SUBTESTS.map(function (s) { return '<option' + (s === sub ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="n-topic">Topik</label><input id="n-topic" list="n-topics" maxlength="80" autocomplete="off" value="' + esc(w ? w.topic : '') + '" placeholder="mis. Pancasila"><datalist id="n-topics"></datalist></div>' +
      '<div class="field"><label for="n-note">Soal dan konsep yang benar</label><textarea id="n-note" rows="6" maxlength="3000" placeholder="Apa yang salah, jawaban yang benar, dan alasannya">' + esc(w ? w.note : '') + '</textarea></div><p class="warn-inline bad" id="n-err"></p>' +
      '<div class="btns"><button class="btn primary" data-act="note-save">Simpan</button>' + (w ? '<button class="btn bad" data-act="note-del">Hapus</button>' : '') + '</div>';
    fillTopics(); sheet.showModal();
  }
  function fillTopics() {
    var sub = document.getElementById('n-sub').value, set = {};
    S.TOPICS[sub].forEach(function (t) { set[t] = 1; });
    state.wrong.forEach(function (w) { if (w.subtest === sub) set[w.topic] = 1; });
    document.getElementById('n-topics').innerHTML = Object.keys(set).map(function (t) { return '<option value="' + esc(t) + '">'; }).join('');
  }

  /* ---------- Render utama ---------- */
  function route() { var r = (location.hash || '').replace(/^#\/?/, ''); return ROUTES.indexOf(r) >= 0 ? r : 'hari-ini'; }
  function render() {
    var r = route(), fn = { 'hari-ini': viewToday, kalender: viewCalendar, skor: viewScores, catatan: viewNotes, pengaturan: viewSettings }[r];
    var y = window.scrollY;
    view.innerHTML = fn();
    document.querySelectorAll('nav a').forEach(function (a) { var on = a.getAttribute('href') === '#/' + r; if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = { 'hari-ini': 'Hari Ini', kalender: 'Kalender', skor: 'Skor', catatan: 'Catatan', pengaturan: 'Pengaturan' }[r] + ' · Tryout SKD';
    if (r === 'pengaturan') updateOfflineStatus();
    window.scrollTo(0, y);
  }
  function applyTheme() {
    var t = state.settings.theme, root = document.documentElement;
    if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
    var dark = t === 'dark' || (t === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelectorAll('meta[name=theme-color]').forEach(function (m) { m.setAttribute('content', dark ? '#0d1117' : '#ffffff'); });
  }
  function afterChange() { save(); }

  /* ---------- Event ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-open],[data-act],[data-tab],[data-series],[data-notesub],[data-note],[data-read],[data-theme]');
    if (!el) { if (e.target === sheet) sheet.close(); return; }
    if (el.dataset.open) return openTryout(el.dataset.open);
    if (el.dataset.tab) { ui.scoreTab = el.dataset.tab; return render(); }
    if (el.dataset.series) { ui.series = el.dataset.series; return render(); }
    if (el.dataset.notesub) { ui.noteSub = el.dataset.notesub; return render(); }
    if (el.dataset.note) return openNote(el.dataset.note);
    if (el.dataset.read) {
      var w = state.wrong.filter(function (x) { return x.id === el.dataset.read; })[0];
      if (w) { w.reads++; w.lastRead = today(); afterChange(); render(); toast('Dicatat: dibaca ulang.'); }
      return;
    }
    if (el.dataset.theme) { state.settings.theme = el.dataset.theme; afterChange(); applyTheme(); return render(); }
    var act = el.dataset.act;
    if (act === 'close-sheet') sheet.close();
    else if (act === 'move') doMove();
    else if (act === 'unmove') { S.resetMove(state, ui.sheet.id); afterChange(); toast('Dikembalikan ke jadwal awal.'); renderTryoutSheet(); }
    else if (act === 'note-new') openNote(null);
    else if (act === 'note-save') saveNote();
    else if (act === 'note-del') {
      var id = ui.sheet.id;
      confirmDialog('Hapus catatan?', 'Catatan ini akan dihapus permanen.', 'Hapus').then(function (ok) { if (!ok) return; state.wrong = state.wrong.filter(function (x) { return x.id !== id; }); afterChange(); sheet.close(); toast('Catatan dihapus.'); });
    }
    else if (act === 'export') doExport();
    else if (act === 'reset') confirmDialog('Reset semua data?', 'Semua skor, catatan, geseran jadwal, dan pengaturan akan dihapus dari perangkat ini. Pastikan sudah Ekspor bila perlu. Tindakan ini tidak bisa dibatalkan.', 'Hapus semua').then(function (ok) {
      if (!ok) return; state = S.newState(); afterChange(); try { localStorage.removeItem(FIRED_KEY); } catch (er) { /* abaikan */ } applyTheme(); render(); toast('Semua data direset.');
    });
    else if (act === 'notif-toggle') toggleNotif();
    else if (act === 'install' && installEvent) { installEvent.prompt(); installEvent = null; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-done]')) { S.setField(state, t.dataset.done, { done: t.checked }); afterChange(); render(); return; }
    if (t.matches('[data-rev]')) { S.setField(state, t.dataset.rev, { reviewed: t.checked }); afterChange(); render(); return; }
    if (t.matches('[data-weeksel]')) { ui.scoreWeek = +t.value; render(); return; }
    if (t.matches('[data-topicsel]')) { ui.noteTopic = t.value; render(); return; }
    if (t.matches('[data-lead]')) { state.settings.lead = +t.value; afterChange(); return; }
    if (t.matches('[data-set=skdDate]')) {
      if (S.isDate(t.value)) { state.settings.skdDate = t.value; afterChange(); toast('Tanggal SKD diperbarui.'); } else { t.value = state.settings.skdDate; toast('Tanggal tidak valid.'); }
      return;
    }
    if (t.matches('[data-thr]')) {
      var v = Number(t.value), k = t.dataset.thr;
      if (t.value !== '' && Number.isInteger(v) && v >= 0 && v <= S.MAX[k]) { state.settings.thr[k] = v; afterChange(); toast('Ambang ' + k.toUpperCase() + ' disimpan.'); } else { t.value = state.settings.thr[k]; toast('Ambang harus bilangan bulat 0–' + S.MAX[k] + '.'); }
      return;
    }
    if (t.id === 'import-file') return doImport(t);
    if (t.id === 'n-sub') return fillTopics();
    if (t.matches('#sheet [data-f=done]')) { S.setField(state, ui.sheet.id, { done: t.checked }); afterChange(); return; }
    if (t.matches('#sheet [data-f=reviewed]')) { S.setField(state, ui.sheet.id, { reviewed: t.checked }); afterChange(); return; }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!ui.sheet || ui.sheet.type !== 'tryout' || !t.matches('#sheet [data-f]')) return;
    var f = t.dataset.f, id = ui.sheet.id;
    if (f === 'name') { S.setField(state, id, { name: t.value }); afterChange(); refreshDerived(); return; }
    if (f === 'twk' || f === 'tiu' || f === 'tkp') {
      var err = document.getElementById('err'), v = t.value.trim(), n = Number(v);
      if (v === '') { S.setField(state, id, (function () { var o = {}; o[f] = ''; return o; })()); err.textContent = ''; }
      else if (!Number.isInteger(n) || n < 0 || n > S.MAX[f]) { err.textContent = f.toUpperCase() + ': isi bilangan bulat 0–' + S.MAX[f] + '. Nilai ini belum disimpan.'; return; }
      else {
        err.textContent = '';
        var patch = {}; patch[f] = n;
        if (!S.getTryout(state, id).done) { patch.done = true; sheet.querySelector('[data-f=done]').checked = true; }
        S.setField(state, id, patch);
      }
      afterChange(); refreshDerived();
    }
  });
  sheet.addEventListener('close', function () { ui.sheet = null; render(); });
  document.addEventListener('toggle', function (e) { var d = e.target; if (d.matches && d.matches('details.week[data-w]')) ui.calOpen[+d.dataset.w] = d.open; }, true);
  window.addEventListener('hashchange', function () { window.scrollTo(0, 0); render(); });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvent = e; if (route() === 'pengaturan') render(); });
  window.addEventListener('appinstalled', function () { installEvent = null; toast('Aplikasi terpasang.'); });

  function doMove() {
    var id = ui.sheet.id, date = document.getElementById('f-date').value, time = document.getElementById('f-time').value, msg = document.getElementById('move-msg'), start = null;
    if (time) { var p = time.split(':'); start = (+p[0]) * 60 + (+p[1]); }
    var r = S.moveTryout(state, id, date, start);
    if (!r.ok) { msg.textContent = r.error; return; }
    afterChange();
    var t = S.getTryout(state, id), day = S.buildDay(state, date), note = '';
    if (day.events.some(function (e) { return e.conflict; })) note = ' Perhatian: jamnya bentrok dengan tryout lain, atur jam mulai.';
    else if (day.events.some(function (e) { return e.flex; })) note = ' Hari itu padat; atur jam mulai.';
    toast('Tryout #' + t.n + ' dijadwalkan ' + S.fmtLong(date) + '.' + note);
    renderTryoutSheet();
    var m2 = document.getElementById('move-msg'); if (m2) m2.textContent = 'Dijadwalkan ' + S.fmtLong(date) + '.' + note;
  }
  function saveNote() {
    var sub = document.getElementById('n-sub').value, topic = document.getElementById('n-topic').value.trim(), note = document.getElementById('n-note').value.trim(), err = document.getElementById('n-err');
    if (!topic) { err.textContent = 'Isi topik.'; return; }
    if (!note) { err.textContent = 'Isi catatan.'; return; }
    if (ui.sheet.id) {
      var w = state.wrong.filter(function (x) { return x.id === ui.sheet.id; })[0];
      if (w) { w.subtest = sub; w.topic = topic; w.note = note; }
    } else state.wrong.push({ id: 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), subtest: sub, topic: topic, note: note, created: today(), reads: 0, lastRead: '' });
    afterChange(); sheet.close(); toast('Catatan disimpan.');
  }
  function doExport() {
    var json = JSON.stringify(S.exportData(state), null, 2);
    var blob = new Blob([json], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'tryout-skd-cadangan-' + today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    toast('Cadangan diekspor.');
  }
  function doImport(input) {
    var f = input.files && input.files[0]; input.value = '';
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast('Berkas terlalu besar.'); return; }
    var rd = new FileReader();
    rd.onerror = function () { toast('Gagal membaca berkas.'); };
    rd.onload = function () {
      var r = S.parseImport(String(rd.result));
      if (!r.ok) { toast('Impor gagal: ' + r.error); return; }
      var done = S.totalStats(r.state).done;
      confirmDialog('Ganti data dengan cadangan?', 'Data saat ini akan diganti: ' + done + ' tryout selesai, ' + r.state.wrong.length + ' catatan soal salah.', 'Ganti data').then(function (ok) {
        if (!ok) return; state = r.state; afterChange(); applyTheme(); render(); toast('Impor berhasil.');
      });
    };
    rd.readAsText(f);
  }

  /* ---------- Notifikasi ---------- */
  function toggleNotif() {
    var s = state.settings;
    if (s.notify) { s.notify = false; afterChange(); render(); return; }
    if (!('Notification' in window)) { toast('Peramban tidak mendukung notifikasi. Aplikasi tetap berfungsi.'); return; }
    Promise.resolve(Notification.requestPermission()).then(function (p) {
      if (p === 'granted') { s.notify = true; afterChange(); toast('Pengingat aktif.'); } else toast('Izin notifikasi tidak diberikan. Aplikasi tetap berfungsi tanpa notifikasi.');
      render();
    }).catch(function () { toast('Tidak bisa meminta izin notifikasi.'); });
  }
  function firedMap() { try { return JSON.parse(localStorage.getItem(FIRED_KEY)) || {}; } catch (e) { return {}; } }
  function checkNotifications() {
    if (!state.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    var n = now(), abs = S.dayNum(n.date) * 86400 + n.sec, day = S.buildDay(state, n.date), fired = firedMap(), changed = false;
    Object.keys(fired).forEach(function (k) { if (k.slice(0, 10) < S.addDays(n.date, -2)) { delete fired[k]; changed = true; } });
    var tmap = byId(S.tryoutList(state));
    day.events.forEach(function (e) {
      if (e.start === null || (e.kind !== 'tryout' && e.kind !== 'bahas' && e.kind !== 'baca')) return;
      var lead = e.kind === 'baca' ? 0 : state.settings.lead, startAbs = S.dayNum(n.date) * 86400 + e.start * 60, trig = startAbs - lead * 60, key = n.date + '|' + e.start + '|' + e.kind + '|' + (e.toId || '');
      if (abs >= trig && abs < startAbs + 120 && !fired[key]) {
        fired[key] = 1; changed = true;
        var t = e.toId ? tmap[e.toId] : null;
        var title = e.label + ' · ' + S.fmtTime(e.start), body = lead ? 'Mulai dalam ' + lead + ' menit.' : 'Mulai sekarang.';
        if (t) body += ' Tryout #' + t.n + ' dari 120.';
        notify(title, body);
      }
    });
    if (changed) { try { localStorage.setItem(FIRED_KEY, JSON.stringify(fired)); } catch (e) { /* abaikan */ } }
  }
  function notify(title, body) {
    var opts = { body: body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'tryout-skd', lang: 'id' };
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistration) {
        navigator.serviceWorker.getRegistration().then(function (reg) { if (reg && reg.showNotification) reg.showNotification(title, opts); else new Notification(title, opts); }).catch(function () { /* abaikan */ });
      } else new Notification(title, opts);
    } catch (e) { /* abaikan */ }
  }

  /* ---------- PWA ---------- */
  function updateOfflineStatus() {
    var el = document.getElementById('offline-status'); if (!el) return;
    if (!('serviceWorker' in navigator)) { el.textContent = 'Mode offline: peramban tidak mendukung service worker.'; return; }
    navigator.serviceWorker.getRegistration().then(function (reg) {
      el.textContent = reg && reg.active ? 'Mode offline: siap. Aplikasi bisa dibuka tanpa internet.' : 'Mode offline: belum aktif. Buka sekali dengan internet.';
      el.dataset.ready = reg && reg.active ? '1' : '0';
    });
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').then(function () { updateOfflineStatus(); }).catch(function () { /* aplikasi tetap berjalan tanpa offline */ });
    });
  }

  /* ---------- Jalan ---------- */
  applyTheme();
  if (window.matchMedia) { try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) { /* abaikan */ } }
  if (memoryOnly) toast('Penyimpanan peramban tidak tersedia. Data hanya sementara.');
  render();
  var tickN = 0;
  setInterval(function () {
    tickN++;
    if (route() === 'hari-ini' && !sheet.open && !confirmDlg.open) {
      var n = now(), r = S.statusNow(state, n);
      if (statusKey(r, n) !== ui.shown) render();
      else { var cd = document.getElementById('cd'); if (cd && r.nextIn !== null) cd.textContent = countdownText(r.nextIn); }
    }
    if (tickN % 10 === 0) checkNotifications();
  }, 1000);
  window.__app = { get state() { return state; } }; // untuk debugging dan tes
})();
