const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveLocations, normalizeCampus, normalizeBuilding, chooseBuilding } = require('./locations.cjs');
const place = (name, address = 'Example University', latitude = 28) => ({ displayName: { text: name }, formattedAddress: address, location: { latitude, longitude: -81 } });
test('selects named hall among unrelated results and prefers campus evidence', () => {
  assert.equal(chooseBuilding([place('Campus Cafe'), place('Remsen Hall')], 'Remsen', 'Example University').displayName.text, 'Remsen Hall');
  const result = chooseBuilding([place('Remsen Hall', 'Other College', 40), place('Remsen Hall')], 'Remsen', 'Example University');
  assert.equal(result.location.latitude, 28);
});
test('does not accept substring matches or tied buildings', () => {
  assert.equal(chooseBuilding([place('Remsenville Hall')], 'Remsen', 'Example University'), null);
  assert.equal(chooseBuilding([place('Remsen Hall', 'Example University', 28), place('Remsen Hall', 'Example University', 29)], 'Remsen', 'Example University'), null);
});
test('tries Hall fallback and fills coordinates without requiring the suffix in the screenshot', async () => {
  const queries = [];
  const [result] = await resolveLocations([{ campus: 'Example University', building: 'Remsen' }], { apiKey: 'test', fetchImpl: async (_url, options) => {
    queries.push(JSON.parse(options.body).textQuery);
    return Response.json({ places: queries.length === 1 ? [] : [place('Remsen Hall')] });
  } });
  assert.deepEqual(queries, ['Remsen, Example University', 'Remsen Hall, Example University']);
  assert.equal(result.latitude, 28);
});
test('UCF aliases and screenshot room codes expand without losing building numbers', () => {
  assert.equal(normalizeCampus('UCF'), 'University of Central Florida, Main Campus, Orlando, Florida');
  assert.equal(normalizeCampus('Homewood'), 'Homewood');
  const cases = { 'ENG2 0302': 'Engineering II', 'ENG1 O187': 'Engineering I', 'MSB 0260': 'Mathematical Sciences Building', 'CB2 O207': 'Classroom Building II', 'HS1 O119': 'Health Sciences I', 'BA1 O225': 'Business Administration I' };
  for (const [room, name] of Object.entries(cases)) assert.equal(normalizeBuilding(room, 'UCF'), name);
  assert.equal(normalizeBuilding('Engineering 2', 'UCF'), 'Engineering 2');
  assert.equal(normalizeBuilding('ENG2', 'Another University'), 'ENG2');
});
test('Roman and Arabic building numbers match but different buildings do not', () => {
  assert.equal(chooseBuilding([place('Engineering 1'), place('Engineering 2')], 'Engineering II', 'UCF').displayName.text, 'Engineering 2');
});
const entry = { name: 'Math', campus: 'Example University, Main Campus', building: 'Science Hall' };
test('disabled Places API reports configuration issue instead of ambiguous building', async () => {
  const [result] = await resolveLocations([entry], { apiKey: 'test', fetchImpl: async () =>
    Response.json({ error: { details: [{ reason: 'SERVICE_DISABLED' }] } }, { status: 403 }) });
  assert.equal(result.latitude, null);
  assert.match(result.locationStatus, /Places API \(New\) is disabled/);
});
test('matches a building and deduplicates lookups', async () => {
  let calls = 0;
  const result = await resolveLocations([entry, entry], { apiKey: 'test', fetchImpl: async () => {
    calls++;
    return Response.json({ places: [{ displayName: { text: 'Science Hall' }, formattedAddress: 'Example University', location: { latitude: 28, longitude: -81 } }] });
  } });
  assert.equal(calls, 1); assert.equal(result[0].latitude, 28);
});
test('ambiguous, missing-campus, and unavailable lookups leave coordinates blank', async () => {
  const fetchImpl = async () => Response.json({ places: [{}, {}] });
  for (const value of [entry, { ...entry, campus: '' }]) {
    const [result] = await resolveLocations([value], { apiKey: 'test', fetchImpl });
    assert.equal(result.latitude, null);
  }
  const [result] = await resolveLocations([entry], { apiKey: '' });
  assert.equal(result.latitude, null);
});
