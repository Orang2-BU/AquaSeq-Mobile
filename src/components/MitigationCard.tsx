// Kartu saran mitigasi cepat: ringkasan + langkah bernomor yang besar dan mudah diikuti teknisi.
import { ArrowRight, Lightbulb, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FadeText } from './motion';
import { statusMeta, statusStroke } from './StatusIconBadge';
import * as api from '@/lib/api';
import type { Mitigation } from '@/lib/domain';
import type { AiState } from '@/lib/farm';
import { useStore } from '@/lib/store';
import { card, colors, fonts } from '@/lib/theme';

export function MitigationCard({ mitigation, ai, compact = false, title, onOpen }: {
  mitigation: Mitigation;
  ai: AiState;
  /** Ringkas: 2 langkah pertama + tautan ke saran lengkap. */
  compact?: boolean;
  title?: string;
  onOpen?: () => void;
}) {
  const { online } = useStore();
  const steps = compact ? mitigation.steps.slice(0, 2) : mitigation.steps;
  const more = mitigation.steps.length - steps.length;
  const isAi = mitigation.source === 'ai';
  const Icon = isAi ? Sparkles : Lightbulb;
  const m = statusMeta[mitigation.severity];

  const sourceLabel = isAi
    ? 'Saran AI'
    : ai === 'loading' ? 'Saran cepat · meminta saran AI…'
      : ai === 'error' ? 'Saran cepat · AI tidak bisa dihubungi'
        : !online ? 'Saran cepat · offline'
          : api.AI_URL ? 'Saran cepat' : 'Saran cepat (aturan bawaan)';

  return (
    <View style={[card, styles.card, statusStroke(mitigation.severity)]}>
      <View style={styles.head}>
        <View style={[styles.iconBox, { backgroundColor: m.tint }]}>
          <Icon size={18} color={m.color} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <FadeText style={styles.source}>{sourceLabel}</FadeText>
        </View>
      </View>

      <Text style={styles.summary}>{mitigation.summary}</Text>

      {mitigation.severity !== 'SEHAT' || !compact ? (
        <View style={styles.steps}>
          {steps.map((s, i) => (
            <View key={`${i}-${s.title}`} style={styles.step}>
              <View style={styles.num}><Text style={styles.numText}>{i + 1}</Text></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                {s.detail && !compact ? <Text style={styles.stepDetail}>{s.detail}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {onOpen ? (
        <Pressable onPress={onOpen} hitSlop={8} accessibilityRole="link" style={styles.open}>
          <Text style={styles.openText}>{more > 0 ? `Lihat ${more} langkah lain` : 'Buka kolam'}</Text>
          <ArrowRight size={16} color={colors.navy} strokeWidth={2.6} />
        </Pressable>
      ) : null}

      {!compact ? <Text style={styles.note}>Ikuti SOP tambak untuk dosis dan prosedur. Cek ulang setelah tindakan.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  source: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.4, color: colors.slate },
  summary: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 22, color: colors.ink },
  steps: { gap: 10 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  num: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: colors.navy,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  numText: { fontFamily: fonts.monoBold, fontSize: 13, color: colors.white },
  stepTitle: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22, color: colors.ink },
  stepDetail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.slate },
  open: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', paddingVertical: 4,
  },
  openText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.navy },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.slate },
});
