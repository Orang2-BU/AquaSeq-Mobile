// Chip filter: aktif = gradient biru gelap teks putih, nonaktif = putih border navy.
// Background & teks cross-fade 150 ms (§6.2).
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeOut, motion } from '@/lib/animations';
import { colors, fonts, gradients, monoNums } from '@/lib/theme';

export function Chip({ label, count, icon: Icon, active, onPress }: {
  label: string;
  count?: number;
  icon?: LucideIcon;
  active: boolean;
  onPress: () => void;
}) {
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(active ? 1 : 0, { duration: motion.fast, easing: easeOut }));
  }, [active, p]);

  const gradStyle = useAnimatedStyle(() => ({ opacity: p.get() }));
  const textStyle = useAnimatedStyle(() => ({ color: interpolateColor(p.get(), [0, 1], [colors.navy, colors.white]) }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={count !== undefined ? `${label} ${count}` : label}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, gradStyle]}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={styles.inner}>
        {Icon ? <Icon size={15} color={active ? colors.white : colors.navy} strokeWidth={2.5} /> : null}
        <Animated.Text style={[styles.label, textStyle]}>{label}</Animated.Text>
        {count !== undefined ? (
          <Animated.Text style={[styles.count, textStyle]}>· {count}</Animated.Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999, borderWidth: 1.5, borderColor: colors.navy, backgroundColor: colors.white,
    overflow: 'hidden', minHeight: 40, justifyContent: 'center',
  },
  chipActive: { borderColor: 'transparent' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14 },
  count: { fontFamily: fonts.monoBold, fontSize: 14, ...monoNums },
});
