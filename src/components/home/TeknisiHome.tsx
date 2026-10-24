// Beranda TEKNISI — sesederhana mungkin: berapa kolam bermasalah, tombol cek besar,
// lalu saran mitigasi per kolam yang perlu tindakan.
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, ClipboardCheck, ListChecks } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeSlideIn } from '../FadeSlideIn';
import { MetricCard } from '../MetricCard';
import { PressScale } from '../motion';
import { PondMap } from '../PondMap';
import { HomeHeader, PondMitigation, homeStyles, useFirstName } from './shared';
import { describeIssue } from '@/lib/domain';
import type { FarmView } from '@/lib/farm';
import { card, colors, fonts, gradients, monoNums } from '@/lib/theme';

export function TeknisiHome({ farm }: { farm: FarmView }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const firstName = useFirstName();
  const problems = farm.ponds.filter((p) => p.status !== 'SEHAT');
  const worst = problems[0];
  const done = farm.tasks.filter((t) => t.done).length;

  let i = 0;
  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
      <FadeSlideIn index={i++}>
        <HomeHeader farm={farm} title={`Halo, ${firstName}`} />
      </FadeSlideIn>

      <FadeSlideIn index={i++}>
        <MetricCard
          value={String(problems.length)}
          unit="kolam"
          text={worst
            ? `perlu tindakan hari ini — terburuk ${worst.pond.name}: ${describeIssue(worst.issues[0])}.`
            : 'perlu tindakan. Semua kolam dalam batas aman.'}
        />
      </FadeSlideIn>

      <FadeSlideIn index={i++}>
        <PressScale onPress={() => router.push('/cek-kolam')} accessibilityRole="button" accessibilityLabel="Cek kolam sekarang" style={styles.cta}>
          <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.ctaInner}>
            <ClipboardCheck size={24} color={colors.white} strokeWidth={2.4} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Cek Kolam Sekarang</Text>
              <Text style={styles.ctaSub}>Lihat warna air & udang — langsung dapat saran</Text>
            </View>
            <ArrowRight size={22} color={colors.white} strokeWidth={2.4} />
          </LinearGradient>
        </PressScale>
      </FadeSlideIn>

      {problems.length ? (
        <FadeSlideIn index={i++}>
          <Text style={homeStyles.section}>Perlu tindakan</Text>
          <View style={homeStyles.list}>
            {problems.map((v) => <PondMitigation key={v.pond.id} view={v} farm={farm} />)}
          </View>
        </FadeSlideIn>
      ) : null}

      <FadeSlideIn index={i++}>
        <PondMap
          title="Status semua kolam"
          tiles={[...farm.ponds].sort((a, b) => a.pond.id.localeCompare(b.pond.id)).map((v) => ({ id: v.pond.id, status: v.status }))}
          onOpen={(id) => router.push({ pathname: '/kolam/[id]', params: { id } })}
        />
      </FadeSlideIn>

      <FadeSlideIn index={i++}>
        <PressScale onPress={() => router.navigate('/tugas')} accessibilityRole="button" accessibilityLabel="Buka tugas hari ini" style={[card, styles.tasks]}>
          <View style={styles.tasksIcon}><ListChecks size={20} color={colors.navy} strokeWidth={2.4} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tasksTitle}>Tugas hari ini</Text>
            <Text style={styles.tasksSub}><Text style={styles.mono}>{done}</Text> dari <Text style={styles.mono}>{farm.tasks.length}</Text> selesai</Text>
          </View>
          <ArrowRight size={20} color={colors.navy} strokeWidth={2.4} />
        </PressScale>
      </FadeSlideIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 14 },
  cta: { borderRadius: 20, overflow: 'hidden', marginTop: -4 },
  ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, minHeight: 72 },
  ctaTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.white },
  ctaSub: { fontFamily: fonts.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 2 },
  tasks: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tasksIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E6EEFF', alignItems: 'center', justifyContent: 'center' },
  tasksTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  tasksSub: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.slate },
  mono: { fontFamily: fonts.monoBold, color: colors.ink, ...monoNums },
});
