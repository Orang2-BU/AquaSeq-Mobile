// Kartu metrik besar (mis. "3 kolam perlu tindakan") + ombak dua lapis di tepi bawah (§8.1b).
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { WaveDivider } from './WaveDivider';
import { colors, fonts, gradients, shadow } from '@/lib/theme';

export function MetricCard({ value, unit, text, children }: {
  value: string;
  unit: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.grad}>
        <View style={styles.row}>
          <Text style={styles.big}>{value}</Text>
          <Text style={styles.unit}>{unit}</Text>
        </View>
        <Text style={styles.body}>{text}</Text>
        {children}
      </LinearGradient>
      <WaveDivider height={32} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', ...shadow },
  // paddingBottom 22 = jarak aman >= 20 px dari kurva ombak.
  grad: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 22 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  big: { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, color: colors.white, letterSpacing: -1 },
  unit: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.white, marginBottom: 9 },
  body: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22, color: colors.white, marginTop: 6 },
});
