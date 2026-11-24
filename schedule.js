/* Logika jadwal tryout SKD: murni (tanpa DOM) supaya bisa diuji di Node dan dipakai di browser.
   Semua tanggal berupa teks "YYYY-MM-DD" di zona WITA (UTC+8, tanpa DST). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Sked = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Revisi 2026-11-24 (150 tryout): mulai Selasa 24 Nov 2026. Senin-Kamis 2 tryout per hari (siang dan malam),
  // Jumat 2 (pagi dan malam), Sabtu 3 (pagi, siang, malam), Minggu 2 (pagi dan siang) = 15 per minggu.
  // 150 tryout selesai Senin 1 Feb 2027, sebelum SKD bawaan 8 Feb 2027. Minggu 1 dihitung dari Senin 23 Nov.
  var START_DATE = '2026-11-23'; // Senin awal minggu 1
  var FIRST_DATE = '2026-11-24'; // tryout pertama
  var TOTAL = 150;
  var PER_DAY = [2, 2, 2, 2, 2, 3, 2]; // Senin..Minggu
  var DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  var MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HOLIDAYS = { '2026-12-25': 'Hari Raya Natal', '2027-01-01': 'Tahun Baru 2027' };
  var MAX = { twk: 150, tiu: 175, tkp: 225 };
  var MIN_PER_WEEK_FOR_TREND = 3;
  var UTC_OFFSET_H = 8; // WITA
  var DEFAULT_SETTINGS = { skdDate: '2027-02-08', thr: { twk: 65, tiu: 80, tkp: 166 }, theme: 'auto', notify: false, lead: 5 };
  var SUBTESTS = ['TWK', 'TIU', 'TKP'];
  var LESSON_MAX = 1000; // panjang maksimum catatan pelajaran harian

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayNum(s) { var p = s.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
  function dateStr(n) { var d = new Date(n * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && dateStr(dayNum(s)) === s; }
  function dayIdx(s) { return ((dayNum(s) + 3) % 7 + 7) % 7; } // 0 = Senin
  function addDays(s, k) { return dateStr(dayNum(s) + k); }
  function diffDays(a, b) { return dayNum(a) - dayNum(b); }
  function fmtLong(s) { var p = s.split('-'); return DAY_NAMES[dayIdx(s)] + ', ' + (+p[2]) + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0]; }
  function fmtShort(s) { var p = s.split('-'); return (+p[2]) + ' ' + MONTHS[+p[1] - 1].slice(0, 3); }
  function fmtTime(min) { return pad(Math.floor(min / 60) % 24) + '.' + pad(min % 60); }

  /* ---------- Jadwal dasar (150 tryout) ---------- */
  function buildBase() {
    var out = [], n = 0, s0 = dayNum(START_DATE);
    for (var dn = dayNum(FIRST_DATE); n < TOTAL; dn++) {
      var d = ((dn + 3) % 7 + 7) % 7;
      for (var k = 0; k < PER_DAY[d] && n < TOTAL; k++) {
        n++;
        out.push({ id: 'T' + (n < 100 ? (n < 10 ? '00' : '0') : '') + n, n: n, week: Math.floor((dn - s0) / 7) + 1, dayIdx: d, slot: k, date: dateStr(dn) });
      }
    }
    return out;
  }
  var BASE = buildBase();
  var WEEKS = BASE[BASE.length - 1].week;
  var WEEK_COUNTS = [];
  for (var wi = 0; wi < WEEKS; wi++) WEEK_COUNTS.push(0);
  BASE.forEach(function (b) { WEEK_COUNTS[b.week - 1]++; });
  var LAST_TRYOUT_DATE = BASE[BASE.length - 1].date;
  var BY_ID = {};
  BASE.forEach(function (b) { BY_ID[b.id] = b; });
  function weekStart(w) { return addDays(START_DATE, 7 * (w - 1)); }
  function weekOf(date) {
    var k = diffDays(date, START_DATE);
    if (k < 0 || k >= WEEKS * 7) return null;
    return Math.floor(k / 7) + 1;
  }
  var LAST_DATE = addDays(START_DATE, WEEKS * 7 - 1); // Minggu akhir minggu terakhir

  /* ---------- Templat harian (menit sejak 00.00) ---------- */
  function T(h, m) { return h * 60 + (m || 0); }
  function block(s) { return { to: [s, s + 100], bahas: [s + 105, s + 150] }; }
  function slot(name, a, b, c, d) { return { name: name, to: [a, b], bahas: [c, d] }; }
  var PAGI = slot('pagi', T(9, 30), T(11, 10), T(11, 15), T(12));
  var SIANG = slot('siang', T(13, 15), T(14, 55), T(15), T(15, 45));
  var MALAM = slot('malam', T(19), T(20, 40), T(20, 50), T(21, 50));
  var TEMPLATES = {
    weekday: { // Senin-Kamis: 2 tryout (siang dan malam)
      slots: [SIANG, MALAM],
      fixed: [{ kind: 'santai', label: 'Santai / istirahat', start: T(21, 50), end: T(23) }, { kind: 'tidur', label: 'Tidur', start: T(23), end: T(24) }],
      extras: [block(T(9, 30)), block(T(16))]
    },
    friday: { // 2 tryout: pagi dan malam (siang bebas untuk Jumatan)
      slots: [PAGI, MALAM],
      fixed: [{ kind: 'santai', label: 'Santai / istirahat', start: T(21, 50), end: T(23) }, { kind: 'tidur', label: 'Tidur', start: T(23), end: T(24) }],
      extras: [SIANG, block(T(16))]
    },
    saturday: { // 3 tryout: pagi, siang, malam
      slots: [PAGI, SIANG, MALAM],
      fixed: [{ kind: 'santai', label: 'Santai / istirahat', start: T(21, 50), end: T(23) }, { kind: 'tidur', label: 'Tidur', start: T(23), end: T(24) }],
      extras: [block(T(16))]
    },
    sunday: { // 2 tryout: pagi dan siang; malam 19.30 baca ulang pelajaran minggu ini
      slots: [PAGI, SIANG],
      fixed: [{ kind: 'baca', label: 'Baca ulang pelajaran minggu ini', start: T(19, 30), end: T(20) }, { kind: 'tidur', label: 'Tidur', start: T(23), end: T(24) }],
      extras: [block(T(16))]
    }
  };
  function templateFor(idx) { return idx < 4 ? TEMPLATES.weekday : idx === 4 ? TEMPLATES.friday : idx === 5 ? TEMPLATES.saturday : TEMPLATES.sunday; }

  /* ---------- State ---------- */
  function newState() {
    return { version: 1, settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), tryouts: {}, lessons: {} };
  }
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    var x = Number(v);
    return isFinite(x) ? x : null;
  }
  function clampInt(v, lo, hi, fallback) {
    var x = num(v);
    if (x === null) return fallback;
    x = Math.round(x);
    return x < lo || x > hi ? fallback : x;
  }
  function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }

  function normalizeState(raw) {
    var st = newState();
    if (!raw || typeof raw !== 'object') return st;
    var s = raw.settings || {};
    if (isDate(s.skdDate)) st.settings.skdDate = s.skdDate;
    ['twk', 'tiu', 'tkp'].forEach(function (k) {
      var v = s.thr && clampInt(s.thr[k], 0, 1000, null);
      if (v !== null && v !== undefined) st.settings.thr[k] = v;
    });
    if (s.theme === 'light' || s.theme === 'dark' || s.theme === 'auto') st.settings.theme = s.theme;
    st.settings.notify = s.notify === true;
    st.settings.lead = clampInt(s.lead, 0, 60, 5);
    var src = raw.tryouts && typeof raw.tryouts === 'object' ? raw.tryouts : {};
    BASE.forEach(function (b) {
      var u = src[b.id];
      if (!u || typeof u !== 'object') return;
      var o = {};
      if (u.done === true) o.done = true;
      if (u.reviewed === true) o.reviewed = true;
      var name = str(u.name, 120);
      if (name) o.name = name;
      ['twk', 'tiu', 'tkp'].forEach(function (k) {
        var v = clampInt(u[k], 0, MAX[k], null);
        if (v !== null) o[k] = v;
      });
      if (isDate(u.date) && u.date !== b.date && weekOf(u.date) === b.week) o.date = u.date;
      var stt = clampInt(u.start, 0, 1439, null);
      if (stt !== null) o.start = stt;
      if (Object.keys(o).length) st.tryouts[b.id] = o;
    });
    // Catatan pelajaran harian: { 'YYYY-MM-DD': 'teks' }. Data lama 'wrong' (buku soal salah) sengaja diabaikan.
    if (raw.lessons && typeof raw.lessons === 'object' && !Array.isArray(raw.lessons)) {
      Object.keys(raw.lessons).slice(0, 2000).forEach(function (d) {
        var txt = str(raw.lessons[d], LESSON_MAX).trim();
        if (isDate(d) && txt) st.lessons[d] = txt;
      });
    }
    return st;
  }

  /* ---------- Daftar tryout ---------- */
  function tryoutList(state) {
    return BASE.map(function (b) {
      var u = state.tryouts[b.id] || {};
      var date = u.date || b.date;
      var start = typeof u.start === 'number' ? u.start : null;
      return {
        id: b.id, n: b.n, week: b.week, slot: b.slot, baseDate: b.date, date: date, start: start,
        moved: date !== b.date || start !== null,
        done: !!u.done, reviewed: !!u.reviewed, name: u.name || '',
        twk: num(u.twk), tiu: num(u.tiu), tkp: num(u.tkp)
      };
    });
  }
  function getTryout(state, id) { return tryoutList(state).filter(function (t) { return t.id === id; })[0] || null; }
  function totalScore(t) { return t.twk !== null && t.tiu !== null && t.tkp !== null ? t.twk + t.tiu + t.tkp : null; }
  function passInfo(t, thr) {
    function p(v, th) { return v === null ? null : v >= th; }
    var r = { twk: p(t.twk, thr.twk), tiu: p(t.tiu, thr.tiu), tkp: p(t.tkp, thr.tkp) };
    r.all = r.twk === null || r.tiu === null || r.tkp === null ? null : (r.twk && r.tiu && r.tkp);
    return r;
  }
  function statusOf(t, today) {
    if (t.done) return 'selesai';
    if (t.date < today) return 'terlewat';
    if (t.date === today) return 'hari-ini';
    return 'terjadwal';
  }
  function setField(state, id, patch) {
    if (!BY_ID[id]) return false;
    var u = state.tryouts[id] || (state.tryouts[id] = {});
    Object.keys(patch).forEach(function (k) {
      var v = patch[k];
      if (k === 'name') { v = str(v, 120); if (v) u.name = v; else delete u.name; }
      else if (k === 'done' || k === 'reviewed') { if (v) u[k] = true; else delete u[k]; }
      else if (k === 'twk' || k === 'tiu' || k === 'tkp') {
        var x = clampInt(v, 0, MAX[k], null);
        if (x === null) delete u[k]; else u[k] = x;
      }
    });
    if (!Object.keys(u).length) delete state.tryouts[id];
    return true;
  }
  function setLesson(state, date, text) {
    if (!isDate(date)) return { ok: false, error: 'Tanggal tidak valid.' };
    var txt = str(text, LESSON_MAX).trim();
    if (txt) state.lessons[date] = txt; else delete state.lessons[date];
    return { ok: true };
  }
  function lessonDates(state) { return Object.keys(state.lessons).sort().reverse(); }
  function moveTryout(state, id, newDate, start) {
    var b = BY_ID[id];
    if (!b) return { ok: false, error: 'Tryout tidak dikenal.' };
    if (!isDate(newDate)) return { ok: false, error: 'Tanggal tidak valid.' };
    if (weekOf(newDate) !== b.week) return { ok: false, error: 'Tryout hanya bisa digeser ke hari lain di minggu yang sama (Minggu ' + b.week + ').' };
    var u = state.tryouts[id] || (state.tryouts[id] = {});
    var st = start === null || start === undefined || start === '' ? null : clampInt(start, 0, 1439, null);
    if (newDate === b.date && st === null) { delete u.date; delete u.start; }
    else { if (newDate !== b.date) u.date = newDate; else delete u.date; if (st === null) delete u.start; else u.start = st; }
    if (!Object.keys(u).length) delete state.tryouts[id];
    return { ok: true };
  }
  function resetMove(state, id) { return moveTryout(state, id, BY_ID[id].date, null); }

  /* ---------- Statistik ---------- */
  function weekStats(state) {
    var out = [];
    for (var w = 1; w <= WEEKS; w++) out.push({ week: w, done: 0, total: 0 });
    tryoutList(state).forEach(function (t) { out[t.week - 1].total++; if (t.done) out[t.week - 1].done++; });
    return out;
  }
  function totalStats(state) {
    var l = tryoutList(state), d = 0;
    l.forEach(function (t) { if (t.done) d++; });
    return { done: d, total: l.length };
  }
  function weeklyAverages(state) {
    var out = [];
    for (var w = 1; w <= WEEKS; w++) out.push({ week: w, n: { twk: 0, tiu: 0, tkp: 0, total: 0 }, sum: { twk: 0, tiu: 0, tkp: 0, total: 0 }, twk: null, tiu: null, tkp: null, total: null });
    tryoutList(state).forEach(function (t) {
      if (!t.done) return;
      var o = out[t.week - 1], tot = totalScore(t);
      ['twk', 'tiu', 'tkp'].forEach(function (k) { if (t[k] !== null) { o.n[k]++; o.sum[k] += t[k]; } });
      if (tot !== null) { o.n.total++; o.sum.total += tot; }
    });
    out.forEach(function (o) {
      ['twk', 'tiu', 'tkp', 'total'].forEach(function (k) { o[k] = o.n[k] ? o.sum[k] / o.n[k] : null; });
    });
    return out;
  }
  /* Skor mentok: tiga minggu berurutan (w-2, w-1, w) dengan >= MIN_PER_WEEK_FOR_TREND tryout bernilai,
     dan rata-rata tidak naik dua kali berturut-turut (a2 <= a1 dan a3 <= a2). Dicek pada tiga minggu terakhir yang punya data. */
  function plateau(avgs, key) {
    var ws = avgs.filter(function (a) { return a[key] !== null && a.n[key] >= MIN_PER_WEEK_FOR_TREND; });
    if (ws.length < 3) return null;
    var a = ws[ws.length - 3], b = ws[ws.length - 2], c = ws[ws.length - 1];
    if (b.week !== a.week + 1 || c.week !== b.week + 1) return null;
    if (b[key] <= a[key] && c[key] <= b[key]) return { weeks: [a.week, b.week, c.week], values: [a[key], b[key], c[key]] };
    return null;
  }
  function normName(s) { return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
  function duplicates(state) {
    var g = {};
    tryoutList(state).forEach(function (t) {
      var k = normName(t.name);
      if (!k) return;
      (g[k] || (g[k] = { name: t.name, ids: [] })).ids.push(t.id);
    });
    return Object.keys(g).map(function (k) { return g[k]; }).filter(function (x) { return x.ids.length > 1; });
  }
  function missed(state, today) {
    return tryoutList(state).filter(function (t) { return !t.done && t.date < today; });
  }
  function holidayPending(state, today, horizon) {
    var end = addDays(today, horizon);
    return tryoutList(state).filter(function (t) { return !t.done && HOLIDAYS[t.date] && t.date >= today && t.date <= end; });
  }
  function afterSkd(state) {
    var skd = state.settings.skdDate;
    return tryoutList(state).filter(function (t) { return !t.done && t.date >= skd; });
  }

  /* ---------- Timeline harian ---------- */
  function subtract(seg, busy) {
    var parts = [[seg.start, seg.end]];
    busy.forEach(function (b) {
      var next = [];
      parts.forEach(function (p) {
        if (b[1] <= p[0] || b[0] >= p[1]) { next.push(p); return; }
        if (b[0] > p[0]) next.push([p[0], b[0]]);
        if (b[1] < p[1]) next.push([b[1], p[1]]);
      });
      parts = next;
    });
    return parts.filter(function (p) { return p[1] - p[0] >= 5; });
  }
  function phaseOf(state, date) {
    var skd = state.settings.skdDate;
    if (date < START_DATE) return 'sebelum';
    if (date <= LAST_DATE) return 'program';
    if (date < skd) return 'tenang';
    if (date === skd) return 'skd';
    return 'setelah';
  }
  function buildDay(state, date, list) {
    list = list || tryoutList(state);
    var idx = dayIdx(date);
    var info = { date: date, dayIdx: idx, holiday: HOLIDAYS[date] || null, phase: phaseOf(state, date), week: weekOf(date), events: [], tryouts: [] };
    if (info.phase === 'program' && date >= state.settings.skdDate) info.afterSkd = true;
    if (info.phase !== 'program') return info;
    var tpl = templateFor(idx);
    var mine = list.filter(function (t) { return t.date === date; });
    info.tryouts = mine.map(function (t) { return t.id; });
    var auto = mine.filter(function (t) { return t.start === null; });
    auto.sort(function (a, b) { return (a.moved - b.moved) || (a.n - b.n); });
    var custom = mine.filter(function (t) { return t.start !== null; }).sort(function (a, b) { return a.start - b.start; });
    var multi = mine.length > 1;
    var seq = 0, evs = [], busy = [];
    function add(t, slot) {
      seq++;
      var lab = slot && slot.name ? ' ' + slot.name : (multi ? ' ' + seq : '');
      if (!slot) { evs.push({ kind: 'tryout', label: 'Tryout' + lab, start: null, end: null, toId: t.id, flex: true }); return; }
      evs.push({ kind: 'tryout', label: 'Tryout' + lab, start: slot.to[0], end: slot.to[1], toId: t.id });
      evs.push({ kind: 'bahas', label: 'Pembahasan', start: slot.bahas[0], end: slot.bahas[1], toId: t.id });
      busy.push([slot.to[0], slot.to[1]], [slot.bahas[0], slot.bahas[1]]);
    }
    auto.forEach(function (t, i) {
      add(t, i < tpl.slots.length ? tpl.slots[i] : (tpl.extras[i - tpl.slots.length] || null));
    });
    custom.forEach(function (t) { add(t, block(t.start)); });
    tpl.fixed.forEach(function (f) {
      if (f.kind === 'santai' && !mine.length) return;
      if (f.kind === 'santai' || f.kind === 'istirahat') {
        subtract(f, busy).forEach(function (p) { evs.push({ kind: f.kind, label: f.label, start: p[0], end: p[1] }); });
      } else evs.push({ kind: f.kind, label: f.label, start: f.start, end: f.end });
    });
    var timed = evs.filter(function (e) { return e.start !== null; }).sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var flex = evs.filter(function (e) { return e.start === null; });
    var work = timed.filter(function (e) { return e.kind === 'tryout' || e.kind === 'bahas'; });
    work.forEach(function (a) {
      work.forEach(function (b) { if (a !== b && a.start < b.end && b.start < a.end) a.conflict = true; });
    });
    info.events = timed.concat(flex);
    return info;
  }

  /* ---------- Waktu WITA ---------- */
  function nowWita(ms) {
    var t = (ms === undefined ? Date.now() : ms) + UTC_OFFSET_H * 3600000;
    var day = Math.floor(t / 86400000);
    return { date: dateStr(day), sec: Math.floor((t - day * 86400000) / 1000) };
  }
  function absSec(date, min) { return dayNum(date) * 86400 + min * 60; }
  function statusNow(state, now) {
    var list = tryoutList(state);
    var abs = dayNum(now.date) * 86400 + now.sec;
    var today = buildDay(state, now.date, list);
    var current = null;
    today.events.forEach(function (e) {
      if (e.start === null) return;
      if (absSec(now.date, e.start) <= abs && abs < absSec(now.date, e.end)) current = e;
    });
    var next = null, nextDate = null;
    for (var k = 0; k < 120 && !next; k++) {
      var d = k === 0 ? today : buildDay(state, addDays(now.date, k), list);
      for (var i = 0; i < d.events.length; i++) {
        var e = d.events[i];
        if (e.start === null) continue;
        if (absSec(d.date, e.start) > abs) { next = e; nextDate = d.date; break; }
      }
    }
    return { today: today, current: current, next: next, nextDate: nextDate, nextIn: next ? absSec(nextDate, next.start) - abs : null };
  }
  function daysToSkd(state, today) { return diffDays(state.settings.skdDate, today); }

  /* ---------- Ekspor / impor ---------- */
  function exportData(state, iso) {
    return { app: 'tryout-skd', version: 1, exportedAt: iso || new Date().toISOString(), data: state };
  }
  function parseImport(text) {
    var j;
    try { j = JSON.parse(text); } catch (e) { return { ok: false, error: 'Berkas bukan JSON yang valid.' }; }
    if (!j || typeof j !== 'object' || j.app !== 'tryout-skd') return { ok: false, error: 'Berkas ini bukan cadangan Tryout SKD.' };
    if (j.version !== 1) return { ok: false, error: 'Versi cadangan tidak dikenali.' };
    if (!j.data || typeof j.data !== 'object' || typeof j.data.tryouts !== 'object' || j.data.tryouts === null) return { ok: false, error: 'Isi cadangan tidak lengkap.' };
    return { ok: true, state: normalizeState(j.data) };
  }

  return {
    START_DATE: START_DATE, FIRST_DATE: FIRST_DATE, LAST_DATE: LAST_DATE, LAST_TRYOUT_DATE: LAST_TRYOUT_DATE, WEEKS: WEEKS, WEEK_COUNTS: WEEK_COUNTS, TOTAL: TOTAL, PER_DAY: PER_DAY,
    DAY_NAMES: DAY_NAMES, MONTHS: MONTHS, HOLIDAYS: HOLIDAYS, MAX: MAX, SUBTESTS: SUBTESTS, LESSON_MAX: LESSON_MAX,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS, MIN_PER_WEEK_FOR_TREND: MIN_PER_WEEK_FOR_TREND,
    BASE: BASE, TEMPLATES: TEMPLATES,
    dayNum: dayNum, dateStr: dateStr, isDate: isDate, dayIdx: dayIdx, addDays: addDays, diffDays: diffDays,
    fmtLong: fmtLong, fmtShort: fmtShort, fmtTime: fmtTime, weekStart: weekStart, weekOf: weekOf,
    newState: newState, normalizeState: normalizeState, tryoutList: tryoutList, getTryout: getTryout,
    totalScore: totalScore, passInfo: passInfo, statusOf: statusOf, setField: setField, setLesson: setLesson, lessonDates: lessonDates, moveTryout: moveTryout, resetMove: resetMove,
    weekStats: weekStats, totalStats: totalStats, weeklyAverages: weeklyAverages, plateau: plateau,
    normName: normName, duplicates: duplicates, missed: missed, holidayPending: holidayPending, afterSkd: afterSkd,
    buildDay: buildDay, phaseOf: phaseOf, nowWita: nowWita, statusNow: statusNow, daysToSkd: daysToSkd,
    exportData: exportData, parseImport: parseImport
  };
});
