// DATA CONTOH untuk mode demo (EXPO_PUBLIC_API_URL kosong). Bukan data lapangan.
// Saat backend tim tersambung, semua ini datang dari GET /farm (lihat docs/API-CONTRACT.md).
import type { FarmSnapshot, Pond, Reading } from './domain';
import type { ParamKey } from './params';

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

type Quick = Pick<Record<ParamKey, number>, 'DO' | 'pH' | 'Suhu' | 'Salinitas' | 'Kecerahan'>;
type Kit = Pick<Record<ParamKey, number>, 'Amonia' | 'Nitrit' | 'Nitrat' | 'Alkalinitas' | 'Kesadahan' | 'TOM' | 'Fosfat' | 'H2S' | 'Vibrio'>;

// Nilai terakhir per kolam. Status kolam DIHITUNG dari nilai ini (src/lib/domain.ts → evaluate):
// A3 kritis (DO), B2 waspada (Vibrio), C1 waspada (amonia), D2 waspada (alkalinitas), sisanya sehat.
const latestQuick: Record<string, Quick> = {
  A3: { DO: 4.1, pH: 7.9, Suhu: 30.5, Salinitas: 22, Kecerahan: 35 },
  B2: { DO: 5.3, pH: 8.4, Suhu: 29.8, Salinitas: 21, Kecerahan: 40 },
  C1: { DO: 5.1, pH: 7.8, Suhu: 30.1, Salinitas: 22, Kecerahan: 38 },
  D2: { DO: 5.4, pH: 8.3, Suhu: 29.6, Salinitas: 20, Kecerahan: 42 },
  A1: { DO: 5.8, pH: 7.8, Suhu: 29.4, Salinitas: 21, Kecerahan: 40 },
  A2: { DO: 5.9, pH: 7.7, Suhu: 29.5, Salinitas: 22, Kecerahan: 45 },
  B1: { DO: 6.0, pH: 7.9, Suhu: 29.2, Salinitas: 21, Kecerahan: 40 },
  B3: { DO: 5.7, pH: 7.8, Suhu: 29.7, Salinitas: 21, Kecerahan: 44 },
  C2: { DO: 6.1, pH: 7.6, Suhu: 29.3, Salinitas: 22, Kecerahan: 42 },
  C3: { DO: 5.8, pH: 7.8, Suhu: 29.6, Salinitas: 22, Kecerahan: 40 },
  D1: { DO: 6.2, pH: 7.7, Suhu: 29.1, Salinitas: 20, Kecerahan: 46 },
  D3: { DO: 5.9, pH: 7.8, Suhu: 29.4, Salinitas: 20, Kecerahan: 41 },
};

const normalKit: Kit = { Amonia: 0.4, Nitrit: 0.15, Nitrat: 12, Alkalinitas: 140, Kesadahan: 2200, TOM: 65, Fosfat: 0.4, H2S: 0.004, Vibrio: 400 };
const kitOverride: Record<string, Partial<Kit>> = {
  A3: { TOM: 82, Amonia: 0.7 },
  B2: { Vibrio: 8500 },
  C1: { Amonia: 1.3, Nitrit: 0.35 },
  D2: { Alkalinitas: 92 },
};

// Tren 6–7 hari ke belakang (indeks terakhir = nilai terbaru).
const DO_A3 = [5.5, 5.7, 5.9, 5.4, 4.9, 4.5, 4.1]; // turun 4 hari berturut-turut
const kitTrend: Record<string, Partial<Record<keyof Kit, number[]>>> = {
  B2: { Vibrio: [600, 900, 1500, 2600, 4800, 8500] },
  C1: { Amonia: [0.5, 0.6, 0.8, 0.9, 1.1, 1.3] },
  D2: { Alkalinitas: [130, 122, 115, 106, 99, 92] },
  A3: { TOM: [62, 66, 70, 74, 78, 82] },
};

const DAYS = ['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24'];
const wobble = [0.2, -0.1, 0.3, 0.1, -0.2, 0.1, 0];
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

