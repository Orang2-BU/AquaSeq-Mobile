// Root: font, splash (sistem -> animasi udang), store, toast, dan stack.
// Belum masuk -> /masuk; sudah masuk -> tab, detail kolam (push), dan modal Cek Kolam.
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import {
  PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { ToastProvider } from '@/components/Toast';
import { motion } from '@/lib/animations';
import { StoreProvider, useMotionReduced, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Sora_700Bold, Sora_800ExtraBold,
    PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
    JetBrainsMono_500Medium, JetBrainsMono_700Bold,
  });

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      {/* Reanimated tidak memotong animasi sendiri saat Reduce Motion: setiap komponen
          sudah menggantinya dengan fade 150 ms (useMotionReduced), sesuai §6.3. */}
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      <StoreProvider>
        <ToastProvider>
          <AppStack />
          <SplashGate />
        </ToastProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

/** Splash animasi udang di atas aplikasi, sekali tiap aplikasi dibuka. Ia juga yang menutup splash sistem. */
function SplashGate() {
  const { ready } = useStore();
  const [done, setDone] = useState(false);
  const finish = useCallback(() => setDone(true), []);
  return (
    <>
      <StatusBar style={done ? 'dark' : 'light'} />
      {done ? null : <AnimatedSplash ready={ready} onDone={finish} />}
    </>
  );
}

function AppStack() {
  const reduced = useMotionReduced();
  const { ready, session } = useStore();
  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.pageBg },
        // Push: slide dari kanan 280 ms. Reduce Motion: fade 150 ms saja (§6.3).
        animation: reduced ? 'fade' : 'slide_from_right',
        animationDuration: reduced ? motion.reduced : motion.screen,
      }}
    >
      <Stack.Protected guard={!session}>
        <Stack.Screen name="masuk" options={{ animation: 'fade', animationDuration: motion.base }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade', animationDuration: motion.base }} />
        <Stack.Screen name="kolam/[id]" />
        <Stack.Screen
          name="cek-kolam"
          options={{
            // Sheet & backdrop dianimasikan sendiri di layar (slide-up 300 ms + backdrop 200 ms).
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
