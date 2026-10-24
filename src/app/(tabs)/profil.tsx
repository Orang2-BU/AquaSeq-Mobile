// Profil: data petugas & peran, pengaturan, sinkronisasi antrean pengecekan, tentang, keluar.
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock3, Cloud, HardDrive, Info, Languages, LogOut, MapPin, RefreshCw, Sparkles, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FadeSlideIn } from '@/components/FadeSlideIn';
import { GradientHeader } from '@/components/GradientHeader';
import { PressScale, SwitchTrack } from '@/components/motion';
import { useToast } from '@/components/Toast';
import * as api from '@/lib/api';
import { wibTime } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { card, colors, fonts, gradients, monoNums } from '@/lib/theme';

const ROLE_LABEL = { teknisi: 'Teknisi tambak', pemilik: 'Pemilik tambak' } as const;

export default function Profil() {
  const toast = useToast();
  const { session, snapshot, signOut, settings, setSetting, pending, syncPending, syncing, online } = useStore();
  if (!session) return null;
  const { user } = session;

  const sync = async () => {
    if (api.isDemo) return toast(`Mode demo: belum ada server. ${pending.length} pengecekan tetap aman di HP.`);
    if (!online) return toast('Sedang offline. Data dikirim otomatis saat kembali online.');
    const r = await syncPending();
    toast(r.failed ? `${r.sent} terkirim, ${r.failed} gagal — dicoba lagi nanti.` : `${r.sent} pengecekan terkirim.`);
  };

  let i = 0;
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <GradientHeader title="Profil" subtitle={`${ROLE_LABEL[user.role]} · ${snapshot?.farm.name ?? ''}`} />

      <View style={styles.body}>
        <FadeSlideIn index={i++}>
          <View style={[card, styles.profile]}>
            <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(user.name)}</Text>
            </LinearGradient>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.meta}>{ROLE_LABEL[user.role]} · ID <Text style={styles.mono}>{user.id}</Text></Text>
              <Text style={styles.meta}>Masuk pukul <Text style={styles.mono}>{wibTime(session.since)}</Text> WIB</Text>
            </View>
          </View>
        </FadeSlideIn>

        <FadeSlideIn index={i++}>
          <Text style={styles.section}>Tambak</Text>
          <View style={[card, styles.group]}>
            <Row icon={MapPin} title={snapshot?.farm.name ?? '—'} detail={`${snapshot?.ponds.length ?? 0} kolam`} />
          </View>
        </FadeSlideIn>

        <FadeSlideIn index={i++}>
          <Text style={styles.section}>Pengaturan</Text>
          <View style={[card, styles.group]}>
            <Pressable
              onPress={() => setSetting('reduceMotion', !settings.reduceMotion)}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.reduceMotion }}
              accessibilityLabel="Kurangi animasi"
              style={styles.row}
            >
              <View style={styles.rowIcon}><Sparkles size={18} color={colors.navy} strokeWidth={2.4} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Kurangi animasi</Text>
                <Text style={styles.rowDetail}>Ganti gerakan geser dengan fade singkat</Text>
              </View>
              <SwitchTrack value={settings.reduceMotion} />
            </Pressable>
            <Divider />
            <Row icon={Languages} title="Bahasa" detail="Bahasa Indonesia" />
            <Divider />
            <Row icon={Clock3} title="Zona waktu" detail="Asia/Jakarta (WIB)" />
          </View>
        </FadeSlideIn>

        <FadeSlideIn index={i++}>
          <Text style={styles.section}>Data & sinkronisasi</Text>
          <View style={[card, styles.group]}>
            <Row
              icon={Cloud}
              title={api.isDemo ? 'Mode demo' : 'Server'}
              detail={api.isDemo ? 'Belum tersambung ke server — data adalah contoh' : `${online ? 'Online' : 'Offline'} · ${api.API_URL.replace(/^https?:\/\//, '')}`}
            />
            <Divider />
            <Row
              icon={HardDrive}
              title="Tersimpan di HP"
              detail={pending.length ? `${pending.length} pengecekan menunggu sinkronisasi` : 'Tidak ada data yang menunggu'}
            />
            <PressScale onPress={sync} disabled={syncing} accessibilityRole="button" accessibilityLabel="Sinkronkan sekarang" style={styles.outlineBtn}>
              {syncing ? <ActivityIndicator color={colors.navy} /> : <RefreshCw size={18} color={colors.navy} strokeWidth={2.4} />}
              <Text style={styles.outlineText}>Sinkronkan sekarang</Text>
            </PressScale>
          </View>
        </FadeSlideIn>

        <FadeSlideIn index={i++}>
          <Text style={styles.section}>Tentang</Text>
          <View style={[card, styles.group]}>
            <Row icon={Info} title={`Versi ${Constants.expoConfig?.version ?? '—'}`} detail="Data dari pengecekan manual teknisi dan hasil lab" />
          </View>
        </FadeSlideIn>

        <FadeSlideIn index={i++}>
          <PressScale onPress={() => { signOut(); toast('Anda sudah keluar'); }} accessibilityRole="button" accessibilityLabel="Keluar" style={styles.logout}>
            <LogOut size={18} color={colors.red} strokeWidth={2.4} />
            <Text style={styles.logoutText}>Keluar</Text>
          </PressScale>
          {pending.length ? <Text style={styles.logoutNote}>{pending.length} pengecekan yang belum terkirim tetap tersimpan di HP ini.</Text> : null}
        </FadeSlideIn>
      </View>
    </ScrollView>
  );
}

function Row({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><Icon size={18} color={colors.navy} strokeWidth={2.4} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingBottom: 48 },
  body: { paddingHorizontal: 16, gap: 14 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, fontSize: 22, color: colors.white },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  meta: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.slate },
  mono: { fontFamily: fonts.monoBold, color: colors.ink, ...monoNums },
  section: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginTop: 4, marginBottom: 10 },
  group: { paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 56 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#E6EEFF', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  rowDetail: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.slate, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border },
  outlineBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    minHeight: 50, borderRadius: 16, borderWidth: 1.5, borderColor: colors.navy, marginTop: 4, marginBottom: 8,
  },
  outlineText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.navy },
  logout: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 54,
    borderRadius: 16, borderWidth: 1.5, borderColor: colors.strokeRed, backgroundColor: colors.white,
  },
  logoutText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.red },
  logoutNote: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate, textAlign: 'center', marginTop: 8 },
});
