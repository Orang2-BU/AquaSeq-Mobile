// Kontrol segmen di atas header gradient. Indikator putih bergeser 200 ms,
// warna label ikut cross-fade. Reduce Motion: indikator langsung pindah.
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { easeOut, motion } from '@/lib/animations';
import { useMotionReduced } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

export function Segmented<K extends string>({ items, value, onChange, tone = 'dark' }: {
  items: readonly { key: K; label: string; icon: LucideIcon }[];
  value: K;
  onChange: (key: K) => void;
  /** 'dark' = di atas header gradient; 'light' = di atas latar terang. */
  tone?: 'dark' | 'light';
}) {
  const inactive = tone === 'dark' ? colors.white : colors.slate;
  const reduced = useMotionReduced();
  const [w, setW] = useState(0);
  const index = items.findIndex((it) => it.key === value);
  const pos = useSharedValue(index);

  useEffect(() => {
    pos.set(reduced ? index : withTiming(index, { duration: motion.base, easing: easeOut }));
  }, [index, pos, reduced]);

  const segW = w / items.length;
  const indicator = useAnimatedStyle(() => ({ width: segW, transform: [{ translateX: pos.get() * segW }] }));

  return (
    <View style={[styles.track, tone === 'light' && styles.trackLight]} onLayout={(e) => setW(e.nativeEvent.layout.width - 8)} accessibilityRole="tablist">
      {w > 0 && <Animated.View style={[styles.indicator, indicator]} />}
      {items.map((it, i) => (
        <Pressable
          key={it.key}
          onPress={() => onChange(it.key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: it.key === value }}
          accessibilityLabel={it.label}
          style={styles.item}
        >
          <SegmentLabel label={it.label} icon={it.icon} i={i} pos={pos} active={it.key === value} inactive={inactive} />
        </Pressable>
      ))}
    </View>
  );
}

function SegmentLabel({ label, icon: Icon, i, pos, active, inactive }: {
  label: string; icon: LucideIcon; i: number; pos: SharedValue<number>; active: boolean; inactive: string;
}) {
  const text = useAnimatedStyle(() => {
    const d = Math.min(Math.abs(pos.get() - i), 1);
    return { color: interpolateColor(d, [0, 1], [colors.navy, inactive]) };
  });
  return (
    <View style={styles.labelRow}>
      <Icon size={17} color={active ? colors.navy : inactive} strokeWidth={2.5} />
      <Animated.Text style={[styles.label, text]}>{label}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row', marginTop: 16, padding: 4, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  trackLight: { marginTop: 0, backgroundColor: '#E1E9F5', borderColor: colors.border },
  indicator: {
    position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999, backgroundColor: colors.white,
    shadowColor: colors.navy, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  item: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15 },
});
