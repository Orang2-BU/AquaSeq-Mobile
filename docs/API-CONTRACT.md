# Kontrak API — aplikasi AquaSeq (mobile & web)

Dokumen ini untuk anggota tim yang membuat **backend** dan **endpoint saran AI**.
Aplikasi sudah memanggil endpoint di bawah persis seperti tertulis. Kalau backend memakai bentuk
lain, cukup sesuaikan satu file: `src/lib/api.ts` (semua panggilan jaringan ada di sana).
Tipe TypeScript lengkap ada di `src/lib/domain.ts`.

- Basis URL diatur lewat `EXPO_PUBLIC_API_URL` (lihat `.env.example`). Kosong = **mode demo**
  (data contoh `src/lib/seed.ts`, tidak ada request jaringan).
- Semua body JSON, `Content-Type: application/json`.
- Setelah login, setiap request membawa `Authorization: Bearer <token>`.
- Waktu dalam ISO 8601 dengan zona, mis. `2026-10-24T06:42:00+07:00`. Aplikasi menampilkan WIB.
- Versi **web** memanggil API dari browser → backend wajib mengizinkan **CORS** untuk domain web
  (mis. `https://tambak.expo.app`) dan header `Authorization`, `Content-Type`.
- Tidak ada data sensor/IoT. Semua nilai kualitas air berasal dari **pengecekan manual** teknisi
  (test kit) dan **hasil lab**.

---

## 1. Login — `POST /auth/login`

Request:
```json
{ "officerId": "TK-014", "pin": "123456" }
```
Response `200`:
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "TK-014", "name": "Budi Santoso", "role": "teknisi" }
}
```
- `role`: `"teknisi"` atau `"pemilik"` — **server yang menentukan peran**, menentukan tab & layar.
- Salah ID/PIN → `401` (aplikasi menampilkan "ID atau PIN salah.").
- Token disimpan di HP (AsyncStorage) sampai pengguna menekan Keluar. Bila token kedaluwarsa,
  balas `401` dan pengguna perlu masuk lagi.

## 2. Data tambak — `GET /farm`

Satu request berisi semua yang ditampilkan aplikasi untuk tambak milik/tempat kerja pengguna.
Dipanggil setelah login dan dari tombol "Muat data". Response `200` = `FarmSnapshot`:

```json
{
  "farm": { "id": "sr", "name": "Tambak Sumber Rejeki", "initials": "SR",
            "bloks": ["Blok A · DOC 42", "Blok B · DOC 55", "Semua Blok · 12 Kolam"] },
  "ponds": [
    { "id": "A3", "name": "Kolam A3", "blok": "A", "docDays": 42, "srPercent": 81,
      "areaM2": 2500, "stockedCount": 250000, "abwGram": 6.2 }
  ],
  "readings": [
    { "id": "r-123", "pondId": "A3", "at": "2026-10-24T06:42:00+07:00", "by": "Shift pagi",
      "synced": true,
      "values": { "DO": 4.1, "pH": 7.9, "Suhu": 30.5, "Salinitas": 22, "Kecerahan": 35 } },
    { "id": "r-124", "pondId": "A3", "at": "2026-10-23T14:00:00+07:00", "by": "Uji kit sore",
      "synced": true,
      "values": { "Amonia": 0.72, "Nitrit": 0.15, "Alkalinitas": 140, "TOM": 82, "Vibrio": 400 } }
  ],
  "labTitle": "Hasil Lab qPCR · DOC 42",
  "labResults": [
    { "pondId": null, "marker": "WSSV", "result": "Tidak terdeteksi", "detected": false },
    { "pondId": "B2", "marker": "Vibrio", "result": "Terdeteksi tinggi · Kolam B2", "detected": true }
  ],
  "riskScores": [
    { "pondId": "A3", "score": 82, "label": "Tinggi", "context": "DO 4,1 mg/L · turun 4 hari berturut-turut" }
  ],
  "recommendations": [
    { "id": "r1", "icon": "wind", "text": "Nyalakan kincir tambahan di Kolam A3 malam ini ..." }
  ],
  "tasks": [
    { "id": "t1", "title": "Cek kualitas air pagi semua kolam", "time": "06.30 WIB", "note": "Semua kolam", "done": false }
  ],
  "feedTodayKg": 128
}
```

Catatan:
- `readings` = **riwayat** pengecekan (cukup 7–14 hari terakhir per kolam). Aplikasi mengambil nilai
  terbaru per parameter, menghitung status kolam, dan menggambar grafik tren dari sini.
- Kunci `values` (boleh sebagian saja per pengecekan):

  | Kunci | Satuan | | Kunci | Satuan |
  |---|---|---|---|---|
  | `DO` | mg/L | | `Nitrat` | mg/L |
  | `pH` | — | | `Alkalinitas` | mg/L |
  | `Suhu` | °C | | `Kesadahan` | mg/L |
  | `Salinitas` | ppt | | `TOM` | mg/L |
  | `Kecerahan` | cm | | `Fosfat` | mg/L |
  | `Amonia` (TAN) | mg/L | | `H2S` | mg/L |
  | `Nitrit` | mg/L | | `Vibrio` | CFU/mL |

- Batas aman (untuk status Sehat/Waspada/Kritis) saat ini ada di aplikasi: `src/lib/params.ts`.
  Kalau batas perlu diatur per tambak dari server, tambahkan field di `FarmSnapshot` dan beri tahu
  tim mobile.
- `recommendations[].icon`: `"wind" | "wheat" | "flask" | "droplet" | "shovel"`.
- `labResults[].pondId = null` artinya berlaku untuk seluruh tambak.

## 3. Kirim pengecekan — `POST /readings`

Dikirim oleh teknisi setelah "Simpan" di layar Cek Kolam. **Offline-first**: kalau gagal/offline,
data tetap di antrean HP dan dikirim ulang otomatis saat online (atau lewat "Sinkronkan sekarang").

Request:
```json
{ "id": "local-1761269520000", "pondId": "A3", "at": "2026-10-24T08:12:00.000Z",
  "by": "Budi Santoso", "values": { "DO": 5.1, "pH": 7.9, "Suhu": 30.5, "Salinitas": 22 } }
