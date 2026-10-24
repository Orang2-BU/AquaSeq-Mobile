// Halaman masuk. Mode demo: pilih peran sendiri. Dengan backend: peran ditentukan server.
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, Check, LogIn, Stethoscope, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeSlideIn } from '@/components/FadeSlideIn';
import { PressScale } from '@/components/motion';
import { WaveDivider } from '@/components/WaveDivider';
import * as api from '@/lib/api';
import type { Role } from '@/lib/domain';
import { validCredentials } from '@/lib/validation';
import { useStore } from '@/lib/store';
import { card, colors, fonts, gradients } from '@/lib/theme';

const ROLES: { key: Role; title: string; desc: string; icon: LucideIcon }[] = [
  { key: 'teknisi', title: 'Teknisi tambak', desc: 'Cek kondisi kolam dan ikuti saran mitigasi cepat', icon: Stethoscope },
  { key: 'pemilik', title: 'Pemilik tambak', desc: 'Lihat kondisi air dan udang semua kolam, plus laporan', icon: Building2 },
];

export default function Masuk() {
  const insets = useSafeAreaInsets();
  const { signIn } = useStore();
  const [role, setRole] = useState<Role>('teknisi');
  const [name, setName] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = validCredentials(officerId, pin, name, api.isDemo);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn({ name: name.trim(), officerId: api.isDemo ? officerId.trim().toUpperCase() : officerId.trim(), pin, role });
    } catch (e) {
      setError(e instanceof api.ApiError ? (e.status === 401 ? (api.isDemo ? 'ID atau PIN salah.' : 'Email atau kata sandi salah.') : e.message) : 'Gagal masuk. Periksa koneksi lalu coba lagi.');
      setBusy(false);
    }
  };

  let i = 0;
  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.hero, { paddingTop: insets.top + 40 }]}>
          <Text style={styles.brand}>AquaSeq</Text>
          <Text style={styles.tagline}>Pantau kolam dan dapatkan saran cepat saat ada masalah.</Text>
        </LinearGradient>
        <WaveDivider />

        <View style={styles.body}>
          {api.isDemo ? (
            <FadeSlideIn index={i++}>
              <Text style={styles.section}>Masuk sebagai</Text>
              <View style={{ gap: 10 }}>
                {ROLES.map((r) => {
                  const on = r.key === role;
                  const Icon = r.icon;
                  return (
                    <PressScale
                      key={r.key}
                      onPress={() => setRole(r.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={r.title}
                      style={[card, styles.role, on && styles.roleOn]}
                    >
                      <View style={[styles.roleIcon, on && { backgroundColor: colors.navy }]}>
                        <Icon size={22} color={on ? colors.white : colors.navy} strokeWidth={2.4} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.roleTitle}>{r.title}</Text>
                        <Text style={styles.roleDesc}>{r.desc}</Text>
                      </View>
                      <View style={[styles.radio, on && styles.radioOn]}>
                        {on ? <Check size={14} color={colors.white} strokeWidth={3.2} /> : null}
                      </View>
                    </PressScale>
                  );
                })}
              </View>
            </FadeSlideIn>
          ) : null}

          <FadeSlideIn index={i++}>
            <View style={[card, styles.form]}>
              {api.isDemo ? (
                <Field label="Nama" value={name} onChangeText={setName} placeholder="mis. Budi Santoso" autoCapitalize="words" />
              ) : null}
              <Field label={api.isDemo ? "ID akun" : "Email"} value={officerId} onChangeText={setOfficerId} placeholder={api.isDemo ? "mis. TK-014" : "nama@contoh.com"} autoCapitalize={api.isDemo ? "characters" : "none"} />
              <Field label={api.isDemo ? "PIN (4–6 angka)" : "Kata sandi (10–72 karakter)"} value={pin} onChangeText={(t) => setPin(api.isDemo ? t.replace(/\D/g, '').slice(0, 6) : t)} placeholder={api.isDemo ? "Masukkan PIN" : "Masukkan kata sandi"} secure onSubmit={submit} />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <PressScale
                onPress={submit}
                disabled={!valid || busy}
                accessibilityRole="button"
                accessibilityLabel="Masuk"
                accessibilityState={{ disabled: !valid || busy }}
                style={[styles.btn, (!valid || busy) && { opacity: 0.45 }]}
              >
                <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.btnInner}>
                  {busy ? <ActivityIndicator color={colors.white} /> : <LogIn size={20} color={colors.white} strokeWidth={2.4} />}
                  <Text style={styles.btnText}>{busy ? 'Memuat data tambak…' : 'Masuk'}</Text>
                </LinearGradient>
              </PressScale>

            </View>
          </FadeSlideIn>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, secure, onSubmit, ...input }: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'words' | 'characters';
  secure?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...input}
        placeholderTextColor={colors.slate}
        secureTextEntry={secure}
        keyboardType={secure && api.isDemo ? 'number-pad' : 'default'}
        autoCorrect={false}
        onSubmitEditing={onSubmit}
        accessibilityLabel={label}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.pageBg },
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  brand: { fontFamily: fonts.display, fontSize: 34, color: colors.white, letterSpacing: -0.6 },
  tagline: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.88)', marginTop: 6 },
  body: { paddingHorizontal: 16, gap: 16 },
  section: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginBottom: 10 },
  role: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleOn: { borderColor: colors.navy, borderWidth: 2 },
  roleIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E6EEFF', alignItems: 'center', justifyContent: 'center' },
  roleTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  roleDesc: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.slate },
  radio: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.navy },
  form: { gap: 14 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, color: colors.slate, textTransform: 'uppercase' },
  input: {
    minHeight: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#F7FAFF',
    paddingHorizontal: 14, fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink,
  },
  error: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.red },
  btn: { borderRadius: 16, overflow: 'hidden' },
  btnInner: { flexDirection: 'row', gap: 8, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.white },
});
