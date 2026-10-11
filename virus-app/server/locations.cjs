const UCF_BUILDINGS = require('../src/constants/ucf-buildings.json');

function normalizeCampus(campus) {
  if (typeof campus !== 'string') return '';
  const name = campus.trim();
  if (/^(?:ucf|university of central florida)(?:[,_\s-]+main(?: campus)?)?$/i.test(name)) {
    return 'University of Central Florida, Main Campus, Orlando, Florida';
  }
  return name;
}

const words = text => ((text || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]+/g) || [])
  .map(word => ({ i: '1', ii: '2', iii: '3' })[word] || word);

function normalizeBuilding(building, campus) {
  const raw = (building || '').replace(/^room:\s*/i, '').trim()
    .replace(/[\s-]+(?:(?:room|rm)\.?\s*\w+|[oO]?\d{2,4}[a-z]?)\s*$/i, '').trim();
  if (campus && !/\bucf\b|university of central florida/i.test(campus)) return raw;
  const normalized = words(raw).join(' ');
  const match = UCF_BUILDINGS.find(entry => entry.aliases.some(alias => words(alias).join(' ') === normalized));
  return match ? match.name : raw;
}

function findUcfBuilding(building, campus) {
  const normalized = normalizeBuilding(building, campus);
  return UCF_BUILDINGS.find(entry => entry.name === normalized || entry.code === normalized);
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

async function resolveLocations(classes) {
  return classes.map(original => {
    const campus = normalizeCampus(original.campus);
    const entry = { ...original, campus: campus || 'University of Central Florida, Main Campus, Orlando, Florida' };
    if (campus && !/\bucf\b|university of central florida/i.test(campus)) {
      return { ...entry, latitude: null, longitude: null, locationError: true, locationStatus: `This app only supports UCF buildings, not ${campus}.` };
    }

    const building = findUcfBuilding(entry.building, entry.campus) || findUcfBuilding(entry.place, entry.campus);
    if (!building) {
      const unreadable = !(entry.building || '').trim()
        && (!(entry.place || '').trim() || /^(?:room\s*)?[oO]?\d{1,4}[a-z]?$/i.test(entry.place.trim()));
      return {
        ...entry,
        latitude: null,
        longitude: null,
        building: '',
        locationError: !unreadable,
        locationStatus: unreadable ? 'Choose the classroom building from the UCF map.' : `Unknown UCF building: ${entry.building || entry.place}`,
      };
    }

    const originalPlace = (entry.place || '').trim();
    const room = originalPlace.match(/(?:room|rm)?\s*([a-z]?\d{2,4}[a-z]?)/i)?.[1];
    const place = findUcfBuilding(originalPlace, entry.campus)?.code === building.code
      ? originalPlace
      : room ? `${building.code} ${room}` : building.code;
    return {
      ...entry,
      campus: 'University of Central Florida, Main Campus, Orlando, Florida',
      building: building.code,
      place,
      latitude: building.latitude,
      longitude: building.longitude,
      matchedAddress: building.address,
      locationError: false,
      locationStatus: `Matched UCF preset: ${building.name}.`,
    };
  });
}

module.exports = { resolveLocations, normalizeCampus, normalizeBuilding, chooseBuilding, findUcfBuilding, UCF_BUILDINGS };