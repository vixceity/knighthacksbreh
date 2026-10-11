import { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Palette, Radius, Typography } from '@/constants/theme';

export function BuildingLookup({ initialCampus, initialBuilding, allowBuildingEdit = false, onFound }: {
  initialCampus: string; initialBuilding: string;
  allowBuildingEdit?: boolean;
  onFound: (latitude: string, longitude: string, building?: string) => void;
}) {
  const theme = useTheme();
  const [campus, setCampus] = useState(initialCampus || 'UCF');
  const [building, setBuilding] = useState(initialBuilding.trim());
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
        onFound(String(data.latitude), String(data.longitude), allowBuildingEdit ? building.trim() : undefined);
        setMessage(`Google Maps: ${data.matchedAddress}. Review the pin and confirm the building before saving.`);
      } else setMessage(data.locationStatus || 'No clear match. Try the full college name and campus/city.');
    } catch { setMessage('Could not look up the building. Check that the import server is running, then retry.'); }
    finally { clearTimeout(timeout); setBusy(false); }
  }
  const inputStyle = { color: theme.text, fontFamily: Typography.body, fontSize: 14, minHeight: 48, backgroundColor: Palette.surface, borderColor: Palette.border, borderWidth: 1, borderRadius: Radius.input, padding: 12 };
  return <View style={{ gap: 8 }}>
    <ThemedText type="subtitle">Find location</ThemedText>
    <ThemedText>College / campus</ThemedText>
    <TextInput accessibilityLabel="College or campus" editable={!busy} value={campus} onChangeText={value => { setCampus(value); setMessage(''); onFound('', ''); }} style={inputStyle} />
    {allowBuildingEdit ? <>
      <ThemedText>Building</ThemedText>
      <TextInput accessibilityLabel="Building" editable={!busy} value={building}
        onChangeText={value => { setBuilding(value); setMessage(''); onFound('', ''); }} style={inputStyle} />
    </> : <ThemedText type="small">{building ? `Building: ${building}` : 'Building missing. Try a clearer screenshot.'}</ThemedText>}
    <Pressable accessibilityRole="button" disabled={busy || !campus.trim() || !building.trim()} onPress={() => void lookup()}
      style={({ pressed }) => ({ minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.button, borderWidth: 1, borderColor: Palette.accentBorder, backgroundColor: Palette.selected, opacity: pressed || busy || !campus.trim() || !building.trim() ? 0.5 : 1 })}>
      <ThemedText type="smallBold">{busy ? 'Finding building…' : 'Find building'}</ThemedText>
    </Pressable>
    {!!message && <ThemedText accessibilityLiveRegion="polite">{message}</ThemedText>}
  </View>;
}
