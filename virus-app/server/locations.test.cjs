const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveLocations, normalizeCampus, normalizeBuilding, chooseBuilding, findUcfBuilding } = require('./locations.cjs');
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
test('UCF aliases and screenshot room codes expand without losing building numbers', () => {
  assert.equal(normalizeCampus('UCF'), 'University of Central Florida, Main Campus, Orlando, Florida');
  assert.equal(normalizeCampus('Homewood'), 'Homewood');
  const cases = { 'ENG2 0302': 'Engineering II', 'ENG1 O187': 'Engineering I', 'MSB 0260': 'Mathematical Sciences Building', 'CB2 O207': 'Classroom Building II', 'HS1 O119': 'Health Sciences I', 'BA1 O225': 'Business Administration I' };
  for (const [room, name] of Object.entries(cases)) assert.equal(normalizeBuilding(room, 'UCF'), name);
  assert.equal(normalizeBuilding('Engineering 2', 'UCF'), 'Engineering II');
  assert.equal(findUcfBuilding('Computer Science Building').code, 'CSB');
  assert.equal(findUcfBuilding('Unknown Hall'), undefined);
});
test('Roman and Arabic building numbers match but different buildings do not', () => {
  assert.equal(chooseBuilding([place('Engineering 1'), place('Engineering 2')], 'Engineering II', 'UCF').displayName.text, 'Engineering 2');
});
test('known UCF buildings use preset coordinates without an external lookup', async () => {
  const [result] = await resolveLocations([{ name: 'Math', place: 'MSB 0260', campus: 'UCF', building: 'MSB 0260' }]);
  assert.equal(result.building, 'MSB');
  assert.equal(result.latitude, 28.5995897);
  assert.equal(result.longitude, -81.2004643);
  assert.equal(result.locationError, false);
});
test('unreadable building can be selected from the map', async () => {
  const [result] = await resolveLocations([{ name: 'Math', place: '', campus: '', building: '' }]);
  assert.equal(result.latitude, null);
  assert.equal(result.locationError, false);
  assert.match(result.locationStatus, /Choose the classroom building from the UCF map/);
});
test('unknown building is marked as an import error instead of guessed', async () => {
  const [result] = await resolveLocations([{ name: 'Math', place: 'Science Hall 101', campus: 'UCF', building: 'Science Hall' }]);
  assert.equal(result.latitude, null);
  assert.equal(result.locationError, true);
  assert.match(result.locationStatus, /Unknown UCF building: Science Hall/);
  assert.equal(findUcfBuilding('Psychology Lab 101'), undefined);
});

test('missing campus defaults to UCF and preserves explicit campuses', async () => {
  const result = await resolveLocations([{ campus: '', building: '' }, { campus: 'Chosen University', building: '' }], { apiKey: '' });
  assert.equal(result[0].campus, normalizeCampus('UCF'));
  assert.equal(result[1].campus, 'Chosen University');
});
