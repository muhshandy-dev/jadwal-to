# Bukti pengujian

Hasil mentah: `tests/hasil-uji.txt` (32 tes logika + 107 pemeriksaan browser, 0 gagal). Screenshot di `screenshots/`.
Browser uji: Chromium (Playwright 1.63), viewport 375×812 (juga 320 dan 1280), zona waktu peramban sengaja `America/Los_Angeles`, jam palsu untuk skenario waktu.

| # | Kriteria | Bukti |
|---|---|---|
| K1 | 120 tryout, 12 per minggu, periode 23 Nov 2026 – 31 Jan 2027 | `logic.test.js`: total 120 dan ID unik; 10 minggu × 12; tiap minggu mulai sama dengan tabel kalender PDF |
| K2 | Templat harian | `logic.test.js`: jam persis Senin–Kamis, Jumat, Sabtu, Minggu (termasuk baca ulang 19.30–20.00) |
| K3 | Geser Natal dan Tahun Baru | `logic.test.js`: 25 Des dan 1 Jan Jumat dengan 2 TO; geser ke minggu lain ditolak; 2000 geseran acak tidak pernah mengubah 120 atau 12/minggu. `e2e`: geser lewat UI, hanya 7 opsi hari, total tetap 120, kembalikan ke jadwal awal |
| K4 | Hari Ini | `e2e`: 19.30 WITA (peramban di Los Angeles) → "Tryout 19.00–20.40" disorot, hitung mundur 01:20:00 berkurang tiap detik, setelah 81 menit sorotan pindah ke Pembahasan. Screenshot 01 |
| K5 | Checklist dan skor | `e2e`: centang selesai, nama paket, skor 70/80/170 → total 320; batas skor ditolak |
| K6 | Ambang | `e2e`: TIU 79 ✗ lalu 80 ✓; ambang bisa diubah di Pengaturan dan nilai tak valid ditolak |
| K7 | Progres dan SKD | `e2e`: 0/120 dan H-77; ubah SKD → H-84; `logic`: x/12 per minggu |
| K8 | Terlewat | `logic` dan `e2e`: peringatan muncul untuk tryout lewat tanggal; hilang bila digeser ke depan |
| K9 | Paket dobel | `logic` (huruf/spasi/tanda baca diabaikan) dan `e2e` (peringatan di sheet dan halaman Skor) |
| K10 | Tren dan skor mentok | `e2e`: data contoh 3 minggu → grafik SVG dengan garis ambang, tabel rata-rata, peringatan mentok TWK dan tidak untuk TKP yang naik. Screenshot 04, 05. `logic`: aturan mentok termasuk kasus batas |
| K11 | Buku soal salah | `e2e`: tambah, ubah, hapus, filter subtes dan topik, penanda dibaca ulang, persisten; Minggu 19.30 kegiatan "Baca ulang buku soal salah" aktif. Screenshot 06 |
| K12 | Kalender | Screenshot 02; `e2e`: 10 minggu, libur Natal dan tanda ↔ pada yang digeser |
| K13 | Pengaturan | `e2e`: SKD, ambang, tema gelap/terang (warna latar berubah), reset batal dan reset terkonfirmasi. Screenshot 07, 08, 09 |
| K14 | Persistensi | `e2e`: reload → skor, nama, status pembahasan, pengaturan, catatan tetap ada |
| K15 | Ekspor/impor | `e2e`: unduhan `tryout-skd-cadangan-2026-12-12.json` valid dan sama dengan localStorage; berkas rusak dan asing ditolak tanpa mengubah data; reset lalu impor memulihkan data persis. `logic`: round-trip dan pembersihan data berbahaya |
| K16 | 375 px | `e2e`: 5 halaman tanpa scroll horizontal di 375 dan 320 px; semua tombol, tautan, select, input ≥ 44 px; navigasi bawah 5 tab. Screenshot 01–10 |
| K17 | PWA offline | `e2e`: manifest valid, ikon 200, SW aktif dan mengendalikan halaman, cangkang ter-cache; `setOffline(true)` lalu reload → aplikasi termuat, data ada, kalender, tambah catatan jalan. Screenshot 12 |
| K18 | Notifikasi | `e2e`: dengan izin (disimulasikan) tepat 5 menit sebelum Tryout 19.00 muncul satu kali; tanpa izin pengingat tetap mati dan aplikasi berfungsi |
| K19 | Subpath GitHub Pages | `e2e`: server di `/tryout-skd-repo/` → tidak ada 404, SW ter-scope subpath, offline jalan |
| Tema | Warna gaya GitHub, solid | `e2e`: CSS tanpa rgba/opacity/gradient/blur; computed style gelap = #0d1117/#161b22/#30363d/#e6edf3 dan terang = #ffffff/#f6f8fa/#d0d7de/#1f2328; semua elemen solid (opacity 1, tanpa gradien); meta theme-color dan manifest ikut; mode otomatis mengikuti sistem. Screenshot 13–16 |
| K20 | Escape HTML | `e2e`: `<img onerror>` dan `<script>` di catatan dan nama paket tampil sebagai teks, tidak dieksekusi |

Tambahan: data localStorage rusak (`{rusak!!`) → aplikasi tetap jalan dengan data baru dan salinan rusak disimpan di `tryoutSkd.v1.rusak`; tanpa galat konsol di semua skenario utama.

## Yang belum terbukti (jujur)

- Belum dicoba di HP asli (Android/iPhone) dan belum di Firefox/Safari. Pemasangan "Tambahkan ke Layar Utama" diuji lewat manifest dan service worker di Chromium, bukan lewat dialog pemasangan HP.
- Dialog izin notifikasi asli tidak bisa diuji tanpa kepala; izin disimulasikan, logika penjadwalannya yang terbukti. Notifikasi tidak muncul saat aplikasi tertutup penuh (batas teknis tanpa server).
- Belum di-deploy ke GitHub Pages sungguhan (belum ada repo); yang diuji adalah server lokal di akar dan di subpath `/tryout-skd-repo/`.
