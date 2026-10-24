// Pengamatan VISUAL teknisi: tanda bakteri & plankton yang terlihat mata telanjang dan langsung
// berpengaruh ke udang. Tanpa alat ukur, tanpa sensor, tanpa lab.
// Setiap pengamatan disimpan sebagai kode pilihan (angka) — lihat `options`.
import type { PondStatus } from './domain';

export type ParamKey =
  | 'WarnaAir' | 'LapisanAlga'
  | 'UdangMenyala' | 'KotoranPutih' | 'EkorMerah' | 'InsangHitam' | 'LumutTubuh';

export type ParamGroup = 'Air' | 'Udang';

export type ParamOption = { value: number; label: string; status: PondStatus; note?: string };

export type ParamConfig = {
  key: ParamKey;
  label: string;
  short: string;
  group: ParamGroup;
  /** Cara mengamati, ditampilkan di bawah nama pengamatan. */
  hint: string;
  options: ParamOption[];
};

const LEVELS: ParamOption[] = [
  { value: 0, label: 'Tidak ada', status: 'SEHAT' },
  { value: 1, label: 'Sedikit', status: 'WASPADA', note: 'beberapa ekor / sebagian kecil kolam' },
  { value: 2, label: 'Banyak', status: 'KRITIS', note: 'banyak udang / sebagian besar kolam' },
];

const level = (key: ParamKey, label: string, short: string, group: ParamGroup, hint: string): ParamConfig =>
  ({ key, label, short, group, hint, options: LEVELS });

export const PARAMS: Record<ParamKey, ParamConfig> = {
  WarnaAir: {
    key: 'WarnaAir', label: 'Warna air', short: 'Warna air', group: 'Air',
    hint: 'Lihat dari pinggir kolam saat siang. Warna air = jenis plankton yang dominan.',
    options: [
      { value: 0, label: 'Hijau cerah', status: 'SEHAT', note: 'alga hijau, baik untuk udang' },
      { value: 1, label: 'Coklat muda', status: 'SEHAT', note: 'diatom, pakan alami udang' },
      { value: 2, label: 'Bening', status: 'WASPADA', note: 'plankton terlalu sedikit' },
      { value: 3, label: 'Hijau pekat / kebiruan', status: 'WASPADA', note: 'alga biru-hijau berlebih' },
      { value: 4, label: 'Putih susu / keruh', status: 'WASPADA', note: 'bakteri berlebih' },
      { value: 5, label: 'Merah kecoklatan', status: 'KRITIS', note: 'alga merah (dinoflagellata)' },
    ],
  },
  LapisanAlga: level('LapisanAlga', 'Lapisan alga di permukaan', 'Lapisan alga', 'Air',
    'Lapisan hijau kebiruan seperti cat, biasanya menumpuk di sudut kolam searah angin.'),
  UdangMenyala: level('UdangMenyala', 'Udang menyala di malam hari', 'Udang menyala', 'Udang',
    'Senter kolam saat malam. Udang yang berpendar terkena bakteri Vibrio berpendar.'),
  KotoranPutih: level('KotoranPutih', 'Kotoran putih', 'Kotoran putih', 'Udang',
    'Kotoran putih mengambang di permukaan atau menempel di anco.'),
  EkorMerah: level('EkorMerah', 'Ekor & kaki memerah', 'Ekor merah', 'Udang',
    'Angkat anco, lihat ekor dan kaki renang udang.'),
  InsangHitam: level('InsangHitam', 'Insang hitam / kuning', 'Insang hitam', 'Udang',
    'Lihat bagian kepala udang dari samping; insang sehat berwarna bening.'),
  LumutTubuh: level('LumutTubuh', 'Lumut / lendir di tubuh udang', 'Lumut di tubuh', 'Udang',
    'Tubuh udang tampak berbulu halus, berlumut, atau berlendir.'),
};

export const PARAM_ORDER: ParamKey[] = [
  'WarnaAir', 'LapisanAlga',
  'UdangMenyala', 'KotoranPutih', 'EkorMerah', 'InsangHitam', 'LumutTubuh',
];

/** Pengamatan dengan pilihan Tidak ada / Sedikit / Banyak. */
export const LEVEL_PARAMS = PARAM_ORDER.filter((k) => PARAMS[k].options === LEVELS);

export function shortName(key: ParamKey): string {
  return PARAMS[key].short;
}

export function optionOf(key: ParamKey, value: number): ParamOption | undefined {
  return PARAMS[key].options.find((o) => o.value === value);
}

/** Label pilihan, mis. "Banyak" / "Hijau pekat / kebiruan". */
export function fmtParam(key: ParamKey, value: number): string {
  return optionOf(key, value)?.label ?? '—';
}
