// Turunan data tambak untuk layar: nilai terakhir per parameter, status kolam, saran mitigasi.
import { useEffect, useMemo, useState } from 'react';

import * as api from './api';
import {
  evaluate, statusOf, statusRank, type FarmSnapshot, type Issue, type Mitigation, type Pond, type PondStatus, type Reading,
} from './domain';
import { localMitigation } from './mitigation-rules';
import { PARAM_ORDER, PATHOGEN_PARAMS, type ParamKey } from './params';
import { useStore } from './store';

export type LatestValue = { value: number; at: string; by: string; synced: boolean };

export type PondView = {
  pond: Pond;
  latest: Partial<Record<ParamKey, LatestValue>>;
  lastCheck: Reading | undefined;
  issues: Issue[];
  status: PondStatus;
};

export type FarmView = Omit<FarmSnapshot, 'ponds' | 'readings'> & {
  ponds: PondView[];               // urut: kritis -> waspada -> sehat
  byId: Record<string, PondView>;
  readings: Reading[];             // semua, urut waktu naik (termasuk yang belum terkirim)
  counts: Record<PondStatus, number>;
};

function build(snapshot: FarmSnapshot, pending: Reading[]): FarmView {
  const readings = [...snapshot.readings, ...pending].sort((a, b) => a.at.localeCompare(b.at));
  const views = snapshot.ponds.map<PondView>((pond) => {
    const mine = readings.filter((r) => r.pondId === pond.id);
    const latest: PondView['latest'] = {};
    for (const r of mine) {
      for (const key of PARAM_ORDER) {
        const v = r.values[key];
        if (v !== undefined) latest[key] = { value: v, at: r.at, by: r.by, synced: r.synced };
      }
    }
    const values = Object.fromEntries(Object.entries(latest).map(([k, l]) => [k, l.value]));
    const issues = evaluate(values);
    return { pond, latest, lastCheck: mine[mine.length - 1], issues, status: statusOf(issues) };
  });
  views.sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.pond.id.localeCompare(b.pond.id));
  const counts: Record<PondStatus, number> = { KRITIS: 0, WASPADA: 0, SEHAT: 0 };
  for (const v of views) counts[v.status]++;
  return { ...snapshot, ponds: views, byId: Object.fromEntries(views.map((v) => [v.pond.id, v])), readings, counts };
}

export function useFarm(): FarmView | null {
  const { snapshot, pending } = useStore();
  return useMemo(() => (snapshot ? build(snapshot, pending) : null), [snapshot, pending]);
}

/** Ringkasan qPCR terakhir per patogen: kolam yang positif dan berapa kolam yang sudah diuji. */
export function pathogenSummary(farm: FarmView, pondId?: string) {
  const views = pondId ? farm.ponds.filter((v) => v.pond.id === pondId) : farm.ponds;
  return PATHOGEN_PARAMS.map((key) => {
    const tested = views.filter((v) => v.latest[key] !== undefined);
    return {
      key,
      tested: tested.length,
      positives: tested.filter((v) => (v.latest[key]?.value ?? 0) > 0.5).map((v) => v.pond.id),
      at: tested.map((v) => v.latest[key]!.at).sort().pop(),
    };
  });
}

/** Nilai satu parameter dari pengecekan-pengecekan terakhir (untuk grafik tren). */
export function paramHistory(farm: FarmView, pondId: string, key: ParamKey, n = 7) {
  return farm.readings
    .filter((r) => r.pondId === pondId && r.values[key] !== undefined)
    .slice(-n)
    .map((r) => ({ at: r.at, value: r.values[key] as number }));
}

// Cache saran AI per kolam + waktu pengecekan terakhir, supaya tidak meminta ulang di setiap layar.
// `inflight` menyatukan permintaan yang sama dari beberapa layar sekaligus (mis. Beranda + Detail).
const aiCache = new Map<string, Mitigation>();
const inflight = new Map<string, Promise<Mitigation | null>>();

export type AiState = 'off' | 'loading' | 'done' | 'error';

/**
 * Saran mitigasi untuk satu kolam. Saran bawaan muncul seketika (juga saat offline);
 * bila endpoint AI tim tersedia dan HP online, saran AI menggantikannya begitu tiba.
 */
export function useMitigation(view: PondView | undefined, farm: FarmView | null): { mitigation: Mitigation | null; ai: AiState } {
  const { session, online } = useStore();
  const key = view ? `${view.pond.id}@${view.lastCheck?.at ?? ''}` : '';
  const [result, setResult] = useState<{ key: string; m: Mitigation | null; state: AiState }>({ key: '', m: null, state: 'off' });

  const local = useMemo(() => (view ? localMitigation(view.pond, view.issues) : null), [view]);
  const wantsAi = !!(view && farm && session && api.AI_URL && online && view.status !== 'SEHAT');

  useEffect(() => {
    if (!wantsAi || !view || !farm || !session) return;
    const cached = aiCache.get(key);
    if (cached) return;
    let alive = true;
    let request = inflight.get(key);
    if (!request) {
      const history = farm.readings.filter((r) => r.pondId === view.pond.id).slice(-10).map(({ at, values }) => ({ at, values }));
      request = api.requestAiMitigation(session.token, {
        pond: view.pond,
        reading: { at: view.lastCheck?.at ?? new Date().toISOString(), values: Object.fromEntries(Object.entries(view.latest).map(([k, l]) => [k, l.value])) },
        history,
        issues: view.issues,
      })
        .then((m) => {
          if (m) aiCache.set(key, m);
          return m;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, request);
    }
    request
      .then((m) => alive && setResult({ key, m, state: m ? 'done' : 'off' }))
      .catch(() => alive && setResult({ key, m: null, state: 'error' }));
    return () => { alive = false; };
  }, [wantsAi, key, view, farm, session]);

  // Hasil dari state dulu (React Compiler menganggap render murni, jadi pembacaan Map modul saja
  // tidak ikut diperbarui saat respons datang); cache dipakai untuk layar yang baru dibuka.
  const cached = (result.key === key && result.state === 'done' ? result.m : null) ?? aiCache.get(key);
  if (cached) return { mitigation: cached, ai: 'done' };
  if (!wantsAi) return { mitigation: local, ai: 'off' };
  if (result.key === key && result.state === 'error') return { mitigation: local, ai: 'error' };
  return { mitigation: local, ai: 'loading' };
}
