// Splash animasi saat aplikasi dibuka. Frame pertama SAMA dengan splash bawaan sistem
// (udang putih 120 dp di tengah, latar navy) supaya perpindahannya mulus, lalu:
//   - latar gradient AquaSeq memudar masuk (400 ms)
//   - udang "berenang": kibasan ekor kecil + bergeser naik (≈ 700 ms)
//   - nama AquaSeq fade + rise 12 px
//   - seluruh layar fade-out 300 ms begitu data sesi siap (minimal 1,5 detik tampil)
// Reduce Motion: tanpa gerak, hanya fade 150 ms.
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { Shrimp } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';

import { easeOut, motion } from '@/lib/animations';
import { useMotionReduced } from '@/lib/store';
import { colors, fonts, gradients } from '@/lib/theme';

// 120 dp × 0,96 = ukuran udang di assets/images/splash-icon.png (lihat scripts/make-icons.sh).
const SHRIMP = 115;
const RISE = 40;
const MIN_SHOW = 1500;

export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const reduced = useMotionReduced();
  const [minElapsed, setMinElapsed] = useState(false);
  const hidden = useRef(false);

  const screen = useSharedValue(1);
  const grad = useSharedValue(0);
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const rot = useSharedValue(0);
  const word = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      grad.set(withTiming(1, { duration: motion.reduced }));
      word.set(withTiming(1, { duration: motion.reduced }));
    } else {
      grad.set(withTiming(1, { duration: 400 }));
      y.set(withDelay(150, withTiming(-RISE, { duration: 700, easing: easeOut })));
      // Kibasan ekor: sedikit maju lalu kembali, sambil berayun kecil.
      x.set(withDelay(150, withSequence(
        withTiming(8, { duration: 350, easing: easeOut }),
        withTiming(0, { duration: 450, easing: easeOut }),
      )));
      rot.set(withDelay(150, withSequence(
        withTiming(-10, { duration: 180 }),
        withTiming(7, { duration: 220 }),
        withTiming(-3, { duration: 180 }),
        withTiming(0, { duration: 160 }),
      )));
      word.set(withDelay(650, withTiming(1, { duration: 300, easing: easeOut })));
    }
    const t = setTimeout(() => setMinElapsed(true), reduced ? 700 : MIN_SHOW);
    return () => clearTimeout(t);
  }, [reduced, grad, y, x, rot, word]);

  useEffect(() => {
    if (!ready || !minElapsed) return;
    const duration = reduced ? motion.reduced : 300;
    screen.set(withTiming(0, { duration }));
    const t = setTimeout(onDone, duration + 20);
    return () => clearTimeout(t);
  }, [ready, minElapsed, reduced, screen, onDone]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screen.get() }));
  const gradStyle = useAnimatedStyle(() => ({ opacity: grad.get() }));
  const shrimpStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }, { translateX: x.get() }, { rotate: `${rot.get()}deg` }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.get(),
    transform: [{ translateY: (1 - word.get()) * (reduced ? 0 : motion.rise) }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, screenStyle]}
      // Splash sistem ditutup tepat saat lapisan ini sudah tergambar.
      onLayout={() => {
        if (hidden.current) return;
        hidden.current = true;
        SplashScreen.hideAsync().catch(() => {});
      }}
      accessibilityLabel="AquaSeq"
    >
      <Animated.View style={[StyleSheet.absoluteFill, gradStyle]}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View style={styles.center}>
        <Animated.View style={shrimpStyle}>
          <Shrimp size={SHRIMP} color={colors.white} strokeWidth={2} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.wordWrap, wordStyle]}>
        <Text style={styles.word}>AquaSeq</Text>
        <Text style={styles.tagline}>Pantau kolam, tindak cepat</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.navy, zIndex: 1000, elevation: 1000 },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  wordWrap: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: SHRIMP / 2 - RISE + 20, alignItems: 'center' },
  word: { fontFamily: fonts.display, fontSize: 36, color: colors.white, letterSpacing: -0.5 },
  tagline: { fontFamily: fonts.bodySemi, fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
});
