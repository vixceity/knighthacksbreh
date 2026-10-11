import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLockdownApps } from '@/hooks/use-lockdown-apps';

export default function BlockedPreview() {
  const { apps } = useLockdownApps();
  const [openedApp, setOpenedApp] = useState<string | null>(null);
  return <>
    <Stack.Screen options={{ title: 'Lockdown Preview', headerStyle: { backgroundColor: '#0B0B0C' }, headerTintColor: '#F5F5F7' }} />
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>PREVIEW</Text>
      {openedApp ? <>
        <Text style={styles.lockIcon}>{'\u{1F512}'}</Text>
        <Text accessibilityRole="header" style={styles.title}>App Restricted</Text>
        <Text style={styles.body}>{openedApp} is unavailable because you&apos;re late to class!</Text>
        <Pressable accessibilityRole="button" onPress={() => setOpenedApp(null)} style={({ pressed }) => [styles.button, pressed && { opacity: 0.65 }]}>
          <Text style={styles.buttonText}>Try another app</Text>
        </Pressable>
      </> : <>
        <Text style={styles.title}>Try opening an app</Text>
        {apps.map(app => <Pressable key={app} accessibilityRole="button" accessibilityLabel={`Open ${app}`}
          onPress={() => setOpenedApp(app)} style={({ pressed }) => [styles.app, pressed && { opacity: 0.65 }]}>
          <Text style={styles.appText}>{app}</Text>
        </Pressable>)}
        {!apps.length && <Text style={styles.body}>No apps selected in Lockdown Options.</Text>}
      </>}
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.button, pressed && { opacity: 0.65 }]}>
        <Text style={styles.buttonText}>Close preview</Text>
      </Pressable>
    </ScrollView>
  </>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0B0C' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 28, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  label: { color: '#9B9BA2', textAlign: 'center', fontSize: 13 },
  title: { color: '#F5F5F7', fontSize: 34, fontWeight: '700', textAlign: 'center' },
  body: { color: '#9B9BA2', fontSize: 17, textAlign: 'center', lineHeight: 25 },
  app: { backgroundColor: '#171719', padding: 18, borderRadius: 10, minHeight: 56 },
  appText: { color: '#F5F5F7', fontSize: 18 },
  lockIcon: { fontSize: 60, textAlign: 'center' },
  button: { backgroundColor: '#2F80ED', padding: 16, borderRadius: 8, minHeight: 48, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
