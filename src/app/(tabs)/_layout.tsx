// Tab bawah per peran (lihat TabBar). Pindah tab = fade 200 ms, tanpa slide (§6.2).
import { Tabs } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PressScale } from '@/components/motion';
import { TabBar } from '@/components/TabBar';
import { motion } from '@/lib/animations';
import { useMotionReduced, useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

export default function TabLayout() {
  const reduced = useMotionReduced();
  const { snapshot } = useStore();

  // Sesi tersimpan tapi data tambak belum ada di cache (mis. gagal memuat setelah masuk).
  if (!snapshot) return <LoadFarm />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        transitionSpec: { animation: 'timing', config: { duration: reduced ? motion.reduced : motion.base } },
        sceneStyle: { backgroundColor: colors.pageBg },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="beranda" />
      <Tabs.Screen name="kolam" />
      <Tabs.Screen name="tugas" />
      <Tabs.Screen name="laporan" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}

function LoadFarm() {
  const { refresh, signOut } = useStore();
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const load = () => {
    setState('busy');
    refresh().then(() => setState('idle')).catch(() => setState('error'));
  };
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Data tambak belum dimuat</Text>
      <Text style={styles.body}>{state === 'error' ? 'Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.' : 'Ketuk untuk memuat data terbaru.'}</Text>
      <PressScale onPress={load} disabled={state === 'busy'} accessibilityRole="button" accessibilityLabel="Muat ulang" style={styles.btn}>
        {state === 'busy' ? <ActivityIndicator color={colors.white} /> : <RefreshCw size={18} color={colors.white} strokeWidth={2.4} />}
        <Text style={styles.btnText}>Muat data</Text>
      </PressScale>
      <PressScale onPress={signOut} accessibilityRole="button" accessibilityLabel="Keluar" style={styles.link}>
        <Text style={styles.linkText}>Keluar</Text>
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.pageBg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, textAlign: 'center' },
  body: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22, color: colors.slate, textAlign: 'center' },
  btn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 52, paddingHorizontal: 24,
    borderRadius: 16, backgroundColor: colors.navy, marginTop: 8,
  },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
  link: { padding: 12 },
  linkText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.navy },
});
