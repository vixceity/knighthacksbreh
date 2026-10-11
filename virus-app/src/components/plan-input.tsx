import { useState } from 'react';
import { Button, Platform, TextInput, View } from 'react-native';
import { ThemedText } from './themed-text';
import { type ImportedClass } from './schedule-import';
import { localDate, validDate } from '@/utils/attendance';
import { useTheme } from '@/hooks/use-theme';

export function PlanInput({ disabled, onPlan, onBusyChange }: {
  disabled: boolean;
  onPlan: (plan: ImportedClass) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  async function parse() {
    setBusy(true); setError('');
    onBusyChange?.(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 85000);
    try {
      const base = process.env.EXPO_PUBLIC_SCHEDULE_API_URL || (Platform.OS === 'web' ? 'http://localhost:3001' : '');
      if (!base) throw new Error('Set the import server address and restart Expo.');
      const response = await fetch(`${base.replace(/\/$/, '')}/parse-plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ text, today: localDate(new Date()) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not read the plan.');
      const plan = data.classes?.[0];
      if (!plan || typeof plan.date !== 'string' || !validDate(plan.date) || !Array.isArray(plan.days)
        || !['name', 'place', 'start', 'end'].every(key => typeof plan[key] === 'string')) throw new Error('Could not read the plan. Include a day, time, and location.');
      onPlan(plan); setText('');
    } catch (failure) { setError(failure instanceof Error && failure.name !== 'AbortError' ? failure.message : 'Request timed out. Try again.'); }
    finally { clearTimeout(timer); setBusy(false); onBusyChange?.(false); }
  }
  return <View style={{ gap: 10 }}>
    <ThemedText type="smallBold">Add a plan</ThemedText>
    <ThemedText type="small">Include a place, day, and time.</ThemedText>
    <TextInput multiline accessibilityLabel="Your plan" editable={!busy && !disabled} value={text} onChangeText={setText} maxLength={2000}
      style={{ color: theme.text, borderColor: '#8C9BB0', borderWidth: 1, padding: 12, borderRadius: 8, minHeight: 90 }} />
    <Button title={busy ? 'Reading plan…' : 'Review plan'} disabled={disabled || busy || !text.trim()} onPress={() => void parse()} />
    {!!error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
  </View>;
}
