// Saran mitigasi cepat bawaan aplikasi. Dipakai saat offline atau saat endpoint AI tim
// belum tersedia/gagal. Isinya tindakan manual umum — dosis & prosedur mengikuti SOP tambak.
import { describeIssue, statusOf, type Issue, type Mitigation, type MitigationStep, type Pond } from './domain';
import type { ParamKey } from './params';

type StepsFor = (i: Issue, pond: Pond) => MitigationStep[];

const RULES: Record<ParamKey, StepsFor> = {
  WarnaAir: (i) => {
    switch (i.value) {
      case 2: // bening
        return [
          { title: 'Tebar fermentasi/pupuk untuk menumbuhkan plankton', detail: 'Ikuti SOP pemupukan tambak.' },
          { title: 'Lihat lagi warna air 2 hari ke depan' },
        ];
      case 3: // hijau pekat / kebiruan
        return [
          { title: 'Ganti air 10–15%', detail: 'Kurangi alga biru-hijau yang bisa meracuni udang.' },
          { title: 'Kurangi pakan 10–20% sampai warna air membaik' },
          { title: 'Tebar probiotik untuk menyeimbangkan plankton' },
        ];
      case 4: // putih susu / keruh
        return [
          { title: 'Ganti air 10–20%' },
          { title: 'Kurangi pakan 20% dan sipon dasar kolam', detail: 'Air keruh putih tanda bakteri berlebih dari sisa pakan.' },
        ];
      case 5: // merah kecoklatan
        return [
          { title: 'Ganti air 20% hari ini', detail: 'Alga merah bisa membuat udang stres dan mati mendadak.' },
          { title: 'Kurangi pakan 30% dan amati udang di pinggir kolam' },
          { title: 'Kabari pemilik tambak' },
        ];
      default:
        return [];
    }
  },
  LapisanAlga: () => [
    { title: 'Serok lapisan alga di sudut kolam pagi ini' },
    { title: 'Ganti air 10% dan kurangi pakan 10%' },
  ],
  UdangMenyala: (i, p) => [
    { title: `Kurangi pakan ${p.name} 20–30%`, detail: 'Sisa pakan memberi makan bakteri berpendar.' },
    { title: 'Tebar probiotik malam ini', detail: 'Dosis mengikuti SOP tambak.' },
    { title: 'Sipon dasar kolam' },
    { title: 'Senter lagi besok malam', detail: i.severity === 'KRITIS' ? 'Bila masih banyak, ganti air 10–20% dan angkat udang yang lemas.' : undefined },
  ],
  KotoranPutih: (_i, p) => [
    { title: `Puasakan ${p.name} satu kali pakan, lalu beri pakan 50%` },
    { title: 'Serok kotoran putih yang mengambang' },
    { title: 'Tebar probiotik malam ini' },
  ],
  EkorMerah: () => [
    { title: 'Angkat dan buang udang yang lemas atau mati' },
    { title: 'Kurangi pakan 20% dan tebar probiotik' },
    { title: 'Ganti air 10–15%' },
  ],
  InsangHitam: () => [
    { title: 'Sipon dasar kolam', detail: 'Insang hitam karena dasar kolam kotor.' },
    { title: 'Ganti air 10–15% dan kurangi pakan 10%' },
    { title: 'Lihat lagi insang udang 2 hari ke depan' },
  ],
  LumutTubuh: () => [
    { title: 'Ganti air 10–20% untuk memacu udang ganti kulit' },
    { title: 'Tebar kapur sesuai SOP', detail: 'Udang yang ganti kulit melepas lumut di tubuhnya.' },
    { title: 'Kurangi pakan 10%' },
  ],
};

export function localMitigation(pond: Pond, issues: Issue[]): Mitigation {
  const severity = statusOf(issues);
  if (!issues.length) {
    return {
      severity,
      summary: `${pond.name} dalam batas aman. Lanjutkan cek warna air, anco, dan senter malam seperti biasa.`,
      steps: [{ title: 'Cek lagi sesuai jadwal berikutnya' }],
      source: 'lokal',
    };
  }

  const seen = new Set<string>();
  const steps: MitigationStep[] = [];
  for (const issue of issues) {
    for (const step of RULES[issue.param](issue, pond)) {
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
