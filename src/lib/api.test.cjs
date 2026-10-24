const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);

process.env.EXPO_PUBLIC_API_URL = 'http://localhost:18080/api/v1/';
const api = require('./api.ts');
const envelope = (data) => new Response(JSON.stringify({ success: true, data, error: null }), { status: 200 });

test('rejects malformed auth, unknown membership role, identity mismatch', async () => {
  for (const me of [ { id: 'u' }, { id: 'u', full_name: 'Server', email: 'u@example.com', memberships: [{ farm_id: 'f', farm_name: 'Farm', role: 'admin' }] }, { id: 'other', full_name: 'Server', email: 'u@example.com', memberships: [{ farm_id: 'f', farm_name: 'Farm', role: 'teknisi' }] } ]) {
    global.fetch = async (url) => envelope(url.endsWith('/auth/login') ? { access_token: 'access', user: { id: 'u', full_name: 'Server', email: 'u@example.com' } } : me);
    await assert.rejects(api.login({ officerId: 'u@example.com', pin: 'password123', name: '', role: 'pemilik' }), api.ApiError);
  }
});

test('rejects malformed farm / AI / mutation data, keeps live errors', async () => {
  global.fetch = async () => envelope({});
  await assert.rejects(api.fetchFarm('access'), api.ApiError);
  await assert.rejects(api.requestAiMitigation('access', { pond: { id: 'p' } }), api.ApiError);
  global.fetch = async () => new Response(JSON.stringify({ success: false, data: null, error: { message: 'Tugas gagal diubah.' } }), { status: 400 });
  await assert.rejects(api.setTaskDone('access', 't', true), api.ApiError);
  global.fetch = async () => new Response(JSON.stringify({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Akses ditolak.' } }), { status: 403 });
  await assert.rejects(api.fetchFarm('access'), (e) => e.status === 403 && e.message === 'Akses ditolak.');
});

test('live login maps email/password, gets authoritative membership, discards refresh token', async () => {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, body: init.body && JSON.parse(init.body) });
    return envelope(url.endsWith('/auth/login')
      ? { access_token: 'access', refresh_token: 'never-store', user: { id: 'u', full_name: 'Server', email: 'Mixed@example.com' } }
      : { id: 'u', full_name: 'Server', email: 'Mixed@example.com', memberships: [{ farm_id: 'f', farm_name: 'Farm', role: 'teknisi' }] });
  };
  assert.deepEqual(await api.login({ officerId: 'Mixed@example.com', pin: 'arbitrary password!', name: 'Client', role: 'pemilik' }), { token: 'access', user: { id: 'u', name: 'Server', role: 'teknisi' } });
  assert.deepEqual(calls, [
    { url: 'http://localhost:18080/api/v1/auth/login', body: { email: 'Mixed@example.com', password: 'arbitrary password!' } },
    { url: 'http://localhost:18080/api/v1/auth/me', body: undefined },
  ]);
});
