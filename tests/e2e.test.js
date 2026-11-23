'use strict';
// Uji browser nyata (Chromium via Playwright). Jalankan: node tests/e2e.test.js
// Menulis screenshot ke ../screenshots/. Zona waktu peramban sengaja bukan WITA untuk membuktikan perhitungan WITA.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const S = require('../schedule.js');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const KEY = 'tryoutSkd.v1';
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok    ' + name); } else { fail++; process.exitCode = 1; console.log('  GAGAL ' + name + (detail !== undefined ? '  -> ' + JSON.stringify(detail) : '')); }
}

function startServer(prefix) {
  const seen = [];
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    seen.push({ url: p });
    if (prefix) { if (!p.startsWith(prefix)) { res.writeHead(404); return res.end('x'); } p = p.slice(prefix.length - 1); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory() || p.startsWith('/tests') || p.startsWith('/screenshots')) { res.writeHead(404); return res.end('tidak ada'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, port: srv.address().port, seen })));
}

// Data contoh: minggu 1-2 selesai semua, minggu 3 sebagian; TWK mentok, TKP naik.
function seedState() {
  const st = S.newState();
  const l = S.tryoutList(st);
  const twk = { 1: 62, 2: 62, 3: 61 }, tkp = { 1: 150, 2: 158, 3: 166 }; // TWK tidak naik 3 minggu, TKP naik
  let k = 0;
  l.forEach(t => {
    if (t.week > 3) return;
    if (['T015', 'T016'].indexOf(t.id) >= 0) return; // terlewat (Senin 7 Des, siang dan malam)
    k++;
    S.setField(st, t.id, { done: true, reviewed: t.date < '2026-12-10', name: 'Paket Bimbel ' + String.fromCharCode(64 + (k % 26 || 26)) + ' ' + k, twk: twk[t.week] + (k % 2 ? 1 : -1), tiu: 78 + (k % 7), tkp: tkp[t.week] + (k % 3) });
  });
  st.wrong.push({ id: 'w1', subtest: 'TWK', topic: 'Pancasila', note: 'Sila ke-3: persatuan Indonesia, bukan kerakyatan.', created: '2026-11-25', reads: 1, lastRead: '2026-11-29' });
  st.wrong.push({ id: 'w2', subtest: 'TKP', topic: 'Pelayanan publik', note: 'Pilih jawaban yang menjelaskan prosedur dengan ramah dan tetap sesuai aturan.', created: '2026-12-02', reads: 0, lastRead: '' });
  st.wrong.push({ id: 'w3', subtest: 'TIU', topic: 'Silogisme', note: 'Semua A adalah B tidak berarti semua B adalah A.', created: '2026-12-05', reads: 0, lastRead: '' });
  return st;
}

