// Model data aplikasi. Bentuk ini juga kontrak dengan backend (lihat docs/API-CONTRACT.md).
import { PARAM_ORDER, fmtParam, optionOf, shortName, type ParamKey } from './params';

export type Role = 'teknisi' | 'pemilik';
export type PondStatus = 'SEHAT' | 'WASPADA' | 'KRITIS';

export type User = { id: string; name: string; role: Role };

export type Farm = { id: string; name: string; initials: string; bloks: string[] };

export type Pond = {
  id: string;            // 'A3'
  name: string;          // 'Kolam A3'
  blok: string;          // 'A'
  docDays: number;       // umur budidaya (Day of Culture), hari
  srPercent: number | null;     // survival rate dari sampling manual
  areaM2: number;
  stockedCount: number | null;  // jumlah benur ditebar (ekor)
  abwGram: number | null;       // berat rata-rata udang dari sampling terakhir (gram)
};

/** Satu kali pengamatan visual teknisi. `values` berisi kode pilihan per pengamatan (lihat params.ts). */
export type Reading = {
  id: string;
  pondId: string;
  at: string;            // ISO 8601
  by: string;            // nama petugas / shift
  values: Partial<Record<ParamKey, number>>;
  synced: boolean;       // false = baru tersimpan di perangkat
};

export type Task = { id: string; title: string; time: string; note: string; done: boolean };

export type RiskScore = { pondId: string; score: number; label: 'Tinggi' | 'Sedang' | 'Rendah'; context: string };

export type RecIcon = 'wheat' | 'flask' | 'droplet' | 'shovel' | 'eye';
export type Recommendation = { id: string; icon: RecIcon; text: string };

export type FarmSnapshot = {
  farm: Farm;
  ponds: Pond[];
  readings: Reading[];   // riwayat pengamatan, termasuk yang terbaru
  riskScores: RiskScore[];
  recommendations: Recommendation[];
  tasks: Task[];
  feedTodayKg: number;
};

export type Issue = {
  param: ParamKey;
  value: number;          // kode pilihan
  severity: Exclude<PondStatus, 'SEHAT'>;
};

export type MitigationStep = { title: string; detail?: string };

export type Mitigation = {
  severity: PondStatus;
  summary: string;
  steps: MitigationStep[];
  /** 'ai' = dari endpoint AI tim; 'lokal' = aturan bawaan di aplikasi (offline). */
  source: 'ai' | 'lokal';
};

export const statusRank: Record<PondStatus, number> = { KRITIS: 0, WASPADA: 1, SEHAT: 2 };

/** Pengamatan yang tidak sehat, yang paling parah dulu. Status tiap pilihan ada di params.ts. */
export function evaluate(values: Reading['values']): Issue[] {
  const issues: Issue[] = [];
  for (const key of PARAM_ORDER) {
    const v = values[key];
    if (v === undefined) continue;
    const status = optionOf(key, v)?.status ?? 'SEHAT';
    if (status !== 'SEHAT') issues.push({ param: key, value: v, severity: status });
  }
  return issues.sort((a, b) => statusRank[a.severity] - statusRank[b.severity]);
}

export function statusOf(issues: Issue[]): PondStatus {
  if (issues.some((i) => i.severity === 'KRITIS')) return 'KRITIS';
  if (issues.length) return 'WASPADA';
  return 'SEHAT';
}

export function paramStatus(key: ParamKey, value: number): PondStatus {
  return optionOf(key, value)?.status ?? 'SEHAT';
}

/** "Udang menyala: banyak" · "Warna air: hijau pekat / kebiruan" */
export function describeIssue(i: Issue): string {
  return `${shortName(i.param)}: ${fmtParam(i.param, i.value).toLowerCase()}`;
}

export function biomassKg(p: Pond): number | null {
  if (p.stockedCount == null || p.srPercent == null || p.abwGram == null) return null;
  return Math.round((p.stockedCount * (p.srPercent / 100) * p.abwGram) / 1000);
}

/** Jam WIB "HH.MM" dari ISO. */
export function wibTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta',
  }).replace(':', '.');
}

/** "Sab, 24 Okt" (WIB) */
export function wibDay(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta',
  });
}

/** "Minggu, 25 Okt" untuk besok (WIB). */
export function tomorrowLabel(now = new Date()): string {
  return new Date(now.getTime() + 86_400_000).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta',
  });
}
