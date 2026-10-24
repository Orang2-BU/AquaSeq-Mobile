// State aplikasi + cache offline (AsyncStorage). Data tambak datang dari api.ts;
// pengecekan yang dibuat di HP masuk antrean `pending` sampai berhasil dikirim.
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import * as api from './api';
import type { FarmSnapshot, Reading, User } from './domain';

const KEY = 'aquaseq/state/v2';

export type Session = { token: string; user: User; since: string };
export type Settings = { reduceMotion: boolean };

type Persisted = {
  session: Session | null;
  snapshot: FarmSnapshot | null;
  pending: Reading[];
  scheduled: string[];
  settings: Settings;
};

type Store = Persisted & {
  ready: boolean;
  online: boolean;
  syncing: boolean;
  signIn: (input: api.LoginInput) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
  addReading: (pondId: string, values: Reading['values']) => Reading;
  syncPending: () => Promise<{ sent: number; failed: number }>;
  toggleTask: (id: string) => void;
  /** false bila sudah terjadwal (no-op, tanpa tugas ganda). */
  schedule: (recId: string) => boolean;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const initial: Persisted = {
  session: null,
  snapshot: null,
  pending: [],
  scheduled: [],
  settings: { reduceMotion: false },
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  // Aksi (sinkronisasi, tugas, jadwal) membaca state terbaru lewat ref tanpa ikut dibuat ulang.
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Persisted>;
        setState({ ...initial, ...saved, settings: { ...initial.settings, ...saved.settings } });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)), []);

  const signIn = useCallback(async (input: api.LoginInput) => {
    const { token, user } = await api.login(input);
    const snapshot = await api.fetchFarm(token);
    setState((s) => ({ ...s, session: { token, user, since: new Date().toISOString() }, snapshot }));
  }, []);

  // Antrean pengecekan yang belum terkirim tetap disimpan saat keluar, supaya tidak hilang.
  const signOut = useCallback(() => setState((s) => ({ ...s, session: null, snapshot: null })), []);

  const refresh = useCallback(async () => {
    const token = stateRef.current.session?.token;
    if (!token) return;
    const snapshot = await api.fetchFarm(token);
    setState((s) => ({ ...s, snapshot }));
  }, []);

  const syncPending = useCallback(async () => {
    const { session, pending } = stateRef.current;
    if (!session || !pending.length) return { sent: 0, failed: 0 };
    setSyncing(true);
    const sent: Reading[] = [];
    for (const r of pending) {
      try {
        await api.submitReading(session.token, r);
        sent.push({ ...r, synced: true });
      } catch {
        // Tetap di antrean; dicoba lagi saat online / tombol "Sinkronkan sekarang".
      }
    }
    setState((s) => ({
      ...s,
      pending: s.pending.filter((r) => !sent.some((x) => x.id === r.id)),
      snapshot: s.snapshot && sent.length ? { ...s.snapshot, readings: [...s.snapshot.readings, ...sent] } : s.snapshot,
    }));
    setSyncing(false);
    return { sent: sent.length, failed: pending.length - sent.length };
  }, []);

  const addReading = useCallback((pondId: string, values: Reading['values']) => {
    const reading: Reading = {
      id: `local-${Date.now()}`,
      pondId,
      at: new Date().toISOString(),
      by: stateRef.current.session?.user.name ?? 'Petugas',
      values,
      synced: false,
    };
    setState((s) => ({ ...s, pending: [...s.pending, reading] }));
    return reading;
  }, []);

  // Coba kirim antrean setiap kali kembali online (mode demo: tidak ada server, jadi tetap menunggu).
  useEffect(() => {
    if (online && ready && state.session && state.pending.length && !api.isDemo) void syncPending();
  }, [online, ready, state.session, state.pending.length, syncPending]);

  const toggleTask = useCallback((id: string) => {
    const s0 = stateRef.current;
    const task = s0.snapshot?.tasks.find((t) => t.id === id);
    if (!task || !s0.session) return;
    setState((s) => s.snapshot
      ? { ...s, snapshot: { ...s.snapshot, tasks: s.snapshot.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) } }
      : s);
    api.setTaskDone(s0.session.token, id, !task.done).catch(() => {});
  }, []);

  const schedule = useCallback((recId: string) => {
    const s0 = stateRef.current;
    if (s0.scheduled.includes(recId) || !s0.session) return false;
    setState((s) => (s.scheduled.includes(recId) ? s : { ...s, scheduled: [...s.scheduled, recId] }));
    api.scheduleRecommendation(s0.session.token, recId).catch(() => {});
    return true;
  }, []);

  const setSetting = useCallback<Store['setSetting']>((key, value) => {
    setState((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  }, []);

  const value = useMemo<Store>(
    () => ({ ...state, ready, online, syncing, signIn, signOut, refresh, addReading, syncPending, toggleTask, schedule, setSetting }),
    [state, ready, online, syncing, signIn, signOut, refresh, addReading, syncPending, toggleTask, schedule, setSetting],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore harus di dalam StoreProvider');
  return v;
}

/** Reduce Motion dari sistem ATAU dari pengaturan "Kurangi animasi" di Profil (§6.3). */
export function useMotionReduced(): boolean {
  const system = useReducedMotion();
  const store = useContext(Ctx);
  return system || !!store?.settings?.reduceMotion;
}
