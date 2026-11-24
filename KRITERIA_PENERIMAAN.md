# Kriteria penerimaan — Jadwal Tryout SKD

> **Revisi 2026-11-24 (permintaan Shandy):** mulai Selasa 24 Nov 2026, 15 tryout per minggu (Sen–Kam 2 per hari, Jumat 1 malam, Sabtu 3, Minggu 3; sesi hanya siang 13.15, siang 2 16.00, malam 19.00) agar 150 tryout selesai sebelum SKD bawaan 8 Feb 2027. 11 minggu (13, 9×15, 2), tryout terakhir Senin 1 Feb 2027. Jumat 25 Des dan 1 Jan tetap punya 1 tryout malam (peringatan libur, bisa digeser dalam minggu yang sama). K1–K3 di bawah berlaku untuk jadwal ini.

Ditulis sebelum coding. Setiap butir dibuktikan dengan tes nyata (lihat `BUKTI.md`).

Hasil cocok-silang dengan PDF "Jadwal Tryout Disiplin": templat harian, 12 TO/minggu, 10 minggu,
tanggal Natal/Tahun Baru, dan 7 aturan tetap sama dengan pesan Shandy. Tidak ada selisih data.
Satu-satunya tambahan di PDF yang tidak ada di pesan: catatan minggu 1 ("pengumuman formasi,
buat akun SSCASN") dan 7 aturan tetap; keduanya ditampilkan sebagai catatan saja.

| # | Kriteria | Bukti yang diminta |
|---|----------|--------------------|
| K1 | Total tepat 150 tryout; tiap minggu 15 (minggu 1: 13, minggu 11: 2); ID unik; periode 23 Nov 2026 – 31 Jan 2027 (Senin–Minggu) | tes logika (Node) |
| K2 | Templat harian: Sen–Kam siang 13.15 + malam 19.00; Jumat malam; Sabtu dan Minggu siang 13.15, siang 2 16.00, malam 19.00; Minggu baca ulang 22.00; jam persis | tes logika |
| K3 | Jumat 25 Des 2026 dan Jumat 1 Jan 2027 ditandai libur dan tryoutnya bisa digeser ke hari lain di minggu yang sama; tidak bisa ke minggu lain; total tetap 150, tiap minggu tetap 15 | tes logika + tes browser |
| K4 | Hari Ini: timeline, sorot kegiatan berjalan, hitung mundur ke kegiatan berikutnya (zona WITA) | tes browser dengan jam palsu |
| K5 | Checklist: selesai, nama paket, skor TWK/TIU/TKP, total otomatis, status pembahasan | tes browser |
| K6 | Ambang lulus per subtes (default 65/80/166), bisa diubah | tes logika + browser |
| K7 | Progres per minggu x/15 dan total x/150 dengan progress bar; hitung mundur hari ke SKD (default 8 Feb 2027, bisa diubah) | tes logika + browser |
| K8 | Tryout terlewat memunculkan peringatan sampai digeser/diselesaikan | tes logika + browser |
| K9 | Peringatan paket dobel (nama sama, tak peka huruf besar/spasi) | tes logika + browser |
| K10 | Grafik tren TWK/TIU/TKP/total, rata-rata per minggu, peringatan "skor mentok" (TWK atau TKP tidak naik dua minggu berturut-turut) | tes logika + screenshot |
| K11 | (Revisi 2026-11-24) Buku soal salah dihapus; diganti satu catatan "pelajaran yang didapat hari ini" per hari + pengingat baca ulang Minggu 22.00 | tes logika + tes browser |
| K12 | Kalender 10 minggu dengan status tiap tryout | screenshot |
| K13 | Pengaturan: tanggal SKD, ambang, tema gelap/terang, reset dengan konfirmasi | tes browser |
| K14 | Data bertahan setelah reload (localStorage) | tes browser |
| K15 | Ekspor JSON dan impor JSON bekerja; berkas rusak/asing ditolak tanpa merusak data | tes browser + logika |
| K16 | Tampilan rapi di 375 px: tanpa scroll horizontal, tombol ≥ 44 px, navigasi bawah 5 tab | tes browser + screenshot |
| K17 | PWA: manifest valid, service worker aktif, halaman jalan saat offline setelah dimuat sekali | tes browser (offline) |
| K18 | Notifikasi opsional: aplikasi tetap jalan penuh jika izin ditolak/tidak ada | tes browser |
| K19 | Path relatif sehingga jalan di subpath GitHub Pages (`/nama-repo/`) | tes browser di subpath |
| K20 | Semua teks pengguna di-escape (tidak ada injeksi HTML) | tes browser |
