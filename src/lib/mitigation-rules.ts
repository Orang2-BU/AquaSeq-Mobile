// Saran mitigasi cepat bawaan aplikasi. Dipakai saat offline atau saat endpoint AI tim
// belum tersedia/gagal. Isinya tindakan manual umum — dosis & prosedur mengikuti SOP tambak.
import { describeIssue, statusOf, type Issue, type Mitigation, type MitigationStep, type Pond } from './domain';
import type { ParamKey } from './params';

type StepsFor = (i: Issue, pond: Pond) => MitigationStep[];

const RULES: Partial<Record<ParamKey, StepsFor>> = {
  Vibrio: (i, p) => [
    { title: `Kurangi pakan ${p.name} 20–30%`, detail: 'Sisa pakan memberi makan Vibrio; tunda pakan malam sampai hitungan turun.' },
    { title: 'Tebar probiotik Bacillus malam ini', detail: 'Dosis mengikuti SOP; Bacillus bersaing langsung dengan Vibrio.' },
    { title: 'Sipon dasar kolam', detail: 'Kurangi lumpur dan bahan organik tempat Vibrio berkembang.' },
    { title: 'Hitung ulang Vibrio besok pagi (TCBS)', detail: i.severity === 'KRITIS' ? 'Bila masih naik, ganti air 10–20% dan amati udang lemas di pinggir kolam.' : undefined },
  ],
  VibrioHijau: (_i, p) => [
    { title: `Kurangi pakan ${p.name} 20–30%` },
    { title: 'Tebar probiotik Bacillus malam ini' },
    { title: 'Kirim sampel udang & air ke lab untuk qPCR AHPND', detail: 'Vibrio koloni hijau sering terkait V. parahaemolyticus.' },
  ],
  TotalBakteri: () => [
    { title: 'Sipon dasar kolam' },
    { title: 'Kurangi pakan 10–20%' },
    { title: 'Tebar probiotik pengurai bahan organik' },
  ],
  Bacillus: () => [
    { title: 'Tebar ulang probiotik Bacillus', detail: 'Populasi probiotik rendah membuat Vibrio mudah naik.' },
    { title: 'Hitung ulang Bacillus 2–3 hari lagi' },
  ],
  Plankton: (i) => i.direction === 'rendah'
    ? [
      { title: 'Tebar fermentasi/pupuk untuk menumbuhkan plankton', detail: 'Ikuti SOP pemupukan tambak.' },
      { title: 'Hitung ulang plankton 2 hari lagi' },
    ]
    : [
      { title: 'Ganti air 10% untuk mengurangi plankton terlalu pekat' },
      { title: 'Kurangi pakan 10% hari ini' },
    ],
  Diatom: () => [
    { title: 'Tebar pupuk silikat untuk menumbuhkan diatom', detail: 'Ikuti SOP pemupukan tambak.' },
  ],
  BGA: (i) => [
    { title: `Ganti air ${i.severity === 'KRITIS' ? '15–20%' : '10–15%'} untuk menurunkan alga biru-hijau` },
    { title: 'Kurangi pakan 10–20% sampai dominasi turun' },
    { title: 'Tebar probiotik & pupuk diatom', detail: 'Arahkan komposisi plankton ke diatom dan alga hijau.' },
  ],
  Dino: () => [
    { title: 'Ganti air 10–15%' },
    { title: 'Kurangi pakan 10% dan hitung ulang plankton besok' },
  ],
  WSSV: (_i, p) => [
    { title: `Isolasi ${p.name}: jangan pindahkan air, alat, atau orang ke kolam lain`, detail: 'Gunakan alat khusus dan desinfeksi sepatu/tangan.' },
    { title: 'Hubungi pemilik & ahli penyakit hari ini' },
    { title: 'Siapkan rencana panen darurat bila udang mulai mati' },
  ],
  AHPND: (_i, p) => [
    { title: `Isolasi ${p.name} dan hentikan pembuangan air ke saluran bersama` },
    { title: 'Kurangi pakan 30–50% dan tebar probiotik' },
    { title: 'Hubungi pemilik & ahli penyakit hari ini' },
  ],
  EHP: (_i, p) => [
    { title: `Pantau pertumbuhan ${p.name}: sampling berat udang minggu ini`, detail: 'EHP memperlambat pertumbuhan; ukuran udang jadi tidak seragam.' },
    { title: 'Jangan pakai air atau alat dari kolam ini untuk kolam lain' },
    { title: 'Kirim sampel ulang ke lab untuk konfirmasi' },
  ],
  IHHNV: (_i, p) => [
    { title: `Pantau udang kerdil/bengkok di ${p.name}` },
    { title: 'Catat asal benur untuk siklus berikutnya' },
  ],
};

export function localMitigation(pond: Pond, issues: Issue[]): Mitigation {
  const severity = statusOf(issues);
  if (!issues.length) {
    return {
      severity,
      summary: `${pond.name} dalam batas aman. Lanjutkan jadwal hitung bakteri & plankton seperti biasa.`,
      steps: [{ title: 'Hitung ulang sesuai jadwal berikutnya' }],
      source: 'lokal',
    };
  }

  const seen = new Set<string>();
  const steps: MitigationStep[] = [];
  for (const issue of issues) {
    for (const step of RULES[issue.param]?.(issue, pond) ?? []) {
      // Langkah serupa dari beberapa masalah (mis. "kurangi pakan") cukup sekali.
      const key = step.title.toLowerCase().replace(/kolam \w+/g, '').replace(/[\d–%-]+/g, '').trim().slice(0, 18);
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
