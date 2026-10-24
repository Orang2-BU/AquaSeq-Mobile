// Beranda PEMILIK — ringkasan seluruh tambak yang lebih rinci: produksi, pengamatan tiap hal di
// semua kolam, kolam yang perlu perhatian beserta saran, dan pengamatan terakhir.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeSlideIn } from '../FadeSlideIn';
import { MetricCard } from '../MetricCard';
import { statusMeta } from '../StatusIconBadge';
import { HomeHeader, PondMitigation, homeStyles } from './shared';
import { biomassKg, statusRank, wibDay, wibTime } from '@/lib/domain';
import type { FarmView } from '@/lib/farm';
import { PARAMS, PARAM_ORDER, type ParamKey } from '@/lib/params';
import { card, colors, fonts, monoNums } from '@/lib/theme';

export function PemilikHome({ farm }: { farm: FarmView }) {
  const insets = useSafeAreaInsets();
  const problems = farm.ponds.filter((p) => p.status !== 'SEHAT');
  const top = [...farm.riskScores].sort((a, b) => b.score - a.score)[0];
  const totalBiomass = farm.ponds.reduce((s, v) => s + biomassKg(v.pond), 0);
  const avgSr = farm.ponds.reduce((s, v) => s + v.pond.srPercent, 0) / Math.max(farm.ponds.length, 1);
  const totalArea = farm.ponds.reduce((s, v) => s + v.pond.areaM2, 0);
  const recent = [...farm.readings].reverse().slice(0, 5);

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
        <Text style={homeStyles.section}>Pengamatan semua kolam</Text>
        <View style={card}>
          {PARAM_ORDER.map((k, idx) => <ObservationRow key={k} param={k} farm={farm} first={idx === 0} />)}
        </View>
      </FadeSlideIn>

      <FadeSlideIn index={i++}>
        <Text style={homeStyles.section}>Pengamatan terakhir</Text>
        <View style={card}>
          {recent.map((r, idx) => (
            <View key={r.id} style={[styles.recent, idx > 0 && styles.divider]}>
              <Text style={styles.recentTime}>{wibTime(r.at)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentTitle}>{farm.byId[r.pondId]?.pond.name ?? r.pondId} · {Object.keys(r.values).length} pengamatan</Text>
                <Text style={styles.recentSub}>{wibDay(r.at)} · {r.by}{r.synced ? '' : ' · belum terkirim'}</Text>
              </View>
            </View>
          ))}
        </View>
      </FadeSlideIn>
    </ScrollView>
  );
}

/** Satu pengamatan di semua kolam: berapa kolam bermasalah dan hasilnya per kolam. */
function ObservationRow({ param, farm, first }: { param: ParamKey; farm: FarmView; first: boolean }) {
  const checked = farm.ponds.filter((v) => v.latest[param] !== undefined);
  if (!checked.length) return null;
  const c = PARAMS[param];
  // Kelompokkan kolam per pilihan, yang bermasalah (kritis -> waspada) dulu.
  const groups = c.options
    .map((o) => ({ o, ids: checked.filter((v) => v.latest[param]!.value === o.value).map((v) => v.pond.id) }))
    .filter((g) => g.ids.length)
    .sort((a, b) => statusRank[a.o.status] - statusRank[b.o.status]);
  const bad = groups.filter((g) => g.o.status !== 'SEHAT');
  const badCount = bad.reduce((n, g) => n + g.ids.length, 0);
  const m = statusMeta[bad[0]?.o.status ?? 'SEHAT'];
  const Icon = m.icon;
  return (
    <View style={[styles.avgRow, !first && styles.divider]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.avgLabel}>{c.label}</Text>
        <View style={styles.avgStatus}>
          <Icon size={13} color={m.color} strokeWidth={2.6} />
          <Text style={[styles.avgStatusText, { color: m.color }]}>
            {bad.length ? bad.map((g) => `${g.o.label}: ${g.ids.join(', ')}`).join(' · ') : `Semua kolam: ${groups.map((g) => g.o.label.toLowerCase()).join(' / ')}`}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.avgValue, badCount ? { color: m.color } : null]}>{badCount}</Text>
        <Text style={styles.avgUnit}>dari {checked.length} kolam</Text>
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
  avgStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  avgStatusText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 12 },
  avgValue: { fontFamily: fonts.monoBold, fontSize: 20, color: colors.ink, ...monoNums },
  avgUnit: { fontFamily: fonts.mono, fontSize: 11, color: colors.slate },
  recent: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'center' },
  recentTime: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.navy, width: 48, ...monoNums },
  recentTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  recentSub: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.slate },
});
