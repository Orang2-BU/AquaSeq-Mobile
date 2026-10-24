// Kartu kolam. Teknisi: status + masalah utama + kapan dicek (sederhana).
// Pemilik: ditambah DOC / SR / biomassa.
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Check, Clock, Waves } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { PressScale } from './motion';
import { StatusIconBadge, statusMeta, statusStroke } from './StatusIconBadge';
import { biomassKg, describeIssue, wibDay, wibTime } from '@/lib/domain';
import type { PondView } from '@/lib/farm';
import { card, colors, fonts, gradients, monoNums } from '@/lib/theme';

export function PondCard({ view, detailed, onOpen }: { view: PondView; detailed: boolean; onOpen: () => void }) {
  const { pond, issues, status, lastCheck } = view;
  const m = statusMeta[status];
  const IssueIcon = issues.length ? m.icon : Check;
  const today = lastCheck && wibDay(lastCheck.at) === wibDay(new Date().toISOString());

  return (
    <PressScale onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${pond.name}, ${m.label}. Buka`} style={[card, styles.card, statusStroke(status)]}>
      <View style={styles.top}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBox}>
          <Waves size={24} color={colors.white} strokeWidth={2.4} />
        </LinearGradient>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.name}>{pond.name}</Text>
          <StatusIconBadge status={status} />
        </View>
        <ArrowRight size={20} color={colors.navy} strokeWidth={2.4} />
      </View>

      <View style={[styles.issue, { backgroundColor: issues.length ? m.tint : '#E2F5EC' }]}>
        <IssueIcon size={16} color={issues.length ? m.color : colors.green} strokeWidth={2.6} />
        <Text style={styles.issueText}>
          {issues.length ? describeIssue(issues[0]) : 'Semua parameter dalam batas aman'}
          {issues.length > 1 ? ` (+${issues.length - 1} lainnya)` : ''}
        </Text>
      </View>

      {detailed ? (
        <View style={styles.stats}>
          <Stat label="DOC" value={`${pond.docDays} hari`} />
          <View style={styles.statDivider} />
          <Stat label="SR" value={`${pond.srPercent}%`} />
          <View style={styles.statDivider} />
          <Stat label="BIOMASSA" value={`${biomassKg(pond).toLocaleString('id-ID')} kg`} />
        </View>
      ) : null}

      <View style={styles.meta}>
        <Clock size={14} color={colors.slate} strokeWidth={2.4} />
        <Text style={styles.metaText}>
          {lastCheck
            ? `Dicek ${today ? '' : `${wibDay(lastCheck.at)} `}${wibTime(lastCheck.at)} · ${lastCheck.by}${lastCheck.synced ? '' : ' · belum terkirim'}`
            : 'Belum pernah dicek'}
        </Text>
      </View>
    </PressScale>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  issue: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: 14, padding: 10 },
  issueText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  stats: { flexDirection: 'row', backgroundColor: '#F3F8FF', borderRadius: 16, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: colors.slate },
  statValue: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.ink, ...monoNums },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate },
});
