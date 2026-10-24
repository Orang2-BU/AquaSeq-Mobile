// Potongan yang dipakai kedua Beranda (teknisi & pemilik).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FarmPicker } from '../FarmPicker';
import { MitigationCard } from '../MitigationCard';
import { useMitigation, type FarmView, type PondView } from '@/lib/farm';
import { useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

export function HomeHeader({ farm, title }: { farm: FarmView; title: string }) {
  const [blok, setBlok] = useState(0);
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta',
  });
  return (
    <View style={{ gap: 14 }}>
      <FarmPicker farm={farm.farm} blokIndex={blok} onCycle={() => setBlok((b) => (b + 1) % farm.farm.bloks.length)} />
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.date}>{today}</Text>
      </View>
    </View>
  );
}

export function useFirstName(): string {
  const name = useStore().session?.user.name ?? '';
  return name.split(/\s+/)[0] || 'Petugas';
}

/** Saran mitigasi ringkas satu kolam (hook per kolam, jadi dibungkus komponen sendiri). */
export function PondMitigation({ view, farm }: { view: PondView; farm: FarmView }) {
  const router = useRouter();
  const { mitigation, ai } = useMitigation(view, farm);
  if (!mitigation) return null;
  return (
    <MitigationCard
      mitigation={mitigation}
      ai={ai}
      compact
      title={view.pond.name}
      onOpen={() => router.push({ pathname: '/kolam/[id]', params: { id: view.pond.id } })}
    />
  );
}

export const homeStyles = StyleSheet.create({
  section: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginTop: 6, marginBottom: 10 },
  list: { gap: 12 },
});

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, letterSpacing: -0.4 },
  date: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.slate, marginTop: 2 },
});
