// Tugas harian TEKNISI (§8.4): progress vertikal + kartu tugas satu kolom,
// lalu tindakan yang dijadwalkan pemilik dari Laporan untuk besok.
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { FadeSlideIn } from '@/components/FadeSlideIn';
import { GradientHeader } from '@/components/GradientHeader';
import { FadeText } from '@/components/motion';
import { TaskCard } from '@/components/TaskCard';
import { easeOut } from '@/lib/animations';
import { tomorrowLabel } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { card, colors, fonts, gradients, monoNums } from '@/lib/theme';

export default function Tugas() {
  const { snapshot, session, toggleTask, scheduled } = useStore();
  const tasks = snapshot?.tasks ?? [];
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? done / tasks.length : 0;
  const tomorrow = (snapshot?.recommendations ?? []).filter((r) => scheduled.includes(r.id));

  const [trackW, setTrackW] = useState(0);
  const width = useSharedValue(0);
  // Bar progress menganimasikan lebar 300 ms easeOut dari nilai lama ke nilai baru.
  useEffect(() => {
    width.set(withTiming(trackW * pct, { duration: 300, easing: easeOut }));
  }, [pct, trackW, width]);
  const barStyle = useAnimatedStyle(() => ({ width: width.get() }));

  if (session?.user.role === 'pemilik') return <Redirect href="/beranda" />;

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <GradientHeader title="Tugas Harian" subtitle={`${today} · ${done} dari ${tasks.length} selesai`} />
      <View style={styles.body}>
        <FadeSlideIn index={0}>
          <View style={[card, styles.progressCard]}>
            <Text style={styles.progressLabel}>Kemajuan hari ini</Text>
            <View style={styles.countBadge}>
              <FadeText style={styles.countText}>{`${done} dari ${tasks.length} selesai`}</FadeText>
            </View>
            <View style={styles.track} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
              <Animated.View style={[styles.bar, barStyle]}>
                <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
              </Animated.View>
            </View>
            <Text style={styles.pct}>{Math.round(pct * 100)}%</Text>
          </View>
        </FadeSlideIn>

        {tasks.map((t, idx) => (
          <FadeSlideIn key={t.id} index={idx + 1}>
            <TaskCard task={t} onToggle={() => toggleTask(t.id)} />
          </FadeSlideIn>
        ))}

        {tomorrow.length > 0 ? (
          <FadeSlideIn index={tasks.length + 1}>
            <Text style={styles.section}>Besok · {tomorrowLabel()}</Text>
            <Text style={styles.sectionSub}>Dijadwalkan pemilik dari Laporan</Text>
            <View style={{ gap: 12 }}>
              {tomorrow.map((r) => (
                <View key={r.id} style={[card, styles.tomorrowCard]}>
                  <CalendarPlus size={18} color={colors.navy} strokeWidth={2.4} />
                  <Text style={styles.tomorrowText}>{r.text}</Text>
                </View>
              ))}
            </View>
          </FadeSlideIn>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingBottom: 48 },
  body: { paddingHorizontal: 16, gap: 14 },
  progressCard: { gap: 10 },
  progressLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  countBadge: { alignSelf: 'flex-start', backgroundColor: '#E6EEFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.navy, ...monoNums },
  track: { height: 12, borderRadius: 6, backgroundColor: '#E1E9F5', overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 6, overflow: 'hidden' },
  pct: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.slate, alignSelf: 'flex-end', ...monoNums },
  section: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginTop: 6 },
  sectionSub: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate, marginBottom: 10 },
  tomorrowCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tomorrowText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22, color: colors.ink },
});