```
Response `201`/`204`. **Wajib idempoten berdasarkan `id`** — aplikasi bisa mengirim ulang data yang
sama setelah koneksi putus; jangan simpan dobel.

## 4. Tandai tugas — `PATCH /tasks/{id}`

```json
{ "done": true }
```
Response `204`. (Saat ini aplikasi mengubah tampilan dulu; kegagalan tidak diantrekan.)

## 5. Jadwalkan rekomendasi — `POST /recommendations/{id}/schedule`

Dipanggil pemilik dari layar Laporan ("Jadwalkan besok"). Server sebaiknya membuat **tugas teknisi
untuk besok**, dan mengembalikannya lewat `GET /farm` hari berikutnya. Wajib idempoten (jadwal
ulang rekomendasi yang sama tidak membuat tugas ganda). Response `204`.

---

## 6. Saran mitigasi AI — `POST /ai/mitigasi`

Default URL `{EXPO_PUBLIC_API_URL}/ai/mitigasi`; bisa ditimpa dengan `EXPO_PUBLIC_AI_URL`.
Dipanggil untuk kolam berstatus **Waspada/Kritis** saat HP online. Selama menunggu (dan bila AI
gagal/timeout 15 detik/offline), aplikasi menampilkan **saran bawaan** dari
`src/lib/mitigation-rules.ts`, berlabel "Saran cepat". Begitu respons AI datang, kartu berganti
berlabel "Saran AI".

> **API key AI (mis. Anthropic/Claude) hanya boleh di server.** Jangan pernah dimasukkan ke
> variabel `EXPO_PUBLIC_*` — nilainya ikut tertanam di aplikasi dan bisa dibaca siapa pun.

Request:
```json
{
  "pond": { "id": "A3", "name": "Kolam A3", "blok": "A", "docDays": 42, "srPercent": 81,
            "areaM2": 2500, "stockedCount": 250000, "abwGram": 6.2 },
  "reading": { "at": "2026-10-24T06:42:00+07:00",
               "values": { "DO": 4.1, "pH": 7.9, "Suhu": 30.5, "Salinitas": 22, "Amonia": 0.72 } },
  "history": [ { "at": "2026-10-23T06:30:00+07:00", "values": { "DO": 4.5, "pH": 7.9 } } ],
  "issues": [
    { "param": "DO", "value": 4.1, "severity": "KRITIS", "direction": "rendah", "limit": 5.0 }
  ]
}
```
- `reading.values` = nilai **terbaru per parameter** (gabungan beberapa pengecekan).
- `history` = 10 pengecekan terakhir kolam itu (lama → baru).
- `issues` = parameter di luar batas menurut aplikasi, paling parah dulu.

Response `200`:
```json
{
  "severity": "KRITIS",
  "summary": "Kolam A3 kritis: DO 4,1 mg/L dan terus turun 4 hari.",
  "steps": [
    { "title": "Nyalakan semua kincir di Kolam A3 sekarang", "detail": "Tambah kincir cadangan sampai pagi." },
    { "title": "Kurangi pakan berikutnya 20–30%" },
    { "title": "Cek ulang DO 1 jam lagi" }
  ]
}
```
Aturan isi (supaya cocok dengan UI teknisi yang dibuat sederhana):
- `severity`: `"SEHAT" | "WASPADA" | "KRITIS"`.
- `summary`: 1–2 kalimat Bahasa Indonesia, tanpa emoji, tanpa markdown.
- `steps`: 1–5 langkah, **urut dari yang paling mendesak**. `title` berupa perintah singkat yang bisa
  langsung dikerjakan teknisi di kolam (≤ 80 karakter); `detail` opsional (≤ 160 karakter).
- Jangan menyarankan tindakan yang butuh sensor/perangkat otomatis — tambak ini tanpa IoT.
- Respons dengan bentuk lain dianggap gagal dan aplikasi tetap memakai saran bawaan.

---

## Ringkasan endpoint

| Method | Path | Dipakai oleh |
|---|---|---|
| POST | `/auth/login` | Halaman Masuk |
| GET | `/farm` | Setelah masuk, tombol "Muat data" |
| POST | `/readings` | Cek Kolam (teknisi), antrean offline |
| PATCH | `/tasks/{id}` | Tugas (teknisi) |
| POST | `/recommendations/{id}/schedule` | Laporan (pemilik) |
| POST | `/ai/mitigasi` | Kartu saran di Beranda, Detail Kolam, hasil Cek Kolam |
