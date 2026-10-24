// Cek Kolam (teknisi) — modal slide-up + fade backdrop (§6.2).
// Alur: pilih kolam -> ketuk hasil pengamatan (air & udang) -> Simpan -> status & saran mitigasi.
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck, CloudOff, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { MitigationCard } from '@/components/MitigationCard';
import { PressScale } from '@/components/motion';
import { StatusIconBadge, statusMeta } from '@/components/StatusIconBadge';
import { easeOut, motion } from '@/lib/animations';
import type { Reading } from '@/lib/domain';
import { useFarm, useMitigation } from '@/lib/farm';
import { LEVEL_PARAMS, PARAMS, PARAM_ORDER, optionOf, type ParamGroup, type ParamKey } from '@/lib/params';
import { useMotionReduced, useStore } from '@/lib/store';
import { colors, fonts, gradients } from '@/lib/theme';

const GROUP_TITLE: Record<ParamGroup, string> = { Air: 'Air kolam', Udang: 'Udang (cek dari anco / senter malam)' };

export default function CekKolam() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pond?: string }>();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduced = useMotionReduced();
  const farm = useFarm();
  const { addReading, online, pending, snapshot, toggleTask } = useStore();

  const ponds = farm?.ponds ?? [];
  const [pondId, setPondId] = useState(params.pond && farm?.byId[params.pond] ? params.pond : ponds[0]?.pond.id ?? '');
  // Draf per kolam: berpindah kolam tidak menghapus pilihan yang sudah diketuk.
  // Sengaja tidak diisi otomatis dari pengamatan lalu — teknisi harus benar-benar melihat.
  const [drafts, setDrafts] = useState<Record<string, Reading['values']>>({});
  const [saved, setSaved] = useState<Reading | null>(null);

  const view = farm?.byId[pondId];
  const values = drafts[pondId] ?? {};
  const pick = (k: ParamKey, v: number) =>
    setDrafts((d) => ({ ...d, [pondId]: { ...d[pondId], [k]: d[pondId]?.[k] === v ? undefined : v } }));
  // "Sisanya Tidak ada": isi semua tanda di udang yang belum dipilih dengan 0.
  const restNone = () =>
    setDrafts((d) => {
      const cur = { ...d[pondId] };
      for (const k of LEVEL_PARAMS) if (cur[k] === undefined) cur[k] = 0;
      return { ...d, [pondId]: cur };
    });
  const answered = PARAM_ORDER.filter((k) => values[k] !== undefined).length;
  const complete = answered === PARAM_ORDER.length;

  // --- animasi sheet ---
  const backdrop = useSharedValue(0);
  const sheetY = useSharedValue(reduced ? 0 : height);
  const sheetOpacity = useSharedValue(reduced ? 0 : 1);
  useEffect(() => {
    backdrop.set(withTiming(0.5, { duration: reduced ? motion.reduced : motion.base }));
    if (reduced) sheetOpacity.set(withTiming(1, { duration: motion.reduced }));
    else sheetY.set(withTiming(0, { duration: motion.sheet, easing: easeOut }));
  }, [backdrop, sheetY, sheetOpacity, reduced]);
  const close = () => {
    backdrop.set(withTiming(0, { duration: reduced ? motion.reduced : 250 }));
    if (reduced) sheetOpacity.set(withTiming(0, { duration: motion.reduced }));
    else sheetY.set(withTiming(height, { duration: 250, easing: easeOut }));
    // Dibuka langsung dari tautan (tanpa riwayat) -> kembali ke Beranda.
    setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/beranda')), reduced ? motion.reduced : 250);
  };
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));
  const sheetStyle = useAnimatedStyle(() => ({ opacity: sheetOpacity.get(), transform: [{ translateY: sheetY.get() }] }));

  const save = () => {
    if (!complete || !view) return;
    setSaved(addReading(pondId, values));
    setDrafts((d) => ({ ...d, [pondId]: {} }));
  };

  const morningTask = snapshot?.tasks.find((t) => t.id === 't1');

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Tutup" />
      </Animated.View>

      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: height - insets.top - 16 }, sheetStyle]}>
        <View style={{ flexShrink: 1 }}>
          <View style={styles.head}>
            <Text style={styles.title}>{saved ? 'Hasil Cek' : 'Cek Kolam'}</Text>
            <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Tutup" style={styles.closeBtn}>
              <X size={22} color={colors.navy} strokeWidth={2.6} />
            </Pressable>
          </View>

          {!online ? (
            <View style={styles.offline}>
              <CloudOff size={16} color={colors.amber} strokeWidth={2.4} />
              <Text style={styles.offlineText}>Offline — hasil disimpan di HP dan dikirim saat online.</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
            {saved && farm ? (
              <Result
                reading={saved}
                pendingIds={pending.map((p) => p.id)}
                morningTaskOpen={!!morningTask && !morningTask.done}
                onDoneTask={() => toggleTask('t1')}
                onAnother={() => setSaved(null)}
                onClose={close}
              />
            ) : (
              <>
                <View>
                  <Text style={styles.label}>Kolam</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {ponds.map((p) => (
                      <Chip key={p.pond.id} label={p.pond.id} icon={statusMeta[p.status].icon} active={p.pond.id === pondId} onPress={() => setPondId(p.pond.id)} />
                    ))}
                  </ScrollView>
                </View>

                {(['Air', 'Udang'] as const).map((g) => (
                  <View key={g} style={styles.group}>
                    <View style={styles.groupHead}>
                      <Text style={styles.groupTitle}>{GROUP_TITLE[g]}</Text>
                      {g === 'Udang' ? (
                        <Pressable onPress={restNone} hitSlop={8} accessibilityRole="button" accessibilityLabel="Isi sisanya Tidak ada">
                          <Text style={styles.restNone}>Sisanya “Tidak ada”</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    {PARAM_ORDER.filter((k) => PARAMS[k].group === g).map((k) => (
                      <ObsInput key={k} k={k} value={values[k]} onPick={(v) => pick(k, v)} />
                    ))}
                  </View>
                ))}

                <PressScale onPress={save} disabled={!complete} accessibilityRole="button" accessibilityLabel="Simpan dan lihat saran" style={[styles.saveBtn, !complete && { opacity: 0.45 }]}>
                  <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.saveInner}>
                    <Text style={styles.saveText}>{complete ? 'Simpan & Lihat Saran' : `Isi semua pengamatan (${answered}/${PARAM_ORDER.length})`}</Text>
                  </LinearGradient>
                </PressScale>
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

/** Satu pengamatan: nama, cara melihat, lalu pilihan yang tinggal diketuk. */
function ObsInput({ k, value, onPick }: { k: ParamKey; value: number | undefined; onPick: (v: number) => void }) {
  const c = PARAMS[k];
  const opt = value === undefined ? undefined : optionOf(k, value);
  const m = opt ? statusMeta[opt.status] : null;
  const Icon = m?.icon;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{c.label}</Text>
      <Text style={styles.rowHint}>{c.hint}</Text>
      <View style={styles.options}>
        {c.options.map((o) => (
          <Chip key={o.value} label={o.label} active={value === o.value} onPress={() => onPick(o.value)} />
        ))}
      </View>
      {opt && m && Icon ? (
        <View style={styles.rowStatus}>
          <Icon size={13} color={m.color} strokeWidth={2.6} />
          <Text style={[styles.rowNote, { color: opt.status === 'SEHAT' ? colors.green : m.color }]}>
            {m.label}{opt.note ? ` · ${opt.note}` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Setelah simpan: status kolam dari pengecekan ini + saran mitigasi. */
function Result({ reading, pendingIds, morningTaskOpen, onDoneTask, onAnother, onClose }: {
  reading: Reading;
  pendingIds: string[];
  morningTaskOpen: boolean;
  onDoneTask: () => void;
  onAnother: () => void;
  onClose: () => void;
}) {
  const farm = useFarm();
  const view = farm?.byId[reading.pondId];
  const { mitigation, ai } = useMitigation(view, farm);
  if (!view) return null;
  const sent = !pendingIds.includes(reading.id);

  return (
    <>
      <View style={styles.savedRow}>
        <CircleCheck size={20} color={colors.green} strokeWidth={2.6} />
        <Text style={styles.savedText}>
          {view.pond.name} · {Object.keys(reading.values).length} pengamatan {sent ? 'terkirim' : 'tersimpan di HP, menunggu sinkronisasi'}
        </Text>
      </View>
      <View style={styles.statusLine}>
        <Text style={styles.statusLabel}>Status sekarang</Text>
        <StatusIconBadge status={view.status} />
      </View>
      {mitigation ? <MitigationCard mitigation={mitigation} ai={ai} title="Saran mitigasi" /> : null}
      {morningTaskOpen ? (
        <PressScale onPress={onDoneTask} accessibilityRole="button" style={styles.ghostBtn}>
          <Text style={styles.ghostText}>Tandai tugas “Cek warna air & anco pagi” selesai</Text>
        </PressScale>
      ) : null}
      <View style={styles.resultBtns}>
        <PressScale onPress={onAnother} accessibilityRole="button" accessibilityLabel="Cek kolam lain" style={[styles.ghostBtn, { flex: 1 }]}>
          <Text style={styles.ghostText}>Cek kolam lain</Text>
        </PressScale>
        <PressScale onPress={onClose} accessibilityRole="button" accessibilityLabel="Selesai" style={[styles.saveBtn, { flex: 1 }]}>
          <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.saveInner}>
            <Text style={styles.saveText}>Selesai</Text>
          </LinearGradient>
        </PressScale>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#000' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.pageBg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 16, paddingTop: 18,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  closeBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  offline: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#FFF1D1', borderRadius: 14, padding: 12, marginBottom: 12 },
  offlineText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.8, color: colors.slate, marginBottom: 8, textTransform: 'uppercase' },
  chips: { gap: 8 },
  group: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  groupTitle: { flex: 1, fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  restNone: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.navy },
  row: { gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  rowHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.slate },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  rowStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowNote: { fontFamily: fonts.bodySemi, fontSize: 12 },
  saveBtn: { borderRadius: 18, overflow: 'hidden' },
  saveInner: { minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.white },
  savedRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  savedText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  statusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  ghostBtn: {
    minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: colors.navy, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
  },
  ghostText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.navy, textAlign: 'center' },
  resultBtns: { flexDirection: 'row', gap: 10 },
});
