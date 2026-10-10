const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('./schedule.cjs');
const image = 'data:image/png;base64,aGVsbG8=';
async function run(options, callback) {
  const server = createServer(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/import-schedule`;
  try { await callback((body, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('missing key returns actionable error', async () => {
  await run({ apiKey: '' }, async post => {
    const response = await post({ image }); assert.equal(response.status, 503);
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
