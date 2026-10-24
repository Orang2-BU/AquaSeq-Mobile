// Parameter kualitas air yang diukur MANUAL oleh teknisi (test kit / lab), bukan sensor.
// Batas di sini adalah nilai awal yang wajar untuk udang vaname — sesuaikan dengan SOP tambak
// (atau biarkan backend mengirim batasnya sendiri lewat FarmSnapshot.thresholds).

export type ParamKey =
  | 'DO' | 'pH' | 'Suhu' | 'Salinitas' | 'Kecerahan'
  | 'Amonia' | 'Nitrit' | 'Nitrat' | 'Alkalinitas' | 'Kesadahan' | 'TOM' | 'Fosfat' | 'H2S'
  | 'Vibrio';

export type ParamGroup = 'Fisika' | 'Kimia' | 'Biologi';

/** Batas: di luar `warn` = WASPADA, di luar `crit` = KRITIS. */
export type Limits = {
  warn: { min?: number; max?: number };
  crit: { min?: number; max?: number };
};

export type ParamConfig = {
  key: ParamKey;
  label: string;
  unit: string;
  decimals: number;
  step: number;
  min: number;
  max: number;
  group: ParamGroup;
  /** Diisi teknisi di "Cek cepat". Yang lain ada di bagian "Uji kit / lab (opsional)". */
  quick: boolean;
  limits: Limits;
};

const p = (c: ParamConfig) => c;

export const PARAMS: Record<ParamKey, ParamConfig> = {
  DO: p({ key: 'DO', label: 'Oksigen terlarut (DO)', unit: 'mg/L', decimals: 1, step: 0.1, min: 0, max: 15, group: 'Kimia', quick: true,
    limits: { warn: { min: 5.0 }, crit: { min: 4.5 } } }),
  pH: p({ key: 'pH', label: 'pH', unit: '', decimals: 1, step: 0.1, min: 5, max: 10, group: 'Kimia', quick: true,
    limits: { warn: { min: 7.5, max: 8.5 }, crit: { min: 7.0, max: 9.0 } } }),
  Suhu: p({ key: 'Suhu', label: 'Suhu air', unit: '°C', decimals: 1, step: 0.5, min: 20, max: 38, group: 'Fisika', quick: true,
    limits: { warn: { min: 28, max: 32 }, crit: { min: 26, max: 34 } } }),
  Salinitas: p({ key: 'Salinitas', label: 'Salinitas', unit: 'ppt', decimals: 0, step: 1, min: 0, max: 45, group: 'Kimia', quick: true,
    limits: { warn: { min: 15, max: 30 }, crit: { min: 5, max: 40 } } }),
  Kecerahan: p({ key: 'Kecerahan', label: 'Kecerahan', unit: 'cm', decimals: 0, step: 5, min: 0, max: 150, group: 'Fisika', quick: false,
    limits: { warn: { min: 30, max: 60 }, crit: { min: 20, max: 80 } } }),
  Amonia: p({ key: 'Amonia', label: 'Amonia (TAN)', unit: 'mg/L', decimals: 2, step: 0.05, min: 0, max: 10, group: 'Kimia', quick: false,
    limits: { warn: { max: 1.0 }, crit: { max: 2.0 } } }),
  Nitrit: p({ key: 'Nitrit', label: 'Nitrit (NO₂)', unit: 'mg/L', decimals: 2, step: 0.05, min: 0, max: 10, group: 'Kimia', quick: false,
    limits: { warn: { max: 0.5 }, crit: { max: 1.0 } } }),
  Nitrat: p({ key: 'Nitrat', label: 'Nitrat (NO₃)', unit: 'mg/L', decimals: 1, step: 1, min: 0, max: 200, group: 'Kimia', quick: false,
    limits: { warn: { max: 60 }, crit: { max: 100 } } }),
  Alkalinitas: p({ key: 'Alkalinitas', label: 'Alkalinitas', unit: 'mg/L', decimals: 0, step: 5, min: 0, max: 300, group: 'Kimia', quick: false,
    limits: { warn: { min: 100, max: 200 }, crit: { min: 80, max: 250 } } }),
  Kesadahan: p({ key: 'Kesadahan', label: 'Kesadahan', unit: 'mg/L', decimals: 0, step: 50, min: 0, max: 8000, group: 'Kimia', quick: false,
    limits: { warn: { min: 500 }, crit: { min: 300 } } }),
  TOM: p({ key: 'TOM', label: 'Bahan organik (TOM)', unit: 'mg/L', decimals: 0, step: 5, min: 0, max: 300, group: 'Kimia', quick: false,
    limits: { warn: { max: 90 }, crit: { max: 120 } } }),
  Fosfat: p({ key: 'Fosfat', label: 'Fosfat (PO₄)', unit: 'mg/L', decimals: 2, step: 0.05, min: 0, max: 10, group: 'Kimia', quick: false,
    limits: { warn: { max: 1.0 }, crit: { max: 2.0 } } }),
  H2S: p({ key: 'H2S', label: 'Hidrogen sulfida (H₂S)', unit: 'mg/L', decimals: 3, step: 0.005, min: 0, max: 1, group: 'Kimia', quick: false,
    limits: { warn: { max: 0.01 }, crit: { max: 0.05 } } }),
  Vibrio: p({ key: 'Vibrio', label: 'Total Vibrio', unit: 'CFU/mL', decimals: 0, step: 100, min: 0, max: 1_000_000, group: 'Biologi', quick: false,
    limits: { warn: { max: 1000 }, crit: { max: 10000 } } }),
};

export const PARAM_ORDER: ParamKey[] = [
  'DO', 'pH', 'Suhu', 'Salinitas', 'Kecerahan',
  'Amonia', 'Nitrit', 'Nitrat', 'Alkalinitas', 'Kesadahan', 'TOM', 'Fosfat', 'H2S', 'Vibrio',
];

export const QUICK_PARAMS = PARAM_ORDER.filter((k) => PARAMS[k].quick);
export const KIT_PARAMS: ParamKey[] = ['Amonia', 'Nitrit', 'Alkalinitas', 'Kecerahan'];

/** Nama pendek untuk kalimat & chip, mis. "DO", "Amonia", "H₂S". */
export function shortName(key: ParamKey): string {
  return key === 'H2S' ? 'H₂S' : key;
}

export function fmtParam(key: ParamKey, value: number, withUnit = true): string {
  const c = PARAMS[key];
  const n = value.toLocaleString('id-ID', { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
  return withUnit && c.unit ? `${n} ${c.unit}` : n;
}

/** Teks batas aman singkat, mis. "5,0–" atau "7,5–8,5". */
export function safeRange(key: ParamKey): string {
  const { warn } = PARAMS[key].limits;
  const f = (v: number) => fmtParam(key, v, false);
  if (warn.min !== undefined && warn.max !== undefined) return `${f(warn.min)}–${f(warn.max)}`;
  if (warn.min !== undefined) return `≥ ${f(warn.min)}`;
  if (warn.max !== undefined) return `≤ ${f(warn.max)}`;
  return '—';
}
