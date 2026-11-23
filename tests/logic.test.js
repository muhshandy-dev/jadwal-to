'use strict';
// Jalankan: node tests/logic.test.js  (tanpa dependensi)
// Jadwal revisi 2026-11-23: mulai Selasa 24 Nov 2026, 2 tryout per hari (siang dan malam), hanya Senin-Kamis.
const assert = require('assert');
const S = require('../schedule.js');
let passed = 0;
function t(name, fn) { try { fn(); passed++; console.log('  ok   ' + name); } catch (e) { console.log('  GAGAL ' + name + '\n       ' + e.message); process.exitCode = 1; } }
const BASE_COUNTS = [6].concat(Array(14).fill(8), [2]);
function weekCounts(l) { const c = {}; l.forEach(x => { c[x.week] = (c[x.week] || 0) + 1; }); return Object.keys(c).map(Number).sort((a, b) => a - b).map(w => c[w]); }

console.log('K1 jumlah dan periode');
t('total tepat 120, ID unik', () => {
  const l = S.tryoutList(S.newState());
  assert.strictEqual(l.length, 120);
  assert.strictEqual(new Set(l.map(x => x.id)).size, 120);
  assert.strictEqual(S.TOTAL, 120);
});
t('mulai Selasa 24 Nov 2026 (bukan Senin 23 Nov), selesai Senin 8 Maret 2027', () => {
  const l = S.tryoutList(S.newState());
  assert.strictEqual(l[0].date, '2026-11-24'); assert.strictEqual(S.dayIdx('2026-11-24'), 1);
  assert.strictEqual(l[119].date, '2027-03-08'); assert.strictEqual(S.dayIdx('2027-03-08'), 0);
  assert.strictEqual(S.FIRST_DATE, '2026-11-24'); assert.strictEqual(S.LAST_TRYOUT_DATE, '2027-03-08');
  assert.ok(!l.some(x => x.date === '2026-11-23'));
});
t('hanya Senin-Kamis, tepat 2 tryout per hari tryout, 60 hari', () => {
  const l = S.tryoutList(S.newState()), d = {};
  l.forEach(x => { assert.ok(S.dayIdx(x.date) <= 3, x.date + ' bukan Sen-Kam'); d[x.date] = (d[x.date] || 0) + 1; });
  assert.strictEqual(Object.keys(d).length, 60);
  Object.values(d).forEach(v => assert.strictEqual(v, 2));
});
t('minggu: 16 minggu (6, lalu 14 minggu × 8, lalu 2) = 120', () => {
  assert.strictEqual(S.WEEKS, 16);
  assert.deepStrictEqual(weekCounts(S.tryoutList(S.newState())), BASE_COUNTS);
  assert.deepStrictEqual(S.WEEK_COUNTS, BASE_COUNTS);
  assert.strictEqual(BASE_COUNTS.reduce((a, b) => a + b, 0), 120);
});
t('awal minggu tepat: minggu 1 Sen 23 Nov, minggu 2 Sen 30 Nov, minggu 16 Sen 8 Mar 2027', () => {
  assert.strictEqual(S.weekStart(1), '2026-11-23'); assert.strictEqual(S.weekStart(2), '2026-11-30'); assert.strictEqual(S.weekStart(16), '2027-03-08');
  assert.strictEqual(S.LAST_DATE, '2027-03-14');
});
t('tidak ada tryout pada Jumat 25 Des 2026 dan Jumat 1 Jan 2027 (libur, hari tanpa tryout)', () => {
  ['2026-12-25', '2027-01-01'].forEach(d => { assert.strictEqual(S.dayIdx(d), 4); assert.strictEqual(S.buildDay(S.newState(), d).tryouts.length, 0); assert.ok(S.HOLIDAYS[d]); });
});
t('jumlah tryout sebelum 8 Feb 2027 (SKD bawaan) = 86 dan sesudahnya 34', () => {
  const l = S.tryoutList(S.newState());
  assert.strictEqual(l.filter(x => x.date < '2027-02-08').length, 86);
  assert.strictEqual(l.filter(x => x.date >= '2027-02-08').length, 34);
});

