// Ombak SVG dua lapis — STATIS, tidak pernah dianimasikan (§6.2).
// 'down': ombak menggantung di bawah zona gradient (kartu metrik, header).
// 'up'  : ombak naik dari zona gradient ke zona putih di atasnya (kartu modul).
import { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/lib/theme';

const FRONT = 'M0,0 H400 V14 C340,28 270,2 200,14 C130,26 64,4 0,16 Z';
const BACK = 'M0,0 H400 V24 C330,10 272,34 200,24 C128,14 62,32 0,22 Z';

export function WaveDivider({ direction = 'down', height = 30, style }: {
  direction?: 'down' | 'up';
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <View pointerEvents="none" style={[{ height, width: '100%' }, direction === 'up' && { transform: [{ scaleY: -1 }] }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 34" preserveAspectRatio="none">
        <Defs>
          {/* Lapisan depan berangkat dari #050C9C dan mengikuti gradient hero supaya menyatu dengan kartu. */}
          <LinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.navy} />
            <Stop offset="1" stopColor={colors.violet} />
          </LinearGradient>
        </Defs>
        <Path d={BACK} fill={colors.blue} fillOpacity={0.55} />
        <Path d={FRONT} fill={`url(#g${id})`} />
      </Svg>
    </View>
  );
}
