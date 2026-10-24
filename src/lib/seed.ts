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

// Nilai pagi terbaru (hitung koloni TCBS + hitung plankton). Status kolam DIHITUNG dari nilai
// terbaru (src/lib/domain.ts → evaluate): A3 kritis (Vibrio), B2 waspada (Vibrio),
// C1 waspada (alga biru-hijau), D2 waspada (EHP positif dari qPCR), sisanya sehat.
const normalMorning = { Vibrio: 450, VibrioHijau: 30, Plankton: 150_000, BGA: 8 };
const normalAfternoon = { TotalBakteri: 120_000, Bacillus: 50_000, Diatom: 45, AlgaHijau: 35, Dino: 3 };

// Tren 7 hari (indeks terakhir = hari ini).
const morningTrend: Record<string, Partial<Record<keyof typeof normalMorning, number[]>>> = {
  A3: { Vibrio: [3_000, 3_400, 3_200, 5_200, 8_100, 11_500, 15_000], VibrioHijau: [150, 180, 170, 320, 560, 880, 1_200] },
  B2: { Vibrio: [600, 900, 1_500, 2_600, 4_800, 6_900, 8_500], VibrioHijau: [30, 40, 45, 55, 60, 70, 80] },
  C1: { BGA: [10, 12, 15, 18, 22, 25, 28] },
};
const afternoonOverride: Record<string, Partial<typeof normalAfternoon>> = {
  A3: { TotalBakteri: 650_000, Bacillus: 18_000 },
  C1: { Diatom: 26, AlgaHijau: 30 },
};
// qPCR terakhir (23 Okt): 1 = positif.
const pcrPositive: Record<string, Partial<Record<'WSSV' | 'AHPND' | 'EHP' | 'IHHNV', number>>> = {
  D2: { EHP: 1 },
};

const DAYS = ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'];
const wobble = [0.12, -0.08, 0.15, 0.05, -0.1, 0.06, 0];
const jitter = (v: number, d: number) => Math.round(v * (1 + wobble[d]));

function history(): Reading[] {
  const out: Reading[] = [];
  for (const pond of ponds) {
    DAYS.forEach((day, d) => {
      const last = d === DAYS.length - 1;
      const morning: Values = {};
      for (const [k, base] of Object.entries(normalMorning) as [keyof typeof normalMorning, number][]) {
        morning[k] = morningTrend[pond.id]?.[k]?.[d] ?? jitter(base, d);
      }
      out.push({ id: `p-${pond.id}-${d}`, pondId: pond.id, at: `${day}T${last ? '06:42' : '06:30'}:00+07:00`, by: 'Shift pagi', synced: true, values: morning });

      if (d === 5) {
        out.push({
          id: `q-${pond.id}`, pondId: pond.id, at: `${day}T10:00:00+07:00`, by: 'Lab qPCR', synced: true,
          values: { WSSV: 0, AHPND: 0, EHP: 0, IHHNV: 0, ...pcrPositive[pond.id] },
        });
      }
      if (last) return; // hitung bakteri & plankton sore hari ini belum dilakukan
      const afternoon: Values = {};
      const base = { ...normalAfternoon, ...afternoonOverride[pond.id] };
      for (const [k, v] of Object.entries(base) as [keyof typeof normalAfternoon, number][]) {
        afternoon[k] = k === 'Diatom' || k === 'AlgaHijau' || k === 'Dino' ? v : jitter(v, d);
      }
      out.push({ id: `s-${pond.id}-${d}`, pondId: pond.id, at: `${day}T14:00:00+07:00`, by: 'Mikroskop sore', synced: true, values: afternoon });
    });
  }
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
  labTitle: 'Hasil Lab qPCR · DOC 42',
  riskScores: [
    { pondId: 'A3', score: 82, label: 'Tinggi', context: 'Vibrio 15.000 CFU/mL · naik 4 hari berturut-turut' },
    { pondId: 'B2', score: 54, label: 'Sedang', context: 'Vibrio 8.500 CFU/mL dan terus naik' },
    { pondId: 'C1', score: 41, label: 'Sedang', context: 'Alga biru-hijau 28% dari total plankton' },
    { pondId: 'A1', score: 18, label: 'Rendah', context: 'Bakteri dan plankton dalam batas' },
  ],
  recommendations: [
    { id: 'r1', icon: 'wheat', text: 'Kurangi pakan Kolam A3 20% dan tebar probiotik Bacillus malam ini untuk menekan Vibrio.' },
    { id: 'r2', icon: 'microscope', text: 'Hitung ulang Vibrio Kolam A3 dan B2 besok pagi (TCBS) untuk memastikan tren.' },
    { id: 'r3', icon: 'droplet', text: 'Ganti air 10–15% di Kolam C1 untuk menurunkan dominasi alga biru-hijau.' },
    { id: 'r4', icon: 'shovel', text: 'Sipon dasar Kolam A3 untuk mengurangi bahan organik tempat Vibrio berkembang.' },
    { id: 'r5', icon: 'flask', text: 'Kirim sampel udang Kolam D2 ke lab untuk konfirmasi EHP dan cek pertumbuhan.' },
  ],
  tasks: [
    { id: 't1', title: 'Hitung Vibrio & plankton pagi semua kolam', time: '06.30 WIB', note: 'Semua kolam', done: false },
    { id: 't2', title: 'Pakan pagi — total 45 kg', time: '07.00 WIB', note: 'Pakan pagi', done: false },
    { id: 't3', title: 'Ambil sampel lab qPCR DOC 42 — A3 & B2', time: '10.00 WIB', note: 'Lab qPCR', done: false },
    { id: 't4', title: 'Hitung total bakteri & komposisi plankton', time: '14.00 WIB', note: 'Mikroskop', done: false },
  ],
  feedTodayKg: 128,
};
