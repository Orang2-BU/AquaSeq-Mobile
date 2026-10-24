// Push/pop slide horizontal + fade untuk web. Di Android/iOS animasi ini sudah
// dikerjakan native stack ('slide_from_right' 280 ms), jadi wrapper ini diam.
import { useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeOut, motion } from '@/lib/animations';
import { useMotionReduced } from '@/lib/store';

const WEB = Platform.OS === 'web';

export function useScreenSlide() {
  const reduced = useMotionReduced();
  const { width } = useWindowDimensions();
  const x = useSharedValue(WEB && !reduced ? Math.min(width, 480) : 0);
  const opacity = useSharedValue(WEB ? 0 : 1);

  useEffect(() => {
    if (!WEB) return;
    // Masuk: slide dari kanan 280 ms + fade 200 ms.
    x.set(withTiming(0, { duration: motion.screen, easing: easeOut }));
    opacity.set(withTiming(1, { duration: reduced ? motion.reduced : motion.base }));
  }, [x, opacity, reduced]);

  /** Keluar: slide ke kanan 250 ms + fade 150 ms, lalu jalankan navigasi. */
  const leave = (navigate: () => void) => {
    if (!WEB) return navigate();
    if (!reduced) x.set(withTiming(Math.min(width, 480), { duration: 250, easing: easeOut }));
    opacity.set(withTiming(0, { duration: motion.fast }));
    setTimeout(navigate, reduced ? motion.fast : 250);
  };

  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateX: x.get() }] }));
  return { style, leave };
}

export function SlideView({ style, children }: { style: ReturnType<typeof useScreenSlide>['style']; children: React.ReactNode }) {
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}