(async () => {
  const browser = await chromium.launch();
  const { srv, port, seen } = await startServer('');
  const base = 'http://127.0.0.1:' + port + '/';
  const MOBILE = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'id-ID', timezoneId: 'America/Los_Angeles', serviceWorkers: 'allow' };

  async function open(iso, opts) {
    opts = opts || {};
    const ctx = await browser.newContext(Object.assign({}, MOBILE, opts.ctx || {}));
    if (opts.grant) await ctx.grantPermissions(['notifications']);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    if (opts.seed) await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [KEY, JSON.stringify(seedState())]);
    if (opts.rawStorage) await page.addInitScript(([k, v]) => { if (!sessionStorage.getItem('__init')) { localStorage.setItem(k, v); sessionStorage.setItem('__init', '1'); } }, [KEY, opts.rawStorage]);
    if (opts.notifSpy) await page.addInitScript(() => { window.__notifs = []; Object.defineProperty(Notification, 'permission', { get: () => 'granted', configurable: true }); Notification.requestPermission = () => Promise.resolve('granted'); /* izin asli tidak bisa diuji headless */ if (window.ServiceWorkerRegistration) ServiceWorkerRegistration.prototype.showNotification = function (t, o) { window.__notifs.push({ t: t, b: o && o.body }); return Promise.resolve(); }; });
    if (iso) await page.clock.install({ time: new Date(iso) });
    await page.goto((opts.base || base) + (opts.hash || ''));
    await page.waitForSelector('#view h1');
    return { ctx, page, errors };
  }
  const closeSheet = async page => { await page.click('[data-act=close-sheet]'); await page.waitForFunction(() => !document.getElementById('sheet').open); await page.waitForTimeout(80); };
  const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name + '.png') });
  const ROUTE_MAP = { '#/hari-ini': '#/tryout', '#/kalender': '#/tryout', '#/skor': '#/tryout', '#/catatan': '#/rekap', '#/rekap-salah': '#/rekap' };
  const go = async (page, h) => {
    const target = ROUTE_MAP[h] || h;
    await page.evaluate(x => { location.hash = x; }, target); await page.waitForTimeout(80);
    if (target === '#/tryout') await page.evaluate(() => document.querySelectorAll('details.week[data-w]').forEach(d => { d.open = true; }));
    if (target === '#/rekap') await page.click(h === '#/catatan' || h === '#/rekap-salah' ? '[data-tab=salah]' : '[data-tab=skor]');
    await page.waitForTimeout(40);
  };
  const toWeeks = page => page.locator('#view h2:has-text("Semua minggu")').evaluate(e => e.scrollIntoView());
  const stateOf = page => page.evaluate(() => JSON.parse(localStorage.getItem('tryoutSkd.v1')));

  // ---------------------------------------------------------------- K4 Hari Ini
  console.log('K4 Hari Ini (Selasa 24 Nov 2026 19.30 WITA = 11.30 UTC; peramban di zona Los Angeles)');
  {
    const { ctx, page, errors } = await open('2026-11-24T11:30:00Z');
    const head = await page.textContent('#view');
    check('tanggal ditampilkan dalam WITA', /Selasa, 24 November 2026/.test(head), head);
    const nowTxt = await page.textContent('.ev.now');
    check('kegiatan berjalan disorot: Tryout malam 19.00–20.40', /19\.00–20\.40/.test(nowTxt) && /Tryout/.test(nowTxt) && /sedang berjalan/.test(nowTxt), nowTxt);
    check('timeline Selasa: 6 kegiatan (tryout siang, bahas, tryout malam, bahas, santai, tidur)', (await page.locator('.timeline .ev').count()) === 6);
    const cd0 = await page.textContent('#cd');
    check('hitung mundur ke kegiatan berikutnya (Pembahasan 20.50), kira-kira 01:20:00', /^01:(19|20):\d\d$/.test(cd0), cd0);
    await page.clock.runFor(5000);
    const cd1 = await page.textContent('#cd');
    const sec = s => { const p = s.split(':').map(Number); return p[0] * 3600 + p[1] * 60 + p[2]; };
    check('hitung mundur berkurang tiap detik', sec(cd0) - sec(cd1) >= 4 && sec(cd0) - sec(cd1) <= 7, [cd0, cd1]);
    check('SKD H-76 dan progres 0/120', /H-76/.test(await page.textContent('.card')) && /0\/120/.test(await page.textContent('.card')));
    await page.clock.runFor(81 * 60 * 1000); // lewat 20.50
    const nowTxt2 = await page.textContent('.ev.now');
    check('setelah 81 menit, sorotan pindah ke Pembahasan', /Pembahasan/.test(nowTxt2), nowTxt2);
    check('tanpa galat konsol', errors.length === 0, errors);
    await ctx.close();
  }

  // ---------------------------------------------------------------- K5 K14 checklist + persistensi + K9
  console.log('K5/K14/K9 checklist, skor, persistensi, paket dobel');
  {
    const { ctx, page } = await open('2026-11-24T11:30:00Z');
    await page.check('[data-done=T001]');
    check('centang selesai di timeline menaikkan progres ke 1/120', /1\/120/.test(await page.textContent('.card')));
    await page.click('.ev.k-tryout [data-open=T001]');
    await page.fill('#f-name', 'Bimbel A – Paket 1');
    await page.fill('#f-twk', '70'); await page.fill('#f-tiu', '79'); await page.fill('#f-tkp', '170');
    const derived = await page.textContent('#derived');
    check('total dihitung otomatis 319', /Total 319/.test(derived), derived);
    check('lulus/tidak per subtes: TWK ✓, TIU ✗, TKP ✓', /TWK 70 ✓/.test(derived) && /TIU 79 ✗/.test(derived) && /TKP 170 ✓/.test(derived) && /Belum lulus semua/.test(derived), derived);
    await page.fill('#f-tiu', '176');
    check('skor di luar batas ditolak dengan pesan', /0–175/.test(await page.textContent('#err')));
    await page.fill('#f-tiu', '80');
    check('TIU 80 = lulus (batas tepat)', /TIU 80 ✓/.test(await page.textContent('#derived')) && /Lulus semua ambang/.test(await page.textContent('#derived')));
    await page.check('[data-f=reviewed]');
    await closeSheet(page);
    await page.reload(); await page.waitForSelector('#view h1');
    const st = await stateOf(page);
    check('data tetap ada setelah reload (localStorage)', st.tryouts.T001 && st.tryouts.T001.twk === 70 && st.tryouts.T001.tiu === 80 && st.tryouts.T001.name === 'Bimbel A – Paket 1' && st.tryouts.T001.done && st.tryouts.T001.reviewed, st.tryouts.T001);
    await go(page, '#/skor');
    check('daftar skor memuat nilai setelah reload', /Total 320/.test(await page.textContent('.list')));
    // paket dobel
    await page.click('[data-open=T002]');
    await page.fill('#f-name', '  bimbel a – paket 1 ');
    check('peringatan paket dobel di dalam sheet', /juga dipakai di tryout #1/.test(await page.textContent('#dup')));
    await closeSheet(page);
    await go(page, '#/rekap');
    check('peringatan paket dobel di halaman Skor', /Paket dobel/.test(await page.textContent('#view')));
    await ctx.close();
  }

  // ---------------------------------------------------------------- K3 geser + K8 terlewat
  console.log('K3/K8 geser tryout (termasuk ke Jumat Natal) dan peringatan terlewat');
  {
    const { ctx, page } = await open('2026-12-21T04:00:00Z'); // Senin 21 Des 12.00 WITA
    check('peringatan terlewat muncul (tryout minggu-minggu lalu belum selesai)', /tryout terlewat/.test(await page.textContent('#view')));
    const thu = await page.evaluate(() => Sked.buildDay(__app.state, '2026-12-24').tryouts);
    check('Kamis 24 Des punya 2 tryout; Jumat 25 Des (Natal) tidak ada tryout', thu.length === 2 && (await page.evaluate(() => Sked.buildDay(__app.state, '2026-12-25').tryouts.length)) === 0, thu);
    await go(page, '#/tryout');
    check('minggu 5 menampilkan catatan Natal', /Natal jatuh Jumat 25 Des/.test(await page.textContent('details[data-w="5"]')));
    await page.click('details[data-w="5"] [data-open="' + thu[0] + '"]');
    const opts = await page.$$eval('#f-date option', o => o.map(x => x.value));
    check('pilihan geser hanya 7 hari di minggu yang sama (21–27 Des)', opts.join() === '2026-12-21,2026-12-22,2026-12-23,2026-12-24,2026-12-25,2026-12-26,2026-12-27', opts);
    await page.selectOption('#f-date', '2026-12-25');
    await page.click('[data-act=move]');
    check('toast konfirmasi geser ke Jumat 25 Desember', /dijadwalkan Jumat, 25 Desember 2026/.test(await page.textContent('#toast')) || /Dijadwalkan Jumat, 25 Desember 2026/.test(await page.textContent('#move-msg')));
    await closeSheet(page);
    const inv = await page.evaluate(() => { const l = Sked.tryoutList(__app.state), c = {}; l.forEach(t => { c[t.week] = (c[t.week] || 0) + 1; }); return { n: l.length, same: JSON.stringify(Object.values(c)) === JSON.stringify(Sked.WEEK_COUNTS), moved: Sked.tryoutList(__app.state).filter(t => t.moved).length }; });
    check('setelah geser: total tetap 120, jumlah tiap minggu tetap, 1 tryout bertanda digeser', inv.n === 120 && inv.same && inv.moved === 1, inv);
    check('peringatan: tryout di hari libur Natal bisa digeser', /Hari Raya Natal, Jum 25 Des: 1 tryout bisa digeser/.test(await page.textContent('.warn:has-text("Natal")')));
    await page.click('.warn:has-text("Natal") [data-open]');
    await page.selectOption('#f-date', '2026-12-26');
    await page.fill('#f-time', '10:00');
    await page.click('[data-act=move]');
    await closeSheet(page);
    check('peringatan Natal hilang setelah tryout digeser dari hari libur', (await page.locator('.warn:has-text("Natal")').count()) === 0);
    check('minggu 5: tryout geseran bertanda ↔', /↔/.test(await page.textContent('details[data-w="5"]')));
    await page.click('details[data-w="5"] [data-open="' + thu[0] + '"]');
    await page.click('[data-act=unmove]');
    check('kembalikan ke jadwal awal (Kamis 24 Des)', (await page.evaluate(id => Sked.getTryout(__app.state, id).date, thu[0])) === '2026-12-24');
    await closeSheet(page);
    const ny = await page.evaluate(() => { const id = Sked.buildDay(__app.state, '2026-12-31').tryouts[0]; return [Sked.moveTryout(__app.state, id, '2027-01-01').ok, Sked.moveTryout(__app.state, id, '2027-01-04').ok]; });
    check('Tahun Baru: Kamis 31 Des bisa digeser ke Jumat 1 Jan, tidak ke Senin 4 Jan (minggu lain)', ny[0] === true && ny[1] === false, ny);
    await ctx.close();
  }

  // ---------------------------------------------------------------- K10 K12 K15 dengan data contoh, tren, ekspor/impor
  console.log('K10/K12/K15 tren, kalender, ekspor dan impor JSON');
  {
    const { ctx, page } = await open('2026-12-12T02:00:00Z', { seed: true }); // Sabtu 12 Des 10.00 WITA
    await shot(page, '01-tryout-hari-ini-375');
    await go(page, '#/tryout'); await toWeeks(page); await page.waitForTimeout(100); await shot(page, '02-tryout-minggu-375');
    await page.evaluate(() => window.scrollTo(0, 0)); await go(page, '#/rekap');
    const trenTxt = await page.textContent('#view');
    check('skor mentok TWK terdeteksi (62,63→? minggu 1-3 tidak naik dua kali)', /Skor mentok: rata-rata TWK/.test(trenTxt), trenTxt.slice(0, 300));
    check('TKP naik: tidak ada peringatan mentok TKP', !/Skor mentok: rata-rata TKP/.test(trenTxt));
    check('grafik SVG tergambar dengan garis ambang', (await page.locator('svg.chart polyline.ln').count()) === 1 && (await page.locator('svg.chart .thr').count()) === 1 && (await page.locator('svg.chart circle.pt').count()) > 10);
    const rows = await page.locator('table.avg tbody tr').count();
    check('tabel rata-rata per minggu untuk 3 minggu', rows === 3, rows);
    await shot(page, '04-skor-tren-twk-375');
    await page.click('[data-series=tkp]'); await shot(page, '05-skor-tren-tkp-375');
    await go(page, '#/catatan'); await shot(page, '06-rekap-soal-salah-375');
    await go(page, '#/pengaturan'); await shot(page, '07-pengaturan-375');
    // ekspor
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=export]')]);
    const fname = dl.suggestedFilename();
    const text = fs.readFileSync(await dl.path(), 'utf8');
    const parsed = S.parseImport(text);
    check('ekspor: nama berkas dan JSON valid', /^tryout-skd-cadangan-2026-12-12\.json$/.test(fname) && parsed.ok, fname);
    const before = await stateOf(page);
    check('ekspor memuat state yang sama dengan localStorage', JSON.stringify(parsed.state) === JSON.stringify(S.normalizeState(before)));
    // impor berkas rusak
    await page.setInputFiles('#import-file', { name: 'rusak.json', mimeType: 'application/json', buffer: Buffer.from('{bukan json') });
    await page.waitForTimeout(150);
    check('impor berkas rusak ditolak dengan pesan', /Impor gagal/.test(await page.textContent('#toast')));
    await page.setInputFiles('#import-file', { name: 'asing.json', mimeType: 'application/json', buffer: Buffer.from('{"foo":1}') });
    await page.waitForTimeout(150);
    check('impor berkas asing ditolak', /bukan cadangan Tryout SKD/.test(await page.textContent('#toast')));
    check('data tidak berubah setelah impor gagal', JSON.stringify(await stateOf(page)) === JSON.stringify(before));
    // reset lalu impor cadangan
    await page.click('[data-act=reset]'); await page.click('#confirm [value=cancel]');
    check('reset dibatalkan: data tetap', JSON.stringify(await stateOf(page)) === JSON.stringify(before));
    await shot(page, '08-dialog-reset-375').catch(() => {});
    await page.click('[data-act=reset]');
    await shot(page, '08-dialog-reset-375');
    await page.click('#confirm [value=ok]');
    await page.waitForTimeout(100);
    const afterReset = await stateOf(page);
    check('reset dengan konfirmasi menghapus semua data', Object.keys(afterReset.tryouts).length === 0 && afterReset.wrong.length === 0);
    await page.setInputFiles('#import-file', { name: fname, mimeType: 'application/json', buffer: Buffer.from(text) });
    await page.waitForSelector('#confirm[open]');
    check('dialog impor menyebut jumlah data', /tryout selesai/.test(await page.textContent('#confirm p')));
    await page.click('#confirm [value=ok]'); await page.waitForTimeout(100);
    check('impor memulihkan data persis seperti sebelum reset', JSON.stringify(S.normalizeState(await stateOf(page))) === JSON.stringify(S.normalizeState(before)));
    await ctx.close();
  }

  // ---------------------------------------------------------------- K11 catatan, K20 XSS
  console.log('K11/K20 buku soal salah, pengingat Minggu 19.30, XSS');
  {
    const { ctx, page } = await open('2026-11-29T11:30:00Z', { hash: '#/hari-ini' }); // Minggu 19.30 WITA
    const nowTxt = await page.textContent('.ev.now');
    check('Minggu 19.30: pengingat Baca ulang buku soal salah sedang berjalan', /Baca ulang buku soal salah/.test(nowTxt) && /Buka catatan/.test(nowTxt), nowTxt);
    await go(page, '#/catatan');
    await page.click('[data-act=note-new]');
    await page.selectOption('#n-sub', 'TWK');
    await page.fill('#n-topic', 'Pancasila');
    await page.fill('#n-note', 'Sila ke-3 <img src=x onerror="window.__xss=1"> <script>window.__xss=2</script>');
    await page.click('[data-act=note-save]'); await page.waitForTimeout(150);
    await page.click('[data-act=note-new]');
    await page.selectOption('#n-sub', 'TKP');
    await page.fill('#n-topic', 'Pelayanan publik');
    await page.fill('#n-note', 'Utamakan pelayanan prima.');
    await page.click('[data-act=note-save]'); await page.waitForTimeout(150);
    check('dua catatan tersimpan', (await page.locator('.note-card').count()) === 2);
    check('XSS: HTML ditampilkan sebagai teks, tidak dieksekusi', (await page.evaluate(() => window.__xss)) === undefined && /<img src=x/.test(await page.textContent('.note-card:has-text("Sila") .ntext')) && (await page.locator('.note-card img').count()) === 0);
    await page.click('[data-notesub=TKP]');
    check('filter subtes TKP menyisakan 1 catatan', (await page.locator('.note-card').count()) === 1);
    await page.click('[data-notesub=Semua]');
    await page.selectOption('[data-topicsel]', 'Pancasila');
    check('filter topik Pancasila menyisakan 1 catatan', (await page.locator('.note-card').count()) === 1 && /TWK/.test(await page.textContent('.note-card')));
    await page.click('[data-read]');
    check('tombol sudah dibaca ulang mencatat 1×', /Dibaca ulang 1×/.test(await page.textContent('.note-card')));
    await page.reload(); await page.waitForSelector('#view h1');
    check('catatan tetap ada setelah reload', (await (await stateOf(page)).wrong.length) === 2);
    await go(page, '#/catatan');
    await page.click('[data-note]'); await page.fill('#n-note', 'Diubah'); await page.click('[data-act=note-save]'); await page.waitForTimeout(150);
    check('ubah catatan', /Diubah/.test(await page.textContent('#view')));
    await page.click('[data-note]'); await page.click('[data-act=note-del]'); await page.click('#confirm [value=ok]'); await page.waitForTimeout(100);
    check('hapus catatan dengan konfirmasi', (await stateOf(page)).wrong.length === 1);
    // XSS lewat nama paket dan impor
    await go(page, '#/skor'); await page.click('[data-open=T001]'); await page.fill('#f-name', '"><img src=x onerror=window.__xss=3>');
    await closeSheet(page);
    check('XSS lewat nama paket tidak dieksekusi', (await page.evaluate(() => window.__xss)) === undefined && (await page.locator('#view img').count()) === 0);
    await ctx.close();
  }

  // ---------------------------------------------------------------- K13 pengaturan
  console.log('K13 pengaturan: SKD, ambang, tema');
  {
    const { ctx, page } = await open('2026-11-24T11:30:00Z', { hash: '#/pengaturan' });
    await page.fill('#skd', '2027-02-15'); await page.dispatchEvent('#skd', 'change');
    await go(page, '#/hari-ini');
    check('ubah tanggal SKD ke 15 Feb: hitung mundur H-83', /H-83/.test(await page.textContent('.card')));
    await go(page, '#/pengaturan');
    await page.fill('#skd', '2027-01-20'); await page.dispatchEvent('#skd', 'change');
    await go(page, '#/hari-ini');
    check('SKD sebelum tryout terakhir memunculkan peringatan', /lebih awal dari tryout terakhir/.test(await page.textContent('#view')));
    await go(page, '#/pengaturan');
    await page.fill('#thr-twk', '50'); await page.dispatchEvent('#thr-twk', 'change');
    await page.fill('#thr-tiu', '999'); await page.dispatchEvent('#thr-tiu', 'change');
    check('ambang tidak valid dikembalikan ke nilai lama (80)', (await page.inputValue('#thr-tiu')) === '80');
    await page.click('[data-theme=dark]');
    check('mode gelap menerapkan data-theme', (await page.getAttribute('html', 'data-theme')) === 'dark');
    const bgDark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.click('[data-theme=light]');
    const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check('warna latar berbeda antara gelap dan terang', bgDark !== bgLight, [bgDark, bgLight]);
    await page.click('[data-theme=dark]');
    await page.reload(); await page.waitForSelector('#view h1');
    const st = await stateOf(page);
    check('pengaturan bertahan setelah reload', st.settings.skdDate === '2027-01-20' && st.settings.thr.twk === 50 && st.settings.theme === 'dark' && (await page.getAttribute('html', 'data-theme')) === 'dark', st.settings);
    await go(page, '#/hari-ini'); await shot(page, '09-hari-ini-gelap-375');
    await ctx.close();
  }

  // ---------------------------------------------------------------- Navigasi 2 tab
  console.log('Navigasi sederhana: 2 tab + ikon pengaturan');
  {
    const { ctx, page } = await open('2026-11-29T11:30:00Z', { hash: '#/hari-ini' }); // alias lama, Minggu 19.30
    const h1 = async () => { await page.waitForTimeout(120); return page.textContent('#view h1'); };
    const cur = async () => { await page.waitForTimeout(40); return page.$$eval('nav a[aria-current=page]', a => a.map(x => x.textContent.trim()).join()); };
    check('alamat lama #/hari-ini membuka tab Tryout', (await h1()) === 'Tryout' && (await cur()) === 'Tryout');
    check('tab Tryout memuat timeline hari ini, progres, dan 16 minggu dengan 120 baris tryout', (await page.locator('.timeline .ev').count()) > 1 && (await page.locator('details.week[data-w]').count()) === 16 && (await page.locator('li.item').count()) === 120 && (await page.locator('[role=progressbar]').count()) > 10);
    check('hanya 2 tautan di navigasi bawah', (await page.locator('nav.bottom a').count()) === 2);
    await page.click('nav a[href="#/rekap"]');
    check('tab Rekap aktif: grafik skor', (await h1()) === 'Rekap' && (await cur()) === 'Rekap' && (await page.locator('[data-series]').count()) === 4);
    await page.click('[data-tab=salah]');
    check('Rekap > Soal salah: tombol tambah catatan dan filter subtes', (await page.locator('[data-act=note-new]').count()) === 1 && (await page.locator('[data-notesub]').count()) === 4);
    await page.click('a.gear');
    check('ikon gerigi di pojok kanan atas membuka Pengaturan, tanpa tab aktif', (await h1()) === 'Pengaturan' && (await cur()) === '' && (await page.locator('#skd').count()) === 1);
    await page.click('a.gear:has-text("Kembali")');
    check('tombol Kembali ke Tryout', (await h1()) === 'Tryout');
    const g = await page.$eval('a.gear', e => { const r = e.getBoundingClientRect(); return [Math.round(r.right), innerWidth, Math.round(r.top)]; });
    check('gerigi berada di pojok kanan atas', g[0] >= g[1] - 24 && g[2] < 40, g);
    await page.locator('.ev.now [data-act=goto-notes]').click();
    check('pengingat Minggu 19.30: tombol Buka catatan langsung ke Rekap > Soal salah', (await h1()) === 'Rekap' && (await page.locator('[data-act=note-new]').count()) === 1);
    await page.evaluate(() => { location.hash = '#/catatan'; }); await page.waitForTimeout(80);
    check('alamat lama #/catatan membuka Rekap', (await h1()) === 'Rekap');
    await ctx.close();
  }

  // ---------------------------------------------------------------- Tema GitHub, warna solid
  console.log('Tema warna gaya GitHub (solid, tanpa transparansi)');
  {
    const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
    check('CSS tanpa rgba/hsla, opacity, gradient, blur, backdrop-filter', !/rgba\(|hsla\(|opacity|gradient|blur|backdrop-filter|#[0-9a-fA-F]{8}\b/.test(css));
    const { ctx, page } = await open('2026-11-24T11:30:00Z', { hash: '#/pengaturan' });
    const col = async () => page.evaluate(() => { const g = (el, p) => getComputedStyle(el)[p]; const b = document.body, c = document.querySelector('.card'); return { bg: g(b, 'backgroundColor'), card: g(c, 'backgroundColor'), line: g(c, 'borderTopColor'), text: g(b, 'color'), meta: [...document.querySelectorAll('meta[name=theme-color]')].map(m => m.content) }; });
    await page.click('[data-theme=dark]');
    const d = await col();
    check('gelap: latar #0d1117, kartu #161b22, border #30363d, teks #e6edf3', d.bg === 'rgb(13, 17, 23)' && d.card === 'rgb(22, 27, 34)' && d.line === 'rgb(48, 54, 61)' && d.text === 'rgb(230, 237, 243)', d);
    check('gelap: meta theme-color #0d1117', d.meta.every(x => x === '#0d1117'), d.meta);
    await page.click('[data-theme=light]');
    const l = await col();
    check('terang: latar #ffffff, kartu #f6f8fa, border #d0d7de, teks #1f2328', l.bg === 'rgb(255, 255, 255)' && l.card === 'rgb(246, 248, 250)' && l.line === 'rgb(208, 215, 222)' && l.text === 'rgb(31, 35, 40)', l);
    check('terang: meta theme-color #ffffff', l.meta.every(x => x === '#ffffff'), l.meta);
    const man = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
    check('manifest theme_color dan background_color #0d1117', man.theme_color === '#0d1117' && man.background_color === '#0d1117', man);
    await page.click('[data-theme=dark]');
    const alpha = await page.evaluate(() => { const bad = []; document.querySelectorAll('*').forEach(el => { const cs = getComputedStyle(el); ['color', 'backgroundColor', 'borderTopColor', 'outlineColor'].forEach(p => { if (/rgba|\/ ?0?\.\d/.test(cs[p]) && cs[p] !== 'rgba(0, 0, 0, 0)') bad.push(el.tagName + '.' + p + '=' + cs[p]); }); if (parseFloat(cs.opacity) < 1) bad.push(el.tagName + '.opacity'); if (cs.backdropFilter && cs.backdropFilter !== 'none') bad.push('backdrop'); if (/gradient/.test(cs.backgroundImage)) bad.push('gradient'); }); return bad.slice(0, 5); });
    check('semua elemen: warna solid, opacity 1, tanpa gradien (dibaca dari computed style; latar tanpa warna bawaan dikecualikan)', alpha.length === 0, alpha);
    await page.emulateMedia({ colorScheme: 'dark' }); await page.click('[data-theme=auto]'); await page.waitForTimeout(80);
    check('otomatis mengikuti sistem gelap', (await col()).bg === 'rgb(13, 17, 23)');
    await page.emulateMedia({ colorScheme: 'light' }); await page.waitForTimeout(80);
    check('otomatis mengikuti sistem terang', (await col()).bg === 'rgb(255, 255, 255)');
    await ctx.close();
  }

  {
    const g = await open('2026-12-12T02:00:00Z', { seed: true, ctx: { colorScheme: 'dark' } });
    await shot(g.page, '13-gelap-tryout-375');
    await go(g.page, '#/tryout'); await toWeeks(g.page); await g.page.waitForTimeout(100); await shot(g.page, '14-gelap-minggu-375');
    await go(g.page, '#/rekap'); await shot(g.page, '15-gelap-tren-375');
    await go(g.page, '#/catatan'); await shot(g.page, '16-gelap-soal-salah-375');
    await g.ctx.close();
  }

  // ---------------------------------------------------------------- Palet solid di semua halaman dan dialog
  console.log('Warna polos di semua halaman dan dialog (gelap dan terang)');
  for (const scheme of ['dark', 'light']) {
    const { ctx, page } = await open('2026-12-12T02:00:00Z', { seed: true, ctx: { colorScheme: scheme } });
    const audit = () => page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const hex = n => { const h = root.getPropertyValue(n).trim(); const v = parseInt(h.slice(1), 16); return 'rgb(' + (v >> 16) + ', ' + (v >> 8 & 255) + ', ' + (v & 255) + ')'; };
      const allowedBg = ['--bg', '--surface', '--surface2', '--text', '--accent', '--primary', '--ok', '--bad', '--warn', '--backdrop', '--toast-bg'].map(hex).concat(['rgba(0, 0, 0, 0)']);
      const bad = [];
      const alphaRe = /rgba\((?!0, 0, 0, 0\))|\/ ?0?\.\d|color\(|hsla/;
      document.querySelectorAll('body *').forEach(el => {
        for (const pe of [null, '::before', '::after']) {
          const cs = getComputedStyle(el, pe);
          if (pe && cs.content === 'none') continue;
          const nm = el.tagName + (el.className && el.className.baseVal === undefined ? '.' + String(el.className).split(' ')[0] : '') + (pe || '');
          if (!pe && !(el instanceof SVGElement) && !allowedBg.includes(cs.backgroundColor)) bad.push('latar ' + nm + ' ' + cs.backgroundColor);
          ['color', 'borderTopColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke'].forEach(p => { if (cs[p] && alphaRe.test(cs[p])) bad.push(p + ' ' + nm + ' ' + cs[p]); });
          if (parseFloat(cs.opacity) < 1) bad.push('opacity ' + nm + ' ' + cs.opacity);
          if (cs.boxShadow !== 'none') bad.push('shadow ' + nm + ' ' + cs.boxShadow);
          if (cs.backdropFilter && cs.backdropFilter !== 'none') bad.push('backdrop-filter ' + nm);
          if (cs.filter && cs.filter !== 'none') bad.push('filter ' + nm);
          if (/gradient/.test(cs.backgroundImage)) bad.push('gradient ' + nm);
        }
      });
      for (const id of ['sheet', 'confirm']) { const b = getComputedStyle(document.getElementById(id), '::backdrop').backgroundColor; if (b !== hex('--backdrop')) bad.push('::backdrop ' + id + ' ' + b); }
      return bad.slice(0, 8);
    });
    for (const h of ['#/tryout', '#/rekap', '#/rekap-salah', '#/pengaturan']) {
      await go(page, h);
      const bad = await audit();
      check(scheme + ' ' + h + ': hanya warna solid dari palet (latar, teks, garis, bayangan, opacity, gradien)', bad.length === 0, bad);
    }
    await go(page, '#/hari-ini');
    const warnBg = await page.evaluate(() => [getComputedStyle(document.querySelector('.warn')).backgroundColor, getComputedStyle(document.querySelector('.now-card')).backgroundColor, getComputedStyle(document.body).backgroundColor, getComputedStyle(document.querySelector('.card')).backgroundColor]);
    check(scheme + ': peringatan dan kartu "sedang berjalan" memakai warna permukaan netral (bukan tint merah/kuning/biru)', warnBg[0] === warnBg[3] && warnBg[1] === warnBg[3] && warnBg[0] !== warnBg[2], warnBg);
    await page.click('.warn [data-open]'); await page.waitForTimeout(100);
    const bs = await audit();
    check(scheme + ': dialog detail tryout polos, termasuk ::backdrop', bs.length === 0, bs);
    await closeSheet(page);
    await go(page, '#/pengaturan'); await page.click('[data-act=reset]'); await page.waitForTimeout(100);
    const bc = await audit();
    check(scheme + ': dialog konfirmasi polos, termasuk ::backdrop', bc.length === 0, bc);
    await shot(page, '17-dialog-konfirmasi-' + scheme + '-375');
    await ctx.close();
  }

  // ---------------------------------------------------------------- K16 layout 375 px
  console.log('K16 layout 375 px');
  {
    const { ctx, page } = await open('2026-12-12T02:00:00Z', { seed: true });
    for (const h of ['#/tryout', '#/rekap', '#/rekap-salah', '#/pengaturan']) {
      await go(page, h);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, tgt: [].slice.call(document.querySelectorAll('button, a.btn, a.gear, nav a, select, input:not([type=checkbox]):not([type=file]), summary, label.btn, .chk')).filter(e => e.offsetParent !== null || e.tagName === 'A').map(e => { const r = e.getBoundingClientRect(); return { t: e.tagName + (e.className ? '.' + String(e.className).split(' ')[0] : ''), h: Math.round(r.height), w: Math.round(r.width) }; }).filter(x => x.h < 44 || x.w < 40) }));
      check(h + ': tanpa scroll horizontal', m.sw <= m.iw, [m.sw, m.iw]);
      check(h + ': semua tombol/input minimal 44 px tinggi', m.tgt.length === 0, m.tgt.slice(0, 6));
    }
    const nav = await page.$$eval('nav.bottom a', a => a.map(x => x.textContent.trim()));
    check('navigasi bawah hanya 2 tab: Tryout dan Rekap', nav.join() === 'Tryout,Rekap', nav);
    await go(page, '#/skor'); await page.click('[data-open=T025]');
    await page.waitForTimeout(100); await shot(page, '10-sheet-tryout-375');
    const sheetBox = await page.evaluate(() => { const s = document.getElementById('sheet'); return { sw: s.scrollWidth, cw: s.clientWidth }; });
    check('sheet detail tanpa scroll horizontal', sheetBox.sw <= sheetBox.cw, sheetBox);
    await closeSheet(page);
    await page.setViewportSize({ width: 320, height: 640 });
    for (const h of ['#/tryout', '#/rekap', '#/rekap-salah', '#/pengaturan']) { await go(page, h); const m = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); check('320 px ' + h + ': tanpa scroll horizontal', m[0] <= m[1], m); }
    await ctx.close();
    const d = await open('2026-12-12T02:00:00Z', { seed: true, ctx: { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 } });
    await shot(d.page, '11-hari-ini-desktop-1280'); await d.ctx.close();
  }

  // ---------------------------------------------------------------- K18 notifikasi
  console.log('K18 notifikasi (izin diberikan dan ditolak)');
  {
    const a = await open('2026-11-24T10:56:00Z', { grant: true, notifSpy: true, hash: '#/pengaturan' }); // 18.56 WITA, TO 19.00, ingatkan 5 menit sebelum
    await a.page.click('[data-act=notif-toggle]'); await a.page.waitForTimeout(200);
    check('izin diberikan: pengingat aktif', (await stateOf(a.page)).settings.notify === true);
    await a.page.clock.runFor(11000);
    await a.page.waitForTimeout(200);
    const n = await a.page.evaluate(() => window.__notifs);
    check('notifikasi muncul 5 menit sebelum Tryout malam 19.00', n.length === 1 && /Tryout malam · 19\.00/.test(n[0].t) && /5 menit/.test(n[0].b), n);
    await a.page.clock.runFor(20000);
    check('tidak dikirim dobel', (await a.page.evaluate(() => window.__notifs.length)) === 1);
    await a.ctx.close();
    const b = await open('2026-11-24T10:56:00Z', { hash: '#/pengaturan' });
    await b.page.click('[data-act=notif-toggle]'); await b.page.waitForTimeout(300);
    const stb = (await stateOf(b.page)) || { settings: { notify: false } };
    check('izin ditolak/tidak ada: pengingat tetap nonaktif, aplikasi tetap berfungsi', stb.settings.notify === false && /tetap berfungsi/.test((await b.page.textContent('#toast')) + (await b.page.textContent('#notif-status'))));
    await go(b.page, '#/hari-ini');
    check('Hari Ini tetap tampil tanpa notifikasi', (await b.page.locator('.timeline .ev').count()) === 6);
    await b.ctx.close();
  }

  // ---------------------------------------------------------------- Data rusak
  console.log('Ketahanan: localStorage rusak');
  {
    const { ctx, page, errors } = await open('2026-11-24T11:30:00Z', { rawStorage: '{rusak!!' });
    check('data rusak: aplikasi tetap jalan dengan data baru dan cadangan disimpan', (await page.locator('.timeline .ev').count()) === 6 && (await page.evaluate(() => localStorage.getItem('tryoutSkd.v1.rusak'))) === '{rusak!!', errors);
    await ctx.close();
  }

  // ---------------------------------------------------------------- K17 PWA offline
  console.log('K17 PWA: manifest, service worker, offline');
  {
    const { ctx, page } = await open('2026-11-24T11:30:00Z');
    const man = await page.evaluate(async () => { const r = await fetch(document.querySelector('link[rel=manifest]').href); return r.json(); });
    check('manifest valid: standalone, ikon 192/512/maskable, start_url relatif', man.display === 'standalone' && man.start_url === './' && man.icons.some(i => i.sizes === '192x192') && man.icons.some(i => i.sizes === '512x512') && man.icons.some(i => i.purpose === 'maskable') && man.lang === 'id', man);
    for (const i of man.icons) { const st = await page.evaluate(async u => (await fetch(u)).status, new URL(i.src, base + 'manifest.webmanifest').href); check('ikon ' + i.src + ' dapat dimuat', st === 200); }
    const swState = await page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; return { scope: reg.scope, active: !!reg.active }; });
    check('service worker aktif dengan scope akar situs', swState.active && swState.scope === base, swState);
    await page.reload(); await page.waitForSelector('#view h1');
    check('halaman dikendalikan service worker setelah muat ulang', await page.evaluate(() => !!navigator.serviceWorker.controller));
    const cached = await page.evaluate(async () => (await (await caches.open('tryout-skd-v4')).keys()).map(r => new URL(r.url).pathname));
    check('cangkang aplikasi ter-cache', ['/index.html', '/app.js', '/schedule.js', '/styles.css', '/manifest.webmanifest', '/icons/icon-192.png'].every(p => cached.includes(p)), cached);
    await page.check('[data-done=T001]');
    await ctx.setOffline(true);
    await page.reload(); await page.waitForSelector('#view h1', { timeout: 8000 });
    check('OFFLINE: halaman tetap termuat setelah reload', (await page.locator('.timeline .ev').count()) === 6);
    check('OFFLINE: data lokal tetap ada (1/120)', /1\/120/.test(await page.textContent('.card')));
    await go(page, '#/kalender');
    check('OFFLINE: kalender 16 minggu tampil', (await page.locator('details.week[data-w]').count()) === 16);
    await go(page, '#/catatan'); await page.click('[data-act=note-new]'); await page.fill('#n-topic', 'Offline'); await page.fill('#n-note', 'Catatan saat offline'); await page.click('[data-act=note-save]');
    check('OFFLINE: menambah catatan berfungsi', (await stateOf(page)).wrong.length === 1);
    const navOffline = await page.evaluate(async () => { const r = await fetch('./index.html'); return r.status; });
    check('OFFLINE: berkas aplikasi dilayani dari cache', navOffline === 200);
    await go(page, '#/pengaturan');
    check('status offline di Pengaturan: siap', /siap/.test(await page.textContent('#offline-status')));
    await shot(page, '12-offline-pengaturan-375');
    await ctx.setOffline(false);
    await ctx.close();
  }

  // ---------------------------------------------------------------- K19 subpath GitHub Pages
  console.log('K19 subpath (GitHub Pages: /nama-repo/)');
  {
    const sub = await startServer('/tryout-skd-repo/');
    const b2 = 'http://127.0.0.1:' + sub.port + '/tryout-skd-repo/';
    const { ctx, page, errors } = await open('2026-11-24T11:30:00Z', { base: b2 });
    const bad = [];
    page.on('response', r => { if (r.status() >= 400) bad.push(r.url()); });
    await page.reload(); await page.waitForSelector('#view h1');
    const sw = await page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; return reg.scope; });
    check('service worker ter-scope di subpath', sw === b2, sw);
    check('tidak ada permintaan 404 di subpath', bad.length === 0 && !sub.seen.some(s => !s.url.startsWith('/tryout-skd-repo/')), [bad, sub.seen.filter(s => !s.url.startsWith('/tryout-skd-repo/'))]);
    await ctx.setOffline(true); await page.reload(); await page.waitForSelector('#view h1', { timeout: 8000 });
    check('offline di subpath berfungsi', (await page.locator('.timeline .ev').count()) === 6);
    await ctx.setOffline(false);
    check('tanpa galat konsol di subpath', errors.length === 0, errors);
    await ctx.close(); sub.srv.close();
  }

  await browser.close(); srv.close();
  console.log('\n' + pass + ' pemeriksaan lulus, ' + fail + ' gagal');
})().catch(e => { console.error(e); process.exit(2); });
