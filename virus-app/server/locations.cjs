// Building codes: https://parking.ucf.edu/wp-content/uploads/sites/22/2025/04/CampusMapandParkingGuide2025.pdf
const UCF_BUILDINGS = { ENG1: 'Engineering I', ENG2: 'Engineering II', MSB: 'Mathematical Sciences Building', CB2: 'Classroom Building II', HS1: 'Health Sciences I', BA1: 'Business Administration I' };
function normalizeCampus(campus) {
  if (typeof campus !== 'string') return '';
  const name = campus.trim();
  if (/^(?:ucf|university of central florida)(?:[,\s-]+main(?: campus)?)?$/i.test(name)) {
    return 'University of Central Florida, Main Campus, Orlando, Florida';
  }
  return name;
}
const words = text => ((text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]+/g) || []).map(word => ({ i: '1', ii: '2', iii: '3' })[word] || word);
function normalizeBuilding(building, campus) {
  const raw = (building || '').replace(/^room:\s*/i, '').trim();
  if (/\bucf\b|university of central florida/i.test(campus)) {
    const code = raw.toUpperCase().match(/^(ENG\s*[12]|MSB|CB\s*2|HS\s*1|BA\s*1)(?=\s|$)/)?.[1]?.replace(/\s/g, '');
    if (code && UCF_BUILDINGS[code]) return UCF_BUILDINGS[code];
  }
  // Only strip a room number, not the building number in "Engineering 2".
  return raw.replace(/\s+(?:(?:room|rm)\.?\s*\w+|[oO]?\d{3,}[a-z]?)\s*$/i, '').trim();
}
function chooseBuilding(places, building, campus) {
  const suffixes = new Set(['hall', 'building', 'bldg']);
  const wanted = words(building).filter(word => !suffixes.has(word));
  if (!wanted.length) return null;
  const campusWords = words(campus).filter(word => !['university', 'college', 'campus', 'main', 'the', 'of'].includes(word));
  const candidates = [];
  const seen = new Set();
  for (const place of places || []) {
    const point = place.location;
    if (!Number.isFinite(point?.latitude) || !Number.isFinite(point?.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) continue;
    const name = words(place.displayName?.text);
    // Match whole words so "Remsen" never matches "Remsenville".
    if (!wanted.every(word => name.includes(word))) continue;
    if (place.types?.some(type => ['restaurant', 'cafe', 'hotel', 'lodging', 'store'].includes(type))) continue;
    const identity = place.id || `${point.latitude},${point.longitude}:${name.join(' ')}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const address = words(place.formattedAddress);
    const campusEvidence = campusWords.filter(word => address.includes(word) || name.includes(word)).length;
    const extra = name.filter(word => !wanted.includes(word) && !suffixes.has(word) && !campusWords.includes(word) && !['university', 'college', 'the', 'of'].includes(word)).length;
    candidates.push({ place, score: 10 - extra * 2 + Math.min(campusEvidence, 3) * 3 });
  }
  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length || candidates[0].score < 8 || (candidates[1] && candidates[0].score - candidates[1].score < 3)) return null;
  return candidates[0].place;
}
async function resolveLocations(classes, { fetchImpl = fetch, apiKey = process.env.GOOGLE_MAPS_API_KEY } = {}) {
  const cache = new Map();
  return Promise.all(classes.map(async original => {
    const entry = { ...original, campus: normalizeCampus(original.campus) || normalizeCampus('UCF') };
    const unresolved = { ...entry, latitude: null, longitude: null, locationStatus: 'Enter the college and building to find the location.' };
    if (!entry.campus || !entry.building) return unresolved;
    if (!apiKey) return { ...unresolved, locationStatus: `Detected ${entry.campus}. Automatic lookup needs GOOGLE_MAPS_API_KEY on the server.` };
    const building = normalizeBuilding(entry.building, entry.campus);
    const query = `${building}, ${entry.campus}`;
    if (!cache.has(query)) cache.set(query, (async () => {
      try {
        const deadline = AbortSignal.timeout(10000);
        async function search(textQuery) {
        const response = await fetchImpl('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST', signal: deadline,
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'places.id,places.location,places.formattedAddress,places.displayName,places.types' },
          body: JSON.stringify({ textQuery, pageSize: 5 }),
        });
        if (!response.ok) {
          const failure = await response.json().catch(() => ({}));
          const disabled = failure.error?.details?.some(detail => detail.reason === 'SERVICE_DISABLED');
          return { lookupError: disabled
            ? 'Places API (New) is disabled for your Maps key’s Google Cloud project. Enable it in Google Cloud, wait a few minutes, then tap Find building again.'
            : response.status === 403
              ? 'Google denied Maps access. Check Places API (New), billing, and the server key’s API restrictions.'
              : response.status === 429
                ? 'Google Maps quota was exceeded. Check your project quota and retry.'
                : `Google Maps lookup failed (${response.status}). Please retry.` };
        }
        const data = await response.json();
        return { places: data.places || [] };
        }
        const first = await search(query);
        if (first.lookupError) return first;
        let match = chooseBuilding(first.places, building, entry.campus);
        if (!match && !/\b(hall|building|bldg)\b/i.test(building)) {
          const fallback = await search(`${building} Hall, ${entry.campus}`);
          if (fallback.lookupError) return fallback;
          match = chooseBuilding([...first.places, ...fallback.places], building, entry.campus);
        }
        if (!match) return null;
        const point = match.location;
        return { latitude: point.latitude, longitude: point.longitude, matchedAddress: `${match.displayName.text}, ${match.formattedAddress || ''}` };
      } catch { return null; }
    })());
    const match = await cache.get(query);
    if (match?.lookupError) return { ...unresolved, locationStatus: match.lookupError };
    return match ? { ...entry, ...match, locationStatus: 'Suggested building location from Google Maps. Confirm before saving.' }
      : { ...unresolved, locationStatus: `No clear building match for ${query}. Try adding the specific campus and city.` };
  }));
}
module.exports = { resolveLocations, normalizeCampus, normalizeBuilding, chooseBuilding };
