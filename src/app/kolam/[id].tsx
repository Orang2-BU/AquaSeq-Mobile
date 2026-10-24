// Detail Kolam. Teknisi: saran mitigasi dulu, lalu 4 nilai utama dan tombol cek ulang.
// Pemilik: saran + semua kadar zat per kelompok (fisika/kimia/biologi), tren, lab, riwayat.
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ClipboardCheck, FlaskConical, Microscope, Thermometer, TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { FadeSlideIn } from '@/components/FadeSlideIn';
import { MitigationCard } from '@/components/MitigationCard';
import { PressScale } from '@/components/motion';
import { ParamTable } from '@/components/ParamTable';
import { SlideView, useScreenSlide } from '@/components/ScreenSlide';
import { Segmented } from '@/components/Segmented';
import { StatusIconBadge, statusMeta, statusStroke } from '@/components/StatusIconBadge';
import { TrendChart } from '@/components/TrendChart';
import { easeOut } from '@/lib/animations';
import { biomassKg, describeIssue, paramStatus, wibDay, wibTime } from '@/lib/domain';
import { paramHistory, useFarm, useMitigation, type FarmView, type PondView } from '@/lib/farm';
import { PARAMS, PARAM_ORDER, QUICK_PARAMS, fmtParam, safeRange, shortName, type ParamGroup, type ParamKey } from '@/lib/params';
import { useStore } from '@/lib/store';
import { card, colors, fonts, gradients, monoNums } from '@/lib/theme';

export default function DetailKolam() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const farm = useFarm();
  const role = useStore().session?.user.role;
  const { style: slideStyle, leave } = useScreenSlide();
  const view = farm?.byId[String(id).toUpperCase()];
  const { mitigation, ai } = useMitigation(view, farm);

  const goBack = () => leave(() => (router.canGoBack() ? router.back() : router.replace('/kolam')));

  if (!farm || !view) {
    return (
      <View style={[styles.page, { paddingTop: insets.top + 24, paddingHorizontal: 16 }]}>
        <Text style={styles.title}>Kolam tidak ditemukan</Text>
        <Pressable onPress={() => router.replace('/kolam')} style={[styles.secondaryBtn, { marginTop: 16 }]}>
          <Text style={styles.secondaryText}>Kembali ke daftar kolam</Text>
        </Pressable>
      </View>
    );
  }

  const { pond, status, lastCheck } = view;
  let i = 0;
  return (
    <View style={styles.page}>
      <SlideView style={slideStyle}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <Pressable onPress={goBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Kembali" style={styles.back}>
            <ArrowLeft size={22} color={colors.navy} strokeWidth={2.6} />
            <Text style={styles.backText}>Kembali</Text>
          </Pressable>

          <FadeSlideIn index={i++}>
            <View style={[card, statusStroke(status), styles.headerCard]}>
              <View style={styles.headerTop}>
                <Text style={styles.title}>{pond.name}</Text>
                <StatusIconBadge status={status} />
              </View>
              <Text style={styles.meta}>
                {lastCheck ? `Dicek ${wibDay(lastCheck.at)} ${wibTime(lastCheck.at)} · ${lastCheck.by}${lastCheck.synced ? '' : ' · belum terkirim'}` : 'Belum pernah dicek'}
              </Text>
              {role === 'pemilik' ? (
                <View style={styles.stats}>
                  <Stat label="DOC" value={`${pond.docDays} hari`} />
                  <Stat label="SR" value={`${pond.srPercent}%`} />
                  <Stat label="Luas" value={`${pond.areaM2.toLocaleString('id-ID')} m²`} />
                  <Stat label="Tebar" value={`${(pond.stockedCount / 1000).toLocaleString('id-ID')} rb ekor`} />
                  <Stat label="Berat rata-rata" value={`${pond.abwGram.toLocaleString('id-ID')} g`} />
                  <Stat label="Biomassa est." value={`${biomassKg(pond).toLocaleString('id-ID')} kg`} />
                </View>
              ) : null}
            </View>
          </FadeSlideIn>

          {mitigation ? (
            <FadeSlideIn index={i++}>
              <MitigationCard mitigation={mitigation} ai={ai} title="Saran mitigasi" />
            </FadeSlideIn>
          ) : null}

          {role === 'pemilik'
            ? <OwnerSections view={view} farm={farm} start={i} />
            : <TechSections view={view} start={i} />}

          {role !== 'pemilik' ? (
            <FadeSlideIn index={6} style={styles.actions}>
              <PressScale
                onPress={() => router.push({ pathname: '/cek-kolam', params: { pond: pond.id } })}
                accessibilityRole="button"
                accessibilityLabel={`Cek ulang ${pond.name}`}
                style={styles.primaryBtn}
              >
                <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.primaryInner}>
                  <ClipboardCheck size={20} color={colors.white} strokeWidth={2.4} />
                  <Text style={styles.primaryText}>Cek Ulang Kolam Ini</Text>
                </LinearGradient>
              </PressScale>
            </FadeSlideIn>
          ) : null}
        </ScrollView>
      </SlideView>
    </View>
  );
}

