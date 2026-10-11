import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
export const LOCKDOWN_APPS = ['Instagram', 'TikTok', 'YouTube', 'Games'];
const KEY = 'lockdown-apps-v1';
let state = { apps: ['Instagram', 'TikTok'], ready: false, error: '' };
let loading: Promise<void> | undefined;
let writes = Promise.resolve();
const listeners = new Set<() => void>();
function emit() { listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
const snapshot = () => state;
async function load() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const apps: unknown = raw ? JSON.parse(raw) : state.apps;
    if (!Array.isArray(apps) || !apps.every(app => typeof app === 'string' && LOCKDOWN_APPS.includes(app))) throw Error('Invalid settings');
    state = { apps: [...new Set(apps as string[])], ready: true, error: '' };
  } catch { state = { ...state, ready: true, error: 'Could not load your choices. Select apps to save them again.' }; }
  emit();
}
export function useLockdownApps() {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => { loading ??= load(); }, []);
  function toggleApp(app: string) {
    if (!state.ready || !LOCKDOWN_APPS.includes(app)) return;
    const apps = state.apps.includes(app) ? state.apps.filter(item => item !== app) : [...state.apps, app];
    state = { apps, ready: true, error: '' };
    emit();
    writes = writes.then(async () => {
      try { await AsyncStorage.setItem(KEY, JSON.stringify(apps)); state = { ...state, error: '' }; }
      catch { state = { ...state, error: 'Could not save your choices. Change a selection to retry.' }; }
      emit();
    });
  }
  return { ...current, toggleApp };
}
