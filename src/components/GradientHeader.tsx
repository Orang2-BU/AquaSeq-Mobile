// Header gradient biru gelap + ombak bawah (Kolam Saya, Laporan).
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeText } from './motion';
import { WaveDivider } from './WaveDivider';
import { colors, fonts, gradients } from '@/lib/theme';

export function GradientHeader({ title, subtitle, children }: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View>
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.grad, { paddingTop: insets.top + 20 }]}
      >
        <FadeText style={styles.title}>{title}</FadeText>
        <FadeText style={styles.subtitle}>{subtitle}</FadeText>
        {children}
      </LinearGradient>
      <WaveDivider />
    </View>
  );
}

const styles = StyleSheet.create({
  grad: { paddingHorizontal: 16, paddingBottom: 20 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.white, letterSpacing: -0.5 },
  subtitle: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
});
