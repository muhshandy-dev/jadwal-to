'use strict';
// Jalankan: node tests/logic.test.js  (tanpa dependensi)
const assert = require('assert');
const S = require('../schedule.js');
let passed = 0;
function t(name, fn) { try { fn(); passed++; console.log('  ok   ' + name); } catch (e) { console.log('  GAGAL ' + name + '\n       ' + e.message); process.exitCode = 1; } }

console.log('K1 jumlah dan periode');
t('total tepat 120, ID unik', () => {
  const l = S.tryoutList(S.newState());
  assert.strictEqual(l.length, 120);
  assert.strictEqual(new Set(l.map(x => x.id)).size, 120);
  assert.strictEqual(S.TOTAL, 120);
});
t('tiap minggu tepat 12 (10 minggu)', () => {
  const c = {};
  S.tryoutList(S.newState()).forEach(x => { c[x.week] = (c[x.week] || 0) + 1; });
  assert.deepStrictEqual(Object.keys(c).map(Number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  Object.values(c).forEach(v => assert.strictEqual(v, 12));
});
t('minggu 1 mulai Senin 2026-11-23, minggu 10 berakhir Minggu 2027-01-31', () => {
  assert.strictEqual(S.dayIdx('2026-11-23'), 0);
  assert.strictEqual(S.dayIdx('2027-01-31'), 6);
  assert.strictEqual(S.LAST_DATE, '2027-01-31');
  const l = S.tryoutList(S.newState());
  assert.strictEqual(l[0].date, '2026-11-23');
  assert.strictEqual(l[119].date, '2027-01-31');
  assert.strictEqual(S.weekStart(10), '2027-01-25');
});
t('kalender sama dengan PDF (rentang tiap minggu)', () => {
  const exp = ['2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28', '2027-01-04', '2027-01-11', '2027-01-18', '2027-01-25'];
  exp.forEach((d, i) => assert.strictEqual(S.weekStart(i + 1), d));
});

console.log('K2 templat harian');
function dayEvents(date, st) { return S.buildDay(st || S.newState(), date).events.map(e => [e.kind, S.fmtTime(e.start) + '-' + S.fmtTime(e.end), e.label].join('|')); }
t('Senin-Kamis: 1 TO', () => {
  ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26'].forEach(d => assert.strictEqual(S.buildDay(S.newState(), d).tryouts.length, 1));
  assert.deepStrictEqual(dayEvents('2026-11-23'), ['tryout|19.00-20.40|Tryout', 'bahas|20.50-21.50|Pembahasan', 'santai|21.50-23.00|Santai / istirahat', 'tidur|23.00-00.00|Tidur']);
});
t('Jumat: 2 TO', () => {
  assert.deepStrictEqual(dayEvents('2026-11-27'), ['tryout|18.30-20.10|Tryout 1', 'bahas|20.15-21.00|Pembahasan', 'tryout|21.10-22.50|Tryout 2', 'bahas|22.55-23.40|Pembahasan', 'tidur|23.45-00.00|Tidur']);
});
t('Sabtu: 4 TO', () => {
  const e = dayEvents('2026-11-28');
  assert.deepStrictEqual(e, ['tryout|07.00-08.40|Tryout 1', 'bahas|08.45-09.30|Pembahasan', 'tryout|09.45-11.25|Tryout 2', 'bahas|11.30-12.15|Pembahasan', 'istirahat|12.15-13.15|Istirahat, makan, salat', 'tryout|13.15-14.55|Tryout 3', 'bahas|15.00-15.45|Pembahasan', 'tryout|16.00-17.40|Tryout 4', 'bahas|17.45-18.30|Pembahasan', 'istirahat|18.30-23.00|Istirahat / AI trainer', 'tidur|23.00-00.00|Tidur']);
});
t('Minggu: 2 TO + baca ulang 19.30-20.00', () => {
  assert.deepStrictEqual(dayEvents('2026-11-29'), ['tryout|07.00-08.40|Tryout 1', 'bahas|08.45-09.30|Pembahasan', 'tryout|09.45-11.25|Tryout 2', 'bahas|11.30-12.15|Pembahasan', 'istirahat|12.15-19.30|Istirahat / AI trainer', 'baca|19.30-20.00|Baca ulang buku soal salah', 'tidur|23.00-00.00|Tidur']);
});
t('hari di luar program tidak punya kegiatan (minggu tenang)', () => {
  const d = S.buildDay(S.newState(), '2027-02-03');
  assert.strictEqual(d.phase, 'tenang'); assert.strictEqual(d.events.length, 0);
  assert.strictEqual(S.buildDay(S.newState(), '2027-02-08').phase, 'skd');
  assert.strictEqual(S.buildDay(S.newState(), '2026-11-20').phase, 'sebelum');
});

console.log('K3 geser tryout');
t('25 Des 2026 dan 1 Jan 2027 jatuh Jumat, libur, masing-masing 2 TO', () => {
  ['2026-12-25', '2027-01-01'].forEach(d => {
    assert.strictEqual(S.dayIdx(d), 4);
    const day = S.buildDay(S.newState(), d);
    assert.ok(day.holiday); assert.strictEqual(day.tryouts.length, 2);
  });
});
t('geser ke hari lain di minggu yang sama: berhasil, total tetap 120 dan tiap minggu 12', () => {
  const st = S.newState();
  const fri = S.buildDay(st, '2026-12-25').tryouts;
  assert.ok(S.moveTryout(st, fri[0], '2026-12-26').ok);
  assert.ok(S.moveTryout(st, fri[1], '2026-12-23').ok);
  const l = S.tryoutList(st);
  assert.strictEqual(l.length, 120);
  const c = {}; l.forEach(x => { c[x.week] = (c[x.week] || 0) + 1; });
  Object.values(c).forEach(v => assert.strictEqual(v, 12));
  assert.strictEqual(S.buildDay(st, '2026-12-25').tryouts.length, 0);
  assert.strictEqual(S.buildDay(st, '2026-12-26').tryouts.length, 5);
  assert.strictEqual(S.buildDay(st, '2026-12-23').tryouts.length, 2);
  assert.ok(S.getTryout(st, fri[0]).moved);
});
t('geser ke minggu lain ditolak', () => {
  const st = S.newState();
  const id = S.buildDay(st, '2026-12-25').tryouts[0];
  const r = S.moveTryout(st, id, '2026-12-28');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(S.moveTryout(st, id, '2027-02-01').ok, false);
  assert.strictEqual(S.moveTryout(st, id, 'bukan-tanggal').ok, false);
  assert.strictEqual(S.getTryout(st, id).date, '2026-12-25');
});
t('2000 geseran acak tidak pernah mengubah total 120 atau 12 per minggu', () => {
  const st = S.newState(); let seed = 7;
  const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  for (let i = 0; i < 2000; i++) {
    const b = S.BASE[rnd(120)];
    const target = S.addDays(S.weekStart(b.week), rnd(7));
    S.moveTryout(st, b.id, target, rnd(3) ? null : 8 * 60 + rnd(600));
    if (rnd(5) === 0) S.moveTryout(st, b.id, S.addDays(S.weekStart(b.week), 7 + rnd(30)));
  }
  const l = S.tryoutList(st); assert.strictEqual(l.length, 120);
  const c = {}; l.forEach(x => { c[x.week] = (c[x.week] || 0) + 1; assert.strictEqual(S.weekOf(x.date), x.week); });
  Object.values(c).forEach(v => assert.strictEqual(v, 12));
});
t('tryout yang digeser ke hari padat mendapat slot tambahan tanpa tabrakan; kembalikan ke jadwal awal', () => {
  const st = S.newState();
  const id = S.buildDay(st, '2026-12-25').tryouts[0];
  S.moveTryout(st, id, '2026-12-24'); // Kamis, sudah 1 TO
  const d = S.buildDay(st, '2026-12-24');
  assert.strictEqual(d.tryouts.length, 2);
  assert.ok(!d.events.some(e => e.conflict));
  const toEv = d.events.filter(e => e.kind === 'tryout').map(e => S.fmtTime(e.start));
  assert.deepStrictEqual(toEv, ['16.30', '19.00']);
  S.resetMove(st, id);
  assert.strictEqual(S.getTryout(st, id).date, '2026-12-25');
  assert.deepStrictEqual(st.tryouts, {});
});
t('jam mulai kustom, dan bentrok ditandai', () => {
  const st = S.newState();
  const id = S.buildDay(st, '2026-12-25').tryouts[0];
  S.moveTryout(st, id, '2026-12-24', 19 * 60 + 30);
  assert.ok(S.buildDay(st, '2026-12-24').events.some(e => e.conflict));
  S.moveTryout(st, id, '2026-12-24', 8 * 60);
  assert.ok(!S.buildDay(st, '2026-12-24').events.some(e => e.conflict));
});
t('Sabtu dengan TO ke-5 dan ke-6: slot malam lalu jam fleksibel', () => {
  const st = S.newState();
  S.buildDay(st, '2026-12-25').tryouts.forEach(id => S.moveTryout(st, id, '2026-12-26'));
  const ev = S.buildDay(st, '2026-12-26').events.filter(e => e.kind === 'tryout');
  assert.strictEqual(ev.length, 6);
  assert.strictEqual(ev.filter(e => e.flex).length, 1);
});

console.log('K6/K7 skor, ambang, progres');
t('total otomatis dan lulus per subtes (default 65/80/166)', () => {
  const st = S.newState(); const id = 'T001';
  S.setField(st, id, { done: true, twk: 70, tiu: 79, tkp: 170 });
  const t1 = S.getTryout(st, id);
  assert.strictEqual(S.totalScore(t1), 319);
  const p = S.passInfo(t1, st.settings.thr);
  assert.deepStrictEqual([p.twk, p.tiu, p.tkp, p.all], [true, false, true, false]);
  S.setField(st, id, { tiu: 80 });
  assert.strictEqual(S.passInfo(S.getTryout(st, id), st.settings.thr).all, true);
  S.setField(st, id, { tkp: '' });
  assert.strictEqual(S.totalScore(S.getTryout(st, id)), null);
});
t('ambang bisa diubah', () => {
  const st = S.newState(); S.setField(st, 'T001', { twk: 60, tiu: 90, tkp: 170 });
  st.settings.thr.twk = 55;
  assert.strictEqual(S.passInfo(S.getTryout(st, 'T001'), st.settings.thr).twk, true);
});
t('skor di luar batas ditolak (TWK maks 150, TIU 175, TKP 225)', () => {
  const st = S.newState(); S.setField(st, 'T001', { twk: 151, tiu: 176, tkp: 226 });
  assert.deepStrictEqual(st.tryouts, {});
  S.setField(st, 'T001', { twk: -1 }); assert.deepStrictEqual(st.tryouts, {});
});
t('progres per minggu x/12 dan total x/120', () => {
  const st = S.newState();
  ['T001', 'T002', 'T013'].forEach(id => S.setField(st, id, { done: true }));
  const ws = S.weekStats(st);
  assert.deepStrictEqual([ws[0].done, ws[0].total, ws[1].done], [2, 12, 1]);
  assert.deepStrictEqual(S.totalStats(st), { done: 3, total: 120 });
});
t('hitung mundur SKD (default 8 Feb 2027)', () => {
  const st = S.newState();
  assert.strictEqual(S.daysToSkd(st, '2026-11-23'), 77);
  st.settings.skdDate = '2027-02-01';
  assert.strictEqual(S.daysToSkd(st, '2027-01-31'), 1);
});

console.log('K8/K9 terlewat dan paket dobel');
t('terlewat: belum selesai dan tanggal lewat; hilang bila digeser ke depan atau selesai', () => {
  const st = S.newState();
  const m = S.missed(st, '2026-11-25').map(x => x.id);
  assert.deepStrictEqual(m, ['T001', 'T002']);
  S.moveTryout(st, 'T001', '2026-11-29');
  S.setField(st, 'T002', { done: true });
  assert.deepStrictEqual(S.missed(st, '2026-11-25'), []);
  assert.strictEqual(S.statusOf(S.getTryout(st, 'T001'), '2026-11-25'), 'terjadwal');
});
t('paket dobel: huruf besar, spasi, tanda baca diabaikan', () => {
  const st = S.newState();
  S.setField(st, 'T001', { name: 'Paket Bimbel A  #1' });
  S.setField(st, 'T002', { name: 'paket bimbel a 1' });
  S.setField(st, 'T003', { name: 'Paket Bimbel B' });
  const d = S.duplicates(st);
  assert.strictEqual(d.length, 1); assert.deepStrictEqual(d[0].ids, ['T001', 'T002']);
  S.setField(st, 'T002', { name: 'Paket Bimbel C' });
  assert.strictEqual(S.duplicates(st).length, 0);
});
t('libur belum digeser terdeteksi; tryout pada/atau setelah tanggal SKD terdeteksi', () => {
  const st = S.newState();
  assert.strictEqual(S.holidayPending(st, '2026-12-20', 14).length, 4); // 25 Des (2) dan 1 Jan (2)
  assert.strictEqual(S.holidayPending(st, '2026-12-20', 7).length, 2);
  assert.strictEqual(S.holidayPending(st, '2026-11-23', 14).length, 0);
  st.settings.skdDate = '2027-01-30';
  assert.strictEqual(S.afterSkd(st).length, 6);
});

console.log('K10 tren dan skor mentok');
function fill(st, week, twk, tkp) { S.tryoutList(st).filter(x => x.week === week).slice(0, 3).forEach(x => S.setField(st, x.id, { done: true, twk, tiu: 100, tkp })); }
t('rata-rata per minggu', () => {
  const st = S.newState(); fill(st, 1, 60, 150);
  const a = S.weeklyAverages(st)[0];
  assert.deepStrictEqual([a.twk, a.tiu, a.tkp, a.total], [60, 100, 150, 310]);
  assert.strictEqual(S.weeklyAverages(st)[1].twk, null);
});
t('mentok: rata-rata tidak naik dua minggu berturut-turut', () => {
  const st = S.newState(); fill(st, 1, 60, 150); fill(st, 2, 60, 160); fill(st, 3, 59, 170);
  const a = S.weeklyAverages(st);
  assert.ok(S.plateau(a, 'twk')); assert.strictEqual(S.plateau(a, 'tkp'), null);
});
t('tidak mentok bila ada kenaikan; tidak dicek bila minggu tidak berurutan atau data < 3 tryout', () => {
  let st = S.newState(); fill(st, 1, 60, 150); fill(st, 2, 62, 150); fill(st, 3, 61, 150);
  assert.strictEqual(S.plateau(S.weeklyAverages(st), 'twk'), null);
  assert.ok(S.plateau(S.weeklyAverages(st), 'tkp'));
  st = S.newState(); fill(st, 1, 60, 150); fill(st, 2, 60, 150); fill(st, 4, 60, 150);
  assert.strictEqual(S.plateau(S.weeklyAverages(st), 'twk'), null);
  st = S.newState(); fill(st, 1, 60, 150); fill(st, 2, 60, 150);
  S.tryoutList(st).filter(x => x.week === 3).slice(0, 2).forEach(x => S.setField(st, x.id, { done: true, twk: 10, tiu: 1, tkp: 1 }));
  assert.strictEqual(S.plateau(S.weeklyAverages(st), 'twk'), null);
});

console.log('K15 ekspor/impor');
t('ekspor lalu impor menghasilkan state identik', () => {
  const st = S.newState();
  S.setField(st, 'T005', { done: true, name: 'Paket X', twk: 100, tiu: 120, tkp: 200, reviewed: true });
  S.moveTryout(st, 'T100', '2027-01-30', 9 * 60);
  st.settings.skdDate = '2027-02-10'; st.settings.thr.twk = 60; st.settings.theme = 'dark';
  st.wrong.push({ id: 'w1', subtest: 'TWK', topic: 'Pancasila', note: 'Sila ke-3', created: '2026-11-23', reads: 2, lastRead: '2026-11-29' });
  const json = JSON.stringify(S.exportData(st));
  const r = S.parseImport(json);
  assert.ok(r.ok); assert.deepStrictEqual(r.state, st);
});
t('impor menolak JSON rusak, berkas asing, versi lain, dan membersihkan data berbahaya', () => {
  assert.strictEqual(S.parseImport('{bukan json').ok, false);
  assert.strictEqual(S.parseImport('{"a":1}').ok, false);
  assert.strictEqual(S.parseImport('{"app":"tryout-skd","version":9,"data":{"tryouts":{}}}').ok, false);
  assert.strictEqual(S.parseImport('{"app":"tryout-skd","version":1,"data":{}}').ok, false);
  const r = S.parseImport(JSON.stringify({ app: 'tryout-skd', version: 1, data: { settings: { skdDate: 'ngawur', thr: { twk: 'x', tiu: 9999 } }, tryouts: { T001: { twk: 9999, date: '2030-01-01', done: 'ya' }, TXXX: { done: true }, T002: { date: '2026-12-01', done: true } }, wrong: [{ subtest: 'XYZ', topic: 'a', note: 'b' }, 'x'] } }));
  assert.ok(r.ok);
  assert.strictEqual(r.state.settings.skdDate, '2027-02-08');
  assert.strictEqual(r.state.settings.thr.twk, 65); assert.strictEqual(r.state.settings.thr.tiu, 80);
  assert.deepStrictEqual(r.state.tryouts, { T002: { done: true } }); // T002 ada di minggu 1 dan 2026-12-01 minggu 2, jadi tanggal ditolak
  assert.strictEqual(r.state.wrong.length, 0);
});

console.log('K4 waktu WITA dan hitung mundur');
t('WITA = UTC+8', () => {
  const n = S.nowWita(Date.UTC(2026, 10, 23, 11, 30, 15)); // 11.30 UTC = 19.30 WITA
  assert.deepStrictEqual(n, { date: '2026-11-23', sec: 19 * 3600 + 30 * 60 + 15 });
  assert.strictEqual(S.nowWita(Date.UTC(2026, 10, 23, 16, 0, 0)).date, '2026-11-24'); // 00.00 WITA
});
t('kegiatan berjalan dan berikutnya (Senin 19.30 WITA)', () => {
  const st = S.newState();
  const r = S.statusNow(st, { date: '2026-11-23', sec: 19 * 3600 + 30 * 60 });
  assert.strictEqual(r.current.kind, 'tryout');
  assert.strictEqual(r.next.kind, 'bahas');
  assert.strictEqual(r.nextIn, 80 * 60); // 19.30 -> bahas mulai 20.50
});
t('jeda antar kegiatan, lewat tengah malam, dan sebelum program dimulai', () => {
  const st = S.newState();
  const gap = S.statusNow(st, { date: '2026-11-27', sec: 21 * 3600 + 5 * 60 }); // Jumat 21.05 di antara bahas dan TO2
  assert.strictEqual(gap.current, null); assert.strictEqual(gap.next.label, 'Tryout 2'); assert.strictEqual(gap.nextIn, 5 * 60);
  const late = S.statusNow(st, { date: '2026-11-23', sec: 23 * 3600 + 30 * 60 });
  assert.strictEqual(late.current.kind, 'tidur'); assert.strictEqual(late.nextDate, '2026-11-24');
  const before = S.statusNow(st, { date: '2026-11-20', sec: 12 * 3600 });
  assert.strictEqual(before.nextDate, '2026-11-23'); assert.strictEqual(before.next.kind, 'tryout');
  assert.strictEqual(S.statusNow(st, { date: '2027-02-03', sec: 10 * 3600 }).next, null);
});

console.log('\n' + passed + ' tes lulus' + (process.exitCode ? ', ADA YANG GAGAL' : ''));
