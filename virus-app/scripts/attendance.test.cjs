const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/utils/attendance.ts'), 'utf8');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { attendance, validClass } = context.exports;
const entry = { id: '1', name: 'Math', place: 'Hall', days: [1], start: '10:00', end: '11:00', latitude: 28.6, longitude: -81.2, radius: 100 };
const now = new Date(2026, 9, 12, 10, 0);
const position = { timestamp: now.getTime(), coords: { latitude: 28.6, longitude: -81.2, accuracy: 10 } };
test('class starts inclusively and ends exclusively, on matching weekdays', () => {
  assert.equal(attendance(entry, position, now), 'present');
  assert.equal(attendance(entry, position, new Date(2026, 9, 12, 9, 59)), 'inactive');
  assert.equal(attendance(entry, position, new Date(2026, 9, 12, 11, 0)), 'inactive');
  assert.equal(attendance(entry, position, new Date(2026, 9, 13, 10, 0)), 'inactive');
});
test('distant user is absent; missing, stale, or imprecise locations are unknown', () => {
  assert.equal(attendance(entry, { ...position, coords: { ...position.coords, latitude: 29 } }, now), 'absent');
  assert.equal(attendance(entry, null, now), 'unknown');
  assert.equal(attendance(entry, { ...position, timestamp: now.getTime() - 31000 }, now), 'unknown');
  assert.equal(attendance(entry, { ...position, coords: { ...position.coords, accuracy: 200 } }, now), 'unknown');
});
test('validate times, coordinates, days, and radius', () => {
  assert.equal(validClass(entry), true);
  for (const change of [{ start: '25:00' }, { end: '09:00' }, { latitude: 91 }, { longitude: -181 }, { days: [] }, { radius: 0 }]) {
    assert.equal(validClass({ ...entry, ...change }), false);
  }
});
