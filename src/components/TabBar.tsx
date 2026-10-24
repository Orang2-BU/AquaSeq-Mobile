// Bottom nav per peran (§7).
// Teknisi: Beranda · Kolam · (+ Cek Kolam) · Tugas · Profil — FAB membuka modal Cek Kolam.
// Pemilik: Beranda · Kolam · Laporan · Profil — tanpa FAB (pemilik tidak menginput).
import type { BottomTabBarProps } from 'expo-router/tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChartColumn, CircleUser, House, ListChecks, Plus, Waves, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PressScale } from './motion';
import type { Role } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  beranda: { label: 'Beranda', icon: House },
  kolam: { label: 'Kolam', icon: Waves },
  tugas: { label: 'Tugas', icon: ListChecks },
  laporan: { label: 'Laporan', icon: ChartColumn },
  profil: { label: 'Profil', icon: CircleUser },
};

export const TABS_BY_ROLE: Record<Role, string[]> = {
  teknisi: ['beranda', 'kolam', 'tugas', 'profil'],
  pemilik: ['beranda', 'kolam', 'laporan', 'profil'],
};

export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const router = useRouter();
  const role = useStore().session?.user.role ?? 'teknisi';
  const names = TABS_BY_ROLE[role];
  const routes = state.routes
    .filter((r) => names.includes(r.name))
    .sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name));
  const activeName = state.routes[state.index]?.name;

  const renderTab = (route: (typeof routes)[number]) => {
    const meta = TABS[route.name];
    const active = route.name === activeName;
    const Icon = meta.icon;
    return (
      <Pressable
        key={route.key}
        onPress={() => navigateToTab(route.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={meta.label}
        style={styles.tab}
      >
        <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
          <Icon size={22} color={active ? colors.navy : colors.slate} strokeWidth={active ? 2.6 : 2} />
        </View>
        <Text style={[styles.label, active && styles.labelActive]}>{meta.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {routes.slice(0, 2).map(renderTab)}
      {role === 'teknisi' ? (
        <View style={styles.fabSlot}>
          <Fab onPress={() => router.push('/cek-kolam')} />
        </View>
      ) : null}
      {routes.slice(2).map(renderTab)}
    </View>
  );
}

function Fab({ onPress }: { onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <PressScale
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel="Cek kolam"
      style={[styles.fab, { shadowOpacity: pressed ? 0.65 : 0.55 }]}
    >
      <LinearGradient colors={[colors.navy, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabInner}>
        <Plus size={32} color={colors.white} strokeWidth={3} />
      </LinearGradient>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: colors.white, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.border,
    shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 52 },
  iconWrap: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: '#DDE8FF' },
  label: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.slate },
  labelActive: { fontFamily: fonts.bodyBold, color: colors.navy },
  fabSlot: { width: 76, alignItems: 'center' },
  fab: {
    position: 'absolute', top: -30, width: 64, height: 64, borderRadius: 32,
    shadowColor: colors.navy, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10,
    borderWidth: 4, borderColor: colors.white, backgroundColor: colors.white,
  },
  fabInner: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