/** Teknisi: 4 nilai utama besar + masalah lain dari uji kit (kalau ada). */
function TechSections({ view, start }: { view: PondView; start: number }) {
  const kitIssues = view.issues.filter((x) => !PARAMS[x.param].quick);
  return (
    <>
      <FadeSlideIn index={start}>
        <Text style={styles.section}>Kondisi terkini</Text>
        <View style={styles.paramGrid}>
          {QUICK_PARAMS.map((k) => {
            const l = view.latest[k];
            const st = l ? paramStatus(k, l.value) : 'SEHAT';
            const bad = st !== 'SEHAT';
            const m = statusMeta[st];
            return (
              <View key={k} style={[card, styles.param, bad ? statusStroke(st) : null]}>
                <Text style={styles.paramLabel}>{shortName(k)}</Text>
                <View style={styles.paramValueRow}>
                  <Text style={[styles.paramValue, bad ? { color: m.color } : null]}>{l ? fmtParam(k, l.value, false) : '—'}</Text>
                  {PARAMS[k].unit ? <Text style={styles.paramUnit}>{PARAMS[k].unit}</Text> : null}
                </View>
                {bad ? (
                  <View style={styles.ctxRow}>
                    <TriangleAlert size={14} color={m.color} strokeWidth={2.6} />
                    <Text style={[styles.ctxText, { color: m.color }]}>Batas {safeRange(k)}</Text>
                  </View>
                ) : <Text style={styles.okText}>Aman</Text>}
              </View>
            );
          })}
        </View>
      </FadeSlideIn>
      {kitIssues.length ? (
        <FadeSlideIn index={start + 1}>
          <View style={card}>
            <Text style={styles.cardTitle}>Dari uji kit / lab</Text>
            {kitIssues.map((x) => {
              const m = statusMeta[x.severity];
              const Icon = m.icon;
              return (
                <View key={x.param} style={styles.kitRow}>
                  <Icon size={16} color={m.color} strokeWidth={2.6} />
                  <Text style={styles.kitText}>{describeIssue(x)}</Text>
                </View>
              );
            })}
          </View>
        </FadeSlideIn>
      ) : null}
    </>
  );
}

const GROUPS = [
  { key: 'Kimia', label: 'Kimia', icon: FlaskConical },
  { key: 'Fisika', label: 'Fisika', icon: Thermometer },
  { key: 'Biologi', label: 'Biologi', icon: Microscope },
] as const;

const TREND_PARAMS: ParamKey[] = ['DO', 'pH', 'Amonia', 'Nitrit', 'Alkalinitas', 'TOM', 'Vibrio', 'Suhu', 'Salinitas'];

