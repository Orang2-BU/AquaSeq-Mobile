# Catatan QA

Status per 2026-10-24. Dasar desain: `Mobile-App-Tambak-Build-Spec.md` (token warna, font, ikon Lucide,
tanpa emoji/dot, animasi §6). Struktur layar sudah **menyimpang dari spesifikasi** atas permintaan
pengguna — dicatat di bawah supaya bisa dikonfirmasi ke Fathir.

## Perubahan besar dari spesifikasi

1. **Dua peran** — Teknisi dan Pemilik. Tab berbeda per peran:
   - Teknisi: Beranda · Kolam · (+ Cek Kolam) · Tugas · Profil
   - Pemilik: Beranda · Kolam · Laporan · Profil (tanpa FAB; pemilik tidak menginput)
2. **Login wajib** (`/masuk`). Mode demo: pilih peran sendiri; dengan backend: peran dari server.
3. **Semua fitur IoT dihapus**: modul Peralatan (aerator/kincir/genset), toggle ALERT per kolam,
   pengaturan notifikasi ALERT, grafik "24 Jam" (aliran sensor), teks "update otomatis".
   Parameter fisika/kimia (pH, DO, suhu, dll.), hitungan lab (Vibrio CFU/mL, plankton sel/mL),
   dan qPCR juga dihapus (2026-10-24). Data kolam kini **pengamatan mata telanjang** yang
   berpengaruh ke udang: warna air, lapisan alga, udang menyala di malam hari, kotoran putih,
   ekor & kaki merah, insang hitam/kuning, lumut/lendir di tubuh udang.
4. **Status kolam dihitung** dari pilihan terakhir tiap pengamatan (status per pilihan di `src/lib/params.ts`)
   (bukan lagi label tetap di data).
5. **Saran mitigasi**: endpoint AI tim (`/ai/mitigasi`), dengan saran bawaan
   (`src/lib/mitigation-rules.ts`) saat offline / AI belum ada / gagal. Label kartu jujur:
   "Saran AI" vs "Saran cepat".
6. Input Sampling → **Cek Kolam**: 7 pengamatan cukup diketuk (warna air: 6 pilihan; lainnya
   Tidak ada / Sedikit / Banyak), ada tombol "Sisanya Tidak ada", lalu langsung tampil status + saran.
7. Beranda modul 2×2 dihapus (teknisi: tombol "Cek Kolam Sekarang" + daftar "Perlu tindakan").

## Asumsi yang perlu dikonfirmasi

- **Status tiap pilihan** (`params.ts`) adalah asumsi awal: Sedikit = waspada, Banyak = kritis;
  warna air bening / hijau pekat / putih keruh = waspada, merah kecoklatan = kritis.
- **Isi saran bawaan** (dosis ditulis umum, "ikuti SOP tambak") — perlu ditinjau ahli budidaya.
- **Data contoh** (`seed.ts`): 12 kolam, pengamatan 7 hari, tebar, berat rata-rata, biomassa, skor risiko,
  rekomendasi, dan nama pencatat ("Shift pagi", "Uji kit sore") — bukan data lapangan.
- Kolam skor 18 (Rendah) dipetakan ke A1 (spesifikasi menulis `pondId: '—'`).
- Nama aplikasi **AquaSeq** (ditetapkan pengguna 2026-10-24). `android.package` / `bundleIdentifier` =
  `com.aquaseq.app` — konfirmasi dulu sebelum rilis; package tidak bisa diubah setelah terbit di Play Store.
- Ikon & splash: udang Lucide (`shrimp`) putih di atas gradient AquaSeq, dibuat dari `scripts/make-icons.sh`.

## Perilaku penting

- **Offline-first**: pengecekan disimpan di HP (antrean `pending`), dikirim otomatis saat online
  (mode backend). Mode demo: tetap "tersimpan di HP (mode demo)" — tidak pernah diklaim terkirim.
- Antrean yang belum terkirim **tetap tersimpan** saat pengguna keluar.
- Tugas yang dicentang & rekomendasi yang dijadwalkan: diubah di HP dulu, lalu dikirim ke server;
  kegagalannya belum diantrekan (lihat API-CONTRACT §4–5).
- Rekomendasi yang dijadwalkan pemilik muncul di Tugas teknisi bagian "Besok". Di mode demo ini hanya
  terlihat bila pemilik & teknisi masuk di HP yang sama; dengan backend, lewat server.
- Pengaturan "Kurangi animasi" memaksa perilaku Reduce Motion (§6.3).

## Sudah diuji (web, 390 × 844, mode demo)

- Splash animasi udang (web): frame berurutan — udang berayun & naik, nama AquaSeq muncul, fade ke halaman Masuk.

- Masuk sebagai teknisi → Beranda teknisi (4 kolam perlu tindakan, saran per kolam).
- Cek Kolam versi pengamatan: lihat bagian uji di bawah.
- Keluar → masuk sebagai pemilik → Beranda pemilik (biomassa, SR, pengamatan semua kolam), tab tanpa FAB.
- Detail kolam versi pemilik: tab Air kolam / Udang, riwayat 7 hari (ikon status per hari), daftar pengamatan.
- `npm run typecheck`, `npm run lint`, `npm run export:web` bersih.

## Belum diuji

- Splash di Android/iOS: kecocokan posisi udang splash sistem vs frame pertama animasi (Android 12+
  memakai API splash sistem yang bisa memotong/mengecilkan ikon).

- Build Android sungguhan (EAS) dan pemakaian di HP fisik; Reduce Motion sistem di perangkat.
- Mode backend & endpoint AI (belum ada server) — hanya mode demo yang dijalankan.
- `expo-doctor`: 19/20 cek lolos; cek skema app.json butuh koneksi ke Expo dan tidak bisa jalan di sini.
