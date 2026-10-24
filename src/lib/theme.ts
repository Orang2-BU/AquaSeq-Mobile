// Design token §4 — jangan diganti tanpa persetujuan.
import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  navy: '#050C9C',
  blue: '#3572EF',
  sky: '#3ABEF9',
  ice: '#A7E6FF',
  violet: '#6A4FE0',
  pageBg: '#EFF8FF',
  ink: '#0A1166',
  slate: '#475569',
  white: '#FFFFFF',
  border: '#D9E4F2',
  strokeRed: '#E23A2E',
  strokeAmber: '#EFA00B',
  // Ikon status di tile terang
  red: '#C0261B',
  amber: '#A86A00',
  green: '#0E7A4F',
  // Ikon status di zona gelap
  redL: '#FFB4A2',
  amberL: '#FFD88A',
  greenL: '#7EE2B8',
} as const;

export const gradients = {
  hero: [colors.navy, colors.violet] as const,
  warm: ['#FFB47A', '#FFDCC2'] as const,
};

export const fonts = {
  display: 'Sora_800ExtraBold',
  displayBold: 'Sora_700Bold',
  body: 'PlusJakartaSans_400Regular',
  bodySemi: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const radius = { card: 22, pill: 16 } as const;

export const space = { gap: 14, pad: 16, gutter: 16, waveSafe: 20 } as const;

export const shadow: ViewStyle = {
  shadowColor: colors.navy,
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

export const card: ViewStyle = {
  backgroundColor: colors.white,
  borderRadius: radius.card,
  borderWidth: 1,
  borderColor: colors.border,
  padding: space.pad,
  ...shadow,
};

// Angka sensor selalu mono tabular.
export const monoNums: TextStyle = { fontVariant: ['tabular-nums'] };

/** Format angka Indonesia: 4.1 -> "4,1", 2500 -> "2.500". */
export function fmt(value: number, decimals = 1): string {
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
