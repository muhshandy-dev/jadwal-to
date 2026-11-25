'use strict';
// Jalankan: node tests/logic.test.js  (tanpa dependensi)
// Jadwal revisi 2026-11-25: mulai Senin 30 Nov 2026; hari biasa 15 per minggu (Sen-Kam 2, Jum 1, Sab 3, Min 3), hari libur 4 tryout; 151 tryout selesai Senin 1 Feb 2027.
const assert = require('assert');
const S = require('../schedule.js');
let passed = 0;
function t(name, fn) { try { fn(); passed++; console.log('  ok   ' + name); } catch (e) { console.log('  GAGAL ' + name + '\n       ' + e.message); process.exitCode = 1; } }
const BASE_COUNTS = [15, 15, 15, 22, 20, 17, 15, 15, 15, 2];
const EXTRA = ['2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-05'];
function weekCounts(l) { const c = {}; l.forEach(x => { c[x.week] = (c[x.week] || 0) + 1; }); return Object.keys(c).map(Number).sort((a, b) => a - b).map(w => c[w]); }

console.log('K1 jumlah dan periode');
t('total tepat 151, ID unik', () => {
  const l = S.tryoutList(S.newState());
  assert.strictEqual(l.length, 151);
  assert.strictEqual(new Set(l.map(x => x.id)).size, 151);
  assert.strictEqual(S.TOTAL, 151); assert.strictEqual(l[150].id, 'T151');
});
t('mulai Senin 30 Nov 2026 (tidak ada tryout minggu ini), selesai Senin 1 Feb 2027, sebelum SKD bawaan 8 Feb', () => {
  const l = S.tryoutList(S.newState());
  assert.strictEqual(l[0].date, '2026-11-30'); assert.strictEqual(S.dayIdx('2026-11-30'), 0);
  assert.strictEqual(l[150].date, '2027-02-01'); assert.strictEqual(S.dayIdx('2027-02-01'), 0);
  assert.strictEqual(S.FIRST_DATE, '2026-11-30'); assert.strictEqual(S.LAST_TRYOUT_DATE, '2027-02-01');
  assert.ok(!l.some(x => x.date < '2026-11-30'));
  assert.ok(l.every(x => x.date < S.DEFAULT_SETTINGS.skdDate));
});
t('jumlah per hari: hari biasa Sen-Kam 2, Jumat 1, Sabtu 3, Minggu 3; hari libur dan libur panjang 4', () => {
  const l = S.tryoutList(S.newState()), d = {};
  l.forEach(x => { d[x.date] = (d[x.date] || 0) + 1; });
  const want = [2, 2, 2, 2, 1, 3, 3];
  Object.keys(d).forEach(date => {
    if (date === '2027-02-01') return assert.strictEqual(d[date], 2);
    assert.strictEqual(d[date], EXTRA.indexOf(date) >= 0 ? 4 : want[S.dayIdx(date)], date);
  });
  assert.strictEqual(Object.keys(d).length, 64); // 9 minggu × 7 hari + Senin 1 Feb
});
t('minggu: 10 minggu (15, 15, 15, 22, 20, 17, 15, 15, 15, 2) = 151; minimal 15 per minggu kecuali minggu penutup', () => {
  assert.strictEqual(S.WEEKS, 10);
  assert.deepStrictEqual(weekCounts(S.tryoutList(S.newState())), BASE_COUNTS);
  assert.deepStrictEqual(S.WEEK_COUNTS, BASE_COUNTS);
  assert.strictEqual(BASE_COUNTS.reduce((a, b) => a + b, 0), 151);
  BASE_COUNTS.slice(0, 9).forEach(c => assert.ok(c >= 15));
});
t('awal minggu tepat: minggu 1 Sen 30 Nov, minggu 4 Sen 21 Des, minggu 10 Sen 1 Feb 2027', () => {
  assert.strictEqual(S.weekStart(1), '2026-11-30'); assert.strictEqual(S.weekStart(4), '2026-12-21'); assert.strictEqual(S.weekStart(10), '2027-02-01');
  assert.strictEqual(S.LAST_DATE, '2027-02-07');
});
t('hari libur resmi dipakai: 24 Des (cuti bersama Natal), 25 Des, 1 Jan, 5 Jan (Isra Mikraj); libur panjang 26-27 Des dan 2-3 Jan', () => {
  assert.deepStrictEqual(Object.keys(S.HOLIDAYS).sort(), ['2026-12-24', '2026-12-25', '2027-01-01', '2027-01-05']);
  assert.deepStrictEqual(Object.keys(S.EXTRA_DAYS).sort(), EXTRA);
  assert.deepStrictEqual(['2026-12-24', '2026-12-25', '2027-01-01', '2027-01-05'].map(d => S.dayIdx(d)), [3, 4, 4, 1]);
  EXTRA.forEach(d => { assert.strictEqual(S.buildDay(S.newState(), d).tryouts.length, 4, d); assert.ok(S.dayNote(d), d); });
});
t('hari padat: 4 sesi (pagi 09.30, siang 13.15, siang 2 16.00, malam 19.00), jeda pembahasan cukup, tanpa bentrok', () => {
  EXTRA.forEach(d => {
    const ev = S.buildDay(S.newState(), d).events;
    assert.deepStrictEqual(ev.filter(e => e.kind === 'tryout').map(e => S.fmtTime(e.start)), ['09.30', '13.15', '16.00', '19.00'], d);
    assert.deepStrictEqual(ev.filter(e => e.kind === 'bahas').map(e => S.fmtTime(e.start) + '-' + S.fmtTime(e.end)), ['11.15-12.00', '15.00-15.45', '17.45-18.30', '20.50-21.50'], d);
    assert.ok(!ev.some(e => e.conflict), d);
  });
});
t('semua 151 tryout selesai sebelum SKD bawaan 8 Feb 2027; 2-7 Feb tenang (5 Feb cuti bersama, 6 Feb Imlek)', () => {
  const l = S.tryoutList(S.newState());
  assert.strictEqual(l.filter(x => x.date < '2027-02-08').length, 151);
  assert.strictEqual(S.diffDays('2027-02-08', S.LAST_TRYOUT_DATE), 7);
  for (let d = '2027-02-02'; d < '2027-02-08'; d = S.addDays(d, 1)) assert.strictEqual(S.buildDay(S.newState(), d).tryouts.length, 0);
});

