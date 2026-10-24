// Pill pemilih tambak — PUTIH SOLID, tanpa kaca, tanpa dot, tanpa "Aktif" (§8.1a).
import { ChevronDown } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { FadeText, PressScale } from './motion';
import type { Farm } from '@/lib/domain';
import { colors, fonts, shadow } from '@/lib/theme';

export function FarmPicker({ farm, blokIndex, onCycle }: { farm: Farm; blokIndex: number; onCycle: () => void }) {
  return (
    <PressScale
      onPress={onCycle}
      accessibilityRole="button"
      accessibilityLabel={`${farm.name}, ${farm.bloks[blokIndex]}. Ketuk untuk ganti blok`}
      style={styles.pill}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{farm.initials}</Text>
      </View>
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>{farm.name}</Text>
        <FadeText style={styles.sub}>{farm.bloks[blokIndex]}</FadeText>
      </View>
      <ChevronDown size={20} color={colors.navy} strokeWidth={2.4} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: 999, paddingVertical: 8, paddingLeft: 8, paddingRight: 16,
    alignSelf: 'stretch', ...shadow,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.display, fontSize: 14, color: colors.white },
  texts: { flex: 1 },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  sub: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.slate, marginTop: 1 },
});
