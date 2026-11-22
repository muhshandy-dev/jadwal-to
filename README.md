# Jadwal Tryout SKD

Aplikasi web statis (HTML, CSS, JavaScript murni) untuk mengatur 120 tryout SKD CPNS: 12 tryout per minggu, 10 minggu,
Senin 23 November 2026 sampai Minggu 31 Januari 2027. Mobile-first, bisa dipasang di layar utama (PWA) dan jalan offline.
Tanpa backend, tanpa login. Semua data disimpan di `localStorage` perangkat; cadangan lewat Ekspor/Impor JSON.

Zona waktu tetap WITA (Asia/Makassar, UTC+8), apa pun zona waktu perangkat.

## Fitur

- **Hari Ini**: timeline kegiatan, sorotan kegiatan yang sedang berjalan, hitung mundur ke kegiatan berikutnya, progres, H-minus SKD, dan peringatan.
- **Kalender**: 10 minggu, status tiap tryout (selesai, hari ini, terjadwal, terlewat, digeser), catatan Natal/Tahun Baru, 7 aturan tetap.
- **Skor**: checklist per minggu (selesai, nama paket, TWK/TIU/TKP, total otomatis, status pembahasan, lulus/belum per subtes), grafik tren per subtes dan total, rata-rata per minggu, peringatan skor mentok dan paket dobel.
- **Catatan**: buku soal salah per subtes dan topik, filter, penanda sudah dibaca ulang; pengingat Minggu 19.30.
- **Pengaturan**: tanggal SKD (default 8 Feb 2027), ambang lulus (default TWK 65, TIU 80, TKP 166), tema gaya GitHub: gelap (#0d1117), terang (#ffffff), atau otomatis mengikuti sistem; semua warna solid tanpa transparansi, notifikasi, ekspor/impor, reset dengan konfirmasi.
- **Geser tryout**: ke hari lain di minggu yang sama (Natal Jumat 25 Des 2026 dan Tahun Baru Jumat 1 Jan 2027 sudah ditandai libur).

## Struktur berkas

| Berkas | Isi |
|---|---|
| `index.html`, `styles.css`, `app.js` | tampilan dan interaksi |
| `schedule.js` | data jadwal dan semua logika (tanpa DOM, diuji di Node) |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA |
| `tests/` | `logic.test.js` (Node), `e2e.test.js` (Chromium via Playwright), `hasil-uji.txt` |
| `KRITERIA_PENERIMAAN.md`, `BUKTI.md` | kriteria dan bukti pengujian |

## Menjalankan di komputer

Service worker butuh `http://localhost` atau HTTPS (tidak jalan dari `file://`, tapi aplikasinya tetap bisa dibuka tanpa fitur offline).

```bash
python3 -m http.server 8080      # atau: npx serve .
# buka http://localhost:8080
```

## Deploy ke GitHub Pages

Semua path di kode, manifest, dan service worker bersifat **relatif**, jadi aplikasi jalan baik di
`https://USERNAME.github.io/NAMA-REPO/` (subpath) maupun di domain sendiri.

1. Buat repo baru di GitHub bernama `jadwal-to` (kosong, tanpa README). Nama lain juga boleh; path di kode relatif.
2. Dari folder ini:
   ```bash
   git init -b main        # lewati jika memakai bundle, lihat bawah
   git add .
   git commit -m "Aplikasi jadwal tryout SKD"
   git remote add origin https://github.com/muhshandy-dev/jadwal-to.git
   git push -u origin main
   ```
   Jika memakai berkas bundle: `git clone tryout-skd.bundle jadwal-to && cd jadwal-to && git remote set-url origin https://github.com/muhshandy-dev/jadwal-to.git && git push -u origin main`.
3. Di GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save**.
4. Tunggu sekitar 1 menit, buka `https://muhshandy-dev.github.io/jadwal-to/`.
5. Di HP: buka alamat itu **sekali dengan internet**, lalu pasang:
   - Android (Chrome): menu ⋮ → **Tambahkan ke Layar Utama** (atau tombol **Pasang aplikasi** di Pengaturan).
   - iPhone (Safari): **Bagikan → Tambah ke Layar Utama**.
6. Cek mode offline: Pengaturan → bagian "Pasang di layar utama" harus menulis "Mode offline: siap". Setelah itu mode pesawat pun aplikasi tetap terbuka.

File `.nojekyll` sudah disertakan supaya GitHub Pages tidak memproses berkas lewat Jekyll.

### Memperbarui aplikasi

Service worker memakai strategi *stale-while-revalidate*: setelah Anda push perubahan, versi baru dimuat di latar belakang dan tampil
pada pembukaan berikutnya (kadang perlu dua kali buka). Jika mengubah daftar berkas di `sw.js`, naikkan `VERSION` di baris pertama.

## Data dan cadangan

- Data hanya ada di peramban perangkat itu. Menghapus data situs atau menghapus aplikasi dari layar utama (pada beberapa peramban) bisa menghapusnya.
- **Ekspor** (Pengaturan) menghasilkan `tryout-skd-cadangan-TANGGAL.json`. **Impor** mengganti seluruh data dengan isi berkas (ada konfirmasi) dan
  menolak berkas rusak, bukan cadangan Tryout SKD, atau versi tak dikenal. Isi berkas dibersihkan: skor di luar batas, tanggal di luar minggunya, dan ID asing dibuang.
- Lakukan ekspor berkala, terutama sebelum mengganti HP.

## Aturan perilaku yang perlu diketahui

- **Geser** hanya ke hari lain di minggu yang sama, supaya tiap minggu tetap 12 dan total tetap 120. Tryout dianggap *terlewat* bila belum selesai dan tanggalnya sudah lewat (WITA); peringatannya hilang bila digeser ke hari ini atau sesudahnya, atau ditandai selesai.
- Tryout yang digeser ke hari lain mengisi slot jadwal harian yang kosong; bila sudah penuh, dipakai slot tambahan (Senin–Kamis 16.30, 14.00, 11.30; Jumat 16.00, 13.30, 11.00; Sabtu 19.00; Minggu 13.15 dan 16.00). Anda juga bisa mengisi "Jam mulai". Jam yang bentrok ditandai.
- **Total** dihitung bila ketiga skor terisi. Skor valid: TWK 0–150, TIU 0–175, TKP 0–225 (bilangan bulat). Mengisi skor otomatis menandai tryout selesai.
- **Skor mentok**: rata-rata mingguan TWK atau TKP, tiga minggu berurutan, minimal 3 tryout bernilai per minggu, tidak naik dua kali berturut-turut (sama atau turun).
- **Paket dobel**: nama dianggap sama bila huruf besar/kecil, spasi, dan tanda baca diabaikan.
- Jika tanggal SKD diubah lebih awal dari 31 Januari, aplikasi memberi peringatan (jumlah tryout yang jatuh pada/setelah hari SKD) tetapi **tidak** mengurangi total otomatis.
- **Notifikasi** bersifat opsional dan hanya muncul selama aplikasi terbuka atau masih hidup di latar belakang (tanpa server push, peramban tidak bisa membangunkan aplikasi yang tertutup). Tanpa izin notifikasi semua fitur lain tetap jalan.

## Pengujian

```bash
node tests/logic.test.js                          # 32 tes logika, tanpa dependensi
npm i -D playwright && node tests/e2e.test.js     # 107 pemeriksaan browser (Chromium), menulis screenshot ke screenshots/
```

Jadwal sudah dicocokkan dengan PDF "Jadwal Tryout Disiplin": templat harian, jumlah per hari, rentang tanggal tiap minggu, catatan Natal/Tahun Baru, dan 7 aturan tetap sama.
