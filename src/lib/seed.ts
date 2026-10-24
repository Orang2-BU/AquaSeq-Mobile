// DATA CONTOH untuk mode demo (EXPO_PUBLIC_API_URL kosong). Bukan data lapangan.
// Saat backend tim tersambung, semua ini datang dari GET /farm (lihat docs/API-CONTRACT.md).
import type { FarmSnapshot, Pond, Reading } from './domain';

const ponds: Pond[] = [
  { id: 'A3', name: 'Kolam A3', blok: 'A', docDays: 42, srPercent: 81, areaM2: 2500, stockedCount: 250_000, abwGram: 6.2 },
  { id: 'B2', name: 'Kolam B2', blok: 'B', docDays: 55, srPercent: 88, areaM2: 2000, stockedCount: 200_000, abwGram: 10.5 },
  { id: 'C1', name: 'Kolam C1', blok: 'A', docDays: 42, srPercent: 85, areaM2: 2500, stockedCount: 250_000, abwGram: 6.0 },
  { id: 'D2', name: 'Kolam D2', blok: 'B', docDays: 55, srPercent: 87, areaM2: 2000, stockedCount: 200_000, abwGram: 10.1 },
  { id: 'A1', name: 'Kolam A1', blok: 'A', docDays: 68, srPercent: 92, areaM2: 2500, stockedCount: 250_000, abwGram: 15.8 },
  { id: 'A2', name: 'Kolam A2', blok: 'A', docDays: 42, srPercent: 90, areaM2: 2500, stockedCount: 250_000, abwGram: 6.4 },
  { id: 'B1', name: 'Kolam B1', blok: 'B', docDays: 55, srPercent: 91, areaM2: 2000, stockedCount: 200_000, abwGram: 10.8 },
  { id: 'B3', name: 'Kolam B3', blok: 'B', docDays: 55, srPercent: 89, areaM2: 2000, stockedCount: 200_000, abwGram: 10.3 },
  { id: 'C2', name: 'Kolam C2', blok: 'A', docDays: 42, srPercent: 90, areaM2: 2500, stockedCount: 250_000, abwGram: 6.3 },
  { id: 'C3', name: 'Kolam C3', blok: 'A', docDays: 42, srPercent: 91, areaM2: 2500, stockedCount: 250_000, abwGram: 6.5 },
  { id: 'D1', name: 'Kolam D1', blok: 'B', docDays: 55, srPercent: 92, areaM2: 2000, stockedCount: 200_000, abwGram: 11.0 },
  { id: 'D3', name: 'Kolam D3', blok: 'B', docDays: 55, srPercent: 90, areaM2: 2000, stockedCount: 200_000, abwGram: 10.6 },
];

type Values = Reading['values'];

// Kode pilihan ada di params.ts. Warna air: 0 hijau cerah, 1 coklat muda, 3 hijau pekat/kebiruan.
// Tingkat: 0 tidak ada, 1 sedikit, 2 banyak.
// Status kolam DIHITUNG dari pengamatan terbaru (domain.ts → evaluate):
// A3 kritis (udang menyala banyak), B2 waspada (ekor merah), C1 waspada (air hijau pekat + lapisan alga),
// D2 waspada (insang hitam), sisanya sehat.
const DAYS = ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'];

type Morning = { WarnaAir: number; LapisanAlga: number; KotoranPutih: number; EkorMerah: number; InsangHitam: number; LumutTubuh: number };
const healthyMorning = (pondIndex: number): Morning =>
  ({ WarnaAir: pondIndex % 3 === 0 ? 1 : 0, LapisanAlga: 0, KotoranPutih: 0, EkorMerah: 0, InsangHitam: 0, LumutTubuh: 0 });

