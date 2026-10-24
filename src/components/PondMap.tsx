// Denah kolam — tile terang, kode Sora 800 19 px + ikon status saja, legenda wajib.
import { StyleSheet, Text, View } from 'react-native';

import { PressScale } from './motion';
import { statusMeta, statusStroke } from './StatusIconBadge';
import type { PondStatus } from '@/lib/domain';
import { card, colors, fonts } from '@/lib/theme';

export function PondMap({ tiles, onOpen, title = 'Denah Kolam' }: {
  tiles: { id: string; status: PondStatus }[];
  onOpen: (pondId: string) => void;
  title?: string;
}) {
  const counts = tiles.reduce<Record<PondStatus, number>>(
    (acc, t) => ({ ...acc, [t.status]: acc[t.status] + 1 }),
    { SEHAT: 0, WASPADA: 0, KRITIS: 0 },
  );

  return (
    <View style={card}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.grid}>
        {tiles.map((t) => {
          const m = statusMeta[t.status];
          const Icon = m.icon;
          return (
            <PressScale
              key={t.id}
              onPress={() => onOpen(t.id)}
              accessibilityRole="button"
              accessibilityLabel={`Kolam ${t.id}, ${m.label}. Buka detail`}
              style={[styles.tile, statusStroke(t.status)]}
            >
              <Text style={styles.code}>{t.id}</Text>
              <Icon size={17} color={m.color} strokeWidth={2.6} />
            </PressScale>
          );
        })}
      </View>

      <View style={styles.legend}>
        {(['SEHAT', 'WASPADA', 'KRITIS'] as const).map((s) => {
          const m = statusMeta[s];
          const Icon = m.icon;
          return (
            <View key={s} style={styles.legendItem}>
              <Icon size={14} color={m.color} strokeWidth={2.6} />
              <Text style={styles.legendText}>{m.label} · {counts[s]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '22%', flexGrow: 1, aspectRatio: 1.1, backgroundColor: colors.white, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  code: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink },
});
