const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('./schedule.cjs');
const image = 'data:image/png;base64,aGVsbG8=';
async function run(options, callback) {
  const server = createServer(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}${options.path || '/import-schedule'}`;
  try { await callback((body, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('missing key returns actionable error', async () => {
  await run({ apiKey: '' }, async post => {
    const response = await post({ image }); assert.equal(response.status, 503);
  });
});
test('plain text plan uses supplied local date and defaults to an hour', async () => {
  await run({ path: '/parse-plan', apiKey: 'test', fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(JSON.parse(body.contents[0].parts[0].text).today, '2026-10-10');
    assert.ok(body.generationConfig.responseJsonSchema.properties.classes.items.required.includes('date'));
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ classes: [{ name: 'Study', place: 'ENG2', campus: '', building: 'ENG2', date: '2026-10-11', start: '19:00', end: '' }] }) }] } }] });
  } }, async post => {
    const response = await post({ text: 'Study in ENG2 at 7pm tomorrow', today: '2026-10-10' });
    assert.equal(response.status, 200);
    const event = (await response.json()).classes[0];
    assert.equal(event.date, '2026-10-11');
    assert.equal(event.end, '20:00');
    assert.deepEqual(event.days, [0]);
  });
});
test('rejects untrusted origins and non-image inputs before AI call', async () => {
  await run({ apiKey: 'test', fetchImpl: () => { throw new Error('Must not be called'); } }, async post => {
    assert.equal((await post({ image }, { Origin: 'https://untrusted.example' })).status, 403);
    assert.equal((await post({ image: 'https://example.com/image.png' })).status, 400);
  });
});
test('extracts structured classes through a mocked AI response', async () => {
  const classes = [{ name: 'Math', place: 'Hall 1', days: [1, 3], start: '10:00', end: '11:00' }];
  await run({ apiKey: 'test', fetchImpl: async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.match(_url, /^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\/.+:generateContent$/);
    assert.equal(options.headers['x-goog-api-key'], 'test');
    assert.equal(request.generationConfig.responseMimeType, 'application/json');
    assert.deepEqual(request.contents[0].parts[1].inlineData, { mimeType: 'image/png', data: 'aGVsbG8=' });
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ classes }) }] } }] });
  } }, async post => {
    const response = await post({ image }); assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.classes[0].name, 'Math');
    assert.equal(data.classes[0].latitude, null);
  });
});
test('refusal or malformed output never becomes a schedule', async () => {
  await run({ apiKey: 'test', fetchImpl: async () => Response.json({ candidates: [{ finishReason: 'SAFETY' }] }) }, async post => {
    assert.equal((await post({ image })).status, 422);
  });
});

for (const [label, result] of [
  ['incomplete', { candidates: [{ finishReason: 'MAX_TOKENS' }] }],
  ['invalid JSON', { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'invalid' }] } }] }],
  ['invalid event', { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"classes":null}' }] } }] }],
]) {
  test('plan errors describe plans: ' + label, async () => {
    await run({ path: '/parse-plan', apiKey: 'test', fetchImpl: async () => Response.json(result) }, async post => {
      const response = await post({ text: 'Study tomorrow at 7pm', today: '2026-10-10' });
      assert.equal(response.status, 422);
      const { error } = await response.json();
      assert.match(error, /plan/i);
      assert.doesNotMatch(error, /screenshot/i);
    });
  });
}
