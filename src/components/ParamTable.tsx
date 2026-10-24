// Tabel kadar parameter untuk pemilik: nilai terakhir, batas aman, status, kapan dicek.
import { StyleSheet, Text, View } from 'react-native';

import { statusMeta } from './StatusIconBadge';
import { paramStatus, wibDay, wibTime } from '@/lib/domain';
import type { LatestValue } from '@/lib/farm';
import { PARAMS, fmtParam, safeRange, type ParamKey } from '@/lib/params';
import { colors, fonts, monoNums } from '@/lib/theme';

export function ParamTable({ keys, latest }: { keys: ParamKey[]; latest: Partial<Record<ParamKey, LatestValue>> }) {
  return (
    <View>
      {keys.map((k, idx) => {
        const l = latest[k];
        const c = PARAMS[k];
        const status = l ? paramStatus(k, l.value) : null;
        const m = status ? statusMeta[status] : null;
        const Icon = m?.icon;
        return (
          <View key={k} style={[styles.row, idx > 0 && styles.divider]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.label}>{c.label}</Text>
              <Text style={styles.range}>Batas aman {safeRange(k)}{c.unit ? ` ${c.unit}` : ''}</Text>
              {l ? <Text style={styles.when}>{wibDay(l.at)} {wibTime(l.at)} · {l.by}</Text> : null}
            </View>
            <View style={styles.right}>
              <Text style={[styles.value, status && status !== 'SEHAT' ? { color: m!.color } : null]}>
                {l ? fmtParam(k, l.value, false) : '—'}
              </Text>
              {c.unit ? <Text style={styles.unit}>{c.unit}</Text> : null}
              {m && Icon ? (
                <View style={styles.statusRow}>
                  <Icon size={13} color={m.color} strokeWidth={2.6} />
                  <Text style={[styles.status, { color: m.color }]}>{m.label}</Text>
                </View>
              ) : <Text style={styles.unit}>Belum diukur</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'center' },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  range: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate },
  when: { fontFamily: fonts.body, fontSize: 12, color: colors.slate },
  right: { alignItems: 'flex-end', minWidth: 92 },
  value: { fontFamily: fonts.monoBold, fontSize: 22, color: colors.ink, ...monoNums },
  unit: { fontFamily: fonts.mono, fontSize: 12, color: colors.slate },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  status: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
