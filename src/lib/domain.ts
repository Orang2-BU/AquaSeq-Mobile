// Model data aplikasi. Bentuk ini juga kontrak dengan backend (lihat docs/API-CONTRACT.md).
import { PARAMS, PARAM_ORDER, fmtParam, shortName, type ParamKey } from './params';

export type Role = 'teknisi' | 'pemilik';
export type PondStatus = 'SEHAT' | 'WASPADA' | 'KRITIS';

export type User = { id: string; name: string; role: Role };

export type Farm = { id: string; name: string; initials: string; bloks: string[] };

export type Pond = {
  id: string;            // 'A3'
  name: string;          // 'Kolam A3'
  blok: string;          // 'A'
  docDays: number;       // umur budidaya (Day of Culture), hari
  srPercent: number;     // survival rate dari sampling manual
  areaM2: number;
  stockedCount: number;  // jumlah benur ditebar (ekor)
  abwGram: number;       // berat rata-rata udang dari sampling terakhir (gram)
};

/** Satu kali pengecekan manual oleh teknisi atau hasil lab. */
export type Reading = {
  id: string;
  pondId: string;
  at: string;            // ISO 8601
  by: string;            // nama petugas / "Lab"
  values: Partial<Record<ParamKey, number>>;
  synced: boolean;       // false = baru tersimpan di perangkat
};

export type Task = { id: string; title: string; time: string; note: string; done: boolean };

export type RiskScore = { pondId: string; score: number; label: 'Tinggi' | 'Sedang' | 'Rendah'; context: string };

export type LabResult = { pondId: string | null; marker: string; result: string; detected: boolean };

export type RecIcon = 'wind' | 'wheat' | 'flask' | 'droplet' | 'shovel';
export type Recommendation = { id: string; icon: RecIcon; text: string };

export type FarmSnapshot = {
  farm: Farm;
  ponds: Pond[];
  readings: Reading[];   // riwayat pengecekan, termasuk yang terbaru
  labResults: LabResult[];
  labTitle: string;      // mis. "Hasil Lab qPCR · DOC 42"
  riskScores: RiskScore[];
  recommendations: Recommendation[];
  tasks: Task[];
  feedTodayKg: number;
};

export type Issue = {
  param: ParamKey;
  value: number;
  severity: Exclude<PondStatus, 'SEHAT'>;
  direction: 'rendah' | 'tinggi';
  limit: number;
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

/** Nilai di luar batas pada satu pengecekan, yang paling parah dulu. */
export function evaluate(values: Reading['values']): Issue[] {
  const issues: Issue[] = [];
  for (const key of PARAM_ORDER) {
    const v = values[key];
    if (v === undefined) continue;
    const { warn, crit } = PARAMS[key].limits;
    if (crit.min !== undefined && v < crit.min) issues.push({ param: key, value: v, severity: 'KRITIS', direction: 'rendah', limit: warn.min ?? crit.min });
    else if (crit.max !== undefined && v > crit.max) issues.push({ param: key, value: v, severity: 'KRITIS', direction: 'tinggi', limit: warn.max ?? crit.max });
    else if (warn.min !== undefined && v < warn.min) issues.push({ param: key, value: v, severity: 'WASPADA', direction: 'rendah', limit: warn.min });
    else if (warn.max !== undefined && v > warn.max) issues.push({ param: key, value: v, severity: 'WASPADA', direction: 'tinggi', limit: warn.max });
  }
  return issues.sort((a, b) => statusRank[a.severity] - statusRank[b.severity]);
}

export function statusOf(issues: Issue[]): PondStatus {
  if (issues.some((i) => i.severity === 'KRITIS')) return 'KRITIS';
  if (issues.length) return 'WASPADA';
  return 'SEHAT';
}

export function paramStatus(key: ParamKey, value: number): PondStatus {
  return statusOf(evaluate({ [key]: value }));
}

/** "DO 4,1 mg/L di bawah batas 5,0" */
export function describeIssue(i: Issue): string {
  return `${shortName(i.param)} ${fmtParam(i.param, i.value)} ${i.direction === 'rendah' ? 'di bawah' : 'di atas'} batas ${fmtParam(i.param, i.limit, false)}`;
}

export function biomassKg(p: Pond): number {
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
