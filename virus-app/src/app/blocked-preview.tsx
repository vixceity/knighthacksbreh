import { Stack, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLockdownApps } from '@/hooks/use-lockdown-apps';
import { Palette, Radius, Typography } from '@/constants/theme';

export default function BlockedPreview() {
  const { apps } = useLockdownApps();
  const openedApp = apps[0] || 'This app';
  return <>
    <Stack.Screen options={{ title: 'Lockdown Preview', headerStyle: { backgroundColor: Palette.background }, headerTintColor: Palette.text }} />
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>PREVIEW</Text>
      <Text style={styles.lockIcon}>{'\u{1F512}'}</Text>
      <Text accessibilityRole="header" style={styles.title}>App Restricted</Text>
      <Text style={styles.body}>{openedApp} is unavailable because you&apos;re late to class!</Text>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.button, pressed && { opacity: 0.65 }]}>
        <Text style={styles.buttonText}>Close preview</Text>
      </Pressable>
    </ScrollView>
  </>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  label: { color: Palette.muted, fontFamily: Typography.medium, textAlign: 'center', fontSize: 12, lineHeight: 20 },
  title: { color: Palette.text, fontFamily: Typography.headingStrong, fontSize: 30, lineHeight: 36, textAlign: 'center' },
  body: { color: Palette.muted, fontFamily: Typography.body, fontSize: 15, textAlign: 'center', lineHeight: 24 },
  lockIcon: { fontSize: 60, textAlign: 'center' },
  button: { backgroundColor: Palette.accent, padding: 16, borderRadius: Radius.button, minHeight: 48, alignItems: 'center', marginTop: 16 },
  buttonText: { color: Palette.background, fontFamily: Typography.semibold, fontSize: 16, lineHeight: 24 },
});
