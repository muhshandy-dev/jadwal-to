# Bukti pengujian

**Revisi jadwal 2026-11-23:** mulai Selasa 24 Nov 2026, 2 tryout/hari (siang 13.15, malam 19.00), Senin–Kamis, 120 tryout, selesai Senin 8 Maret 2027. Baris K1–K3 dan K8 di bawah sudah dijalankan ulang untuk jadwal ini (lihat `tests/hasil-uji.txt`).

Hasil mentah: `tests/hasil-uji.txt` (38 tes logika + 128 pemeriksaan browser, 0 gagal). Screenshot di `screenshots/`.
Browser uji: Chromium (Playwright 1.63), viewport 375×812 (juga 320 dan 1280), zona waktu peramban sengaja `America/Los_Angeles`, jam palsu untuk skenario waktu.

| # | Kriteria | Bukti |
|---|---|---|
| K1 | 120 tryout, mulai Selasa 24 Nov 2026, selesai Senin 8 Mar 2027, hanya Sen–Kam, 2 per hari | `logic.test.js`: total 120 dan ID unik; tanggal pertama/terakhir; 60 hari × 2; 16 minggu = 6 + 14×8 + 2; awal tiap minggu; tak ada tryout di Jumat 25 Des dan 1 Jan; 86 tryout sebelum 8 Feb dan 34 sesudahnya |
| K2 | Templat harian | `logic.test.js`: Sen–Kam siang 13.15–14.55 + bahas 15.00–15.45, malam 19.00–20.40 + bahas 20.50–21.50, santai, tidur 23.00; Jumat/Sabtu hanya tidur; Minggu baca ulang 19.30–20.00; Senin 23 Nov (belum mulai) hanya tidur |
| K3 | Geser tryout | `logic.test.js`: ke hari lain di minggu yang sama (termasuk Jumat Natal dan akhir pekan) berhasil, ke minggu lain ditolak; 2000 geseran acak tidak mengubah 120 atau jumlah per minggu; slot tambahan tanpa tabrakan; jam kustom dan bentrok. `e2e`: geser Kamis 24 Des ke Jumat 25 Des lewat UI (hanya 7 opsi hari), peringatan libur, geser lagi, kembalikan, Tahun Baru |
| K4 | Hari Ini | `e2e`: 19.30 WITA (peramban di Los Angeles) → "Tryout 19.00–20.40" disorot, hitung mundur 01:20:00 berkurang tiap detik, setelah 81 menit sorotan pindah ke Pembahasan. Screenshot 01 |
| K5 | Checklist dan skor | `e2e`: centang selesai, nama paket, skor 70/80/170 → total 320; batas skor ditolak |
| K6 | Ambang | `e2e`: TIU 79 ✗ lalu 80 ✓; ambang bisa diubah di Pengaturan dan nilai tak valid ditolak |
| K7 | Progres dan SKD | `e2e`: 0/120 dan H-77; ubah SKD → H-84; `logic`: x/12 per minggu |
| K8 | Terlewat | `logic` dan `e2e`: peringatan muncul untuk tryout lewat tanggal; hilang bila digeser ke depan |
| K9 | Paket dobel | `logic` (huruf/spasi/tanda baca diabaikan) dan `e2e` (peringatan di sheet dan halaman Skor) |
| K10 | Tren dan skor mentok | `e2e`: data contoh 3 minggu → grafik SVG dengan garis ambang, tabel rata-rata, peringatan mentok TWK dan tidak untuk TKP yang naik. Screenshot 04, 05. `logic`: aturan mentok termasuk kasus batas |
| K11 | Buku soal salah | `e2e`: tambah, ubah, hapus, filter subtes dan topik, penanda dibaca ulang, persisten; Minggu 19.30 kegiatan "Baca ulang buku soal salah" aktif. Screenshot 06 |
| K12 | Kalender | Kini bagian tab Tryout (10 minggu, status tiap tryout). Screenshot 02; `e2e`: 10 minggu, 120 baris, catatan Natal dan tanda ↔ pada yang digeser |
| K13 | Pengaturan | `e2e`: SKD, ambang, tema gelap/terang (warna latar berubah), reset batal dan reset terkonfirmasi. Screenshot 07, 08, 09 |
| K14 | Persistensi | `e2e`: reload → skor, nama, status pembahasan, pengaturan, catatan tetap ada |
| K15 | Ekspor/impor | `e2e`: unduhan `tryout-skd-cadangan-2026-12-12.json` valid dan sama dengan localStorage; berkas rusak dan asing ditolak tanpa mengubah data; reset lalu impor memulihkan data persis. `logic`: round-trip dan pembersihan data berbahaya |
| K16 | 375 px | `e2e`: 5 halaman tanpa scroll horizontal di 375 dan 320 px; semua tombol, tautan, select, input ≥ 44 px; navigasi bawah 5 tab. Screenshot 01–10 |
| K17 | PWA offline | `e2e`: manifest valid, ikon 200, SW aktif dan mengendalikan halaman, cangkang ter-cache; `setOffline(true)` lalu reload → aplikasi termuat, data ada, kalender, tambah catatan jalan. Screenshot 12 |
| K18 | Notifikasi | `e2e`: dengan izin (disimulasikan) tepat 5 menit sebelum Tryout 19.00 muncul satu kali; tanpa izin pengingat tetap mati dan aplikasi berfungsi |
| K19 | Subpath GitHub Pages | `e2e`: server di `/tryout-skd-repo/` → tidak ada 404, SW ter-scope subpath, offline jalan |
| Nav | Navigasi disederhanakan jadi 2 tab | `e2e` "Navigasi 2 tab": hanya 2 tautan di navigasi bawah (Tryout, Rekap); tab Tryout memuat timeline hari ini, progres, 10 minggu dan 120 baris tryout; Rekap memuat grafik dan Soal salah; ikon gerigi di pojok kanan atas membuka Pengaturan dan tombol Kembali; tombol "Buka catatan" Minggu 19.30 langsung ke Soal salah; alamat lama diarahkan. Semua tes fitur sebelumnya dijalankan ulang lewat 2 tab. Screenshot 01, 02, 13–16 |
| Tema | Warna gaya GitHub, solid | `e2e`: CSS tanpa rgba/opacity/gradient/blur; computed style gelap = #0d1117/#161b22/#30363d/#e6edf3 dan terang = #ffffff/#f6f8fa/#d0d7de/#1f2328; semua elemen solid (opacity 1, tanpa gradien); meta theme-color dan manifest ikut; mode otomatis mengikuti sistem. Screenshot 13–16. Putaran kedua: latar peringatan, sorotan, chip, dan pil dibuat netral (warna hanya pada garis tepi dan teks); tes memeriksa SEMUA elemen di 5 halaman dan 2 dialog (+ `::backdrop`) pada tema gelap dan terang: latar harus salah satu warna palet, tanpa alpha/opacity/bayangan/filter/gradien. Tes ini terbukti gagal pada CSS versi sebelumnya (tint merah/biru/kuning) dan lulus pada versi sekarang |
| K20 | Escape HTML | `e2e`: `<img onerror>` dan `<script>` di catatan dan nama paket tampil sebagai teks, tidak dieksekusi |

Tambahan: data localStorage rusak (`{rusak!!`) → aplikasi tetap jalan dengan data baru dan salinan rusak disimpan di `tryoutSkd.v1.rusak`; tanpa galat konsol di semua skenario utama.

## Yang belum terbukti (jujur)

- Belum dicoba di HP asli (Android/iPhone) dan belum di Firefox/Safari. Pemasangan "Tambahkan ke Layar Utama" diuji lewat manifest dan service worker di Chromium, bukan lewat dialog pemasangan HP.
- Dialog izin notifikasi asli tidak bisa diuji tanpa kepala; izin disimulasikan, logika penjadwalannya yang terbukti. Notifikasi tidak muncul saat aplikasi tertutup penuh (batas teknis tanpa server).
- Belum di-deploy ke GitHub Pages sungguhan (belum ada repo); yang diuji adalah server lokal di akar dan di subpath `/tryout-skd-repo/`.
