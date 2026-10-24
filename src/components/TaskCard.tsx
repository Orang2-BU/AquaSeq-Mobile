// Kartu tugas vertikal: judul -> meta -> aksi, bertumpuk ke bawah (§8.4).
import { Check, CircleCheck, Clock } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';

import { FadeText, PressScale } from './motion';
import { easeOut } from '@/lib/animations';
import type { Task } from '@/lib/domain';
import { useMotionReduced } from '@/lib/store';
import { card, colors, fonts, monoNums } from '@/lib/theme';

export function TaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const reduced = useMotionReduced();
  const scale = useSharedValue(1);
  const fill = useSharedValue(task.done ? 1 : 0);
  const first = useRef(true);

  useEffect(() => {
    fill.set(withTiming(task.done ? 1 : 0, { duration: 200, easing: easeOut }));
    if (first.current) { first.current = false; return; }
    // Pop centang 1 -> 1.15 -> 1 (200 ms)
    if (!reduced) scale.set(withSequence(withTiming(1.15, { duration: 100 }), withTiming(1, { duration: 100 })));
  }, [task.done, fill, scale, reduced]);

  const circle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    backgroundColor: interpolateColor(fill.get(), [0, 1], [colors.white, colors.green]),
    borderColor: interpolateColor(fill.get(), [0, 1], [colors.navy, colors.green]),
  }));

  return (
    <PressScale
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.done }}
      accessibilityLabel={task.title}
      style={[card, styles.card]}
    >
      <View style={styles.top}>
        <Animated.View style={[styles.circle, circle]}>
          {task.done ? <Check size={18} color={colors.white} strokeWidth={3.2} /> : null}
        </Animated.View>
        <Text style={styles.title}>{task.title}</Text>
      </View>

      <View style={styles.meta}>
        <Clock size={15} color={colors.navy} strokeWidth={2.4} />
        <Text style={styles.time}>{task.time}</Text>
        <Text style={styles.note}>· {task.note}</Text>
      </View>

      <View style={styles.action}>
        <View style={styles.status}>
          {task.done
            ? <CircleCheck size={17} color={colors.green} strokeWidth={2.6} />
            : <Clock size={17} color={colors.amber} strokeWidth={2.6} />}
          <FadeText style={[styles.statusText, { color: task.done ? colors.green : colors.amber }]}>
            {task.done ? 'Selesai' : 'Belum selesai'}
          </FadeText>
        </View>
        <FadeText style={styles.hint}>{task.done ? 'Ketuk untuk batalkan' : 'Ketuk untuk tandai selesai'}</FadeText>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  circle: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, color: colors.ink, paddingTop: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 42 },
  time: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.navy, ...monoNums },
  note: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.slate },
  action: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 2,
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  hint: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate, textAlign: 'right', flexShrink: 1 },
});
