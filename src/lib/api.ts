// Satu-satunya pintu ke backend & AI tim. Kontrak lengkap: docs/API-CONTRACT.md.
//
// EXPO_PUBLIC_API_URL kosong  -> MODE DEMO: data contoh (seed.ts), login lokal, tidak ada yang dikirim.
// EXPO_PUBLIC_API_URL terisi  -> semua data dari backend.
// EXPO_PUBLIC_AI_URL (opsional) menimpa endpoint saran AI (default: {API_URL}/ai/mitigasi).
import type { FarmSnapshot, Issue, Mitigation, Pond, Reading, Role, User } from './domain';
import { seedSnapshot } from './seed';

const trim = (u: string | undefined) => (u ?? '').trim().replace(/\/+$/, '');

export const API_URL = trim(process.env.EXPO_PUBLIC_API_URL);
export const AI_URL = trim(process.env.EXPO_PUBLIC_AI_URL) || (API_URL ? `${API_URL}/ai/mitigasi` : '');
export const isDemo = !API_URL;

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

async function request<T>(url: string, init: { method?: string; body?: unknown; token?: string; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 12_000);
  try {
    const res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ApiError(text || `HTTP ${res.status}`, res.status);
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(controller.signal.aborted ? 'Waktu habis menghubungi server' : 'Tidak bisa menghubungi server');
  } finally {
    clearTimeout(timer);
  }
}

export type LoginInput = { officerId: string; pin: string; name: string; role: Role };
export type LoginResult = { token: string; user: User };

export async function login(input: LoginInput): Promise<LoginResult> {
  if (isDemo) {
    // Mode demo: nama & peran dari formulir. PIN tidak disimpan dan tidak dikirim ke mana pun.
    return { token: 'demo', user: { id: input.officerId, name: input.name, role: input.role } };
  }
  return request<LoginResult>(`${API_URL}/auth/login`, {
    method: 'POST',
    body: { officerId: input.officerId, pin: input.pin },
  });
}

export async function fetchFarm(token: string): Promise<FarmSnapshot> {
  if (isDemo) return seedSnapshot;
  return request<FarmSnapshot>(`${API_URL}/farm`, { token });
}

/** Kirim pengecekan manual. Mode demo: tidak ada server, data tetap "menunggu sinkronisasi". */
export async function submitReading(token: string, reading: Reading): Promise<void> {
  if (isDemo) throw new ApiError('Mode demo — belum ada server');
  await request<void>(`${API_URL}/readings`, { method: 'POST', token, body: { ...reading, synced: undefined } });
}

export async function setTaskDone(token: string, taskId: string, done: boolean): Promise<void> {
  if (isDemo) return;
  await request<void>(`${API_URL}/tasks/${encodeURIComponent(taskId)}`, { method: 'PATCH', token, body: { done } });
}

export async function scheduleRecommendation(token: string, recId: string): Promise<void> {
  if (isDemo) return;
  await request<void>(`${API_URL}/recommendations/${encodeURIComponent(recId)}/schedule`, { method: 'POST', token });
}

export type MitigationRequest = {
  pond: Pond;
  reading: Pick<Reading, 'at' | 'values'>;
  history: Pick<Reading, 'at' | 'values'>[];
  issues: Issue[];
};

/** Saran dari AI tim, atau null bila AI belum dikonfigurasi. Melempar ApiError bila gagal. */
export async function requestAiMitigation(token: string, payload: MitigationRequest): Promise<Mitigation | null> {
  if (!AI_URL) return null;
  const res = await request<Omit<Mitigation, 'source'>>(AI_URL, { method: 'POST', token, body: payload, timeoutMs: 15_000 });
  if (!res || !Array.isArray(res.steps) || typeof res.summary !== 'string') throw new ApiError('Format saran AI tidak dikenal');
  return { ...res, source: 'ai' };
}
