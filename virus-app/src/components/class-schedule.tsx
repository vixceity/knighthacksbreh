import { displayTime, parseTime } from '@/utils/time';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { ScheduleImport, type ImportedClass } from './schedule-import';
import { PlanInput } from './plan-input';
import { ScheduleDate } from './schedule-date';
import LocationMap from './location-map';
import ucfBuildings from '@/constants/ucf-buildings.json';
import { type ClassEntry, type Position, attendance, validClass, overlaps } from '@/utils/attendance';

const KEY = 'class-schedule-v1';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_QUEUED_REMINDERS = 60;
const REMINDER_MESSAGES = [
  (place: string, radius: number) => `CLASS IS IN SESSION. Get to ${place} now; the check-in zone is ${radius} m.`,
  (place: string, radius: number) => `Still outside the ${radius} m zone. Stop scrolling and move toward ${place}.`,
  (place: string, radius: number) => `Another minute out of class. Head to ${place} right now.`,
  (place: string, radius: number) => `Your class is happening NOW. Get inside the ${radius} m zone at ${place}.`,
  (place: string, radius: number) => `This is your attendance reminder. Go to ${place} now.`,
  (place: string, radius: number) => `You're still not at ${place}. The class is already underway.`,
];

function reminderBody(place: string, radius: number, index: number) {
  return REMINDER_MESSAGES[index % REMINDER_MESSAGES.length](place, radius);
}

