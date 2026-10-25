// Detail Kolam. Teknisi: saran mitigasi dulu, lalu pengamatan terbaru dan tombol cek ulang.
// Pemilik: saran + pengamatan per kelompok (air/udang), riwayat 7 hari, daftar pengamatan.
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ClipboardCheck, Droplets, Fish } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeSlideIn } from '@/components/FadeSlideIn';
import { MitigationCard } from '@/components/MitigationCard';
import { PressScale } from '@/components/motion';
import { ParamTable } from '@/components/ParamTable';
import { SlideView, useScreenSlide } from '@/components/ScreenSlide';
import { Segmented } from '@/components/Segmented';
import { StatusIconBadge, statusMeta, statusStroke } from '@/components/StatusIconBadge';
import { biomassKg, paramStatus, wibDay, wibTime } from '@/lib/domain';
import { dailyHistory, useFarm, useMitigation, type FarmView, type PondView } from '@/lib/farm';
import { PARAMS, PARAM_ORDER, fmtParam, shortName, type ParamGroup, type ParamKey } from '@/lib/params';
import { useStore } from '@/lib/store';
import { card, colors, fonts, gradients, monoNums } from '@/lib/theme';

export default function DetailKolam() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const farm = useFarm();
  const role = useStore().session?.user.role;
  const { style: slideStyle, leave } = useScreenSlide();
  const view = farm?.byId[String(id)] ?? farm?.byId[String(id).toUpperCase()];
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
                  <Stat label="SR" value={pond.srPercent != null ? `${pond.srPercent}%` : 'Belum ada'} />
                  <Stat label="Luas" value={`${pond.areaM2.toLocaleString('id-ID')} m²`} />
                  <Stat label="Tebar" value={pond.stockedCount != null ? `${(pond.stockedCount / 1000).toLocaleString('id-ID')} rb ekor` : 'Belum ada'} />
                  <Stat label="Berat rata-rata" value={pond.abwGram != null ? `${pond.abwGram.toLocaleString('id-ID')} g` : 'Belum ada'} />
                  <Stat label="Biomassa est." value={biomassKg(pond) != null ? `${biomassKg(pond)!.toLocaleString('id-ID')} kg` : 'Belum ada'} />
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

/** Teknisi: semua pengamatan terbaru, dengan cara mengamatinya. */
function TechSections({ view, start }: { view: PondView; start: number }) {
  return (
    <FadeSlideIn index={start}>
      <Text style={styles.section}>Kondisi terkini</Text>
      <View style={card}>
        <ParamTable keys={PARAM_ORDER} latest={view.latest} showHint />
      </View>
    </FadeSlideIn>
  );
}

const GROUPS = [
  { key: 'Air', label: 'Air kolam', icon: Droplets },
  { key: 'Udang', label: 'Udang', icon: Fish },
] as const;

/** Pemilik: pengamatan per kelompok, riwayat 7 hari per pengamatan, dan daftar pengamatan. */
function OwnerSections({ view, farm, start }: { view: PondView; farm: FarmView; start: number }) {
  const [group, setGroup] = useState<ParamGroup>(view.issues[0] ? PARAMS[view.issues[0].param].group : 'Air');
  const keys = PARAM_ORDER.filter((k) => PARAMS[k].group === group);
  const history = farm.readings.filter((r) => r.pondId === view.pond.id).slice(-6).reverse();
  const days = [...new Set(farm.readings.filter((r) => r.pondId === view.pond.id).map((r) => wibDay(r.at)))].slice(-7);

  return (
    <>
      <FadeSlideIn index={start}>
        <Text style={styles.section}>Pengamatan terbaru</Text>
        <Segmented items={GROUPS} value={group} onChange={setGroup} tone="light" />
        <View style={[card, { marginTop: 12 }]}>
          <ParamTable keys={keys} latest={view.latest} />
        </View>
      </FadeSlideIn>

      <FadeSlideIn index={start + 1}>
        <View style={card}>
          <Text style={styles.cardTitle}>Riwayat 7 hari</Text>
          <View style={styles.gridHead}>
            <View style={styles.gridLabelCol} />
            {days.map((d) => <Text key={d} style={styles.gridDay}>{d.split(',')[0]}</Text>)}
          </View>
          {keys.map((k) => {
            const byDay = new Map(dailyHistory(farm, view.pond.id, k).map((h) => [h.day, h.value]));
            return (
              <View key={k} style={styles.gridRow}>
                <Text style={styles.gridLabel} numberOfLines={2}>{shortName(k)}</Text>
                {days.map((d) => {
                  const v = byDay.get(d);
                  const st = v === undefined ? null : paramStatus(k, v);
                  const m = st ? statusMeta[st] : null;
                  const Icon = m?.icon;
                  return (
                    <View
                      key={d}
                      style={[styles.gridCell, { backgroundColor: m ? m.tint : '#EEF2F8' }]}
                      accessibilityLabel={`${shortName(k)} ${d}: ${v === undefined ? 'belum dicek' : fmtParam(k, v)}`}
                    >
                      {m && Icon ? <Icon size={14} color={m.color} strokeWidth={2.8} /> : <Text style={styles.gridEmpty}>–</Text>}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </FadeSlideIn>

      <FadeSlideIn index={start + 2}>
        <View style={card}>
          <Text style={styles.cardTitle}>Riwayat pengamatan</Text>
          {history.map((r) => (
            <View key={r.id} style={styles.histRow}>
              <Text style={styles.histTime}>{wibTime(r.at)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.histTitle}>{wibDay(r.at)} · {r.by}{r.synced ? '' : ' · belum terkirim'}</Text>
                <Text style={styles.histSub}>
                  {Object.entries(r.values).map(([k, v]) => `${shortName(k as ParamKey)}: ${fmtParam(k as ParamKey, v as number).toLowerCase()}`).join(' · ')}
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
  gridHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: 4 },
  gridLabelCol: { width: 92 },
  gridDay: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 11, color: colors.slate, textAlign: 'center' },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  gridLabel: { width: 92, fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, color: colors.ink },
  gridCell: { flex: 1, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  gridEmpty: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.slate },
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
