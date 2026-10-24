// Saran mitigasi cepat bawaan aplikasi. Dipakai saat offline atau saat endpoint AI tim
// belum tersedia/gagal. Isinya tindakan manual umum — dosis & prosedur mengikuti SOP tambak.
import { describeIssue, statusOf, type Issue, type Mitigation, type MitigationStep, type Pond } from './domain';
import type { ParamKey } from './params';

type StepsFor = (i: Issue, pond: Pond) => MitigationStep[];

const RULES: Partial<Record<ParamKey, StepsFor>> = {
  DO: (i, p) => [
    { title: `Nyalakan semua kincir di ${p.name} sekarang`, detail: 'Tambah kincir cadangan bila ada, terutama mulai sore sampai pagi.' },
    { title: 'Kurangi pakan berikutnya 20–30%', detail: 'Tunda pakan malam sampai DO kembali di atas batas.' },
    { title: 'Cek ulang DO 1 jam lagi', detail: i.severity === 'KRITIS' ? 'Bila masih turun, ganti air 10–20% secara bertahap.' : undefined },
  ],
  pH: (i) => i.direction === 'tinggi'
    ? [
      { title: 'Tambah air baru 5–10% untuk menurunkan pH' },
      { title: 'Tunda pemberian kapur hari ini' },
      { title: 'Cek ulang pH sore hari', detail: 'Selisih pH pagi–sore idealnya di bawah 0,5.' },
    ]
    : [
      { title: 'Tebar kapur dolomit malam hari', detail: 'Dosis mengikuti SOP; cek alkalinitas sebelum menebar.' },
      { title: 'Cek ulang pH besok pagi' },
    ],
  Suhu: (i) => i.direction === 'tinggi'
    ? [
      { title: 'Tambah kedalaman air bila memungkinkan' },
      { title: 'Nyalakan kincir untuk sirkulasi' },
      { title: 'Geser jadwal pakan ke pagi/sore, kurangi pakan siang' },
    ]
    : [
      { title: 'Kurangi pakan 10–20% sampai suhu naik' },
      { title: 'Cek ulang suhu siang hari' },
    ],
  Salinitas: (i) => [
    { title: i.direction === 'tinggi' ? 'Tambah air tawar bertahap' : 'Tambah air laut bertahap', detail: 'Maksimal 2–3 ppt per hari supaya udang tidak stres.' },
    { title: 'Cek ulang salinitas besok pagi' },
  ],
  Kecerahan: (i) => i.direction === 'rendah'
    ? [
      { title: 'Ganti air 10% untuk mengurangi plankton pekat' },
      { title: 'Kurangi pakan 10% hari ini' },
    ]
    : [
      { title: 'Tebar fermentasi/pupuk untuk menumbuhkan plankton', detail: 'Ikuti SOP pemupukan tambak.' },
    ],
  Amonia: () => [
    { title: 'Kurangi pakan 20–30%' },
    { title: 'Sipon dasar kolam' },
    { title: 'Ganti air 10–20% dan tebar probiotik' },
  ],
  Nitrit: () => [
    { title: 'Kurangi pakan 20%' },
    { title: 'Tebar probiotik nitrifikasi' },
    { title: 'Ganti air 10% bila nitrit belum turun besok' },
  ],
  Nitrat: () => [{ title: 'Ganti air 10% dan kurangi pakan 10%' }],
  Alkalinitas: (i) => i.direction === 'rendah'
    ? [
      { title: 'Tebar kapur (dolomit/CaCO₃) malam hari', detail: 'Dosis mengikuti SOP; ukur ulang besok pagi.' },
    ]
    : [{ title: 'Hentikan pengapuran sementara' }],
  Kesadahan: () => [{ title: 'Tebar kapur dolomit sesuai SOP untuk menaikkan kesadahan' }],
  TOM: () => [
    { title: 'Sipon dasar kolam' },
    { title: 'Tebar probiotik pengurai bahan organik' },
    { title: 'Kurangi pakan 10–20%' },
  ],
  Fosfat: () => [{ title: 'Kurangi pakan 10% dan ganti air 10%' }],
  H2S: () => [
    { title: 'Sipon dasar kolam segera' },
    { title: 'Nyalakan kincir dekat dasar untuk menambah oksigen dasar' },
    { title: 'Tebar kapur sesuai SOP' },
  ],
  Vibrio: (_i, p) => [
    { title: 'Kurangi pakan 20%' },
    { title: 'Tebar probiotik Bacillus' },
    { title: `Ambil sampel ulang Vibrio ${p.name} untuk lab` },
  ],
};

export function localMitigation(pond: Pond, issues: Issue[]): Mitigation {
  const severity = statusOf(issues);
  if (!issues.length) {
    return {
      severity,
      summary: `${pond.name} dalam batas aman. Lanjutkan jadwal cek dan pakan seperti biasa.`,
      steps: [{ title: 'Cek ulang sesuai jadwal berikutnya' }],
      source: 'lokal',
    };
  }

  const seen = new Set<string>();
  const steps: MitigationStep[] = [];
  for (const issue of issues) {
    for (const step of RULES[issue.param]?.(issue, pond) ?? []) {
      // Langkah serupa dari beberapa masalah (mis. "kurangi pakan") cukup sekali.
      const key = step.title.toLowerCase().replace(/[\d–%-]+/g, '').trim().slice(0, 18);
      if (seen.has(key)) continue;
      seen.add(key);
      steps.push(step);
    }
  }

  const lead = issues.slice(0, 2).map(describeIssue).join('; ');
  return {
    severity,
    summary: `${pond.name} ${severity === 'KRITIS' ? 'kritis' : 'perlu diwaspadai'}: ${lead}.`,
    steps: steps.slice(0, 5),
    source: 'lokal',
  };
}
