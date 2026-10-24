const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);

const v = require('./validation.ts');

test('normalizeApiUrl handles base origins and avoids double /api/v1', () => {
  assert.equal(v.normalizeApiUrl('http://192.168.1.10:18080'), 'http://192.168.1.10:18080/api/v1');
  assert.equal(v.normalizeApiUrl('http://192.168.1.10:18080/'), 'http://192.168.1.10:18080/api/v1');
  assert.equal(v.normalizeApiUrl('http://192.168.1.10:18080/api/v1'), 'http://192.168.1.10:18080/api/v1');
  assert.equal(v.normalizeApiUrl('http://192.168.1.10:18080/api/v1/'), 'http://192.168.1.10:18080/api/v1');
  assert.equal(v.normalizeApiUrl(''), '');
  assert.equal(v.normalizeApiUrl(undefined), '');
  assert.throws(() => v.normalizeApiUrl('http://localhost:18080/other/path'), /EXPO_PUBLIC_API_URL/);
});

test('validCredentials preserves demo PIN vs live email/password', () => {
  // Demo
  assert.equal(v.validCredentials('TK-014', '123456', 'Budi', true), true);
  assert.equal(v.validCredentials('TK-014', '12', 'Budi', true), false);
  assert.equal(v.validCredentials('TK-014', 'abcdef', 'Budi', true), false);

  // Live
  assert.equal(v.validCredentials('user@example.com', 'password123', '', false), true);
  assert.equal(v.validCredentials('notanemail', 'password123', '', false), false);
  assert.equal(v.validCredentials('user@example.com', 'short', '', false), false);
  assert.equal(v.validCredentials('user@example.com', 'a'.repeat(73), '', false), false);
});
