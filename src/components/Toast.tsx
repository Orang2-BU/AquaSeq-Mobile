// Toast umum §6.2: slide-up + fade 250 ms, tampil 3 detik, fade-out 200 ms.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { easeOut, motion } from '@/lib/animations';
import { useMotionReduced } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

type ToastFn = (message: string) => void;
const Ctx = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const reduced = useMotionReduced();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const y = useSharedValue(24);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ToastFn>((msg) => {
    if (timer.current) clearTimeout(timer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setMessage(msg);
    y.set(reduced ? 0 : 24);
    opacity.set(0);
    opacity.set(withTiming(1, { duration: reduced ? motion.reduced : 250, easing: easeOut }));
    y.set(withTiming(0, { duration: reduced ? 0 : 250, easing: easeOut }));
    timer.current = setTimeout(() => {
      opacity.set(withTiming(0, { duration: reduced ? motion.reduced : 200 }));
      hideTimer.current = setTimeout(() => setMessage(null), 220);
    }, 3000);
  }, [opacity, y, reduced]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateY: y.get() }] }));

  return (
    <Ctx.Provider value={show}>
      {children}
      {message !== null && (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { bottom: insets.bottom + 108 }, style]}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: colors.navy,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  text: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20 },
});
