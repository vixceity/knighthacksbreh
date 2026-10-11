import { ScheduleDate } from './schedule-date';
import { displayTime, parseTime } from '@/utils/time';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Button, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { ScheduleImport, type ImportedClass } from './schedule-import';
import { PlanInput } from './plan-input';
import { BuildingLookup } from './building-lookup';
import { type ClassEntry, type Position, attendance, validClass, overlaps } from '@/utils/attendance';

const KEY = 'class-schedule-v1';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function ClassSchedule({ position, onAbsent }: { position: Position | null; onAbsent: (absent: boolean) => void }) {
  const theme = useTheme();
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const [days, setDays] = useState<number[]>([1]);
  const [imports, setImports] = useState<ImportedClass[]>([]);
  const [importSource, setImportSource] = useState<'screenshot' | 'plan'>('screenshot');
  const [details, setDetails] = useState(false);
  const [eventDate, setEventDate] = useState<string | undefined>();
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
    const entry = { ...form, name: form.name.trim(), place: form.place.trim(), id: `${Date.now()}`, days: eventDate ? [new Date(`${eventDate}T12:00:00`).getDay()] : days, ...(eventDate ? { date: eventDate } : {}),
      start: parseTime(form.start), end: parseTime(form.end), latitude: Number(form.latitude), longitude: Number(form.longitude), radius: Number(form.radius) };
    if (!form.latitude.trim() || !form.longitude.trim() || !validClass(entry)) {
      setError('Enter a class and location name, choose days, use AM/PM times (end after start), valid coordinates, and a radius of 20–5000 meters.'); return;
    }
    if (classes.some(other => overlaps(other, entry))) {
      setError('This class overlaps another class. Choose a different time.'); return;
    }
    if (await save([...classes, entry])) advanceImport();
  }
  function loadDraft(draft?: ImportedClass) {
    setDetails(false);
    setEventDate(draft?.date);
    setLocationConfirmed(false);
    setDays(draft?.days ?? [1]);
    setForm({ name: draft?.name ?? '', place: draft?.place ?? '', start: displayTime(draft?.start ?? ''), end: displayTime(draft?.end ?? ''), latitude: Number.isFinite(draft?.latitude) ? String(draft?.latitude) : '', longitude: Number.isFinite(draft?.longitude) ? String(draft?.longitude) : '', radius: '100' });
    setError('');
  }
  function advanceImport() {
    const remaining = imports.slice(1);
    setImports(remaining);
    loadDraft(remaining[0]);
    if (!remaining.length) setEditorOpen(false);
  }
  function closeEditor() {
    if (saving) return;
    Keyboard.dismiss();
    setEditorOpen(false);
  }
  const labels = { name: 'Class name', place: 'Building / room', start: 'Start (AM/PM)', end: 'End (AM/PM)', latitude: 'Latitude', longitude: 'Longitude', radius: 'Attendance radius (meters)' };
  return (
    <View style={styles.home}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your classes</Text>
        <Text style={styles.classCount}>{ready ? `${classes.length} ${classes.length === 1 ? 'class' : 'classes'}` : 'Loading...'}</Text>
      </View>
      <View style={styles.divider} />
      {!ready && !error && <Text style={styles.secondaryText}>Loading schedule...</Text>}
      {ready && classes.length === 0 && <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No classes yet</Text>
        <Text style={styles.emptyBody}>Add your first class or import a schedule screenshot.</Text>
      </View>}
      {classes.map(entry => {
        const status = attendance(entry, position, now);
        return <View key={entry.id} style={styles.classRow}>
          <View style={styles.classInfo}>
            <Text style={styles.emptyTitle}>{entry.name}</Text>
            <Text style={styles.secondaryText}>{entry.place}</Text>
            <Text style={styles.secondaryText}>{entry.date ? `${new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (one time)` : entry.days.map(day => DAYS[day]).join(', ')} | {displayTime(entry.start)} - {displayTime(entry.end)}</Text>
            <Text accessibilityLiveRegion="polite" style={[styles.secondaryText, status === 'absent' && styles.absentText, status === 'present' && styles.presentText]}>
              {status === 'absent' ? 'Not at class - head to your classroom' : status === 'present' ? 'At class' : status === 'unknown' ? 'Waiting for an accurate location' : 'Not in session'}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${entry.name}`} disabled={saving || importing}
            onPress={() => void save(classes.filter(item => item.id !== entry.id))}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={22} tintColor="#A7A7AE" />
          </Pressable>
        </View>;
      })}
      {!!error && !editorOpen && <Text accessibilityRole="alert" style={styles.absentText}>{error}</Text>}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={!ready || saving || importing}
          onPress={() => { if (!imports.length) loadDraft(); setEditorOpen(true); }}
          style={({ pressed }) => [styles.primaryButton, (pressed || !ready || saving || importing) && styles.pressed]}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={24} tintColor="#FFFFFF" />
          <Text style={styles.primaryButtonText}>{imports.length ? 'Continue reviewing classes' : 'Add class'}</Text>
        </Pressable>

      </View>
      <Modal visible={editorOpen} animationType="slide" onRequestClose={closeEditor}>
        <SafeAreaProvider style={[styles.modal, { backgroundColor: theme.background }]}>
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <ThemedText type="smallBold">{imports.length ? 'Review event' : 'Add class'}</ThemedText>
              <Pressable accessibilityRole="button" accessibilityLabel="Exit to main menu" disabled={saving}
                accessibilityState={{ disabled: saving }} hitSlop={8} onPress={closeEditor}
                style={({ pressed }) => [styles.closeButton, (pressed || saving) && styles.pressed]}>
                <ThemedText type="smallBold">Exit</ThemedText>
              </Pressable>
            </View>
            <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editor}>
        {!imports.length && <ScheduleImport disabled={!ready || saving || importing || imports.length > 0}
          onImport={items => { setImportSource('screenshot'); setImports(items); loadDraft(items[0]); setEditorOpen(true); }}
          onBusyChange={setImporting}
          renderTrigger={(pick, disabled, busy) => (
            <Pressable accessibilityRole="button" disabled={disabled} onPress={pick}
              style={({ pressed }) => [styles.secondaryButton, (pressed || disabled) && styles.pressed]}>
              <SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={21} tintColor="#5A9CFF" />
              <Text style={styles.secondaryButtonText}>{busy ? 'Reading screenshot...' : 'Import schedule screenshot'}</Text>
            </Pressable>
          )} />}
                {!imports.length && <PlanInput disabled={!ready || saving || importing} onBusyChange={setImporting}
                  onPlan={plan => { setImportSource('plan'); setImports([plan]); loadDraft(plan); }} />}
                {imports.length > 0 && <View style={{ gap: 8 }}>
                  <ThemedText type="smallBold">Review event · {imports.length} remaining</ThemedText>
                  <ThemedText type="small">Campus: {imports[0].campus || 'Enter your college below'}</ThemedText>
                  <ThemedText type="small">{!imports[0].campus || !imports[0].building ? 'Complete the location below to find your building.' : imports[0].locationStatus || 'Find your building below.'}</ThemedText>
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
                  allowBuildingEdit={importSource === 'plan'}
                  onFound={(latitude, longitude, building) => { setLocationConfirmed(false); setForm(previous => ({ ...previous, latitude, longitude, place: building || previous.place })); }} />}
                <ScheduleDate key={imports[0]?.name || 'manual'} date={eventDate} days={days} onDate={setEventDate} onDays={setDays} />
                {imports.length > 0 && <ThemedText type="small">Extracted location: {form.place || 'Not readable — try another screenshot'}</ThemedText>}
                <Button title={details ? "Hide location details" : "Location details"} onPress={() => setDetails(value => !value)} />
                {(Object.keys(labels) as (keyof typeof labels)[]).filter(key => !(imports.length > 0 && key === 'place') && (details || !['latitude', 'longitude', 'radius'].includes(key))).map(key => <View key={key}>
                  <ThemedText type="small">{labels[key]}</ThemedText>
                  <TextInput accessibilityLabel={labels[key]} value={form[key]} onChangeText={value => { if (['place', 'latitude', 'longitude'].includes(key)) setLocationConfirmed(false); setForm(previous => ({ ...previous, [key]: value })); }}
                    autoCapitalize="none" style={[styles.input, { color: theme.text, backgroundColor: theme.background }]} />
                </View>)}
                <Button title="Use my current location for this class" disabled={!position || now.getTime() - position.timestamp > 30000} onPress={() => {
                  setLocationConfirmed(false);
                  if (position) setForm(previous => ({ ...previous, latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) }));
                }} />
                {!!error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
                <Button title={saving ? 'Saving…' : 'Save class'} disabled={!ready || saving || importing} onPress={() => void add()} />
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  home: { flexGrow: 1 },
  sectionHeader: { marginTop: 64, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: '#F5F5F7', fontSize: 27, lineHeight: 33, fontWeight: '700' },
  classCount: { color: '#77777F', fontSize: 15, lineHeight: 20 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#2A2A2D', marginTop: 16 },
  emptyState: { paddingTop: 34, paddingBottom: 42 },
  emptyTitle: { color: '#D6D6DA', fontSize: 18, lineHeight: 24, fontWeight: '600' },
  emptyBody: { marginTop: 8, maxWidth: 290, color: '#85858D', fontSize: 16, lineHeight: 23 },
  secondaryText: { color: '#9B9BA2', fontSize: 14, lineHeight: 21 },
  classRow: { flexDirection: 'row', gap: 12, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2A2A2D' },
  classInfo: { flex: 1, gap: 4 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  absentText: { color: '#FCA5A5', fontSize: 14, lineHeight: 21 },
  presentText: { color: '#86EFAC' },
  actions: { marginTop: 'auto', paddingTop: 28, gap: 14 },
  primaryButton: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: '#2F80ED', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, lineHeight: 23, fontWeight: '600', flexShrink: 1 },
  secondaryButton: { minHeight: 48, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { color: '#5A9CFF', fontSize: 16, lineHeight: 21, fontWeight: '500', flexShrink: 1 },
  pressed: { opacity: 0.65 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, minHeight: 64, flexShrink: 0 },
  closeButton: { minWidth: 64, minHeight: 48, paddingHorizontal: 12, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  editor: { width: '100%', maxWidth: 800, alignSelf: 'center', padding: 20, gap: 12 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  input: { borderWidth: 1, borderColor: '#8C9BB0', borderRadius: 8, padding: 12, minHeight: 44 },
});
