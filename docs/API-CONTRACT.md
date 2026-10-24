# Kontrak API — aplikasi AquaSeq (mobile & web)

Dokumen ini untuk anggota tim yang membuat **backend** dan **endpoint saran AI**.
Aplikasi sudah memanggil endpoint di bawah persis seperti tertulis. Kalau backend memakai bentuk
lain, cukup sesuaikan satu file: `src/lib/api.ts` (semua panggilan jaringan ada di sana).
Tipe TypeScript lengkap ada di `src/lib/domain.ts`, daftar pengamatan di `src/lib/params.ts`.

- Basis URL diatur lewat `EXPO_PUBLIC_API_URL` (lihat `.env.example`). Kosong = **mode demo**
  (data contoh `src/lib/seed.ts`, tidak ada request jaringan).
- Semua body JSON, `Content-Type: application/json`.
- Setelah login, setiap request membawa `Authorization: Bearer <token>`.
- Waktu dalam ISO 8601 dengan zona, mis. `2026-10-24T06:42:00+07:00`. Aplikasi menampilkan WIB.
- Versi **web** memanggil API dari browser → backend wajib mengizinkan **CORS** untuk domain web
  (mis. `https://aquaseq.expo.app`) dan header `Authorization`, `Content-Type`.
- Tidak ada sensor/IoT, alat ukur, atau lab. Data kolam adalah **pengamatan mata telanjang** teknisi:
  warna air, lapisan alga, dan tanda bakteri yang terlihat pada udang.

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
      "values": { "WarnaAir": 0, "LapisanAlga": 0, "KotoranPutih": 1, "EkorMerah": 0, "InsangHitam": 0, "LumutTubuh": 0 } },
    { "id": "r-124", "pondId": "A3", "at": "2026-10-23T20:00:00+07:00", "by": "Shift malam",
      "synced": true,
      "values": { "UdangMenyala": 2 } }
  ],
  "riskScores": [
    { "pondId": "A3", "score": 82, "label": "Tinggi", "context": "Udang menyala banyak 2 malam berturut-turut · ada kotoran putih" }
  ],
  "recommendations": [
    { "id": "r1", "icon": "wheat", "text": "Kurangi pakan Kolam A3 30% dan tebar probiotik malam ini ..." }
  ],
  "tasks": [
    { "id": "t1", "title": "Cek warna air & anco pagi semua kolam", "time": "06.30 WIB", "note": "Semua kolam", "done": false }
  ],
  "feedTodayKg": 128
}
```

Catatan:
- `readings` = **riwayat** pengamatan (cukup 7–14 hari terakhir per kolam). Satu pengamatan boleh
  berisi sebagian saja (mis. cek malam hanya `UdangMenyala`). Aplikasi mengambil pilihan terbaru
  per pengamatan, menghitung status kolam, dan menggambar riwayat 7 hari dari sini.
- Isi `values` adalah **kode pilihan** (angka):

  | Kunci | Pengamatan | Kode → arti (status) |
  |---|---|---|
  | `WarnaAir` | Warna air | `0` hijau cerah (sehat) · `1` coklat muda (sehat) · `2` bening (waspada) · `3` hijau pekat / kebiruan (waspada) · `4` putih susu / keruh (waspada) · `5` merah kecoklatan (kritis) |
  | `LapisanAlga` | Lapisan alga di permukaan | tingkat* |
  | `UdangMenyala` | Udang menyala di malam hari (Vibrio berpendar) | tingkat* |
  | `KotoranPutih` | Kotoran putih mengambang / di anco | tingkat* |
  | `EkorMerah` | Ekor & kaki udang memerah | tingkat* |
  | `InsangHitam` | Insang udang hitam / kuning | tingkat* |
  | `LumutTubuh` | Lumut / lendir di tubuh udang | tingkat* |

  \*Tingkat: `0` tidak ada (sehat) · `1` sedikit (waspada) · `2` banyak (kritis).

- Status per pilihan saat ini diatur di aplikasi (`src/lib/params.ts`). Kalau perlu diatur per
  tambak dari server, tambahkan field di `FarmSnapshot` dan beri tahu tim mobile.
- `recommendations[].icon`: `"wheat" | "flask" | "droplet" | "shovel" | "eye"`.

## 3. Kirim pengamatan — `POST /readings`

Dikirim oleh teknisi setelah "Simpan" di layar Cek Kolam (semua 7 pengamatan diisi).
**Offline-first**: kalau gagal/offline, data tetap di antrean HP dan dikirim ulang otomatis saat
online (atau lewat "Sinkronkan sekarang").

Request:
```json
{ "id": "local-1761269520000", "pondId": "A3", "at": "2026-10-24T08:12:00.000Z",
  "by": "Budi Santoso",
  "values": { "WarnaAir": 0, "LapisanAlga": 0, "UdangMenyala": 1, "KotoranPutih": 0, "EkorMerah": 0, "InsangHitam": 0, "LumutTubuh": 0 } }
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
               "values": { "WarnaAir": 0, "LapisanAlga": 0, "UdangMenyala": 2, "KotoranPutih": 1, "EkorMerah": 0, "InsangHitam": 0, "LumutTubuh": 0 } },
  "history": [ { "at": "2026-10-22T20:00:00+07:00", "values": { "UdangMenyala": 2 } } ],
  "issues": [
    { "param": "UdangMenyala", "value": 2, "severity": "KRITIS" },
    { "param": "KotoranPutih", "value": 1, "severity": "WASPADA" }
  ]
}
```
- `reading.values` = pilihan **terbaru per pengamatan** (gabungan beberapa pengamatan).
- `history` = 10 pengamatan terakhir kolam itu (lama → baru).
- `issues` = pengamatan yang tidak sehat menurut aplikasi, paling parah dulu. Arti kode ada di tabel §2.

Response `200`:
```json
{
  "severity": "KRITIS",
  "summary": "Kolam A3 kritis: udang menyala banyak 2 malam berturut-turut dan mulai ada kotoran putih.",
  "steps": [
    { "title": "Kurangi pakan Kolam A3 20–30%", "detail": "Sisa pakan memberi makan bakteri berpendar." },
    { "title": "Tebar probiotik malam ini" },
    { "title": "Senter lagi besok malam" }
  ]
}
```
Aturan isi (supaya cocok dengan UI teknisi yang dibuat sederhana):
- `severity`: `"SEHAT" | "WASPADA" | "KRITIS"`.
- `summary`: 1–2 kalimat Bahasa Indonesia, tanpa emoji, tanpa markdown.
- `steps`: 1–5 langkah, **urut dari yang paling mendesak**. `title` berupa perintah singkat yang bisa
  langsung dikerjakan teknisi di kolam (≤ 80 karakter); `detail` opsional (≤ 160 karakter).
- Hanya tindakan yang bisa dikerjakan di kolam tanpa alat ukur: atur pakan, probiotik, sipon,
  ganti air, serok kotoran/alga, angkat udang lemas, kabari pemilik. Jangan menyarankan sensor,
  pengukuran pH/DO/suhu, uji lab, atau qPCR.
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
