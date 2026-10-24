# AquaSeq — aplikasi pemantauan tambak udang

Aplikasi React Native (Expo SDK 58, Expo Router) untuk dua peran:

- **Teknisi tambak** — mengecek kondisi kolam secara manual (DO, pH, suhu, salinitas + uji kit),
  langsung mendapat status kolam dan **saran mitigasi cepat** (AI bila online, aturan bawaan bila offline).
- **Pemilik tambak** — melihat kondisi semua kolam lebih rinci: kadar zat (amonia, nitrit, alkalinitas,
  TOM, H₂S, Vibrio, …), tren, biomassa, hasil lab, skor risiko, dan menjadwalkan rekomendasi untuk teknisi.

Tidak ada fitur sensor/IoT: semua data berasal dari pengecekan manual dan hasil lab.

## Menjalankan

```bash
npm install
cp .env.example .env      # biarkan EXPO_PUBLIC_API_URL kosong untuk mode demo
npm start                 # lalu tekan a (Android), w (web), atau scan QR dengan Expo Go
```

**Mode demo** (tanpa `EXPO_PUBLIC_API_URL`): data contoh, login bebas dengan memilih peran,
PIN 4–6 angka tidak disimpan, tidak ada yang dikirim ke server.

## Ikon & splash

Ikon, ikon adaptif Android, favicon, dan gambar splash dibuat dari ikon Lucide `shrimp` di atas
gradient AquaSeq:

```bash
bash scripts/make-icons.sh   # butuh ImageMagick + librsvg
```

Saat dibuka, splash sistem (udang putih di latar navy) langsung disambung splash animasi
`src/components/AnimatedSplash.tsx`: udang berenang naik, nama AquaSeq muncul, lalu memudar
ke aplikasi (±1,8 detik; hanya fade bila Reduce Motion aktif). Versi web memakai
`public/index.html` supaya layar pertama sebelum JavaScript termuat juga navy + udang.

## Struktur

| Lokasi | Isi |
|---|---|
| `src/app/` | Layar (Expo Router). `masuk.tsx`, `(tabs)/…`, `kolam/[id].tsx`, `cek-kolam.tsx` |
| `src/lib/api.ts` | **Semua** panggilan ke backend & AI — titik sambung tim backend |
| `src/lib/domain.ts` | Tipe data + perhitungan status kolam |
| `src/lib/params.ts` | Daftar parameter, satuan, dan batas aman |
| `src/lib/mitigation-rules.ts` | Saran mitigasi bawaan (offline / AI tidak tersedia) |
| `src/lib/store.tsx` | Sesi, cache offline, antrean pengecekan yang belum terkirim |
| `src/lib/seed.ts` | Data contoh mode demo |
| `docs/API-CONTRACT.md` | Kontrak endpoint untuk backend & AI |

## Menyambungkan backend & AI

1. Backend mengikuti [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md) (atau sesuaikan `src/lib/api.ts`).
2. Isi `EXPO_PUBLIC_API_URL` (dan opsional `EXPO_PUBLIC_AI_URL`).
3. API key AI **hanya di server** — variabel `EXPO_PUBLIC_*` ikut tertanam di aplikasi.

## Cek sebelum rilis

```bash
npm run typecheck
npm run lint
npm run export:web        # memastikan build web berhasil (hasil di dist/)
```

## Build Android (EAS)

Sekali saja: buat akun di expo.dev, lalu

```bash
npx eas-cli@latest login
npx eas-cli@latest init                       # menautkan proyek & menulis projectId ke app.json
npx eas-cli@latest env:create --environment preview    --name EXPO_PUBLIC_API_URL --value https://... --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_API_URL --value https://... --visibility plaintext
```

Lalu:

```bash
npm run build:apk         # APK untuk dipasang langsung di HP uji (profil preview)
npm run build:aab         # AAB untuk Google Play (profil production)
```

Nilai `EXPO_PUBLIC_*` ditanam saat build. Setelah mengubah `.env`, jalankan ulang dengan cache bersih
(`npx expo start --clear`); script `export:web` / `deploy:web` sudah memakai `--clear`.

Sebelum rilis ke Play Store: pastikan `android.package` di `app.json` (sekarang `com.aquaseq.app`)
sudah benar — **tidak bisa diubah** setelah terbit.

## Deploy web (EAS Hosting)

```bash
npm run deploy:web        # expo export -p web && eas deploy --prod
```

Hasil `dist/` juga bisa diunggah ke hosting statis lain; pastikan semua path diarahkan ke
`index.html` (aplikasi satu halaman). Domain web perlu diizinkan CORS di backend.
