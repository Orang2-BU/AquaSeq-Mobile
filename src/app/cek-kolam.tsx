// Cek Kolam (teknisi) — modal slide-up + fade backdrop (§6.2).
// Alur: pilih kolam -> isi 4 nilai cepat (+ uji kit bila ada) -> Simpan -> status & saran mitigasi.
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, CircleCheck, CloudOff, Minus, Plus, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { MitigationCard } from '@/components/MitigationCard';
import { PressScale } from '@/components/motion';
import { StatusIconBadge, statusMeta } from '@/components/StatusIconBadge';
import { easeOut, motion } from '@/lib/animations';
import { paramStatus, type Reading } from '@/lib/domain';
import { useFarm, useMitigation } from '@/lib/farm';
import { KIT_PARAMS, PARAMS, QUICK_PARAMS, type ParamKey } from '@/lib/params';
import { useMotionReduced, useStore } from '@/lib/store';
import { colors, fonts, gradients, monoNums } from '@/lib/theme';

// Angka untuk kolom isian: koma desimal, TANPA pemisah ribuan (supaya "8.500" tidak terbaca 8,5).
const toInput = (k: ParamKey, v: number) => v.toFixed(PARAMS[k].decimals).replace('.', ',');

const parse = (t: string) => {
  const n = Number(t.replace(/\s/g, '').replace(',', '.'));
  return t.trim() !== '' && Number.isFinite(n) ? n : null;
};

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
  // Draf per kolam: berpindah kolam tidak menghapus angka yang sudah diisi.
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<ParamKey, string>>>>({});
  const [showKit, setShowKit] = useState(false);
  const [saved, setSaved] = useState<Reading | null>(null);

  const view = farm?.byId[pondId];
  const draft = drafts[pondId] ?? {};
  const textOf = (k: ParamKey) => draft[k] ?? (PARAMS[k].quick && view?.latest[k] ? toInput(k, view.latest[k]!.value) : '');
  const setText = (k: ParamKey, t: string) => setDrafts((d) => ({ ...d, [pondId]: { ...d[pondId], [k]: t } }));

  const step = (k: ParamKey, dir: 1 | -1) => {
    const c = PARAMS[k];
    const base = parse(textOf(k)) ?? view?.latest[k]?.value ?? c.min;
    const next = Math.min(c.max, Math.max(c.min, Math.round((base + dir * c.step) * 1000) / 1000));
    setText(k, toInput(k, next));
  };

  const values: Reading['values'] = {};
  for (const k of [...QUICK_PARAMS, ...(showKit ? KIT_PARAMS : [])]) {
    const v = parse(textOf(k));
    if (v !== null) values[k] = v;
  }
  const quickComplete = QUICK_PARAMS.every((k) => values[k] !== undefined);

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
    setTimeout(() => router.back(), reduced ? motion.reduced : 250);
  };
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));
  const sheetStyle = useAnimatedStyle(() => ({ opacity: sheetOpacity.get(), transform: [{ translateY: sheetY.get() }] }));

  const save = () => {
    if (!quickComplete || !view) return;
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flexShrink: 1 }}>
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

                <View style={styles.group}>
                  <Text style={styles.groupTitle}>Cek cepat</Text>
                  <Text style={styles.groupHint}>Terisi nilai terakhir — ubah sesuai hasil ukur sekarang.</Text>
                  {QUICK_PARAMS.map((k) => <ParamInput key={k} k={k} text={textOf(k)} onText={(t) => setText(k, t)} onStep={(d) => step(k, d)} />)}
                </View>

                <View style={styles.group}>
                  <Pressable onPress={() => setShowKit((s) => !s)} accessibilityRole="button" accessibilityState={{ expanded: showKit }} style={styles.kitToggle}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupTitle}>Uji kit (opsional)</Text>
                      <Text style={styles.groupHint}>Amonia, nitrit, alkalinitas, kecerahan — isi yang diukur saja.</Text>
                    </View>
                    {showKit ? <ChevronUp size={22} color={colors.navy} /> : <ChevronDown size={22} color={colors.navy} />}
                  </Pressable>
                  {showKit ? KIT_PARAMS.map((k) => <ParamInput key={k} k={k} text={textOf(k)} onText={(t) => setText(k, t)} onStep={(d) => step(k, d)} />) : null}
                </View>

                <PressScale onPress={save} disabled={!quickComplete} accessibilityRole="button" accessibilityLabel="Simpan dan lihat saran" style={[styles.saveBtn, !quickComplete && { opacity: 0.45 }]}>
                  <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.saveInner}>
                    <Text style={styles.saveText}>Simpan & Lihat Saran</Text>
                  </LinearGradient>
                </PressScale>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

function ParamInput({ k, text, onText, onStep }: { k: ParamKey; text: string; onText: (t: string) => void; onStep: (d: 1 | -1) => void }) {
  const c = PARAMS[k];
  const v = parse(text);
  const st = v === null ? null : paramStatus(k, v);
  const m = st ? statusMeta[st] : null;
  const Icon = m?.icon;
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{c.label}</Text>
        <View style={styles.rowStatus}>
          {m && Icon ? <Icon size={13} color={m.color} strokeWidth={2.6} /> : null}
          <Text style={[styles.rowUnit, m && st !== 'SEHAT' ? { color: m.color } : null]}>
            {m ? m.label : 'Belum diisi'}{c.unit ? ` · ${c.unit}` : ''}
          </Text>
        </View>
      </View>
      <PressScale onPress={() => onStep(-1)} accessibilityRole="button" accessibilityLabel={`Kurangi ${c.label}`} style={styles.stepBtn}>
        <Minus size={22} color={colors.navy} strokeWidth={3} />
      </PressScale>
      <TextInput
        value={text}
        onChangeText={(t) => onText(t.replace(/[^\d.,]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={colors.slate}
        accessibilityLabel={`${c.label}${c.unit ? ` dalam ${c.unit}` : ''}`}
        style={[styles.valueInput, m && st !== 'SEHAT' ? { color: m.color, borderColor: m.stroke ?? colors.border } : null]}
      />
      <PressScale onPress={() => onStep(1)} accessibilityRole="button" accessibilityLabel={`Tambah ${c.label}`} style={styles.stepBtn}>
        <Plus size={22} color={colors.navy} strokeWidth={3} />
      </PressScale>
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
          {view.pond.name} · {Object.keys(reading.values).length} parameter {sent ? 'terkirim' : 'tersimpan di HP, menunggu sinkronisasi'}
        </Text>
      </View>
      <View style={styles.statusLine}>
        <Text style={styles.statusLabel}>Status sekarang</Text>
        <StatusIconBadge status={view.status} />
      </View>
      {mitigation ? <MitigationCard mitigation={mitigation} ai={ai} title="Saran mitigasi" /> : null}
      {morningTaskOpen ? (
        <PressScale onPress={onDoneTask} accessibilityRole="button" style={styles.ghostBtn}>
          <Text style={styles.ghostText}>Tandai tugas “Cek kualitas air pagi” selesai</Text>
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
  groupTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  groupHint: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate, marginBottom: 4 },
  kitToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  rowStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rowUnit: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.slate },
  stepBtn: { width: 44, height: 48, borderRadius: 14, backgroundColor: '#E6EEFF', alignItems: 'center', justifyContent: 'center' },
  valueInput: {
    width: 82, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#F7FAFF',
    textAlign: 'center', fontFamily: fonts.monoBold, fontSize: 20, color: colors.ink, ...monoNums,
  },
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
