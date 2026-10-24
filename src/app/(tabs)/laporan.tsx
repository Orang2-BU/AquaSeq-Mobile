// Laporan PEMILIK (§8.6): skor risiko dan rekomendasi yang bisa dijadwalkan
// menjadi tugas teknisi untuk besok.
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { Check, CircleX, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FadeSlideIn } from '@/components/FadeSlideIn';
import { GradientHeader } from '@/components/GradientHeader';
import { RecCard } from '@/components/RecCard';
import { useToast } from '@/components/Toast';
import { tomorrowLabel, type RiskScore } from '@/lib/domain';
import { useFarm } from '@/lib/farm';
import { useStore } from '@/lib/store';
import { card, colors, fonts, gradients, monoNums } from '@/lib/theme';

const riskMeta: Record<RiskScore['label'], { icon: LucideIcon; color: string; stroke: object; badge: string }> = {
  Tinggi: { icon: CircleX, color: colors.red, stroke: { borderColor: colors.strokeRed, borderWidth: 2 }, badge: 'TINGGI' },
  Sedang: { icon: TriangleAlert, color: colors.amber, stroke: { borderColor: colors.strokeAmber, borderWidth: 2 }, badge: 'SEDANG' },
  Rendah: { icon: Check, color: colors.green, stroke: { borderColor: colors.border, borderWidth: 1 }, badge: 'RENDAH' },
};

export default function Laporan() {
  const router = useRouter();
  const toast = useToast();
  const farm = useFarm();
  const { session, scheduled, schedule } = useStore();
  const [selected, setSelected] = useState<string[]>([]);

  if (session?.user.role !== 'pemilik') return <Redirect href="/beranda" />;
  if (!farm) return null;

  const scores = [...farm.riskScores].sort((a, b) => b.score - a.score);
  const top = scores[0];
  const topName = top ? farm.byId[top.pondId]?.pond.name ?? top.pondId : '';

  const toggleSelect = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const onSchedule = (id: string, text: string) => {
    // Jadwal ulang kartu yang sama = no-op (tanpa tugas ganda).
    if (!schedule(id)) return;
    setSelected((s) => (s.includes(id) ? s : [...s, id]));
    toast(`Dijadwalkan ke tugas teknisi besok (${tomorrowLabel()}): ${text}`);
  };

  let i = 0;
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <GradientHeader title="Laporan" subtitle={`Skor risiko minggu ini · ${farm.farm.name}`} />
      <View style={styles.body}>
        {top ? (
          <FadeSlideIn index={i++}>
            <LinearGradient colors={gradients.warm} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summary}>
              <View style={styles.summaryTop}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={styles.summaryPond}>{topName}</Text>
                  <View style={[styles.badge, { backgroundColor: riskMeta[top.label].color }]}>
                    <CircleX size={14} color={colors.white} strokeWidth={2.6} />
                    <Text style={styles.badgeText}>{riskMeta[top.label].badge}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.summaryLabel}>SKOR RISIKO</Text>
                  <Text style={styles.summaryScore}>{top.score}</Text>
                </View>
              </View>
              <Text style={styles.summaryText}>Skor risiko tertinggi minggu ini, didorong oleh: {top.context}.</Text>
            </LinearGradient>
          </FadeSlideIn>
        ) : null}

        <Text style={styles.section}>Skor per kolam</Text>
        {scores.map((r) => {
          const m = riskMeta[r.label];
          const Icon = m.icon;
          return (
            <FadeSlideIn key={r.pondId} index={i++}>
              <Pressable
                onPress={() => router.push({ pathname: '/kolam/[id]', params: { id: r.pondId } })}
                accessibilityRole="button"
                accessibilityLabel={`${farm.byId[r.pondId]?.pond.name ?? r.pondId}, skor ${r.score}`}
                style={[card, m.stroke, styles.scoreCard]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.scorePond}>{farm.byId[r.pondId]?.pond.name ?? r.pondId}</Text>
                  <Text style={styles.scoreCtx}>{r.context}</Text>
                </View>
                <View style={styles.scoreRight}>
                  <Text style={styles.scoreNum}>{r.score}</Text>
                  <View style={styles.riskRow}>
                    <Icon size={14} color={m.color} strokeWidth={2.6} />
                    <Text style={[styles.riskText, { color: m.color }]}>{r.label}</Text>
                  </View>
                </View>
              </Pressable>
            </FadeSlideIn>
          );
        })}

        <Text style={styles.section}>Rekomendasi untuk teknisi</Text>
        <Text style={styles.sectionSub}>Jadwalkan supaya muncul di daftar tugas teknisi besok.</Text>
        {farm.recommendations.map((r) => (
          <FadeSlideIn key={r.id} index={i++}>
            <RecCard
              rec={r}
              selected={selected.includes(r.id)}
              scheduled={scheduled.includes(r.id)}
              onSelect={() => toggleSelect(r.id)}
              onSchedule={() => onSchedule(r.id, r.text)}
            />
          </FadeSlideIn>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingBottom: 48 },
  body: { paddingHorizontal: 16, gap: 14 },
  summary: { borderRadius: 22, padding: 18, gap: 12 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  summaryPond: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, color: colors.white },
  summaryLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: colors.ink },
  summaryScore: { fontFamily: fonts.monoBold, fontSize: 48, lineHeight: 54, color: colors.ink, ...monoNums },
  summaryText: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22, color: colors.ink },
  section: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginTop: 6 },
  sectionSub: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate, marginTop: -8 },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scorePond: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  scoreCtx: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: colors.ink },
  scoreRight: { alignItems: 'flex-end', gap: 2 },
  scoreNum: { fontFamily: fonts.monoBold, fontSize: 32, lineHeight: 36, color: colors.ink, ...monoNums },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  riskText: { fontFamily: fonts.bodyBold, fontSize: 13 },
});
