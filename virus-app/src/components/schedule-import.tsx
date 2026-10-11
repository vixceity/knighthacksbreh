import * as ImagePicker from 'expo-image-picker';
import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { Palette, Radius } from '@/constants/theme';

export type ImportedClass = {
  date?: string;
  name: string;
  place: string;
  days: number[];
  start: string;
  end: string;
  campus?: string;
  building?: string;
  latitude?: number | null;
  longitude?: number | null;
  matchedAddress?: string;
  locationStatus?: string;
  locationError?: boolean;
};

export function ScheduleImport({ onImport, disabled, renderTrigger, onBusyChange }: {
  onImport: (classes: ImportedClass[]) => void;
  disabled: boolean;
  renderTrigger?: (pick: () => void, disabled: boolean, busy: boolean) => ReactNode;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  async function pick() {
    if (disabled || busy) return;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    setPreview(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 1 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64 || asset.base64.length > 11 * 1024 * 1024) throw new Error('Choose a screenshot under 8 MB.');
      // Expo encodes native base64 as JPEG; web retains the selected file type.
      const mime = Platform.OS === 'web' ? asset.mimeType : 'image/jpeg';
      if (!mime || !['image/png', 'image/jpeg', 'image/webp'].includes(mime)) throw new Error('Choose a PNG, JPEG, or WebP screenshot.');
      setPreview(asset.uri);
      const base = process.env.EXPO_PUBLIC_SCHEDULE_API_URL || (Platform.OS === 'web' ? 'http://localhost:3001' : '');
      if (!base) throw new Error('Configure EXPO_PUBLIC_SCHEDULE_API_URL to your computer’s import server address, then restart Expo.');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 85000);
      try {
        const response = await fetch(`${base.replace(/\/$/, '')}/import-schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ image: `data:${mime};base64,${asset.base64}` }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not import this screenshot.');
        if (!Array.isArray(data.classes) || data.classes.length > 40 || !data.classes.every((item: ImportedClass) =>
          item && ['name', 'place', 'start', 'end'].every(key => typeof item[key as keyof ImportedClass] === 'string')
          && Array.isArray(item.days) && item.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6))) {
          throw new Error('The server returned an invalid schedule.');
        }
        if (!data.classes.length) throw new Error('No classes found. Try a clearer screenshot that includes days and times.');
        onImport(data.classes);
      } finally {
        clearTimeout(timeout);
      }
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== 'AbortError' && failure.message !== 'Failed to fetch'
        ? failure.message : 'Could not reach the import server or the request timed out. Check that the server is running and retry.');
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return <View style={{ gap: 8 }}>
    {!renderTrigger && <ThemedText type="subtitle">Import schedule</ThemedText>}
    {!renderTrigger && <ThemedText type="small">Gemini reads screenshots and matches UCF buildings to presets. Review classes and select a map pin if needed.</ThemedText>}
    {renderTrigger
      ? renderTrigger(() => void pick(), busy || disabled, busy)
      : <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={() => void pick()}
          style={({ pressed }) => [styles.button, (pressed || busy || disabled) && styles.dimmed]}>
          <ThemedText type="smallBold" style={{ color: Palette.accent, textAlign: 'center' }}>{busy ? 'Reading screenshot…' : 'Choose schedule screenshot'}</ThemedText>
        </Pressable>}
    {busy && <ActivityIndicator color={Palette.accent} accessibilityLabel="Reading schedule" />}
    {preview && !renderTrigger && <Image source={{ uri: preview }} resizeMode="contain" accessibilityLabel="Selected schedule screenshot" style={{ width: '100%', height: 180 }} />}
    {!!error && <ThemedText accessibilityRole="alert" style={{ color: Palette.accent }}>{error}</ThemedText>}
  </View>;
}

const styles = StyleSheet.create({
  button: { minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Palette.accentBorder, borderRadius: Radius.button },
  dimmed: { opacity: 0.5 },
});
