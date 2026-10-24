// Grafik tren satu parameter dari pengecekan manual + garis batas aman putus-putus.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { paramStatus } from '@/lib/domain';
import { PARAMS, fmtParam, type ParamKey } from '@/lib/params';
import { colors, fonts } from '@/lib/theme';

const H = 170;
const PAD = { l: 40, r: 12, t: 14, b: 26 };

export function TrendChart({ param, data }: { param: ParamKey; data: { label: string; value: number }[] }) {
  const [w, setW] = useState(0);
  const { warn } = PARAMS[param].limits;
  const lines = [warn.min, warn.max].filter((v): v is number => v !== undefined);
  const values = data.map((d) => d.value);
  const lo = Math.min(...values, ...lines);
  const hi = Math.max(...values, ...lines);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.15;
  const min = lo - pad;
  const max = hi + pad;
  const innerW = Math.max(w - PAD.l - PAD.r, 1);
  const innerH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (innerW * i) / Math.max(data.length - 1, 1);
  const y = (v: number) => PAD.t + innerH * (1 - (v - min) / (max - min));
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');

  if (!data.length) return <Text style={styles.empty}>Belum ada pengecekan untuk parameter ini.</Text>;

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={styles.wrap}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {[min, (min + max) / 2, max].map((t) => (
            <SvgText key={t} x={PAD.l - 6} y={y(t) + 4} fontSize={10} fill={colors.slate} textAnchor="end" fontFamily={fonts.mono}>
              {fmtParam(param, t, false)}
            </SvgText>
          ))}
          {lines.map((v) => (
            <Line key={v} x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} stroke={colors.strokeRed} strokeWidth={1.5} strokeDasharray="6 5" />
          ))}
          <Path d={path} stroke={colors.navy} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((d, i) => (
            <Circle key={`${d.label}-${i}`} cx={x(i)} cy={y(d.value)} r={i === data.length - 1 ? 5.5 : 4}
              fill={colors.white} stroke={paramStatus(param, d.value) === 'SEHAT' ? colors.navy : colors.strokeRed} strokeWidth={2.5} />
          ))}
          {data.map((d, i) => (
            <SvgText key={`l-${d.label}-${i}`} x={x(i)} y={H - 6} fontSize={11} fill={colors.slate} textAnchor="middle" fontFamily={fonts.bodySemi}>
              {d.label}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: H, width: '100%' },
  empty: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.slate, paddingVertical: 24, textAlign: 'center' },
});
