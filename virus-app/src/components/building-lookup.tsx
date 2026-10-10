import { useState } from 'react';
import { Button, Platform, TextInput, View } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

export function BuildingLookup({ initialCampus, initialBuilding, onFound }: {
  initialCampus: string; initialBuilding: string;
  onFound: (latitude: string, longitude: string) => void;
}) {
  const theme = useTheme();
  const [campus, setCampus] = useState(initialCampus);
  const building = initialBuilding.trim();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function lookup() {
    setBusy(true); setMessage(''); onFound('', '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const base = process.env.EXPO_PUBLIC_SCHEDULE_API_URL || (Platform.OS === 'web' ? 'http://localhost:3001' : '');
      if (!base) throw new Error('Configure the import server address and restart Expo.');
      const response = await fetch(`${base.replace(/\/$/, '')}/resolve-location`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ campus, building }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Building lookup failed.');
      if (Number.isFinite(data.latitude) && Number.isFinite(data.longitude) && Math.abs(data.latitude) <= 90 && Math.abs(data.longitude) <= 180) {
        onFound(String(data.latitude), String(data.longitude));
        setMessage(`Google Maps: ${data.matchedAddress}. Review the pin and confirm the building before saving.`);
      } else setMessage(data.locationStatus || 'No clear match. Try the full college name and campus/city.');
    } catch { setMessage('Could not look up the building. Check that the import server is running, then retry.'); }
    finally { clearTimeout(timeout); setBusy(false); }
  }
  const inputStyle = { color: theme.text, borderColor: '#8C9BB0', borderWidth: 1, borderRadius: 8, padding: 12 };
  return <View style={{ gap: 10 }}>
    <ThemedText type="smallBold">Find location</ThemedText>
    <ThemedText>College / campus</ThemedText>
    <TextInput accessibilityLabel="College or campus" editable={!busy} value={campus} onChangeText={setCampus} style={inputStyle} />
    <ThemedText type="small">{building ? `Building: ${building}` : 'Building missing. Try a clearer screenshot.'}</ThemedText>
    <Button title={busy ? 'Finding building…' : 'Find building'} disabled={busy || !campus.trim() || !building.trim()} onPress={() => void lookup()} />
    {!!message && <ThemedText accessibilityLiveRegion="polite">{message}</ThemedText>}
  </View>;
}
