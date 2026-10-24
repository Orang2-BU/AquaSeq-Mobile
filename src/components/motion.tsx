// Primitif animasi kecil yang dipakai ulang: tekan-skala, cross-fade teks, switch.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';

import { easeOut, motion } from '@/lib/animations';
import { useMotionReduced } from '@/lib/store';
import { colors } from '@/lib/theme';

const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable dengan skala 1 -> 0.97 selama 120 ms (§6.2 FAB / kartu). */
export function PressScale({ style, children, disabled, ...rest }: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const reduced = useMotionReduced();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <APressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduced) scale.set(withTiming(motion.pressScale, { duration: 120, easing: easeOut }));
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: 120, easing: easeOut }));
        rest.onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </APressable>
  );
}

/** Teks yang cross-fade saat isinya berganti (default 150 ms). */
export function FadeText({ children, style, duration = motion.fast, numberOfLines }: {
  children: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
  numberOfLines?: number;
}) {
  const [shown, setShown] = useState(children);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (children === shown) return;
    opacity.set(withTiming(0, { duration: duration / 2 }));
    const t = setTimeout(() => {
      setShown(children);
      opacity.set(withTiming(1, { duration: duration / 2, easing: easeOut }));
    }, duration / 2);
    return () => clearTimeout(t);
  }, [children, shown, duration, opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.Text numberOfLines={numberOfLines} style={[style, animated]}>{shown}</Animated.Text>;
}

/** Switch: track + knob. Knob bergeser & warna track berubah 180 ms. */
export function SwitchTrack({ value, dark = false }: { value: boolean; dark?: boolean }) {
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(value ? 1 : 0, { duration: 180, easing: easeOut }));
  }, [value, p]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], ['#C3CDDC', colors.navy]),
  }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.get() * 20 }] }));

  return (
    <Animated.View style={[styles.track, dark && styles.trackDark, track]}>
      <Animated.View style={[styles.knob, knob]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  trackDark: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
});
