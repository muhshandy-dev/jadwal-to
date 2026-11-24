# Jadwal Tryout SKD

Aplikasi web statis (HTML, CSS, JavaScript murni) untuk mengatur 120 tryout SKD CPNS.
**Jadwal (revisi 24 November 2026):** mulai Selasa 24 November 2026, **12 tryout per minggu**: Senin–Kamis 2 per hari (siang 13.15 dan malam 19.00), Jumat 1 (malam 19.00), Sabtu 2 (siang dan malam), Minggu 1 (siang 13.15).
Hasilnya 120 tryout selesai **Senin 1 Februari 2027** (11 minggu: 10 tryout di minggu 1, 12 per minggu di minggu 2–10, 2 di minggu 11), sebelum SKD bawaan 8 Februari 2027.
Minggu malam 19.30 tetap ada pengingat baca ulang buku soal salah. Jumat siang dikosongkan untuk Jumatan. Jumat 25 Des (Natal) dan 1 Jan (Tahun Baru) tetap punya 1 tryout malam; aplikasi memberi peringatan dan Anda bisa menggesernya ke hari lain di minggu itu.
Setelah 1 Februari tidak ada tryout lagi: 6 hari tenang sebelum SKD (baca ulang buku soal salah dan jaga tidur). Bila tanggal SKD resmi lebih awal, aplikasi menampilkan peringatan sampai Anda mengubah tanggal SKD di Pengaturan. Mobile-first, bisa dipasang di layar utama (PWA) dan jalan offline.
Tanpa backend, tanpa login. Semua data disimpan di `localStorage` perangkat; cadangan lewat Ekspor/Impor JSON.

Zona waktu tetap WITA (Asia/Makassar, UTC+8), apa pun zona waktu perangkat.

## Fitur

Navigasi sederhana: **2 tab** di bawah (Tryout, Rekap) dan ikon gerigi di pojok kanan atas untuk Pengaturan.

- **Tab Tryout** (satu halaman): ringkasan (H-minus SKD, progres x/120 dan per minggu), peringatan ringkas, kegiatan hari ini (timeline, sorotan kegiatan berjalan, hitung mundur), lalu 11 minggu yang bisa dibuka. Tiap minggu berisi tryout-nya dengan kotak centang selesai; ketuk untuk mengisi nama paket, skor TWK/TIU/TKP (total otomatis, lulus/belum per subtes), status pembahasan, dan menggeser tryout ke hari lain di minggu yang sama (Natal Jumat 25 Des 2026 dan Tahun Baru Jumat 1 Jan 2027 sudah ditandai libur).
- **Tab Rekap**: *Skor* (grafik tren TWK/TIU/TKP/total dengan garis ambang, rata-rata per minggu, peringatan skor mentok) dan *Soal salah* (buku soal salah per subtes dan topik, filter, penanda sudah dibaca ulang; pengingat Minggu 19.30).
- **Pengaturan** (ikon gerigi): tanggal SKD (default 8 Feb 2027), ambang lulus (default TWK 65, TIU 80, TKP 166), tema gaya GitHub (gelap #0d1117, terang #ffffff, atau otomatis mengikuti sistem; semua warna solid tanpa transparansi), notifikasi, ekspor/impor, reset dengan konfirmasi, dan 7 aturan tetap.
- Alamat lama (`#/hari-ini`, `#/kalender`, `#/skor`, `#/catatan`) masih diarahkan ke tab yang sesuai.

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

- **Geser** hanya ke hari lain di minggu yang sama, supaya jumlah tryout tiap minggu tetap dan total tetap 120. Tryout dianggap *terlewat* bila belum selesai dan tanggalnya sudah lewat (WITA); peringatannya hilang bila digeser ke hari ini atau sesudahnya, atau ditandai selesai.
- Tryout yang digeser ke hari lain mengisi slot jadwal harian yang kosong; bila sudah penuh, dipakai slot tambahan (09.30 dan 16.00 di semua hari; Jumat juga siang 13.15). Anda juga bisa mengisi "Jam mulai". Jam yang bentrok ditandai.
- **Total** dihitung bila ketiga skor terisi. Skor valid: TWK 0–150, TIU 0–175, TKP 0–225 (bilangan bulat). Mengisi skor otomatis menandai tryout selesai.
- **Skor mentok**: rata-rata mingguan TWK atau TKP, tiga minggu berurutan, minimal 3 tryout bernilai per minggu, tidak naik dua kali berturut-turut (sama atau turun).
- **Paket dobel**: nama dianggap sama bila huruf besar/kecil, spasi, dan tanda baca diabaikan.
- Jika tanggal SKD diubah lebih awal dari tryout terakhir (1 Februari 2027), aplikasi memberi peringatan (jumlah tryout yang jatuh pada/setelah hari SKD) tetapi **tidak** mengurangi total otomatis.
- **Notifikasi** bersifat opsional dan hanya muncul selama aplikasi terbuka atau masih hidup di latar belakang (tanpa server push, peramban tidak bisa membangunkan aplikasi yang tertutup). Tanpa izin notifikasi semua fitur lain tetap jalan.

## Pengujian

```bash
node tests/logic.test.js                          # 39 tes logika, tanpa dependensi
npm i -D playwright && node tests/e2e.test.js     # 130 pemeriksaan browser (Chromium), menulis screenshot ke screenshots/
```

Catatan: versi pertama aplikasi mengikuti PDF "Jadwal Tryout Disiplin" (12 tryout per minggu, Senin–Minggu). Sejak revisi 24 November 2026 jadwal memakai pola di atas (12 tryout per minggu, Senin–Minggu); 7 aturan tetap dari PDF tetap berlaku, kecuali aturan ke-6 yang menyesuaikan.