function history(): Reading[] {
  const out: Reading[] = [];
  for (const pond of ponds) {
    const q = latestQuick[pond.id];
    const kit = { ...normalKit, ...kitOverride[pond.id] };
    DAYS.forEach((day, d) => {
      const last = d === DAYS.length - 1;
      out.push({
        id: `q-${pond.id}-${d}`,
        pondId: pond.id,
        at: `${day}T${last ? '06:42' : '06:30'}:00+07:00`,
        by: 'Shift pagi',
        synced: true,
        values: {
          DO: pond.id === 'A3' ? DO_A3[d] : round(q.DO + wobble[d], 1),
          pH: round(q.pH + (last ? 0 : wobble[d] / 2), 1),
          Suhu: round(q.Suhu + (last ? 0 : wobble[(d + 2) % 7]), 1),
          Salinitas: q.Salinitas,
          Kecerahan: q.Kecerahan + (last ? 0 : Math.round(wobble[d] * 10)),
        },
      });
      if (last) return; // uji kit hari ini belum dilakukan (jadwal sore)
      const values: Partial<Kit> = {};
      for (const k of Object.keys(kit) as (keyof Kit)[]) {
        const trend = kitTrend[pond.id]?.[k];
        values[k] = trend ? trend[d] : (k === 'Vibrio' || k === 'Kesadahan' ? kit[k] : round(kit[k] * (1 + wobble[d] / 4), 3));
      }
      out.push({ id: `k-${pond.id}-${d}`, pondId: pond.id, at: `${day}T14:00:00+07:00`, by: 'Uji kit sore', synced: true, values });
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
  labResults: [
    { pondId: null, marker: 'WSSV', result: 'Tidak terdeteksi', detected: false },
    { pondId: null, marker: 'AHPND', result: 'Tidak terdeteksi', detected: false },
    { pondId: null, marker: 'EHP', result: 'Tidak terdeteksi', detected: false },
    { pondId: 'B2', marker: 'Vibrio', result: 'Terdeteksi tinggi · Kolam B2', detected: true },
  ],
  riskScores: [
    { pondId: 'A3', score: 82, label: 'Tinggi', context: 'DO 4,1 mg/L · turun 4 hari berturut-turut' },
    { pondId: 'B2', score: 54, label: 'Sedang', context: 'Vibrio tinggi · pH 8,4' },
    { pondId: 'C1', score: 41, label: 'Sedang', context: 'Amonia naik ke 1,30 mg/L' },
    { pondId: 'A1', score: 18, label: 'Rendah', context: 'Semua parameter dalam batas' },
  ],
  recommendations: [
    { id: 'r1', icon: 'wind', text: 'Nyalakan kincir tambahan di Kolam A3 malam ini sampai DO kembali di atas 5,0 mg/L.' },
    { id: 'r2', icon: 'wheat', text: 'Kurangi pakan sore Kolam A3 sebesar 20% sampai tren DO berhenti turun.' },
    { id: 'r3', icon: 'flask', text: 'Ambil sampel ulang Vibrio di Kolam B2 dan kirim ke lab untuk konfirmasi.' },
    { id: 'r4', icon: 'shovel', text: 'Sipon dasar Kolam C1 dan kurangi pakan 20% sampai amonia di bawah 1,0 mg/L.' },
    { id: 'r5', icon: 'droplet', text: 'Tebar kapur dolomit di Kolam D2 malam ini untuk menaikkan alkalinitas.' },
  ],
  tasks: [
    { id: 't1', title: 'Cek kualitas air pagi semua kolam', time: '06.30 WIB', note: 'Semua kolam', done: false },
    { id: 't2', title: 'Pakan pagi — total 45 kg', time: '07.00 WIB', note: 'Pakan pagi', done: false },
    { id: 't3', title: 'Ambil sampel lab DOC 42 — A3 & B2', time: '10.00 WIB', note: 'Lab DOC 42', done: false },
    { id: 't4', title: 'Uji kit sore (amonia, nitrit, alkalinitas)', time: '14.00 WIB', note: 'Semua kolam', done: false },
  ],
  feedTodayKg: 128,
};
