// Beranda PEMILIK — ringkasan seluruh tambak yang lebih rinci: produksi, rata-rata bakteri &
// plankton semua kolam, hasil qPCR, kolam yang perlu perhatian beserta saran, dan pengecekan terakhir.
import { useRouter } from 'expo-router';
import { ArrowRight, FlaskConical } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeSlideIn } from '../FadeSlideIn';
import { MetricCard } from '../MetricCard';
import { statusMeta } from '../StatusIconBadge';
import { HomeHeader, PondMitigation, homeStyles } from './shared';
import { biomassKg, paramStatus, wibDay, wibTime } from '@/lib/domain';
import { pathogenSummary, type FarmView } from '@/lib/farm';
import { NUMERIC_PARAMS, PARAMS, fmtParam, limitText, shortName, type ParamKey } from '@/lib/params';
import { card, colors, fonts, monoNums } from '@/lib/theme';

const SUMMARY_PARAMS: ParamKey[] = NUMERIC_PARAMS;

export function PemilikHome({ farm }: { farm: FarmView }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const problems = farm.ponds.filter((p) => p.status !== 'SEHAT');
  const top = [...farm.riskScores].sort((a, b) => b.score - a.score)[0];
  const totalBiomass = farm.ponds.reduce((s, v) => s + biomassKg(v.pond), 0);
  const avgSr = farm.ponds.reduce((s, v) => s + v.pond.srPercent, 0) / Math.max(farm.ponds.length, 1);
  const totalArea = farm.ponds.reduce((s, v) => s + v.pond.areaM2, 0);
  const recent = [...farm.readings].reverse().slice(0, 5);
  const positives = pathogenSummary(farm).filter((x) => x.positives.length);

  let i = 0;
  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
      <FadeSlideIn index={i++}>
        <HomeHeader farm={farm} title="Ringkasan tambak" />
      </FadeSlideIn>

      <FadeSlideIn index={i++}>
        <MetricCard
          value={String(problems.length)}
          unit={`dari ${farm.ponds.length} kolam`}
          text={`perlu perhatian. Kritis ${farm.counts.KRITIS}, waspada ${farm.counts.WASPADA}, sehat ${farm.counts.SEHAT}.${top ? ` Skor risiko tertinggi ${farm.byId[top.pondId]?.pond.name ?? top.pondId} (${top.score}).` : ''}`}
        />
      </FadeSlideIn>

      <FadeSlideIn index={i++}>
        <View style={[card, styles.stats]}>
          <Stat label="Biomassa est." value={`${totalBiomass.toLocaleString('id-ID')} kg`} />
          <View style={styles.statDivider} />
          <Stat label="Rata-rata SR" value={`${avgSr.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`} />
          <View style={styles.statDivider} />
          <Stat label="Pakan hari ini" value={`${farm.feedTodayKg} kg`} />
        </View>
        <Text style={styles.statNote}>
          Luas total {(totalArea / 10_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} ha · biomassa dihitung dari tebar × SR × berat rata-rata sampling.
        </Text>
      </FadeSlideIn>

      {problems.length ? (
        <FadeSlideIn index={i++}>
          <Text style={homeStyles.section}>Kolam perlu perhatian</Text>
          <View style={homeStyles.list}>
            {problems.map((v) => <PondMitigation key={v.pond.id} view={v} farm={farm} />)}
          </View>
        </FadeSlideIn>
      ) : null}

      <FadeSlideIn index={i++}>
        <Text style={homeStyles.section}>Bakteri & plankton semua kolam</Text>
        <View style={card}>
          {SUMMARY_PARAMS.map((k, idx) => <AverageRow key={k} param={k} farm={farm} first={idx === 0} />)}
        </View>
      </FadeSlideIn>

      <FadeSlideIn index={i++}>
        <Pressable onPress={() => router.navigate('/laporan')} accessibilityRole="button" accessibilityLabel="Buka laporan qPCR" style={[card, styles.lab]}>
          <View style={styles.labIcon}><FlaskConical size={20} color={colors.navy} strokeWidth={2.4} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.labTitle}>{farm.labTitle}</Text>
            <Text style={styles.labSub}>
              {positives.length ? positives.map((x) => `${shortName(x.key)} positif: ${x.positives.map((id) => `Kolam ${id}`).join(', ')}`).join(' · ') : 'Tidak ada patogen terdeteksi'}
            </Text>
          </View>
          <ArrowRight size={20} color={colors.navy} strokeWidth={2.4} />
        </Pressable>
      </FadeSlideIn>

      <FadeSlideIn index={i++}>
        <Text style={homeStyles.section}>Pengecekan terakhir</Text>
        <View style={card}>
          {recent.map((r, idx) => (
            <View key={r.id} style={[styles.recent, idx > 0 && styles.divider]}>
              <Text style={styles.recentTime}>{wibTime(r.at)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentTitle}>{farm.byId[r.pondId]?.pond.name ?? r.pondId} · {Object.keys(r.values).length} parameter</Text>
                <Text style={styles.recentSub}>{wibDay(r.at)} · {r.by}{r.synced ? '' : ' · belum terkirim'}</Text>
              </View>
            </View>
          ))}
        </View>
      </FadeSlideIn>
    </ScrollView>
  );
}

function AverageRow({ param, farm, first }: { param: ParamKey; farm: FarmView; first: boolean }) {
  const vals = farm.ponds
    .map((v) => ({ id: v.pond.id, value: v.latest[param]?.value }))
    .filter((x): x is { id: string; value: number } => x.value !== undefined);
  if (!vals.length) return null;
  const avg = vals.reduce((s, x) => s + x.value, 0) / vals.length;
  const out = vals.filter((x) => paramStatus(param, x.value) !== 'SEHAT');
  const worst = out.some((x) => paramStatus(param, x.value) === 'KRITIS') ? 'KRITIS' : out.length ? 'WASPADA' : 'SEHAT';
  const m = statusMeta[worst];
  const Icon = m.icon;
  const c = PARAMS[param];
  return (
    <View style={[styles.avgRow, !first && styles.divider]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.avgLabel}>{c.label}</Text>
        <Text style={styles.avgSub}>{limitText(param)}</Text>
        <View style={styles.avgStatus}>
          <Icon size={13} color={m.color} strokeWidth={2.6} />
          <Text style={[styles.avgStatusText, { color: m.color }]}>
            {out.length ? `${out.length} kolam di luar batas: ${out.map((x) => x.id).join(', ')}` : 'Semua kolam dalam batas'}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.avgValue}>{fmtParam(param, avg, false)}</Text>
        <Text style={styles.avgUnit}>rata-rata{c.unit ? ` ${c.unit}` : ''}</Text>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 14 },
  stats: { flexDirection: 'row', paddingHorizontal: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: colors.border },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4, color: colors.slate, textAlign: 'center' },
  statValue: { fontFamily: fonts.monoBold, fontSize: 15, color: colors.ink, ...monoNums },
  statNote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.slate, marginTop: 8 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  avgRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'center' },
  avgLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  avgSub: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.slate },
  avgStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  avgStatusText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 12 },
  avgValue: { fontFamily: fonts.monoBold, fontSize: 20, color: colors.ink, ...monoNums },
  avgUnit: { fontFamily: fonts.mono, fontSize: 11, color: colors.slate },
  lab: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  labIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E6EEFF', alignItems: 'center', justifyContent: 'center' },
  labTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  labSub: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.slate },
  recent: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'center' },
  recentTime: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.navy, width: 48, ...monoNums },
  recentTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  recentSub: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.slate },
});
