// Satu-satunya pintu ke backend & AI tim. Kontrak lengkap: docs/API-CONTRACT.md.
//
// EXPO_PUBLIC_API_URL kosong  -> MODE DEMO: data contoh (seed.ts), login lokal, tidak ada yang dikirim.
// EXPO_PUBLIC_API_URL terisi  -> semua data dari backend live.
// EXPO_PUBLIC_AI_URL (opsional) menimpa endpoint saran AI (default: {API_URL}/mobile/ai/mitigasi).
import type { FarmSnapshot, Issue, Mitigation, Pond, Reading, Role, User } from './domain';
import { seedSnapshot } from './seed';
import {
  authData,
  meData,
  isFarmSnapshot,
  isMitigationData,
  isRecord,
  isString,
  normalizeApiUrl,
  validCredentials,
} from './validation';

export const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
export const AI_URL = API_URL ? `${API_URL}/mobile/ai/mitigasi` : '';
export const isDemo = !API_URL;

export class ApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function request(url: string, init: { method?: string; body?: unknown; token?: string; timeoutMs?: number } = {}): Promise<unknown> {
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

    if (res.status === 204) {
      return undefined;
    }

    const body: unknown = await res.json().catch(() => null);

    if (!res.ok || (isRecord(body) && body.success === false)) {
      const errorObj = isRecord(body) && isRecord(body.error) ? body.error : null;
      const message = errorObj && isString(errorObj.message)
        ? errorObj.message
        : (errorObj && isString(errorObj.code) ? errorObj.code : `Permintaan gagal (HTTP ${res.status}).`);
      throw new ApiError(message, res.status);
    }

    if (!isRecord(body) || body.success !== true || body.error !== null || !('data' in body)) {
      throw new ApiError('Format respons server tidak dikenal.', res.status);
    }

    return body.data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(controller.signal.aborted ? 'Waktu habis menghubungi server.' : 'Tidak bisa menghubungi server.');
  } finally {
    clearTimeout(timer);
  }
}

export type LoginInput = { officerId: string; pin: string; name: string; role: Role };
export type LoginResult = { token: string; user: User };

export async function login(input: LoginInput): Promise<LoginResult> {
  if (isDemo) {
    return { token: 'demo', user: { id: input.officerId, name: input.name, role: input.role } };
  }

  if (!validCredentials(input.officerId, input.pin, input.name, false)) {
    throw new ApiError('Format email salah atau kata sandi kurang dari 10 karakter.', 400);
  }

  const loginData = await request(`${API_URL}/auth/login`, {
    method: 'POST',
    body: { email: input.officerId.trim(), password: input.pin },
  });

  if (!authData(loginData)) {
    throw new ApiError('Format respons login server tidak valid.');
  }

  // Authoritative user profile and role from GET /auth/me memberships
  const me = await fetchMe(loginData.access_token);
  if (me.id !== loginData.user.id) throw new ApiError('Identitas sesi tidak cocok.');
  // Security invariant: access_token stored in AsyncStorage; refresh_token is NEVER stored.
  return { token: loginData.access_token, user: me };
}

export async function fetchMe(token: string): Promise<User> {
  const profile = await request(`${API_URL}/auth/me`, { token });
  if (!meData(profile)) {
    throw new ApiError('Format profil server tidak valid.');
  }

  const membership = [...profile.memberships].sort((a, b) => a.farm_id.localeCompare(b.farm_id))[0];
  if (!membership) throw new ApiError('Akun belum memiliki lokasi tambak aktif.', 403);
  return { id: profile.id, name: profile.full_name, role: membership.role };
}

export async function fetchFarm(token: string): Promise<FarmSnapshot> {
  if (isDemo) return seedSnapshot;
  const data = await request(`${API_URL}/mobile/farm`, { token });
  if (!isFarmSnapshot(data)) {
    throw new ApiError('Format data tambak server tidak sesuai kontrak.');
  }
  return data;
}

/** Kirim pengecekan manual. Idempoten berdasarkan id. */
export async function submitReading(token: string, reading: Reading): Promise<void> {
  if (isDemo) throw new ApiError('Belum tersambung ke server');
  await request(`${API_URL}/mobile/readings`, {
    method: 'POST',
    token,
    body: {
      id: reading.id,
      pondId: reading.pondId,
      at: reading.at,
      values: reading.values,
    },
  });
}

export async function setTaskDone(token: string, taskId: string, done: boolean): Promise<void> {
  if (isDemo) return;
  await request(`${API_URL}/mobile/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    token,
    body: { done },
  });
}

export async function scheduleRecommendation(token: string, recId: string): Promise<void> {
  if (isDemo) return;
  await request(`${API_URL}/mobile/recommendations/${encodeURIComponent(recId)}/schedule`, {
    method: 'POST',
    token,
  });
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
  const res = await request(AI_URL, {
    method: 'POST',
    token,
    body: { pond_id: payload.pond.id },
    timeoutMs: 15_000,
  });
  if (!isMitigationData(res)) throw new ApiError('Format saran AI tidak dikenal');
  return { ...res, source: 'ai' };
}
