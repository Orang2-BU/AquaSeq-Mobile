// Parameter MIKROBA kolam yang diinput mandiri oleh teknisi / lab (hitung koloni TCBS & TPC,
// hitung plankton di mikroskop, hasil qPCR). Tidak ada parameter sensor (pH, DO, suhu, dll.).
// Batas di sini adalah nilai awal — sesuaikan dengan SOP tambak atau kirim dari backend.

export type ParamKey =
  | 'Vibrio' | 'VibrioHijau' | 'TotalBakteri' | 'Bacillus'
  | 'Plankton' | 'Diatom' | 'AlgaHijau' | 'BGA' | 'Dino'
  | 'WSSV' | 'AHPND' | 'EHP' | 'IHHNV';

export type ParamGroup = 'Bakteri' | 'Plankton' | 'Patogen';

/** Batas: di luar `warn` = WASPADA, di luar `crit` = KRITIS. */
export type Limits = {
  warn: { min?: number; max?: number };
  crit: { min?: number; max?: number };
};

export type ParamConfig = {
  key: ParamKey;
  label: string;
  short: string;
  unit: string;
  /** 'number' = hitungan; 'binary' = hasil qPCR (0 = negatif, 1 = positif). */
  kind: 'number' | 'binary';
  decimals: number;
  step: number;
  min: number;
  max: number;
  group: ParamGroup;
  /** Diisi teknisi di "Cek cepat". Sisanya di bagian opsional. */
  quick: boolean;
  limits: Limits;
};

const p = (c: ParamConfig) => c;
const binary = (key: ParamKey, label: string, severe: boolean): ParamConfig => ({
  key, label, short: key, unit: '', kind: 'binary', decimals: 0, step: 1, min: 0, max: 1, group: 'Patogen', quick: false,
  // Positif = di atas 0,5. WSSV & AHPND langsung kritis; EHP & IHHNV waspada.
  limits: severe ? { warn: { max: 0.5 }, crit: { max: 0.5 } } : { warn: { max: 0.5 }, crit: {} },
});

export const PARAMS: Record<ParamKey, ParamConfig> = {
  Vibrio: p({ key: 'Vibrio', label: 'Total Vibrio (TCBS)', short: 'Vibrio', unit: 'CFU/mL', kind: 'number', decimals: 0, step: 100, min: 0, max: 10_000_000, group: 'Bakteri', quick: true,
    limits: { warn: { max: 1_000 }, crit: { max: 10_000 } } }),
  VibrioHijau: p({ key: 'VibrioHijau', label: 'Vibrio koloni hijau', short: 'Vibrio hijau', unit: 'CFU/mL', kind: 'number', decimals: 0, step: 10, min: 0, max: 1_000_000, group: 'Bakteri', quick: true,
    limits: { warn: { max: 100 }, crit: { max: 1_000 } } }),
  TotalBakteri: p({ key: 'TotalBakteri', label: 'Total bakteri (TPC)', short: 'Total bakteri', unit: 'CFU/mL', kind: 'number', decimals: 0, step: 10_000, min: 0, max: 100_000_000, group: 'Bakteri', quick: false,
    limits: { warn: { max: 1_000_000 }, crit: { max: 10_000_000 } } }),
  Bacillus: p({ key: 'Bacillus', label: 'Probiotik Bacillus', short: 'Bacillus', unit: 'CFU/mL', kind: 'number', decimals: 0, step: 1_000, min: 0, max: 100_000_000, group: 'Bakteri', quick: false,
    limits: { warn: { min: 10_000 }, crit: { min: 1_000 } } }),
  Plankton: p({ key: 'Plankton', label: 'Total plankton', short: 'Plankton', unit: 'sel/mL', kind: 'number', decimals: 0, step: 5_000, min: 0, max: 10_000_000, group: 'Plankton', quick: true,
    limits: { warn: { min: 50_000, max: 1_000_000 }, crit: { min: 10_000, max: 3_000_000 } } }),
  Diatom: p({ key: 'Diatom', label: 'Diatom', short: 'Diatom', unit: '%', kind: 'number', decimals: 0, step: 1, min: 0, max: 100, group: 'Plankton', quick: false,
    limits: { warn: { min: 20 }, crit: { min: 10 } } }),
  AlgaHijau: p({ key: 'AlgaHijau', label: 'Alga hijau (Chlorophyta)', short: 'Alga hijau', unit: '%', kind: 'number', decimals: 0, step: 1, min: 0, max: 100, group: 'Plankton', quick: false,
    limits: { warn: {}, crit: {} } }),
  BGA: p({ key: 'BGA', label: 'Alga biru-hijau (BGA)', short: 'Alga biru-hijau', unit: '%', kind: 'number', decimals: 0, step: 1, min: 0, max: 100, group: 'Plankton', quick: true,
    limits: { warn: { max: 20 }, crit: { max: 40 } } }),
  Dino: p({ key: 'Dino', label: 'Dinoflagellata', short: 'Dinoflagellata', unit: '%', kind: 'number', decimals: 0, step: 1, min: 0, max: 100, group: 'Plankton', quick: false,
    limits: { warn: { max: 10 }, crit: { max: 20 } } }),
  WSSV: binary('WSSV', 'WSSV (bintik putih)', true),
  AHPND: binary('AHPND', 'AHPND / EMS', true),
  EHP: binary('EHP', 'EHP (mikrosporidia)', false),
  IHHNV: binary('IHHNV', 'IHHNV', false),
};