/** Pemilik: semua kadar zat, tren per parameter, hasil lab, riwayat pengecekan. */
function OwnerSections({ view, farm, start }: { view: PondView; farm: FarmView; start: number }) {
  const [group, setGroup] = useState<ParamGroup>('Kimia');
  const firstIssue = view.issues[0]?.param;
  const [param, setParam] = useState<ParamKey>(firstIssue && TREND_PARAMS.includes(firstIssue) ? firstIssue : 'DO');
  const [shownParam, setShownParam] = useState(param);
  const chartOpacity = useSharedValue(1);

  // Ganti parameter: grafik lama fade-out 120 ms, grafik baru fade-in 180 ms. Tanpa slide.
  useEffect(() => {
    if (param === shownParam) return;
    chartOpacity.set(withTiming(0, { duration: 120 }));
    const t = setTimeout(() => {
      setShownParam(param);
      chartOpacity.set(withTiming(1, { duration: 180, easing: easeOut }));
    }, 120);
    return () => clearTimeout(t);
  }, [param, shownParam, chartOpacity]);
  const chartStyle = useAnimatedStyle(() => ({ opacity: chartOpacity.get() }));

  const series = paramHistory(farm, view.pond.id, shownParam).map((h) => ({ label: wibDay(h.at).split(',')[0], value: h.value }));
  const values = series.map((s) => s.value);
  const labs = farm.labResults.filter((l) => l.pondId === null || l.pondId === view.pond.id);
  const history = farm.readings.filter((r) => r.pondId === view.pond.id).slice(-6).reverse();

  return (
    <>
      <FadeSlideIn index={start}>
        <Text style={styles.section}>Kadar zat & parameter</Text>
        <Segmented items={GROUPS} value={group} onChange={setGroup} tone="light" />
        <View style={[card, { marginTop: 12 }]}>
          <ParamTable keys={PARAM_ORDER.filter((k) => PARAMS[k].group === group)} latest={view.latest} />
        </View>
      </FadeSlideIn>

      <FadeSlideIn index={start + 1}>
        <View style={card}>
          <Text style={styles.chartTitle}>TREN {PARAMS[shownParam].label.toUpperCase()}</Text>
          <Text style={styles.chartNote}>Dari pengecekan manual · batas aman {safeRange(shownParam)}{PARAMS[shownParam].unit ? ` ${PARAMS[shownParam].unit}` : ''}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendChips}>
            {TREND_PARAMS.map((k) => <Chip key={k} label={shortName(k)} active={k === param} onPress={() => setParam(k)} />)}
          </ScrollView>
          <Animated.View style={chartStyle}>
            <TrendChart param={shownParam} data={series} />
            {values.length ? (
              <Text style={styles.legend}>
                Terakhir <Text style={styles.legendNum}>{fmtParam(shownParam, values[values.length - 1])}</Text>
                {'  ·  '}Terendah <Text style={styles.legendNum}>{fmtParam(shownParam, Math.min(...values), false)}</Text>
                {'  ·  '}Tertinggi <Text style={styles.legendNum}>{fmtParam(shownParam, Math.max(...values), false)}</Text>
              </Text>
            ) : null}
          </Animated.View>
        </View>
      </FadeSlideIn>

      <FadeSlideIn index={start + 2}>
        <View style={card}>
          <Text style={styles.cardTitle}>{farm.labTitle}</Text>
          {labs.map((l) => (
            <View key={`${l.marker}-${l.pondId}`} style={styles.kitRow}>
              {l.detected
                ? <TriangleAlert size={16} color={colors.amber} strokeWidth={2.6} />
                : <FlaskConical size={16} color={colors.green} strokeWidth={2.4} />}
              <Text style={styles.labMarker}>{l.marker}</Text>
              <Text style={[styles.kitText, { textAlign: 'right' }, l.detected && { color: colors.red }]}>{l.result}</Text>
            </View>
          ))}
        </View>
      </FadeSlideIn>

      <FadeSlideIn index={start + 3}>
        <View style={card}>
          <Text style={styles.cardTitle}>Riwayat pengecekan</Text>
          {history.map((r) => (
            <View key={r.id} style={styles.histRow}>
              <Text style={styles.histTime}>{wibTime(r.at)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.histTitle}>{wibDay(r.at)} · {r.by}{r.synced ? '' : ' · belum terkirim'}</Text>
                <Text style={styles.histSub}>
                  {Object.entries(r.values).map(([k, v]) => `${shortName(k as ParamKey)} ${fmtParam(k as ParamKey, v as number, false)}`).join(' · ')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </FadeSlideIn>
    </>
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
  content: { paddingHorizontal: 16, gap: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.navy },
  headerCard: { gap: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, letterSpacing: -0.4 },
  meta: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.slate },
  stats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  stat: { width: '33.3%', gap: 2 },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.4, color: colors.slate },
  statValue: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.ink, ...monoNums },
  section: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginBottom: 10 },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink, marginBottom: 6 },
  paramGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  param: { width: '47%', flexGrow: 1, gap: 6 },
  paramLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.slate },
  paramValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  paramValue: { fontFamily: fonts.monoBold, fontSize: 32, color: colors.ink, ...monoNums },
  paramUnit: { fontFamily: fonts.mono, fontSize: 13, color: colors.slate },
  ctxRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctxText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  okText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.green },
  kitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  kitText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: colors.ink },
  labMarker: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.ink, width: 60 },
  chartTitle: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.8, color: colors.ink },
  chartNote: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate, marginTop: 4 },
  trendChips: { gap: 8, marginTop: 12, marginBottom: 8 },
  legend: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate, marginTop: 6 },
  legendNum: { fontFamily: fonts.monoBold, color: colors.ink, ...monoNums },
  histRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  histTime: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.navy, width: 48, ...monoNums },
  histTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  histSub: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 18, color: colors.slate },
  actions: { gap: 10, marginTop: 4 },
  primaryBtn: { borderRadius: 18, overflow: 'hidden' },
  primaryInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 58 },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
  secondaryBtn: {
    minHeight: 56, borderRadius: 18, borderWidth: 1.5, borderColor: colors.navy, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.navy },
});
