import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useTheme } from '@/hooks/use-theme';
import { ScheduleImport, type ImportedClass } from './schedule-import';
import { Linking } from 'react-native';
import { BuildingLookup } from './building-lookup';
import { type ClassEntry, type Position, attendance, validClass } from '@/utils/attendance';

const KEY = 'class-schedule-v1';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function ClassSchedule({ position, onAbsent }: { position: Position | null; onAbsent: (absent: boolean) => void }) {
  const theme = useTheme();
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const [days, setDays] = useState<number[]>([1]);
  const [imports, setImports] = useState<ImportedClass[]>([]);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [form, setForm] = useState({ name: '', place: '', start: '', end: '', latitude: '', longitude: '', radius: '100' });
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(raw => {
      const data = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(data) || !data.every(validClass)) throw new Error('Invalid schedule');
      if (active) { setClasses(data); setReady(true); }
    }).catch(() => { if (active) setError('Could not load your saved schedule. Restart the app to retry.'); });
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const absent = classes.some(entry => attendance(entry, position, now) === 'absent');
  useEffect(() => { onAbsent(absent); }, [absent, onAbsent]);
  async function save(next: ClassEntry[]) {
    setSaving(true);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); setClasses(next); setError(''); return true; }
    catch { setError('Could not save your schedule. Please try again.'); return false; }
    finally { setSaving(false); }
  }
  async function add() {
    if (imports.length && !locationConfirmed) { setError('Confirm the class location before saving.'); return; }
    const entry = { ...form, name: form.name.trim(), place: form.place.trim(), id: `${Date.now()}`, days,
      latitude: Number(form.latitude), longitude: Number(form.longitude), radius: Number(form.radius) };
    if (!form.latitude.trim() || !form.longitude.trim() || !validClass(entry)) {
      setError('Enter a class and location name, choose days, use 24-hour HH:MM times (end after start), valid coordinates, and a radius of 20–5000 meters.'); return;
    }
    if (classes.some(other => other.days.some(day => days.includes(day)) && entry.start < other.end && entry.end > other.start)) {
      setError('This class overlaps another class. Choose a different time.'); return;
    }
    if (await save([...classes, entry])) advanceImport();
  }
  function loadDraft(draft?: ImportedClass) {
    setLocationConfirmed(false);
    setDays(draft?.days ?? [1]);
    setForm({ name: draft?.name ?? '', place: draft?.place ?? '', start: draft?.start ?? '', end: draft?.end ?? '', latitude: Number.isFinite(draft?.latitude) ? String(draft?.latitude) : '', longitude: Number.isFinite(draft?.longitude) ? String(draft?.longitude) : '', radius: '100' });
    setError('');
  }
  function advanceImport() {
    const remaining = imports.slice(1);
    setImports(remaining);
    loadDraft(remaining[0]);
  }
  const labels = { name: 'Class name', place: 'Building / room', start: 'Start (24-hour HH:MM)', end: 'End (24-hour HH:MM)', latitude: 'Latitude', longitude: 'Longitude', radius: 'Attendance radius (meters)' };
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle">Class schedule</ThemedText>
      <ThemedText type="small">Repeats weekly in your device’s local time. Location is checked while Home is open. GPS checks the building area, not the room.</ThemedText>
      {!ready && !error && <ThemedText>Loading schedule…</ThemedText>}
      {ready && classes.length === 0 && <ThemedText>No classes saved yet.</ThemedText>}
      {classes.map(entry => {
        const status = attendance(entry, position, now);
        return <View key={entry.id} style={styles.entry}>
          <ThemedText type="smallBold">{entry.name} — {entry.place}</ThemedText>
          <ThemedText type="small">{entry.days.map(day => DAYS[day]).join(', ')} · {entry.start}–{entry.end} · {entry.radius} m</ThemedText>
          <ThemedText type="small">{entry.latitude.toFixed(5)}, {entry.longitude.toFixed(5)}</ThemedText>
          <ThemedText accessibilityLiveRegion="polite">{status === 'absent' ? 'Not at class — head to your classroom' : status === 'present' ? 'At class' : status === 'unknown' ? 'Unable to check — waiting for an accurate location' : 'Not in session'}</ThemedText>
          <Button title={`Delete ${entry.name}`} disabled={saving} onPress={() => void save(classes.filter(item => item.id !== entry.id))} />
        </View>;
      })}
      <ScheduleImport disabled={!ready || saving || imports.length > 0} onImport={items => { setImports(items); loadDraft(items[0]); }} />
      {imports.length > 0 && <View style={{ gap: 8 }}>
        <ThemedText type="smallBold">Review imported class · {imports.length} remaining</ThemedText>
        <ThemedText type="small">Campus: {imports[0].campus || 'Could not determine from screenshot'}</ThemedText>
        <ThemedText type="small">{imports[0].locationStatus || 'Enter the building coordinates below.'}</ThemedText>
        {!!imports[0].matchedAddress && <ThemedText type="small">Google Maps: {imports[0].matchedAddress}</ThemedText>}
        <Button title="Review pin in Google Maps" disabled={!form.latitude.trim() || !form.longitude.trim() || !Number.isFinite(Number(form.latitude)) || !Number.isFinite(Number(form.longitude))} onPress={() => {
          void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${form.latitude},${form.longitude}`)}`).catch(() => setError('Could not open Google Maps. Check coordinates manually.'));
        }} />
        <Button title={locationConfirmed ? 'Location confirmed ✓' : 'I confirm this is my class building'} onPress={() => setLocationConfirmed(true)} />
        <Button title="Skip this class" disabled={saving} onPress={advanceImport} />
        <Button title="Discard remaining imports" disabled={saving} onPress={() => { setImports([]); loadDraft(); }} />
      </View>}
      <ThemedText type="smallBold">{imports.length ? 'Review and save class' : 'Add a class'}</ThemedText>
      {imports.length > 0 && <BuildingLookup key={`${imports.length}:${imports[0]?.name}`}
        initialCampus={imports[0]?.campus ?? ''} initialBuilding={imports[0]?.building ?? ''}
        onFound={(latitude, longitude) => { setLocationConfirmed(false); setForm(previous => ({ ...previous, latitude, longitude })); }} />}
      <View style={styles.days}>{DAYS.map((day, index) => <Button key={day} title={`${days.includes(index) ? '✓ ' : ''}${day}`} onPress={() => setDays(previous => previous.includes(index) ? previous.filter(item => item !== index) : [...previous, index])} />)}</View>
      {imports.length > 0 && <ThemedText type="small">Location from screenshot: {form.place || 'Not readable — try another screenshot'}</ThemedText>}
      {(Object.keys(labels) as (keyof typeof labels)[]).filter(key => !(imports.length > 0 && key === 'place')).map(key => <View key={key}>
        <ThemedText type="small">{labels[key]}</ThemedText>
        <TextInput accessibilityLabel={labels[key]} value={form[key]} onChangeText={value => { if (['place', 'latitude', 'longitude'].includes(key)) setLocationConfirmed(false); setForm(previous => ({ ...previous, [key]: value })); }}
          autoCapitalize="none" style={[styles.input, { color: theme.text, backgroundColor: theme.background }]} />
      </View>)}
      <Button title="Use my current location for this class" disabled={!position || now.getTime() - position.timestamp > 30000} onPress={() => {
        setLocationConfirmed(false);
        if (position) setForm(previous => ({ ...previous, latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) }));
      }} />
      {!!error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
      <Button title={saving ? 'Saving…' : 'Save class'} disabled={!ready || saving} onPress={() => void add()} />
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', padding: 20, borderRadius: 16, gap: 12 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  input: { borderWidth: 1, borderColor: '#8C9BB0', borderRadius: 8, padding: 12, minHeight: 44 },
  entry: { gap: 8, borderBottomWidth: 1, borderBottomColor: '#8C9BB0', paddingBottom: 12 },
});