export const PARAM_ORDER: ParamKey[] = [
  'Vibrio', 'VibrioHijau', 'TotalBakteri', 'Bacillus',
  'Plankton', 'Diatom', 'AlgaHijau', 'BGA', 'Dino',
  'WSSV', 'AHPND', 'EHP', 'IHHNV',
];

export const QUICK_PARAMS = PARAM_ORDER.filter((k) => PARAMS[k].quick);
/** Opsional di Cek Kolam: hitungan tambahan (bukan cek cepat, bukan qPCR). */
export const EXTRA_PARAMS = PARAM_ORDER.filter((k) => !PARAMS[k].quick && PARAMS[k].kind === 'number');
export const PATHOGEN_PARAMS = PARAM_ORDER.filter((k) => PARAMS[k].kind === 'binary');
/** Parameter angka yang bisa digambar trennya. */
export const NUMERIC_PARAMS = PARAM_ORDER.filter((k) => PARAMS[k].kind === 'number');

/** Nama pendek untuk kalimat & chip, mis. "Vibrio hijau". */
export function shortName(key: ParamKey): string {
  return PARAMS[key].short;
}

export function fmtParam(key: ParamKey, value: number, withUnit = true): string {
  const c = PARAMS[key];
  if (c.kind === 'binary') return value > 0.5 ? 'Positif' : 'Negatif';
  const n = value.toLocaleString('id-ID', { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
  if (!withUnit || !c.unit) return n;
  return c.unit === '%' ? `${n}%` : `${n} ${c.unit}`;
}

/** Teks batas aman singkat, mis. "≤ 1.000" atau "50.000–1.000.000". */
export function safeRange(key: ParamKey): string {
  const c = PARAMS[key];
  if (c.kind === 'binary') return 'Negatif';
  const { warn } = c.limits;
  const f = (v: number) => fmtParam(key, v, false);
  if (warn.min !== undefined && warn.max !== undefined) return `${f(warn.min)}–${f(warn.max)}`;
  if (warn.min !== undefined) return `≥ ${f(warn.min)}`;
  if (warn.max !== undefined) return `≤ ${f(warn.max)}`;
  return 'tidak dibatasi';
}

/** Kalimat batas lengkap untuk tabel & grafik, mis. "Batas aman ≤ 1.000 CFU/mL". */
export function limitText(key: ParamKey): string {
  const c = PARAMS[key];
  if (c.kind === 'binary') return 'Aman bila negatif';
  const { warn } = c.limits;
  if (warn.min === undefined && warn.max === undefined) return 'Komposisi, tanpa batas';
  const unit = !c.unit ? '' : c.unit === '%' ? '%' : ` ${c.unit}`;
  return `Batas aman ${safeRange(key)}${unit}`;
}
