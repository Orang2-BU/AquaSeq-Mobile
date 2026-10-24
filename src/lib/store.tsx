// State aplikasi + cache offline (AsyncStorage). Data tambak datang dari api.ts;
// pengecekan yang dibuat di HP masuk antrean `pending` sampai berhasil dikirim.
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import * as api from './api';
import type { FarmSnapshot, Reading, User } from './domain';

// v4: pengamatan visual (warna air & tanda di udang) menggantikan data lama.
const KEY = 'aquaseq/state/v4';

export type Session = { token: string; user: User; since: string };
export type Settings = { reduceMotion: boolean };

type Persisted = {
  session: Session | null;
  snapshot: FarmSnapshot | null;
  pending: Reading[];
  quarantinedPending?: Record<string, Reading[]>;
  scheduled: string[];
  settings: Settings;
  error?: string | null;
};

type Store = Persisted & {
  ready: boolean;
  online: boolean;
  syncing: boolean;
  error: string | null;
  clearError: () => void;
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
  quarantinedPending: {},
  scheduled: [],
  settings: { reduceMotion: false },
  error: null,
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

  const refresh = useCallback(async () => {
    const token = stateRef.current.session?.token;
    if (!token) return;
    const snapshot = await api.fetchFarm(token);
    setState((s) => ({ ...s, snapshot, error: null }));
  }, []);

  const signIn = useCallback(async (input: api.LoginInput) => {
    const { token, user } = await api.login(input);
    const snapshot = await api.fetchFarm(token);
    setState((s) => {
      const prevUserId = s.session?.user.id;
      const newUserId = user.id;

      const newQuarantine: Record<string, Reading[]> = { ...(s.quarantinedPending ?? {}) };
      let newPending: Reading[] = s.pending;

      // If user changed and there was pending data, quarantine under prev user so it's not lost
      if (prevUserId && prevUserId !== newUserId && s.pending.length > 0) {
        newQuarantine[prevUserId] = [...(newQuarantine[prevUserId] ?? []), ...s.pending];
        newPending = [];
      }

      // Restore any quarantined pending readings belonging to new user
      if (newQuarantine[newUserId] && newQuarantine[newUserId].length > 0) {
        newPending = [...newPending, ...newQuarantine[newUserId]];
        delete newQuarantine[newUserId];
      }

      return {
        ...s,
        session: { token, user, since: new Date().toISOString() },
        snapshot,
        pending: newPending,
        quarantinedPending: newQuarantine,
        error: null,
      };
    });
  }, []);

  // Antrean pengecekan yang belum terkirim tetap disimpan di quarantine saat keluar, supaya tidak hilang.
  const signOut = useCallback(() => {
    setState((s) => {
      const currentUserId = s.session?.user.id;
      const newQuarantine: Record<string, Reading[]> = { ...(s.quarantinedPending ?? {}) };
      if (currentUserId && s.pending.length > 0) {
        newQuarantine[currentUserId] = [...(newQuarantine[currentUserId] ?? []), ...s.pending];
      }
      return {
        ...s,
        session: null,
        snapshot: null,
        pending: [],
        quarantinedPending: newQuarantine,
        error: null,
      };
    });
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
    const prevDone = task.done;
    const targetDone = !prevDone;

    setState((s) => (s.snapshot
      ? { ...s, error: null, snapshot: { ...s.snapshot, tasks: s.snapshot.tasks.map((t) => (t.id === id ? { ...t, done: targetDone } : t)) } }
      : s));

    api.setTaskDone(s0.session.token, id, targetDone).catch((err) => {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status tugas.';
      setState((s) => (s.snapshot
        ? {
            ...s,
            error: msg,
            snapshot: {
              ...s.snapshot,
              tasks: s.snapshot.tasks.map((t) => (t.id === id ? { ...t, done: prevDone } : t)),
            },
          }
        : { ...s, error: msg }));
      void refresh().catch(() => {});
    });
  }, [refresh]);

  const schedule = useCallback((recId: string) => {
    const s0 = stateRef.current;
    if (s0.scheduled.includes(recId) || !s0.session) return false;

    setState((s) => ({ ...s, error: null, scheduled: [...s.scheduled, recId] }));

    api.scheduleRecommendation(s0.session.token, recId).catch((err) => {
      const msg = err instanceof Error ? err.message : 'Gagal menjadwalkan rekomendasi.';
      setState((s) => ({
        ...s,
        error: msg,
        scheduled: s.scheduled.filter((id) => id !== recId),
      }));
      void refresh().catch(() => {});
    });
    return true;
  }, [refresh]);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const setSetting = useCallback<Store['setSetting']>((key, value) => {
    setState((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...state,
      ready,
      online,
      syncing,
      error: state.error ?? null,
      clearError,
      signIn,
      signOut,
      refresh,
      addReading,
      syncPending,
      toggleTask,
      schedule,
      setSetting,
    }),
    [state, ready, online, syncing, clearError, signIn, signOut, refresh, addReading, syncPending, toggleTask, schedule, setSetting],
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
