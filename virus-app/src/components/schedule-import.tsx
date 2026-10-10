import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Button, Image, Platform, View } from 'react-native';
import { ThemedText } from './themed-text';

export type ImportedClass = { name: string; place: string; days: number[]; start: string; end: string; campus?: string; building?: string; latitude?: number | null; longitude?: number | null; matchedAddress?: string; locationStatus?: string };
export function ScheduleImport({ onImport, disabled }: { onImport: (classes: ImportedClass[]) => void; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  async function pick() {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 1 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64 || asset.base64.length > 11 * 1024 * 1024) throw new Error('Choose a screenshot under 8 MB.');
      // Expo encodes native base64 as JPEG; web retains the selected file type.
      const mime = Platform.OS === 'web' ? asset.mimeType : 'image/jpeg';
      if (!mime || !['image/png', 'image/jpeg', 'image/webp'].includes(mime)) throw new Error('Choose a PNG, JPEG, or WebP screenshot.');
      setPreview(asset.uri);
      setBusy(true);
      const base = process.env.EXPO_PUBLIC_SCHEDULE_API_URL || (Platform.OS === 'web' ? 'http://localhost:3001' : '');
      if (!base) throw new Error('Configure EXPO_PUBLIC_SCHEDULE_API_URL to your computer’s import server address, then restart Expo.');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 85000);
      try {
        const response = await fetch(`${base.replace(/\/$/, '')}/import-schedule`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ image: `data:${mime};base64,${asset.base64}` }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not import this screenshot.');
        if (!Array.isArray(data.classes) || data.classes.length > 40 || !data.classes.every((item: ImportedClass) =>
          item && ['name', 'place', 'start', 'end'].every(key => typeof item[key as keyof ImportedClass] === 'string')
          && Array.isArray(item.days) && item.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6))) throw new Error('The server returned an invalid schedule.');
        if (!data.classes.length) throw new Error('No classes found. Try a clearer screenshot that includes days and times.');
        onImport(data.classes);
      } finally { clearTimeout(timeout); }
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== 'AbortError' && failure.message !== 'Failed to fetch'
        ? failure.message : 'Could not reach the import server or the request timed out. Check that the server is running and retry.');
    } finally { setBusy(false); }
  }
  return <View style={{ gap: 10 }}>
    <ThemedText type="smallBold">Import a schedule screenshot</ThemedText>
    <ThemedText type="small">Your selected screenshot is sent to Google Gemini to read class names, days, times, and rooms. Review each class before saving.</ThemedText>
    <Button title={busy ? 'Reading screenshot…' : 'Choose schedule screenshot'} disabled={busy || disabled} onPress={() => void pick()} />
    {busy && <ActivityIndicator accessibilityLabel="Reading schedule" />}
    {preview && <Image source={{ uri: preview }} resizeMode="contain" accessibilityLabel="Selected schedule screenshot" style={{ width: '100%', height: 180 }} />}
    {!!error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
  </View>;
}