console.log('K2 templat harian');
function dayEvents(date, st) { return S.buildDay(st || S.newState(), date).events.map(e => [e.kind, S.fmtTime(e.start) + '-' + S.fmtTime(e.end), e.label].join('|')); }
t('Selasa 24 Nov: siang 13.15 + malam 19.00', () => {
  assert.deepStrictEqual(dayEvents('2026-11-24'), ['tryout|13.15-14.55|Tryout siang', 'bahas|15.00-15.45|Pembahasan', 'tryout|19.00-20.40|Tryout malam', 'bahas|20.50-21.50|Pembahasan', 'santai|21.50-23.00|Santai / istirahat', 'tidur|23.00-00.00|Tidur']);
});
t('Senin-Kamis semuanya memakai templat yang sama', () => {
  for (const d of ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2027-03-08']) assert.deepStrictEqual(dayEvents(d), dayEvents('2026-11-24'));
});
t('siang dulu, malam kemudian (nomor kecil = siang)', () => {
  const d = S.buildDay(S.newState(), '2026-11-24');
  assert.deepStrictEqual(d.tryouts, ['T001', 'T002']);
  assert.deepStrictEqual(d.events.filter(e => e.kind === 'tryout').map(e => e.toId + '@' + S.fmtTime(e.start)), ['T001@13.15', 'T002@19.00']);
});
t('Senin 23 Nov (belum ada tryout), Jumat, Sabtu: hanya tidur; Minggu: baca ulang 19.30-20.00 dan tidur', () => {
  assert.deepStrictEqual(dayEvents('2026-11-23'), ['tidur|23.00-00.00|Tidur']);
  assert.deepStrictEqual(dayEvents('2026-11-27'), ['tidur|23.00-00.00|Tidur']);
  assert.deepStrictEqual(dayEvents('2026-11-28'), ['tidur|23.00-00.00|Tidur']);
  assert.deepStrictEqual(dayEvents('2026-11-29'), ['baca|19.30-20.00|Baca ulang buku soal salah', 'tidur|23.00-00.00|Tidur']);
});
t('fase: sebelum, program, tenang, SKD, setelah', () => {
  const st = S.newState();
  assert.strictEqual(S.buildDay(st, '2026-11-20').phase, 'sebelum');
  assert.strictEqual(S.buildDay(st, '2027-03-15').phase, 'setelah'); // SKD bawaan 8 Feb sudah lewat
  st.settings.skdDate = '2027-03-22';
  assert.strictEqual(S.buildDay(st, '2027-03-15').phase, 'tenang'); assert.strictEqual(S.buildDay(st, '2027-03-15').events.length, 0);
  assert.strictEqual(S.buildDay(st, '2027-03-22').phase, 'skd');
});

console.log('K3 geser tryout');
t('geser ke hari lain di minggu yang sama (termasuk Jumat libur dan akhir pekan): berhasil, total 120 dan jumlah per minggu tetap', () => {
  const st = S.newState();
  const thu = S.buildDay(st, '2026-12-24').tryouts; assert.strictEqual(thu.length, 2);
  assert.ok(S.moveTryout(st, thu[0], '2026-12-25').ok);  // ke Jumat Natal
  assert.ok(S.moveTryout(st, thu[1], '2026-12-27').ok);  // ke Minggu
  const l = S.tryoutList(st);
  assert.strictEqual(l.length, 120); assert.deepStrictEqual(weekCounts(l), BASE_COUNTS);
  assert.strictEqual(S.buildDay(st, '2026-12-24').tryouts.length, 0);
  assert.strictEqual(S.buildDay(st, '2026-12-25').tryouts.length, 1);
  assert.ok(S.getTryout(st, thu[0]).moved);
});
t('geser ke minggu lain ditolak (termasuk 31 Des ke 4 Jan)', () => {
  const st = S.newState();
  const id = S.buildDay(st, '2026-12-31').tryouts[0];
  assert.strictEqual(S.moveTryout(st, id, '2027-01-04').ok, false);
  assert.strictEqual(S.moveTryout(st, id, '2026-12-27').ok, false);
  assert.strictEqual(S.moveTryout(st, id, 'bukan-tanggal').ok, false);
  assert.strictEqual(S.moveTryout(st, id, '2026-11-23').ok, false);
  assert.strictEqual(S.getTryout(st, id).date, '2026-12-31');
  assert.ok(S.moveTryout(st, id, '2027-01-03').ok);
});
t('tryout pertama (minggu 1 mulai Selasa) tidak bisa digeser ke minggu 2, tapi boleh ke Sen 23 Nov? (hari sebelum mulai, masih minggu 1)', () => {
  const st = S.newState();
  assert.strictEqual(S.moveTryout(st, 'T001', '2026-11-30').ok, false);
  assert.strictEqual(S.moveTryout(st, 'T001', '2026-11-29').ok, true);
});
t('2000 geseran acak tidak pernah mengubah total 120 atau jumlah per minggu', () => {
  const st = S.newState(); let seed = 7;
  const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  for (let i = 0; i < 2000; i++) {
    const b = S.BASE[rnd(120)];
    S.moveTryout(st, b.id, S.addDays(S.weekStart(b.week), rnd(7)), rnd(3) ? null : 8 * 60 + rnd(600));
    if (rnd(5) === 0) S.moveTryout(st, b.id, S.addDays(S.weekStart(b.week), 7 + rnd(30)));
  }
  const l = S.tryoutList(st); assert.strictEqual(l.length, 120);
  l.forEach(x => assert.strictEqual(S.weekOf(x.date), x.week));
  assert.deepStrictEqual(weekCounts(l), BASE_COUNTS);
});
t('tryout digeser ke hari penuh mendapat slot tambahan tanpa tabrakan; kembalikan ke jadwal awal', () => {
  const st = S.newState();
  const id = S.buildDay(st, '2026-12-22').tryouts[0];
  S.moveTryout(st, id, '2026-12-23'); // Rabu sudah 2 tryout
  const d = S.buildDay(st, '2026-12-23');
  assert.strictEqual(d.tryouts.length, 3); assert.ok(!d.events.some(e => e.conflict));
  assert.deepStrictEqual(d.events.filter(e => e.kind === 'tryout').map(e => S.fmtTime(e.start)), ['09.30', '13.15', '19.00']);
  S.resetMove(st, id);
  assert.strictEqual(S.getTryout(st, id).date, '2026-12-22'); assert.deepStrictEqual(st.tryouts, {});
});
t('hari tanpa tryout yang diisi tryout geseran memakai slot siang lalu malam', () => {
  const st = S.newState();
  const [a, b] = S.buildDay(st, '2026-12-24').tryouts;
  S.moveTryout(st, a, '2026-12-26'); S.moveTryout(st, b, '2026-12-26');
  const ev = S.buildDay(st, '2026-12-26').events;
  assert.deepStrictEqual(ev.filter(e => e.kind === 'tryout').map(e => e.label + '@' + S.fmtTime(e.start)), ['Tryout siang@13.15', 'Tryout malam@19.00']);
});
t('jam mulai kustom, dan bentrok ditandai', () => {
  const st = S.newState();
  const id = S.buildDay(st, '2026-12-22').tryouts[0];
  S.moveTryout(st, id, '2026-12-23', 19 * 60 + 30);
  assert.ok(S.buildDay(st, '2026-12-23').events.some(e => e.conflict));
  S.moveTryout(st, id, '2026-12-23', 6 * 60);
  assert.ok(!S.buildDay(st, '2026-12-23').events.some(e => e.conflict));
});
t('delapan tryout dipindah ke satu Sabtu: 4 slot berjam, sisanya jam fleksibel', () => {
  const st = S.newState();
  ['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24'].forEach(d => S.buildDay(st, d).tryouts.forEach(id => S.moveTryout(st, id, '2026-12-26')));
  const ev = S.buildDay(st, '2026-12-26').events.filter(e => e.kind === 'tryout');
  assert.strictEqual(ev.length, 8); assert.strictEqual(ev.filter(e => e.flex).length, 4);
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
t('progres per minggu x/total minggu dan total x/120', () => {
  const st = S.newState();
  ['T001', 'T002', 'T007'].forEach(id => S.setField(st, id, { done: true })); // T007 = minggu 2
  const ws = S.weekStats(st);
  assert.deepStrictEqual([ws[0].done, ws[0].total, ws[1].done, ws[1].total, ws[15].total], [2, 6, 1, 8, 2]);
  assert.deepStrictEqual(S.totalStats(st), { done: 3, total: 120 });
});
t('hitung mundur SKD (default 8 Feb 2027)', () => {
  const st = S.newState();
  assert.strictEqual(S.daysToSkd(st, '2026-11-23'), 77);
  st.settings.skdDate = '2027-02-01';
  assert.strictEqual(S.daysToSkd(st, '2027-01-31'), 1);
});

console.log('K8/K9 terlewat, libur, paket dobel, SKD');
t('terlewat: belum selesai dan tanggal lewat; hilang bila digeser ke depan atau selesai', () => {
  const st = S.newState();
  assert.deepStrictEqual(S.missed(st, '2026-11-25').map(x => x.id), ['T001', 'T002']);
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
t('libur: tidak ada peringatan bila tak ada tryout di hari libur; muncul bila tryout digeser ke Jumat libur', () => {
  const st = S.newState();
  assert.strictEqual(S.holidayPending(st, '2026-12-20', 14).length, 0);
  const id = S.buildDay(st, '2026-12-24').tryouts[0];
  S.moveTryout(st, id, '2026-12-25');
  assert.strictEqual(S.holidayPending(st, '2026-12-20', 14).length, 1);
  assert.strictEqual(S.holidayPending(st, '2026-12-26', 14).length, 0);
});
t('tryout pada/setelah tanggal SKD terdeteksi (SKD bawaan 8 Feb: 34 tryout)', () => {
  const st = S.newState();
  assert.strictEqual(S.afterSkd(st).length, 34);
  st.settings.skdDate = '2027-03-08'; assert.strictEqual(S.afterSkd(st).length, 2);
  st.settings.skdDate = '2027-03-09'; assert.strictEqual(S.afterSkd(st).length, 0);
});

console.log('K10 tren dan skor mentok');
function fill(st, week, twk, tkp) { S.tryoutList(st).filter(x => x.week === week).slice(0, 3).forEach(x => S.setField(st, x.id, { done: true, twk, tiu: 100, tkp })); }
t('rata-rata per minggu', () => {
  const st = S.newState(); fill(st, 1, 60, 150);
  const a = S.weeklyAverages(st);
  assert.strictEqual(a.length, 16);
  assert.deepStrictEqual([a[0].twk, a[0].tiu, a[0].tkp, a[0].total], [60, 100, 150, 310]);
  assert.strictEqual(a[1].twk, null);
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
  S.moveTryout(st, 'T100', S.addDays(S.BASE[99].date, 2), 9 * 60);
  st.settings.skdDate = '2027-03-20'; st.settings.thr.twk = 60; st.settings.theme = 'dark';
  st.wrong.push({ id: 'w1', subtest: 'TWK', topic: 'Pancasila', note: 'Sila ke-3', created: '2026-11-23', reads: 2, lastRead: '2026-11-29' });
  const r = S.parseImport(JSON.stringify(S.exportData(st)));
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
  assert.deepStrictEqual(r.state.tryouts, { T002: { done: true } }); // T002 minggu 1; 2026-12-01 minggu 2, jadi tanggal ditolak
  assert.strictEqual(r.state.wrong.length, 0);
});
t('cadangan lama (jadwal sebelum revisi) tidak merusak: tanggal geser yang tak cocok minggu dibuang', () => {
  const r = S.parseImport(JSON.stringify({ app: 'tryout-skd', version: 1, data: { tryouts: { T050: { date: '2026-12-25', done: true, twk: 70 } } } }));
  assert.ok(r.ok); assert.strictEqual(S.getTryout(r.state, 'T050').twk, 70);
  S.tryoutList(r.state).forEach(x => assert.strictEqual(S.weekOf(x.date), x.week));
});

console.log('K4 waktu WITA dan hitung mundur');
t('WITA = UTC+8', () => {
  const n = S.nowWita(Date.UTC(2026, 10, 24, 11, 30, 15)); // 11.30 UTC = 19.30 WITA
  assert.deepStrictEqual(n, { date: '2026-11-24', sec: 19 * 3600 + 30 * 60 + 15 });
  assert.strictEqual(S.nowWita(Date.UTC(2026, 10, 24, 16, 0, 0)).date, '2026-11-25'); // 00.00 WITA
});
t('kegiatan berjalan dan berikutnya (Selasa 24 Nov 19.30 WITA)', () => {
  const st = S.newState();
  const r = S.statusNow(st, { date: '2026-11-24', sec: 19 * 3600 + 30 * 60 });
  assert.strictEqual(r.current.label, 'Tryout malam'); assert.strictEqual(r.next.kind, 'bahas');
  assert.strictEqual(r.nextIn, 80 * 60); // bahas mulai 20.50
});
t('siang: jeda, lewat tengah malam, sebelum program, dan setelah program', () => {
  const st = S.newState();
  const gap = S.statusNow(st, { date: '2026-11-24', sec: 16 * 3600 }); // 16.00 di antara bahas siang dan tryout malam
  assert.strictEqual(gap.current, null); assert.strictEqual(gap.next.label, 'Tryout malam'); assert.strictEqual(gap.nextIn, 3 * 3600);
  const noon = S.statusNow(st, { date: '2026-11-24', sec: 13 * 3600 + 20 * 60 });
  assert.strictEqual(noon.current.label, 'Tryout siang'); assert.strictEqual(noon.next.label, 'Pembahasan');
  const late = S.statusNow(st, { date: '2026-11-24', sec: 23 * 3600 + 30 * 60 });
  assert.strictEqual(late.current.kind, 'tidur'); assert.strictEqual(late.nextDate, '2026-11-25'); assert.strictEqual(late.next.label, 'Tryout siang');
  const before = S.statusNow(st, { date: '2026-11-20', sec: 12 * 3600 });
  assert.strictEqual(before.nextDate, '2026-11-23'); assert.strictEqual(before.next.kind, 'tidur'); // Senin 23 Nov belum ada tryout
  assert.strictEqual(S.statusNow(st, { date: '2027-03-20', sec: 10 * 3600 }).next, null);
});

console.log('\n' + passed + ' tes lulus' + (process.exitCode ? ', ADA YANG GAGAL' : ''));
