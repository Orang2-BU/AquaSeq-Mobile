// Wrapper fade + rise 12 px dengan stagger (§6.4). Diputar ulang saat layar
// kembali fokus supaya pindah tab terasa fade + rise, bukan potong kasar.
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';

import { easeOut, motion, staggerDelay } from '@/lib/animations';
import { useMotionReduced } from '@/lib/store';

type Props = {
  index?: number;
  /** Nilai apa pun yang, bila berubah, memutar ulang animasi masuk (mis. filter). */
  replayKey?: string | number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function FadeSlideIn({ index = 0, replayKey, style, children }: Props) {
  const reduced = useMotionReduced();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reduced ? 0 : motion.rise);

  const play = useCallback(() => {
    if (reduced) {
      translateY.set(0);
      opacity.set(0);
      opacity.set(withTiming(1, { duration: motion.reduced }));
      return;
    }
    const delay = staggerDelay(index);
    opacity.set(0);
    translateY.set(motion.rise);
    opacity.set(withDelay(delay, withTiming(1, { duration: motion.base, easing: easeOut })));
    translateY.set(withDelay(delay, withTiming(0, { duration: motion.base, easing: easeOut })));
  }, [index, reduced, opacity, translateY]);

  useFocusEffect(play);
  useEffect(() => {
    if (replayKey !== undefined) play();
  }, [replayKey, play]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
