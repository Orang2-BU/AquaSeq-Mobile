// Token animasi §6.1
import { Easing } from 'react-native-reanimated';

export const motion = {
  fast: 150,
  base: 200,
  screen: 280,
  sheet: 300,
  stagger: 40,
  staggerMax: 6,
  rise: 12,
  pressScale: 0.97,
  // Reduce Motion: semua slide & stagger diganti fade 150 ms saja (§6.3)
  reduced: 150,
} as const;

export const easeOut = Easing.out(Easing.cubic);

export function staggerDelay(index: number): number {
  // Sama dengan contoh §6.4: item ke-7 dst. ikut jeda item ke-6, tanpa stagger tambahan.
  return Math.min(index, motion.staggerMax - 1) * motion.stagger;
}
