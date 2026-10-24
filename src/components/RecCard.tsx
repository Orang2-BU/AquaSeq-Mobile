// Kartu rekomendasi + "Jadwalkan besok" (§8.6e).
// Terpilih: gradient biru cross-fade 200 ms, centang scale-in 150 ms, label "Terpilih" fade-in 150 ms.
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarPlus, Check, Droplet, FlaskConical, Microscope, Shovel, Wheat, Wind, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { FadeText, PressScale } from './motion';
import { easeOut, motion } from '@/lib/animations';
import type { RecIcon, Recommendation } from '@/lib/domain';
import { colors, fonts, gradients, radius, shadow } from '@/lib/theme';

const ICONS: Record<RecIcon, LucideIcon> = { wind: Wind, wheat: Wheat, flask: FlaskConical, droplet: Droplet, shovel: Shovel, microscope: Microscope };

export function RecCard({ rec, selected, scheduled, onSelect, onSchedule }: {
  rec: Recommendation;
  selected: boolean;
  scheduled: boolean;
  onSelect: () => void;
  onSchedule: () => void;
}) {
  const on = selected || scheduled;
  const p = useSharedValue(on ? 1 : 0);
  const check = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(on ? 1 : 0, { duration: motion.base, easing: easeOut }));
    check.set(withTiming(on ? 1 : 0, { duration: motion.fast, easing: easeOut }));
  }, [on, p, check]);

  const gradStyle = useAnimatedStyle(() => ({ opacity: p.get() }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: check.get(), transform: [{ scale: 0.6 + 0.4 * check.get() }] }));
  const Icon = ICONS[rec.icon];
  const fg = on ? colors.white : colors.ink;

  return (
    // Seluruh kartu bisa diketuk untuk memilih; untuk pembaca layar, baris "Terpilih"
    // adalah checkbox-nya, dan tombol jadwal tetap tombol terpisah (tanpa <button> bersarang).
    <PressScale onPress={onSelect} accessible={false} style={[styles.card, on && styles.cardOn]}>
      <Animated.View style={[StyleSheet.absoluteFill, gradStyle]}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View style={styles.top}>
        <View style={[styles.iconBox, on && styles.iconBoxOn]}>
          <Icon size={20} color={on ? colors.white : colors.navy} strokeWidth={2.4} />
        </View>
        <Text style={[styles.text, { color: fg }]}>{rec.text}</Text>
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={onSelect}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: on }}
          accessibilityLabel={rec.text}
          style={styles.selectedRow}
        >
          <Animated.View style={[styles.checkWrap, checkStyle]}>
            <Check size={14} color={colors.navy} strokeWidth={3.2} />
          </Animated.View>
          <FadeText style={[styles.selectedLabel, { color: on ? colors.white : colors.slate }]}>
            {scheduled ? 'Terjadwal besok' : on ? 'Terpilih' : 'Ketuk untuk memilih'}
          </FadeText>
        </Pressable>
        <PressScale
          onPress={onSchedule}
          disabled={scheduled}
          accessibilityRole="button"
          accessibilityState={{ disabled: scheduled }}
          style={[styles.btn, on ? styles.btnOn : styles.btnOff, scheduled && styles.btnDone]}
        >
          <CalendarPlus size={16} color={on ? colors.navy : colors.white} strokeWidth={2.4} />
          <FadeText style={[styles.btnText, { color: on ? colors.navy : colors.white }]}>
            {scheduled ? 'Terjadwal' : 'Jadwalkan besok'}
          </FadeText>
        </PressScale>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border,
    padding: 16, gap: 14, overflow: 'hidden', ...shadow,
  },
  cardOn: { borderColor: 'transparent' },
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#E6EEFF',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBoxOn: { backgroundColor: 'rgba(255,255,255,0.18)' },
  text: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkWrap: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedLabel: { fontFamily: fonts.bodyBold, fontSize: 13 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14,
    paddingHorizontal: 14, minHeight: 44, justifyContent: 'center',
  },
  btnOff: { backgroundColor: colors.navy },
  btnOn: { backgroundColor: colors.white },
  btnDone: { opacity: 0.75 },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
