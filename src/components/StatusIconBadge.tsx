// Badge status = ikon Lucide + teks. Bukan dot, bukan bar (§5).
import { Check, CircleX, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { PondStatus } from '@/lib/domain';
import { colors, fonts } from '@/lib/theme';

export const statusMeta: Record<PondStatus, { icon: LucideIcon; color: string; light: string; tint: string; label: string; stroke: string | null }> = {
  SEHAT: { icon: Check, color: colors.green, light: colors.greenL, tint: '#E2F5EC', label: 'Sehat', stroke: null },
  WASPADA: { icon: TriangleAlert, color: colors.amber, light: colors.amberL, tint: '#FFF1D1', label: 'Waspada', stroke: colors.strokeAmber },
  KRITIS: { icon: CircleX, color: colors.red, light: colors.redL, tint: '#FDE3DF', label: 'Kritis', stroke: colors.strokeRed },
};

export function StatusIconBadge({ status, text }: { status: PondStatus; text?: string }) {
  const m = statusMeta[status];
  const Icon = m.icon;
  return (
    <View style={[styles.badge, { backgroundColor: m.tint }]}>
      <Icon size={13} color={m.color} strokeWidth={2.6} />
      <Text style={[styles.text, { color: m.color }]}>{text ?? status}</Text>
    </View>
  );
}

/** Stroke kartu sesuai status: kritis merah 2 px, waspada kuning 2 px, sehat netral. */
export function statusStroke(status: PondStatus) {
  const s = statusMeta[status].stroke;
  return s ? { borderColor: s, borderWidth: 2 } : { borderColor: colors.border, borderWidth: 1 };
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  text: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6 },
});
