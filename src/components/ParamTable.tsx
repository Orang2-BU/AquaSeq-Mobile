// Tabel pengamatan terbaru per kolam: hasil yang diketuk teknisi, status, dan kapan dilihat.
import { StyleSheet, Text, View } from 'react-native';

import { statusMeta } from './StatusIconBadge';
import { wibDay, wibTime } from '@/lib/domain';
import type { LatestValue } from '@/lib/farm';
import { PARAMS, optionOf, type ParamKey } from '@/lib/params';
import { colors, fonts } from '@/lib/theme';

export function ParamTable({ keys, latest, showHint = false }: {
  keys: ParamKey[];
  latest: Partial<Record<ParamKey, LatestValue>>;
  /** Tampilkan cara mengamati (untuk teknisi). */
  showHint?: boolean;
}) {
  return (
    <View>
      {keys.map((k, idx) => {
        const l = latest[k];
        const c = PARAMS[k];
        const opt = l ? optionOf(k, l.value) : undefined;
        const m = opt ? statusMeta[opt.status] : null;
        const Icon = m?.icon;
        return (
          <View key={k} style={[styles.row, idx > 0 && styles.divider]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.label}>{c.label}</Text>
              {showHint ? <Text style={styles.hint}>{c.hint}</Text> : null}
              {l ? <Text style={styles.when}>{wibDay(l.at)} {wibTime(l.at)} · {l.by}</Text> : null}
            </View>
            <View style={styles.right}>
              <Text style={[styles.value, opt && opt.status !== 'SEHAT' && m ? { color: m.color } : null]}>
                {opt ? opt.label : 'Belum dicek'}
              </Text>
              {m && Icon ? (
                <View style={styles.statusRow}>
                  <Icon size={13} color={m.color} strokeWidth={2.6} />
                  <Text style={[styles.status, { color: m.color }]}>{m.label}</Text>
                </View>
              ) : null}
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
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.slate },
  when: { fontFamily: fonts.body, fontSize: 12, color: colors.slate },
  right: { alignItems: 'flex-end', maxWidth: '45%' },
  value: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'right' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  status: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
