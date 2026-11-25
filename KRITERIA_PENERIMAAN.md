# Kriteria penerimaan — Jadwal Tryout SKD

> **Revisi 2026-11-25 (permintaan Shandy):** mulai Senin 30 Nov 2026; hari biasa 15 tryout per minggu (Sen–Kam 2, Jumat 1 malam, Sabtu 3, Minggu 3; sesi siang 13.15, siang 2 16.00, malam 19.00); hari libur 4 tryout (tambah pagi 09.30): 24–27 Des, 1–3 Jan, 5 Jan. 151 tryout, 10 minggu (15, 15, 15, 22, 20, 17, 15, 15, 15, 2), terakhir Senin 1 Feb 2027, tenang 2–7 Feb. K1–K3 berlaku untuk jadwal ini.

Ditulis sebelum coding. Setiap butir dibuktikan dengan tes nyata (lihat `BUKTI.md`).

Hasil cocok-silang dengan PDF "Jadwal Tryout Disiplin": templat harian, 12 TO/minggu, 10 minggu,
tanggal Natal/Tahun Baru, dan 7 aturan tetap sama dengan pesan Shandy. Tidak ada selisih data.
Satu-satunya tambahan di PDF yang tidak ada di pesan: catatan minggu 1 ("pengumuman formasi,
buat akun SSCASN") dan 7 aturan tetap; keduanya ditampilkan sebagai catatan saja.

| # | Kriteria | Bukti yang diminta |
|---|----------|--------------------|
| K1 | Total tepat 151 tryout; min. 15 per minggu (kecuali minggu penutup); ID unik; periode 30 Nov 2026 – 1 Feb 2027 | tes logika (Node) |
| K2 | Templat harian: Sen–Kam siang 13.15 + malam 19.00; Jumat malam; Sabtu dan Minggu siang 13.15, siang 2 16.00, malam 19.00; Minggu baca ulang 22.00; jam persis | tes logika |
| K3 | Hari libur (Natal, Tahun Baru, Isra Mikraj) dipakai dengan 4 tryout; tryout bisa digeser ke hari lain di minggu yang sama; tidak bisa ke minggu lain; total tetap 151, tiap minggu tetap | tes logika + tes browser |
| K4 | Hari Ini: timeline, sorot kegiatan berjalan, hitung mundur ke kegiatan berikutnya (zona WITA) | tes browser dengan jam palsu |
| K5 | Checklist: selesai, nama paket, skor TWK/TIU/TKP, total otomatis, status pembahasan | tes browser |
| K6 | Ambang lulus per subtes (default 65/80/166), bisa diubah | tes logika + browser |
| K7 | Progres per minggu x/15 dan total x/151 dengan progress bar; hitung mundur hari ke SKD (default 8 Feb 2027, bisa diubah) | tes logika + browser |
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