console.log('K2 templat harian');
function dayEvents(date, st) { return S.buildDay(st || S.newState(), date).events.map(e => [e.kind, S.fmtTime(e.start) + '-' + S.fmtTime(e.end), e.label].join('|')); }
t('Senin 30 Nov: siang 13.15 + malam 19.00', () => {
  assert.deepStrictEqual(dayEvents('2026-11-30'), ['tryout|13.15-14.55|Tryout siang', 'bahas|15.00-15.45|Pembahasan', 'tryout|19.00-20.40|Tryout malam', 'bahas|20.50-21.50|Pembahasan', 'santai|21.50-23.00|Santai / istirahat', 'tidur|23.00-00.00|Tidur']);
});
t('Senin-Kamis biasa semuanya memakai templat yang sama', () => {
  for (const d of ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-14', '2027-01-06', '2027-02-01']) assert.deepStrictEqual(dayEvents(d), dayEvents('2026-11-30'), d);
});
t('siang dulu, malam kemudian (nomor kecil = siang)', () => {
  const d = S.buildDay(S.newState(), '2026-11-30');
  assert.deepStrictEqual(d.tryouts, ['T001', 'T002']);
  assert.deepStrictEqual(d.events.filter(e => e.kind === 'tryout').map(e => e.toId + '@' + S.fmtTime(e.start)), ['T001@13.15', 'T002@19.00']);
});
t('Jumat: 1 malam; Sabtu: siang 13.15, siang 2 16.00, malam 19.00; Minggu sama + baca ulang 22.00', () => {
  const SIANG = ['tryout|13.15-14.55|Tryout siang', 'bahas|15.00-15.45|Pembahasan'];
  const SIANG2 = ['tryout|16.00-17.40|Tryout siang 2', 'bahas|17.45-18.30|Pembahasan'];
  const MALAM = ['tryout|19.00-20.40|Tryout malam', 'bahas|20.50-21.50|Pembahasan'];
  const END = ['santai|21.50-23.00|Santai / istirahat', 'tidur|23.00-00.00|Tidur'];
  assert.deepStrictEqual(dayEvents('2026-12-04'), [].concat(MALAM, END));
  assert.deepStrictEqual(dayEvents('2026-12-05'), [].concat(SIANG, SIANG2, MALAM, END));
  assert.deepStrictEqual(dayEvents('2026-12-06'), [].concat(SIANG, SIANG2, MALAM, ['baca|22.00-22.30|Baca ulang pelajaran minggu ini', 'tidur|23.00-00.00|Tidur']));
  assert.deepStrictEqual(S.buildDay(S.newState(), '2026-12-04').tryouts, ['T009']);
  assert.deepStrictEqual(S.buildDay(S.newState(), '2026-12-05').tryouts, ['T010', 'T011', 'T012']);
  assert.deepStrictEqual(S.buildDay(S.newState(), '2026-12-06').tryouts, ['T013', 'T014', 'T015']);
});
t('tidak ada "undefined"/"null"/"NaN" di label jadwal: setiap tryout punya sesi, tidak ada tabrakan jam, pagi hanya di hari libur', () => {
  const st = S.newState(), l = S.tryoutList(st);
  l.forEach(x => { assert.ok(typeof x.session === 'string' && x.session.length > 0 && !/undefined|null|NaN/.test(x.session), x.id); });
  assert.deepStrictEqual([...new Set(l.map(x => x.session))].sort(), ['malam 19.00', 'pagi 09.30', 'siang 13.15', 'siang 2 16.00']);
  for (let d = S.START_DATE, i = 0; i < 80; i++, d = S.addDays(d, 1)) {
    const day = S.buildDay(st, d);
    day.events.forEach(e => { assert.ok(!/undefined|null|NaN/.test(e.label + S.fmtTime(e.start) + S.fmtTime(e.end)), d + ' ' + e.label); assert.ok(!e.conflict, d + ' bentrok'); if (e.kind === 'tryout' && e.start < 13 * 60) assert.ok(S.EXTRA_DAYS[d], d + ' tryout pagi di hari biasa'); });
  }
});
t('sebelum mulai (23-29 Nov, minggu belajar): fase "sebelum", tanpa jadwal; Selasa 2 Feb hanya tidur', () => {
  for (const d of ['2026-11-23', '2026-11-24', '2026-11-29']) { assert.strictEqual(S.buildDay(S.newState(), d).phase, 'sebelum'); assert.deepStrictEqual(dayEvents(d), [], d); }
  assert.deepStrictEqual(dayEvents('2027-02-02'), ['tidur|23.00-00.00|Tidur']);
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
t('geser ke hari lain di minggu yang sama (termasuk hari libur Natal dan akhir pekan): berhasil, total 151 dan jumlah per minggu tetap', () => {
  const st = S.newState();
  const thu = S.buildDay(st, '2026-12-24').tryouts; assert.strictEqual(thu.length, 4);
  assert.ok(S.moveTryout(st, thu[0], '2026-12-21').ok);  // Natal ke Senin
  assert.ok(S.moveTryout(st, thu[1], '2026-12-27').ok);  // ke Minggu
  const l = S.tryoutList(st);
  assert.strictEqual(l.length, 151); assert.deepStrictEqual(weekCounts(l), BASE_COUNTS);
  assert.strictEqual(S.buildDay(st, '2026-12-24').tryouts.length, 2);
  assert.strictEqual(S.buildDay(st, '2026-12-21').tryouts.length, 3); // 2 asli + 1 geseran
  assert.ok(S.getTryout(st, thu[0]).moved);
});
t('geser ke minggu lain ditolak (termasuk Kamis 17 Des ke Senin 21 Des)', () => {
  const st = S.newState();
  const id = S.buildDay(st, '2026-12-17').tryouts[0];
  assert.strictEqual(S.moveTryout(st, id, '2026-12-21').ok, false);
  assert.strictEqual(S.moveTryout(st, id, '2026-12-13').ok, false);
  assert.strictEqual(S.moveTryout(st, id, 'bukan-tanggal').ok, false);
  assert.strictEqual(S.moveTryout(st, id, '2026-11-23').ok, false);
  assert.strictEqual(S.getTryout(st, id).date, '2026-12-17');
  assert.ok(S.moveTryout(st, id, '2026-12-20').ok);
});
t('tryout pertama (Senin 30 Nov) boleh digeser dalam minggu 1 saja, tidak ke 29 Nov (minggu belajar) atau 7 Des', () => {
  const st = S.newState();
  assert.strictEqual(S.moveTryout(st, 'T001', '2026-12-07').ok, false);
  assert.strictEqual(S.moveTryout(st, 'T001', '2026-11-29').ok, false);
  assert.strictEqual(S.moveTryout(st, 'T001', '2026-12-06').ok, true);
});
t('2000 geseran acak tidak pernah mengubah total 151 atau jumlah per minggu', () => {
  const st = S.newState(); let seed = 7;
  const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  for (let i = 0; i < 2000; i++) {
    const b = S.BASE[rnd(151)];
    S.moveTryout(st, b.id, S.addDays(S.weekStart(b.week), rnd(7)), rnd(3) ? null : 8 * 60 + rnd(600));
    if (rnd(5) === 0) S.moveTryout(st, b.id, S.addDays(S.weekStart(b.week), 7 + rnd(30)));
  }
  const l = S.tryoutList(st); assert.strictEqual(l.length, 151);
  l.forEach(x => assert.strictEqual(S.weekOf(x.date), x.week));
  assert.deepStrictEqual(weekCounts(l), BASE_COUNTS);
});
t('tryout digeser ke hari penuh mendapat slot tambahan tanpa tabrakan; kembalikan ke jadwal awal', () => {
  const st = S.newState();
  const id = S.buildDay(st, '2026-12-15').tryouts[0];
  S.moveTryout(st, id, '2026-12-16'); // Rabu sudah 2 tryout
  const d = S.buildDay(st, '2026-12-16');
  assert.strictEqual(d.tryouts.length, 3); assert.ok(!d.events.some(e => e.conflict));
  assert.deepStrictEqual(d.events.filter(e => e.kind === 'tryout').map(e => S.fmtTime(e.start)), ['13.15', '16.00', '19.00']);
  S.resetMove(st, id);
  assert.strictEqual(S.getTryout(st, id).date, '2026-12-15'); assert.deepStrictEqual(st.tryouts, {});
});
t('Jumat (1 tryout) diisi 2 tryout geseran: slot siang 13.15 dan siang 2 16.00, tanpa tabrakan', () => {
  const st = S.newState();
  const [a, b] = S.buildDay(st, '2026-12-17').tryouts;
  S.moveTryout(st, a, '2026-12-18'); S.moveTryout(st, b, '2026-12-18');
  const d = S.buildDay(st, '2026-12-18');
  assert.deepStrictEqual(d.events.filter(e => e.kind === 'tryout').map(e => S.fmtTime(e.start)), ['13.15', '16.00', '19.00']);
  assert.ok(!d.events.some(e => e.conflict || e.flex));
});
t('jam mulai kustom, dan bentrok ditandai', () => {
  const st = S.newState();
  const id = S.buildDay(st, '2026-12-15').tryouts[0];
  S.moveTryout(st, id, '2026-12-16', 19 * 60 + 30);
  assert.ok(S.buildDay(st, '2026-12-16').events.some(e => e.conflict));
  S.moveTryout(st, id, '2026-12-16', 6 * 60);
  assert.ok(!S.buildDay(st, '2026-12-16').events.some(e => e.conflict));
});
t('delapan tryout dipindah ke satu Sabtu (sudah 3): 3 slot berjam, 8 jam fleksibel', () => {
  const st = S.newState();
  ['2026-12-14', '2026-12-15', '2026-12-16', '2026-12-17'].forEach(d => S.buildDay(st, d).tryouts.forEach(id => S.moveTryout(st, id, '2026-12-19')));
  const ev = S.buildDay(st, '2026-12-19').events.filter(e => e.kind === 'tryout');
  assert.strictEqual(ev.length, 11); assert.strictEqual(ev.filter(e => e.flex).length, 8);
});
t('hari libur boleh dikosongkan dengan menggeser, dan tidak ada peringatan libur lagi (hari libur memang dipakai)', () => {
  assert.strictEqual(S.holidayPending, undefined);
  const st = S.newState(); const ids = S.buildDay(st, '2026-12-25').tryouts;
  ids.forEach(id => assert.ok(S.moveTryout(st, id, '2026-12-23').ok));
  assert.strictEqual(S.buildDay(st, '2026-12-25').tryouts.length, 0);
  assert.strictEqual(S.buildDay(st, '2026-12-23').tryouts.length, 6);
});

console.log('Jadwal efektif setelah digeser (jam/sesi ikut berubah)');
t('scheduleMap: jadwal awal punya sesi dan jam; tidak ada undefined', () => {
  const m = S.scheduleMap(S.newState());
  assert.strictEqual(Object.keys(m).length, 151);
  assert.strictEqual(m.T001.text, 'siang 13.15'); assert.strictEqual(m.T002.text, 'malam 19.00');
  assert.strictEqual(m.T009.text, 'malam 19.00'); // Jumat 4 Des
  assert.strictEqual(m.T011.text, 'siang 2 16.00'); // Sabtu 5 Des
  assert.strictEqual(m[S.buildDay(S.newState(), '2026-12-24').tryouts[0]].text, 'pagi 09.30'); // hari libur
  Object.values(m).forEach(x => assert.ok(x.text && !/undefined|null|NaN/.test(x.text)));
});
t('geser hanya jam di hari yang sama (pilih sesi): jam/sesi berubah dan tampil di timeline', () => {
  const st = S.newState();
  assert.ok(S.moveTryout(st, 'T001', '2026-11-30', 16 * 60).ok);
  const m = S.scheduleMap(st);
  assert.strictEqual(m.T001.text, 'siang 2 16.00'); assert.strictEqual(m.T001.session, 'siang 2');
  assert.ok(S.getTryout(st, 'T001').moved);
  const ev = S.buildDay(st, '2026-11-30').events.filter(e => e.kind === 'tryout').map(e => e.label + '@' + S.fmtTime(e.start));
  assert.deepStrictEqual(ev, ['Tryout siang 2@16.00', 'Tryout malam@19.00']);
  assert.ok(!S.buildDay(st, '2026-11-30').events.some(e => e.conflict));
});
t('geser ke hari lain: sesi mengikuti slot kosong hari tujuan; jam kustom tampil sebagai jam; tanpa jam = jam belum diatur', () => {
  const st = S.newState();
  S.moveTryout(st, 'T001', '2026-12-04'); // Jumat: malam sudah dipakai T009
  assert.strictEqual(S.scheduleMap(st).T001.text, 'siang 13.15');
  S.moveTryout(st, 'T001', '2026-12-04', 14 * 60);
  assert.strictEqual(S.scheduleMap(st).T001.text, '14.00'); assert.strictEqual(S.scheduleMap(st).T001.session, null);
  S.moveTryout(st, 'T001', '2026-12-04', 19 * 60); // sesi malam diambil T001 -> T009 (jadwal awal malam) otomatis pindah ke slot kosong, tanpa bentrok
  assert.strictEqual(S.scheduleMap(st).T001.text, 'malam 19.00'); assert.strictEqual(S.scheduleMap(st).T009.text, 'siang 13.15');
  assert.ok(!S.buildDay(st, '2026-12-04').events.some(e => e.conflict));
  S.moveTryout(st, 'T001', '2026-12-04', 19 * 60 + 30); // jam kustom di luar sesi baku yang menimpa T009 malam: bentrok ditandai
  assert.strictEqual(S.scheduleMap(st).T001.text, '19.30'); assert.ok(S.buildDay(st, '2026-12-04').events.some(e => e.conflict));
  const st2 = S.newState();
  ['T001', 'T002', 'T003', 'T004'].forEach(id => S.moveTryout(st2, id, '2026-12-05')); // Sabtu: 3 + 4 geseran, slot habis
  const m = S.scheduleMap(st2);
  assert.ok(Object.values(m).some(x => x.flex && x.text === 'jam belum diatur'));
});
t('kembalikan ke jadwal awal: jam dan sesi kembali', () => {
  const st = S.newState();
  S.moveTryout(st, 'T001', '2026-12-03', 19 * 60);
  S.resetMove(st, 'T001');
  assert.strictEqual(S.scheduleMap(st).T001.text, 'siang 13.15'); assert.strictEqual(S.getTryout(st, 'T001').moved, false);
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
t('progres per minggu x/total minggu dan total x/151', () => {
  const st = S.newState();
  ['T001', 'T002', 'T016'].forEach(id => S.setField(st, id, { done: true })); // T016 = minggu 2
  const ws = S.weekStats(st);
  assert.deepStrictEqual([ws[0].done, ws[0].total, ws[1].done, ws[1].total, ws[9].total], [2, 15, 1, 15, 2]);
  assert.deepStrictEqual(S.totalStats(st), { done: 3, total: 151 });
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
  assert.deepStrictEqual(S.missed(st, '2026-12-01').map(x => x.id), ['T001', 'T002']);
  S.moveTryout(st, 'T001', '2026-12-06');
  S.setField(st, 'T002', { done: true });
  assert.deepStrictEqual(S.missed(st, '2026-12-01'), []);
  assert.strictEqual(S.statusOf(S.getTryout(st, 'T001'), '2026-12-01'), 'terjadwal');
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
t('tryout pada/setelah tanggal SKD terdeteksi (SKD bawaan 8 Feb: 0; SKD 1 Feb: 2)', () => {
  const st = S.newState();
  assert.strictEqual(S.afterSkd(st).length, 0);
  st.settings.skdDate = '2027-02-01'; assert.strictEqual(S.afterSkd(st).length, 2);
  st.settings.skdDate = '2027-02-02'; assert.strictEqual(S.afterSkd(st).length, 0);
});

console.log('K10 tren dan skor mentok');
function fill(st, week, twk, tkp) { S.tryoutList(st).filter(x => x.week === week).slice(0, 3).forEach(x => S.setField(st, x.id, { done: true, twk, tiu: 100, tkp })); }
t('rata-rata per minggu', () => {
  const st = S.newState(); fill(st, 1, 60, 150);
  const a = S.weeklyAverages(st);
  assert.strictEqual(a.length, 10);
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

console.log('K11 catatan pelajaran harian');
t('setLesson: simpan, ubah, kosong = hapus, tanggal tidak valid ditolak, dipangkas 1000 huruf', () => {
  const st = S.newState();
  assert.deepStrictEqual(st.lessons, {});
  assert.ok(S.setLesson(st, '2026-11-24', '  Pancasila sila ke-3  ').ok); assert.strictEqual(st.lessons['2026-11-24'], 'Pancasila sila ke-3');
  S.setLesson(st, '2026-11-24', 'Diubah'); assert.strictEqual(st.lessons['2026-11-24'], 'Diubah');
  S.setLesson(st, '2026-11-24', '   '); assert.deepStrictEqual(st.lessons, {});
  assert.strictEqual(S.setLesson(st, 'bukan-tanggal', 'x').ok, false); assert.deepStrictEqual(st.lessons, {});
  S.setLesson(st, '2026-11-25', 'a'.repeat(5000)); assert.strictEqual(st.lessons['2026-11-25'].length, S.LESSON_MAX);
});
t('lessonDates terbaru dulu; cadangan lama berisi buku soal salah tetap bisa diimpor tanpa merusak', () => {
  const st = S.newState(); S.setLesson(st, '2026-11-24', 'a'); S.setLesson(st, '2026-12-01', 'b'); S.setLesson(st, '2026-11-30', 'c');
  assert.deepStrictEqual(S.lessonDates(st), ['2026-12-01', '2026-11-30', '2026-11-24']);
  const r = S.parseImport(JSON.stringify({ app: 'tryout-skd', version: 1, data: { tryouts: { T001: { done: true } }, wrong: [{ id: 'w1', subtest: 'TWK', topic: 'Pancasila', note: 'Sila ke-3' }] } }));
  assert.ok(r.ok); assert.deepStrictEqual(r.state.lessons, {}); assert.strictEqual(r.state.tryouts.T001.done, true);
  assert.deepStrictEqual(S.normalizeState({ lessons: ['x'] }).lessons, {}); // bentuk salah
});

console.log('K15 ekspor/impor');
t('ekspor lalu impor menghasilkan state identik', () => {
  const st = S.newState();
  S.setField(st, 'T005', { done: true, name: 'Paket X', twk: 100, tiu: 120, tkp: 200, reviewed: true });
  S.moveTryout(st, 'T100', S.addDays(S.BASE[99].date, 2), 9 * 60);
  st.settings.skdDate = '2027-03-20'; st.settings.thr.twk = 60; st.settings.theme = 'dark';
  S.setLesson(st, '2026-11-24', 'Sila ke-3: persatuan Indonesia'); S.setLesson(st, '2026-11-25', 'Silogisme: semua A adalah B bukan berarti semua B adalah A');
  const r = S.parseImport(JSON.stringify(S.exportData(st)));
  assert.ok(r.ok); assert.deepStrictEqual(r.state, st);
});
t('impor menolak JSON rusak, berkas asing, versi lain, dan membersihkan data berbahaya', () => {
  assert.strictEqual(S.parseImport('{bukan json').ok, false);
  assert.strictEqual(S.parseImport('{"a":1}').ok, false);
  assert.strictEqual(S.parseImport('{"app":"tryout-skd","version":9,"data":{"tryouts":{}}}').ok, false);
  assert.strictEqual(S.parseImport('{"app":"tryout-skd","version":1,"data":{}}').ok, false);
  const r = S.parseImport(JSON.stringify({ app: 'tryout-skd', version: 1, data: { settings: { skdDate: 'ngawur', thr: { twk: 'x', tiu: 9999 } }, tryouts: { T001: { twk: 9999, date: '2030-01-01', done: 'ya' }, TXXX: { done: true }, T002: { date: '2026-12-08', done: true } }, wrong: [{ subtest: 'TWK', topic: 'a', note: 'b' }, 'x'], lessons: { ngawur: 'x', '2026-12-01': '  Pelajaran A  ', '2026-12-02': '   ', '2026-12-03': 123 } } }));
  assert.ok(r.ok);
  assert.strictEqual(r.state.settings.skdDate, '2027-02-08');
  assert.strictEqual(r.state.settings.thr.twk, 65); assert.strictEqual(r.state.settings.thr.tiu, 80);
  assert.deepStrictEqual(r.state.tryouts, { T002: { done: true } }); // T002 minggu 1; 2026-12-08 minggu 2, jadi tanggal ditolak
  assert.deepStrictEqual(r.state.lessons, { '2026-12-01': 'Pelajaran A' }); // tanggal ngawur, teks kosong, dan bukan teks dibuang
  assert.strictEqual(r.state.wrong, undefined); // buku soal salah lama diabaikan
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
t('kegiatan berjalan dan berikutnya (Senin 30 Nov 19.30 WITA)', () => {
  const st = S.newState();
  const r = S.statusNow(st, { date: '2026-11-30', sec: 19 * 3600 + 30 * 60 });
  assert.strictEqual(r.current.label, 'Tryout malam'); assert.strictEqual(r.next.kind, 'bahas');
  assert.strictEqual(r.nextIn, 80 * 60); // bahas mulai 20.50
});
t('siang: jeda, lewat tengah malam, sebelum program, dan setelah program', () => {
  const st = S.newState();
  const gap = S.statusNow(st, { date: '2026-11-30', sec: 16 * 3600 }); // 16.00 di antara bahas siang dan tryout malam
  assert.strictEqual(gap.current, null); assert.strictEqual(gap.next.label, 'Tryout malam'); assert.strictEqual(gap.nextIn, 3 * 3600);
  const noon = S.statusNow(st, { date: '2026-11-30', sec: 13 * 3600 + 20 * 60 });
  assert.strictEqual(noon.current.label, 'Tryout siang'); assert.strictEqual(noon.next.label, 'Pembahasan');
  const late = S.statusNow(st, { date: '2026-11-30', sec: 23 * 3600 + 30 * 60 });
  assert.strictEqual(late.current.kind, 'tidur'); assert.strictEqual(late.nextDate, '2026-12-01'); assert.strictEqual(late.next.label, 'Tryout siang');
  const before = S.statusNow(st, { date: '2026-11-20', sec: 12 * 3600 });
  assert.strictEqual(before.nextDate, '2026-11-30'); assert.strictEqual(before.next.label, 'Tryout siang'); // minggu belajar: tryout pertama Senin 30 Nov 13.15
  assert.strictEqual(S.statusNow(st, { date: '2027-03-20', sec: 10 * 3600 }).next, null);
});

console.log('\n' + passed + ' tes lulus' + (process.exitCode ? ', ADA YANG GAGAL' : ''));
