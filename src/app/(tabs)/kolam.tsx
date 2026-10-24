// Daftar kolam (§8.2). Status dihitung dari pengecekan manual terakhir; urut kritis -> waspada -> sehat.
import { useRouter } from 'expo-router';
import { Check, CircleX, Search, TriangleAlert, Waves } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Chip } from '@/components/Chip';
import { FadeSlideIn } from '@/components/FadeSlideIn';
import { GradientHeader } from '@/components/GradientHeader';
import { PondCard } from '@/components/PondCard';
import type { PondStatus } from '@/lib/domain';
import { useFarm } from '@/lib/farm';
import { useMotionReduced, useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

type Filter = 'SEMUA' | PondStatus;

export default function KolamSaya() {
  const router = useRouter();
  const reduced = useMotionReduced();
  const farm = useFarm();
  const role = useStore().session?.user.role;
  const [filter, setFilter] = useState<Filter>('SEMUA');
  const [shownFilter, setShownFilter] = useState<Filter>('SEMUA');
  const [query, setQuery] = useState('');
  const listOpacity = useSharedValue(1);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickFilter = (f: Filter) => {
    if (f === filter) return;
    setFilter(f);
    // Daftar lama fade-out 120 ms, lalu daftar baru fade-in + rise (stagger).
    listOpacity.set(withTiming(0, { duration: reduced ? 0 : 120 }));
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      setShownFilter(f);
      listOpacity.set(1);
    }, reduced ? 0 : 120);
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (farm?.ponds ?? [])
      .filter((v) => shownFilter === 'SEMUA' || v.status === shownFilter)
      .filter((v) => !q || v.pond.id.toLowerCase().includes(q) || v.pond.name.toLowerCase().includes(q));
  }, [farm, shownFilter, query]);

  const listStyle = useAnimatedStyle(() => ({ opacity: listOpacity.get() }));
  if (!farm) return null;

  const filters = [
    { key: 'SEMUA', label: 'Semua', icon: Waves, count: farm.ponds.length },
    { key: 'KRITIS', label: 'Kritis', icon: CircleX, count: farm.counts.KRITIS },
    { key: 'WASPADA', label: 'Waspada', icon: TriangleAlert, count: farm.counts.WASPADA },
    { key: 'SEHAT', label: 'Sehat', icon: Check, count: farm.counts.SEHAT },
  ] as const;
  const needAction = farm.counts.KRITIS + farm.counts.WASPADA;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <GradientHeader
        title="Kolam"
        subtitle={`${farm.ponds.length} kolam · ${needAction ? `${needAction} perlu tindakan` : 'semua dalam batas aman'}`}
      >
        <View style={styles.search}>
          <Search size={20} color={colors.navy} strokeWidth={2.4} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari kolam... mis. A3"
            placeholderTextColor={colors.slate}
            style={styles.searchInput}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Cari kolam"
          />
        </View>
      </GradientHeader>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {filters.map((f) => (
          <Chip key={f.key} label={f.label} count={f.count} icon={f.icon} active={filter === f.key} onPress={() => pickFilter(f.key)} />
        ))}
      </ScrollView>

      <Animated.View style={[styles.list, listStyle]}>
        {list.map((v, idx) => (
          <FadeSlideIn key={v.pond.id} index={idx} replayKey={shownFilter}>
            <PondCard
              view={v}
              detailed={role === 'pemilik'}
              onOpen={() => router.push({ pathname: '/kolam/[id]', params: { id: v.pond.id } })}
            />
          </FadeSlideIn>
        ))}
        {list.length === 0 ? (
          <Text style={styles.empty}>{query ? `Tidak ada kolam yang cocok dengan “${query}”.` : 'Tidak ada kolam di kategori ini.'}</Text>
        ) : null}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingBottom: 48 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16,
    backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 16, minHeight: 48,
  },
  searchInput: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink, paddingVertical: 12 },
  chips: { gap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  list: { paddingHorizontal: 16, gap: 14 },
  empty: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.slate, textAlign: 'center', paddingVertical: 24 },
});