// Tren 7 hari per pengamatan (indeks terakhir = hari ini / malam terakhir).
const morningTrend: Record<string, Partial<Record<keyof Morning, number[]>>> = {
  A3: { KotoranPutih: [0, 0, 0, 0, 1, 1, 1] },
  B2: { EkorMerah: [0, 0, 0, 0, 0, 1, 1] },
  C1: { WarnaAir: [0, 0, 0, 3, 3, 3, 3], LapisanAlga: [0, 0, 0, 0, 1, 1, 1] },
  D2: { InsangHitam: [0, 0, 0, 0, 0, 0, 1] },
};
// Udang menyala dicek malam (20.00) — 6 malam, malam ini belum.
const nightTrend: Record<string, number[]> = {
  A3: [0, 0, 1, 1, 2, 2],
};

function history(): Reading[] {
  const out: Reading[] = [];
  ponds.forEach((pond, pi) => {
    DAYS.forEach((day, d) => {
      const last = d === DAYS.length - 1;
      const morning: Values = {};
      for (const [k, v] of Object.entries(healthyMorning(pi)) as [keyof Morning, number][]) {
        morning[k] = morningTrend[pond.id]?.[k]?.[d] ?? v;
      }
      out.push({ id: `p-${pond.id}-${d}`, pondId: pond.id, at: `${day}T${last ? '06:42' : '06:30'}:00+07:00`, by: 'Shift pagi', synced: true, values: morning });
      if (last) return; // cek malam hari ini belum dilakukan
      out.push({
        id: `m-${pond.id}-${d}`, pondId: pond.id, at: `${day}T20:00:00+07:00`, by: 'Shift malam', synced: true,
        values: { UdangMenyala: nightTrend[pond.id]?.[d] ?? 0 },
      });
    });
  });
  return out;
}

export const seedSnapshot: FarmSnapshot = {
  farm: {
    id: 'sr',
    name: 'Tambak Sumber Rejeki',
    initials: 'SR',
    bloks: ['Blok A · DOC 42', 'Blok B · DOC 55', 'Semua Blok · 12 Kolam'],
  },
  ponds,
  readings: history(),
  riskScores: [
    { pondId: 'A3', score: 82, label: 'Tinggi', context: 'Udang menyala banyak 2 malam berturut-turut · ada kotoran putih' },
    { pondId: 'C1', score: 54, label: 'Sedang', context: 'Air hijau pekat & lapisan alga di permukaan' },
    { pondId: 'B2', score: 41, label: 'Sedang', context: 'Sebagian udang ekor & kakinya memerah' },
    { pondId: 'A1', score: 18, label: 'Rendah', context: 'Tidak ada tanda bakteri atau alga bermasalah' },
  ],
  recommendations: [
    { id: 'r1', icon: 'wheat', text: 'Kurangi pakan Kolam A3 30% dan tebar probiotik malam ini untuk menekan bakteri berpendar.' },
    { id: 'r2', icon: 'shovel', text: 'Sipon dasar Kolam A3 dan serok kotoran putih yang mengambang.' },
    { id: 'r3', icon: 'droplet', text: 'Ganti air 10–15% di Kolam C1 dan serok lapisan alga di sudut kolam.' },
    { id: 'r4', icon: 'eye', text: 'Periksa 20 ekor udang Kolam B2 dari anco; angkat udang lemas yang ekornya merah.' },
    { id: 'r5', icon: 'flask', text: 'Tebar probiotik di Kolam D2 dan cek ulang insang udang besok pagi.' },
  ],
  tasks: [
    { id: 't1', title: 'Cek warna air & anco pagi semua kolam', time: '06.30 WIB', note: 'Semua kolam', done: false },
    { id: 't2', title: 'Pakan pagi — total 45 kg', time: '07.00 WIB', note: 'Pakan pagi', done: false },
    { id: 't3', title: 'Periksa 20 ekor udang Kolam A3 & B2 dari anco', time: '10.00 WIB', note: 'Anco', done: false },
    { id: 't4', title: 'Senter kolam: cek udang menyala', time: '20.00 WIB', note: 'Semua kolam', done: false },
  ],
  feedTodayKg: 128,
};
