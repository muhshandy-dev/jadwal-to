# Bukti pengujian

**Revisi jadwal 2026-11-25:** mulai Senin 30 Nov 2026 (minggu ini belajar). Hari biasa 15 tryout/minggu (Sen–Kam 2, Jumat 1 malam, Sabtu 3, Minggu 3; sesi siang 13.15, siang 2 16.00, malam 19.00); hari libur (24–27 Des, 1–3 Jan, 5 Jan) 4 tryout dengan tambahan pagi 09.30. Total 151 tryout, 10 minggu (15, 15, 15, 22, 20, 17, 15, 15, 15, 2), selesai Senin 1 Feb 2027; 2–7 Feb tenang sebelum SKD bawaan 8 Feb. Tanggal libur dari laporan berita SKB 3 Menteri (Kemenko PMK/Setneg tidak bisa dibuka dari sesi ini).

Hasil mentah: `tests/hasil-uji.txt` (47 tes logika + 152 pemeriksaan browser, 0 gagal). Screenshot di `screenshots/`.
Browser uji: Chromium (Playwright 1.63), viewport 375×812 (juga 320 dan 1280), zona waktu peramban sengaja `America/Los_Angeles`, jam palsu untuk skenario waktu.

| # | Kriteria | Bukti |
|---|---|---|
| K1 | 151 tryout, mulai Senin 30 Nov 2026, selesai Senin 1 Feb 2027, min. 15 per minggu | `logic.test.js`: total 151, ID unik (T001–T151); tanggal pertama/terakhir; per hari biasa Sen–Kam 2, Jum 1, Sab 3, Min 3 dan 4 pada 8 hari libur (64 hari tryout); 10 minggu = 15, 15, 15, 22, 20, 17, 15, 15, 15, 2; awal tiap minggu; semua sebelum 8 Feb dengan 2–7 Feb tanpa tryout; hari libur 4 sesi (09.30, 13.15, 16.00, 19.00) dengan jeda pembahasan dan tanpa bentrok |
| K2 | Templat harian | `logic.test.js`: Sen–Kam siang 13.15–14.55 + bahas 15.00–15.45, malam 19.00–20.40 + bahas 20.50–21.50, santai, tidur 23.00; Jumat malam 19.00; Sabtu dan Minggu siang 13.15 + siang 2 16.00–17.40 (bahas 17.45–18.30) + malam 19.00; Minggu baca ulang 22.00–22.30; tidak ada tryout sebelum 13.00, tidak ada bentrok, label tanpa "undefined"/"null"/"NaN"; Senin 23 Nov (belum mulai) dan Selasa 2 Feb hanya tidur |
| K3 | Geser tryout | `logic.test.js`: ke hari lain di minggu yang sama (termasuk hari libur Natal dan akhir pekan) berhasil, ke minggu lain ditolak; 2000 geseran acak tidak mengubah 151 atau jumlah per minggu; slot tambahan tanpa tabrakan; jam kustom dan bentrok. `e2e`: geser Kamis 24 Des ke Jumat 25 Des lewat UI (hanya 7 opsi hari), peringatan libur Natal (1 → 2 → 1 → hilang saat digeser keluar), kembalikan, Tahun Baru |
| K4 | Hari Ini | `e2e`: 19.30 WITA (peramban di Los Angeles) → "Tryout 19.00–20.40" disorot, hitung mundur 01:20:00 berkurang tiap detik, setelah 81 menit sorotan pindah ke Pembahasan. Screenshot 01 |
| K5 | Checklist dan skor | `e2e`: centang selesai, nama paket, skor 70/80/170 → total 320; batas skor ditolak |
| K6 | Ambang | `e2e`: TIU 79 ✗ lalu 80 ✓; ambang bisa diubah di Pengaturan dan nilai tak valid ditolak |
| K7 | Progres dan SKD | `e2e`: 0/151 dan H-70; ubah SKD → H-77; `logic`: x/15 per minggu |
| Geser | Jam/sesi baru tampil setelah digeser (perbaikan 2026-11-24: baris daftar hanya menampilkan tanggal) | `logic`: `scheduleMap` (sesi/jam efektif), geser hanya jam, geser ke hari lain, jam kustom, kembalikan; tryout lain tidak ikut pindah sesi. `e2e`: baris daftar "↔ · siang 2 16.00", detail "Jam: …", pesan geser, timeline Hari Ini, pilihan sesi, jam kustom 14.30, kembalikan, geser ke Sabtu malam |
| Libur | Hari libur dipakai (menggantikan peringatan "libur bisa digeser" yang lama) | `logic`: `holidayPending` dihapus; hari libur boleh dikosongkan dengan menggeser. `e2e`: Kamis 24 Des dan Jumat 25 Des masing-masing 4 tryout, minggu 4 = 22 tryout dengan 16 bertanda libur, detail menyebut "Cuti bersama Natal" dan jam pagi 09.30, tidak ada peringatan libur |
| K8 | Terlewat | `logic` dan `e2e`: peringatan muncul untuk tryout lewat tanggal; hilang bila digeser ke depan |
| K9 | Paket dobel | `logic` (huruf/spasi/tanda baca diabaikan) dan `e2e` (peringatan di sheet dan halaman Skor) |
| K10 | Tren dan skor mentok | `e2e`: data contoh 3 minggu → grafik SVG dengan garis ambang, tabel rata-rata, peringatan mentok TWK dan tidak untuk TKP yang naik. Screenshot 04, 05. `logic`: aturan mentok termasuk kasus batas |
| K11 | Catatan pelajaran harian (menggantikan buku soal salah, 2026-11-24) | `logic`: simpan/ubah/kosong=hapus, tanggal tidak valid, batas 1000 huruf, urutan terbaru dulu, cadangan lama berisi `wrong` tetap bisa diimpor tanpa merusak. `e2e`: kartu "Pelajaran hari ini" di tab Tryout, editor satu kolom, simpan kosong ditolak, simpan/ubah/hapus (dengan konfirmasi), persisten setelah reload, jalan offline; Minggu 22.00 "Baca ulang pelajaran minggu ini" dengan tombol ke Rekap > Pelajaran; `#/catatan` membuka tab Pelajaran. Screenshot 06 |
| K12 | Kalender | Kini bagian tab Tryout (10 minggu, status tiap tryout). Screenshot 02; `e2e`: 10 minggu, 151 baris, catatan Natal dan tanda ↔ pada yang digeser |
| K13 | Pengaturan | `e2e`: SKD, ambang, tema gelap/terang (warna latar berubah), reset batal dan reset terkonfirmasi. Screenshot 07, 08, 09 |
| K14 | Persistensi | `e2e`: reload → skor, nama, status pembahasan, pengaturan, catatan tetap ada |
| K15 | Ekspor/impor | `e2e`: unduhan `tryout-skd-cadangan-2026-12-12.json` valid dan sama dengan localStorage; berkas rusak dan asing ditolak tanpa mengubah data; reset lalu impor memulihkan data persis. `logic`: round-trip dan pembersihan data berbahaya |
| K16 | 375 px | `e2e`: 5 halaman tanpa scroll horizontal di 375 dan 320 px; semua tombol, tautan, select, input ≥ 44 px; navigasi bawah 5 tab. Screenshot 01–10 |
| K17 | PWA offline | `e2e`: manifest valid, ikon 200, SW aktif dan mengendalikan halaman, cangkang ter-cache; `setOffline(true)` lalu reload → aplikasi termuat, data ada, kalender, tambah catatan jalan. Screenshot 12 |
| K18 | Notifikasi | `e2e`: dengan izin (disimulasikan) tepat 5 menit sebelum Tryout 19.00 muncul satu kali; tanpa izin pengingat tetap mati dan aplikasi berfungsi |
| K19 | Subpath GitHub Pages | `e2e`: server di `/tryout-skd-repo/` → tidak ada 404, SW ter-scope subpath, offline jalan |
| Nav | Navigasi disederhanakan jadi 2 tab | `e2e` "Navigasi 2 tab": hanya 2 tautan di navigasi bawah (Tryout, Rekap); tab Tryout memuat timeline hari ini, progres, 10 minggu dan 151 baris tryout; Rekap memuat grafik dan Pelajaran; ikon gerigi di pojok kanan atas membuka Pengaturan dan tombol Kembali; tombol "Buka catatan" Minggu 22.00 langsung ke Soal salah; alamat lama diarahkan. Semua tes fitur sebelumnya dijalankan ulang lewat 2 tab. Screenshot 01, 02, 13–16 |
| Tema | Warna gaya GitHub, solid | `e2e`: CSS tanpa rgba/opacity/gradient/blur; computed style gelap = #0d1117/#161b22/#30363d/#e6edf3 dan terang = #ffffff/#f6f8fa/#d0d7de/#1f2328; semua elemen solid (opacity 1, tanpa gradien); meta theme-color dan manifest ikut; mode otomatis mengikuti sistem. Screenshot 13–16. Putaran kedua: latar peringatan, sorotan, chip, dan pil dibuat netral (warna hanya pada garis tepi dan teks); tes memeriksa SEMUA elemen di 5 halaman dan 2 dialog (+ `::backdrop`) pada tema gelap dan terang: latar harus salah satu warna palet, tanpa alpha/opacity/bayangan/filter/gradien. Tes ini terbukti gagal pada CSS versi sebelumnya (tint merah/biru/kuning) dan lulus pada versi sekarang |
| Teks | Tidak ada "undefined"/"null"/"NaN" di tampilan (perbaikan: label sesi di daftar tryout dulu memakai tabel 2 elemen sehingga tryout ketiga di Sabtu tampil "undefined") | `logic`: setiap tryout punya sesi (siang 13.15 / siang 2 16.00 / malam 19.00), 80 hari tanpa label buruk. `e2e`: 4 halaman, 150 baris, 6 sheet Sabtu–Minggu, timeline, tanpa galat konsol |
| K20 | Escape HTML | `e2e`: `<img onerror>` dan `<script>` di catatan dan nama paket tampil sebagai teks, tidak dieksekusi |

Tambahan: data localStorage rusak (`{rusak!!`) → aplikasi tetap jalan dengan data baru dan salinan rusak disimpan di `tryoutSkd.v1.rusak`; tanpa galat konsol di semua skenario utama.

## Yang belum terbukti (jujur)

- Belum dicoba di HP asli (Android/iPhone) dan belum di Firefox/Safari. Pemasangan "Tambahkan ke Layar Utama" diuji lewat manifest dan service worker di Chromium, bukan lewat dialog pemasangan HP.
- Dialog izin notifikasi asli tidak bisa diuji tanpa kepala; izin disimulasikan, logika penjadwalannya yang terbukti. Notifikasi tidak muncul saat aplikasi tertutup penuh (batas teknis tanpa server).
- Belum di-deploy ke GitHub Pages sungguhan (belum ada repo); yang diuji adalah server lokal di akar dan di subpath `/tryout-skd-repo/`.
