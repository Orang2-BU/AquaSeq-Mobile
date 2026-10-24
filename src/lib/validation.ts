import type { FarmSnapshot, MitigationStep, Pond, Reading, RecIcon, RiskScore, Role, Task } from './domain';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function record(value: unknown): value is Record<string, unknown> {
  return isRecord(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
export function text(value: unknown): value is string {
  return isString(value);
}

export function isRole(value: unknown): value is Role {
  return value === 'teknisi' || value === 'pemilik';
}
export function role(value: unknown): value is Role {
  return isRole(value);
}

export function isBackendUser(value: unknown): value is { id: string; full_name?: string; name?: string; email?: string } {
  return isRecord(value) && isString(value.id);
}
export function backendUser(value: unknown): value is { id: string; full_name: string; email: string } {
  return isRecord(value) && isString(value.id) && isString(value.full_name) && isString(value.email);
}

export function isAuthLoginData(value: unknown): value is { access_token: string; user: { id: string; full_name?: string; name?: string; email?: string }; refresh_token?: string; expires_in?: number } {
  return isRecord(value) && isString(value.access_token) && isBackendUser(value.user);
}
export function authData(value: unknown): value is { access_token: string; user: { id: string; full_name: string; email: string } } {
  return isRecord(value) && isString(value.access_token) && backendUser(value.user);
}

export function isAuthMeData(value: unknown): value is { id: string; full_name?: string; email?: string; memberships?: { farm_id?: string; farm_name?: string; role?: string }[] } {
  if (!isRecord(value) || !isString(value.id)) return false;
  if (value.memberships !== undefined) {
    if (!Array.isArray(value.memberships)) return false;
    for (const m of value.memberships) {
      if (!isRecord(m) || typeof m.role !== 'string') return false;
    }
  }
  return true;
}
export function meData(value: unknown): value is { id: string; full_name: string; email: string; memberships: { farm_id: string; farm_name: string; role: Role }[] } {
  if (!isRecord(value) || !isString(value.id) || !isString(value.full_name) || !isString(value.email)) return false;
  return Array.isArray(value.memberships) && value.memberships.every((m: unknown) => isRecord(m) && isString(m.farm_id) && isString(m.farm_name) && isRole(m.role));
}

export function isPond(value: unknown): value is Pond {
  if (!isRecord(value)) return false;
  const { id, name, blok, docDays, srPercent, areaM2, stockedCount, abwGram } = value;
  if (!isString(id) || !isString(name) || !isString(blok) || typeof docDays !== 'number' || typeof areaM2 !== 'number') {
    return false;
  }
  // Unknown model values can be null, not fabricated 0
  const isNullableNum = (v: unknown) => v === null || typeof v === 'number';
  return isNullableNum(srPercent) && isNullableNum(stockedCount) && isNullableNum(abwGram);
}

export function isReading(value: unknown): value is Reading {
  if (!isRecord(value)) return false;
  const { id, pondId, at, by, values } = value;
  if (!isString(id) || !isString(pondId) || !isString(at) || typeof by !== 'string' || !isRecord(values)) {
    return false;
  }
  for (const [, v] of Object.entries(values)) {
    if (typeof v !== 'number' || isNaN(v)) return false;
  }
  return true;
}

const REC_ICONS: RecIcon[] = ['wheat', 'flask', 'droplet', 'shovel', 'eye'];

export function isRiskScore(value: unknown): value is RiskScore {
  if (!isRecord(value)) return false;
  const { pondId, score, label, context } = value;
  return isString(pondId) && typeof score === 'number' && (label === 'Tinggi' || label === 'Sedang' || label === 'Rendah') && typeof context === 'string';
}

export function isRecommendation(value: unknown): value is { id: string; icon: RecIcon; text: string } {
  if (!isRecord(value)) return false;
  const { id, icon, text } = value;
  return isString(id) && typeof icon === 'string' && REC_ICONS.includes(icon as RecIcon) && typeof text === 'string';
}

export function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  const { id, title, time, note, done } = value;
  return isString(id) && typeof title === 'string' && typeof time === 'string' && typeof note === 'string' && typeof done === 'boolean';
}

export function isFarmSnapshot(value: unknown): value is FarmSnapshot {
  if (!isRecord(value)) return false;
  const { farm, ponds, readings, riskScores, recommendations, tasks, feedTodayKg } = value;
  if (!isRecord(farm) || !isString(farm.id) || !isString(farm.name) || !isString(farm.initials) || !Array.isArray(farm.bloks)) {
    return false;
  }
  if (!Array.isArray(ponds) || !ponds.every(isPond)) return false;
  if (!Array.isArray(readings) || !readings.every(isReading)) return false;
  if (!Array.isArray(riskScores) || !riskScores.every(isRiskScore)) return false;
  if (!Array.isArray(recommendations) || !recommendations.every(isRecommendation)) return false;
  if (!Array.isArray(tasks) || !tasks.every(isTask)) return false;
  return feedTodayKg === null || typeof feedTodayKg === 'number';
}

export function isMitigationData(value: unknown): value is { severity: 'SEHAT' | 'WASPADA' | 'KRITIS'; summary: string; steps: MitigationStep[] } {
  if (!isRecord(value)) return false;
  const { severity, summary, steps } = value;
  if (severity !== 'SEHAT' && severity !== 'WASPADA' && severity !== 'KRITIS') return false;
  if (typeof summary !== 'string') return false;
  if (!Array.isArray(steps)) return false;
  return steps.every((s) => isRecord(s) && typeof s.title === 'string' && (s.detail === undefined || typeof s.detail === 'string'));
}

export function validCredentials(officerId: string, pin: string, name: string, demo: boolean): boolean {
  return demo
    ? name.trim().length >= 2 && officerId.trim().length >= 3 && /^\d{4,6}$/.test(pin)
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officerId.trim()) && pin.length >= 10 && pin.length <= 72;
}

export function normalizeApiUrl(value: string | undefined): string {
  const input = (value ?? '').trim().replace(/\/+$/, '');
  if (!input) return '';
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('EXPO_PUBLIC_API_URL harus origin http/https yang valid.');
  }
  const pathname = url.pathname.replace(/\/+$/, '');
  if (pathname !== '' && pathname !== '/api/v1') {
    throw new Error('EXPO_PUBLIC_API_URL path harus kosong atau /api/v1.');
  }
  return `${url.origin}/api/v1`;
}