function EditorAction({ title, onPress, disabled = false, primary = false }: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.editorAction, primary && styles.editorActionPrimary, (pressed || disabled) && styles.pressed]}>
    <Text style={[styles.editorActionText, primary && styles.editorActionPrimaryText]}>{title}</Text>
  </Pressable>;
}

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
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [reminderStatus, setReminderStatus] = useState('');
  const reminderRef = useRef<{ classId: string; notificationIds: string[] } | null>(null);
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
  const absentClass = classes.find(entry => attendance(entry, position, now) === 'absent');
  useEffect(() => { onAbsent(absent); }, [absent, onAbsent]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;

    async function cancelReminder() {
      const previous = reminderRef.current;
      if (!previous) return;
      await Promise.all(previous.notificationIds.map(async notificationId => {
        await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
        await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
      }));
      reminderRef.current = null;
    }

    async function syncReminder() {
      const previous = reminderRef.current;
      if (!absentClass) {
        if (previous) await cancelReminder();
        setReminderStatus('Reminders start during a scheduled class when GPS confirms you are outside its radius.');
        return;
      }
      if (previous?.classId === absentClass.id) return;
      if (previous) await cancelReminder();
      try {
        await Notifications.setNotificationChannelAsync('class-attendance', {
          name: 'Class attendance',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
        let permission = await Notifications.getPermissionsAsync();
        if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
        if (!active) return;
        if (!permission.granted) {
          setReminderStatus('Notifications are off. Enable them for Expo Go in your device settings.');
          return;
        }
        const channel = Platform.OS === 'android' ? { channelId: 'class-attendance' } : {};
        const notificationIds: string[] = [];
        const content = (index: number) => ({
          title: `${absentClass.name}: GET TO CLASS NOW`,
          body: reminderBody(absentClass.place, absentClass.radius, index),
          data: { type: 'class-attendance', classId: absentClass.id },
          sound: true,
        });
        const immediateId = await Notifications.scheduleNotificationAsync({ content: content(0), trigger: null });
        notificationIds.push(immediateId);
        const firstRepeatAt = Date.now() + 60_000;
        const classDate = absentClass.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const [endHour, endMinute] = absentClass.end.split(':').map(Number);
        const classEnd = new Date(`${classDate}T00:00:00`);
        classEnd.setHours(endHour, endMinute, 0, 0);
        const repeatCount = Math.min(MAX_QUEUED_REMINDERS, Math.max(0, Math.ceil((classEnd.getTime() - firstRepeatAt) / 60_000)));
        for (let index = 0; index < repeatCount; index++) {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: content(index + 1),
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(firstRepeatAt + index * 60_000),
              ...channel,
            },
          });
          notificationIds.push(notificationId);
        }
        if (active) {
          reminderRef.current = { classId: absentClass.id, notificationIds };
          setReminderStatus(`Urgent class reminders scheduled every 60 seconds through class end (${repeatCount} follow-ups queued).`);
        } else {
          await Promise.all(notificationIds.map(notificationId => Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {})));
        }
      } catch {
        setReminderStatus('Could not schedule a reminder. Check Expo Go notification permissions and try again.');
      }
    }

    void syncReminder();
    return () => {
      active = false;
      void cancelReminder();
    };
  }, [absentClass?.id]);

  async function save(next: ClassEntry[]) {
    setSaving(true);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); setClasses(next); setError(''); return true; }
    catch { setError('Could not save your schedule. Please try again.'); return false; }
    finally { setSaving(false); }
  }

  async function add() {
    if (!form.latitude.trim() || !form.longitude.trim()) {
      setShowLocationPrompt(true);
      return;
    }
    const entry = {
      ...form,
      name: form.name.trim(),
      place: form.place.trim(),
      id: `${Date.now()}`,
      days: eventDate ? [new Date(`${eventDate}T12:00:00`).getDay()] : days,
      ...(eventDate ? { date: eventDate } : {}),
      start: parseTime(form.start),
      end: parseTime(form.end),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius: Number(form.radius),
    };
    if (!form.latitude.trim() || !form.longitude.trim() || !validClass(entry)) {
      setError('Enter a class, choose a building pin, use AM/PM times (end after start), and set a radius of 20–5000 meters.');
      return;
    }
    if (classes.some(other => overlaps(other, entry))) {
      setError('This class overlaps another class. Choose a different time.');
      return;
    }
    if (await save([...classes, entry])) advanceImport();
  }

  function loadDraft(draft?: ImportedClass) {
    setDetails(false);
    setEventDate(draft?.date);
    setDays(draft?.days ?? [1]);
    setForm({
      name: draft?.name ?? '',
      place: draft?.place ?? '',
      start: displayTime(draft?.start ?? ''),
      end: displayTime(draft?.end ?? ''),
      latitude: Number.isFinite(draft?.latitude) ? String(draft?.latitude) : '',
      longitude: Number.isFinite(draft?.longitude) ? String(draft?.longitude) : '',
      radius: '100',
    });
    setError('');
    setShowLocationPrompt(false);
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

  function selectBuilding(building: (typeof ucfBuildings)[number]) {
    const room = form.place.match(/(?:room|rm)?\s*([a-z]?\d{2,4}[a-z]?)/i)?.[1];
    const place = room ? `${building.code} ${room}` : building.code;
    setForm(previous => ({ ...previous, place, latitude: String(building.latitude), longitude: String(building.longitude) }));
    setImports(previous => previous.map((item, index) => index === 0
      ? { ...item, building: building.code, place, latitude: building.latitude, longitude: building.longitude,
        locationError: false, locationStatus: `Selected UCF preset: ${building.name}.` }
      : item));
    setShowLocationPrompt(false);
    setError('');
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
            <Text style={styles.secondaryText}>{entry.place || 'N/A'}</Text>
            <Text style={styles.secondaryText}>{entry.date ? `${new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (one time)` : entry.days.map(day => DAYS[day]).join(', ')} | {displayTime(entry.start)} - {displayTime(entry.end)}</Text>
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
      {!!reminderStatus && Platform.OS !== 'web' && <Text accessibilityLiveRegion="polite" style={styles.secondaryText}>{reminderStatus}</Text>}
      {!!error && !editorOpen && <Text accessibilityRole="alert" style={styles.absentText}>{error}</Text>}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={!ready || saving || importing}
          onPress={() => { if (!imports.length) loadDraft(); setEditorOpen(true); }}
          style={({ pressed }) => [styles.primaryButton, (pressed || !ready || saving || importing) && styles.pressed]}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={24} tintColor="#FFFFFF" />
          <Text style={styles.primaryButtonText}>{imports.length ? 'Continue reviewing classes' : 'Add class'}</Text>
        </Pressable>
        <ScheduleImport disabled={!ready || saving || importing}
          onImport={items => { setImportSource('screenshot'); setImports(items); loadDraft(items[0]); setEditorOpen(true); }}
          onBusyChange={setImporting}
          renderTrigger={(pick, disabled, busy) => (
            <Pressable accessibilityRole="button" disabled={disabled} onPress={pick}
              style={({ pressed }) => [styles.secondaryButton, (pressed || disabled) && styles.pressed]}>
              <SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={21} tintColor="#5A9CFF" />
              <Text style={styles.secondaryButtonText}>{busy ? 'Reading screenshot...' : 'Import schedule screenshot'}</Text>
            </Pressable>
          )} />
      </View>
      <Modal visible={editorOpen} animationType="slide" onRequestClose={closeEditor}>
        <SafeAreaProvider style={[styles.modal, { backgroundColor: theme.background }]}>
          <SafeAreaView style={[styles.modal, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="smallBold">{imports.length ? importSource === 'plan' ? 'Review plan' : 'Review schedule' : 'Add class'}</ThemedText>
              <Pressable accessibilityRole="button" accessibilityLabel="Back to classes" disabled={saving}
                accessibilityState={{ disabled: saving }} hitSlop={8} onPress={closeEditor}
                style={({ pressed }) => [styles.backButton, (pressed || saving) && styles.pressed]}>
                <View pointerEvents="none">
                  <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={20} tintColor="#5A9CFF" />
                </View>
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            </View>
            <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editor}>
                {!imports.length && <View style={styles.formSection}>
                  <PlanInput disabled={!ready || saving || importing} onBusyChange={setImporting}
                    onPlan={plan => { setImportSource('plan'); setImports([plan]); loadDraft(plan); }} />
                </View>}
                {imports.length > 0 && <View style={{ gap: 8 }}>
                  <ThemedText type="smallBold">{importSource === 'plan' ? 'Review plan' : 'Review class'} · {imports.length} remaining</ThemedText>
                  <ThemedText type="small">Campus: {imports[0].campus || 'UCF main campus'}</ThemedText>
                  <ThemedText type="small">{imports[0].locationStatus || 'Choose the classroom building from the UCF map.'}</ThemedText>
                  <ThemedText type="small">Location: {form.place || 'N/A'}</ThemedText>
                  <EditorAction title="Skip this class" disabled={saving} onPress={advanceImport} />
                  <EditorAction title="Discard remaining imports" disabled={saving} onPress={() => { setImports([]); loadDraft(); }} />
                </View>}
                <ScheduleDate key={imports[0]?.name || 'manual'} date={eventDate} days={days} onDate={setEventDate} onDays={setDays} />
                <View style={styles.mapSection}>
                  <View style={styles.sectionHeading}>
                    <ThemedText type="smallBold">Class location</ThemedText>
                    <ThemedText type="small">{form.place || 'Select a building pin'}</ThemedText>
                  </View>
                  <LocationMap showUcfBuildings onBuildingSelect={selectBuilding} />
                </View>
                <EditorAction title={details ? 'Hide location details' : 'Location details'} onPress={() => setDetails(value => !value)} />
                {(Object.keys(labels) as (keyof typeof labels)[]).filter(key => !(imports.length > 0 && key === 'place') && (details || !['latitude', 'longitude', 'radius'].includes(key))).map(key => <View key={key}>
                  <ThemedText type="small">{labels[key]}</ThemedText>
                  <TextInput accessibilityLabel={labels[key]} value={form[key]} onChangeText={value => setForm(previous => ({ ...previous, [key]: value }))}
                    autoCapitalize="none" placeholderTextColor="#77777F" style={styles.input} />
                </View>)}
                {!!error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
                <EditorAction title={saving ? 'Saving…' : 'Save class'} primary disabled={!ready || saving || importing} onPress={() => void add()} />
              </ScrollView>
            </KeyboardAvoidingView>
            {showLocationPrompt && <View style={styles.promptBackdrop}>
              <View style={[styles.promptContent, { backgroundColor: theme.background }]}>
                <ThemedText type="subtitle">Choose a class location</ThemedText>
                <ThemedText type="small">Select the building from the interactive map pins before saving this class.</ThemedText>
                <Pressable accessibilityRole="button" onPress={() => setShowLocationPrompt(false)} style={styles.promptButton}>
                  <ThemedText type="smallBold">Return to map</ThemedText>
                </Pressable>
              </View>
            </View>}
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
  backButton: { minHeight: 44, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  backButtonText: { color: '#5A9CFF', fontSize: 15, fontWeight: '600' },
  editor: { width: '100%', maxWidth: 800, alignSelf: 'center', padding: 20, gap: 16 },
  formSection: { padding: 16, gap: 12, borderWidth: 1, borderColor: '#242427', borderRadius: 8, backgroundColor: '#111113' },
  sectionHeading: { gap: 4 },
  mapSection: { padding: 12, gap: 12, borderWidth: 1, borderColor: '#242427', borderRadius: 8, backgroundColor: '#111113' },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayButton: { minWidth: 44, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: '#34343A', borderRadius: 6, backgroundColor: '#141416' },
  dayButtonSelected: { backgroundColor: '#2F80ED', borderColor: '#2F80ED' },
  dayText: { color: '#A7A7AE', fontSize: 14, fontWeight: '600' },
  dayTextSelected: { color: '#FFFFFF' },
  input: { color: '#F5F5F7', backgroundColor: '#141416', borderWidth: 1, borderColor: '#34343A', borderRadius: 8, padding: 12, minHeight: 46 },
  editorAction: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: '#34343A', borderRadius: 6, backgroundColor: '#141416' },
  editorActionPrimary: { borderColor: '#2F80ED', backgroundColor: '#2F80ED' },
  editorActionText: { color: '#D6D6DA', fontSize: 15, fontWeight: '600' },
  editorActionPrimaryText: { color: '#FFFFFF' },
  promptBackdrop: { ...StyleSheet.absoluteFill, zIndex: 10, elevation: 10, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  promptContent: { width: '100%', maxWidth: 360, borderRadius: 8, padding: 20, gap: 14 },
  promptButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#34343A', borderRadius: 6, backgroundColor: '#141416' },
});