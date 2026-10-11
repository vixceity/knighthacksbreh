import { useLockdownApps } from '@/hooks/use-lockdown-apps';
import { useState } from 'react';
import type { LocationObject } from 'expo-location';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClassSchedule } from '@/components/class-schedule';
import { LocationCard } from '@/components/location-card';
import { BottomTabInset, MaxContentWidth, Palette, Radius, Typography } from '@/constants/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { apps } = useLockdownApps();
  const [position, setPosition] = useState<LocationObject | null>(null);
  const [absent, setAbsent] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.screen, { paddingBottom: Math.max(BottomTabInset, 80) + insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.appName}>Dandruff</Text>
            <Text style={styles.tagline}>don&apos;t flake on your classes</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={settingsOpen ? 'Close settings' : 'Open settings'}
            accessibilityState={{ expanded: settingsOpen }}
            onPress={() => setSettingsOpen(value => !value)}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
            <SymbolView name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} size={24} tintColor={Palette.muted} />
          </Pressable>
        </View>
        {absent && <View style={styles.alert}>
          <Text style={styles.alertKicker}>CLASS IN SESSION</Text>
          <Text accessibilityRole="alert" style={styles.alertTitle}>YOU&apos;RE LATE. GET TO CLASS NOW.</Text>
          <Text style={styles.alertText}>Attendance check has you outside your class location.</Text>
          <Text style={styles.alertDetails}>Lockdown active: {apps.length ? apps.join(', ') : 'No apps selected'}</Text>
          <Link href="/blocked-preview" asChild>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}>
              <Text style={styles.previewText}>See what it looks like</Text>
            </Pressable>
          </Link>
        </View>}
        <View style={!settingsOpen && styles.hidden}>
          <Text style={styles.settingsTitle}>Settings</Text>
          <LocationCard onLocationChange={setPosition} />
          <Link href="/lockdown" asChild>
            <Pressable accessibilityRole="button" style={styles.demoButton}>
              <Text style={styles.demoText}>Lockdown Options</Text>
            </Pressable>
          </Link>
        </View>
        <ClassSchedule position={position} onAbsent={setAbsent} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.background },
  screen: { flexGrow: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  appName: { color: Palette.text, fontFamily: Typography.brand, fontSize: 38, lineHeight: 52 },
  tagline: { marginTop: 4, color: Palette.muted, fontFamily: Typography.body, fontSize: 14, lineHeight: 24 },
  settingsButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  hidden: { display: 'none' },
  settingsTitle: { color: Palette.text, fontFamily: Typography.heading, fontSize: 26, lineHeight: 32, marginVertical: 24 },
  demoButton: { minHeight: 48, marginTop: 8, justifyContent: 'center', alignItems: 'center' },
  demoText: { color: Palette.accent, fontFamily: Typography.medium, fontSize: 14, lineHeight: 22 },
  alert: { backgroundColor: Palette.surface, borderColor: Palette.accentBorder, borderWidth: 1, padding: 16, borderRadius: Radius.card, marginTop: 24, gap: 8 },
  alertKicker: { color: Palette.accent, fontFamily: Typography.semibold, fontSize: 12, lineHeight: 20 },
  alertTitle: { color: Palette.text, fontFamily: Typography.headingStrong, fontSize: 24, lineHeight: 30 },
  alertText: { color: Palette.text, fontFamily: Typography.body, fontSize: 14, lineHeight: 22 },
  alertDetails: { color: Palette.muted, fontFamily: Typography.body, fontSize: 13, lineHeight: 21 },
  previewButton: { minHeight: 48, marginTop: 8, padding: 12, borderRadius: Radius.button, borderWidth: 1, borderColor: Palette.accentBorder, alignItems: 'center' },
  previewText: { color: Palette.accent, fontFamily: Typography.semibold, fontSize: 14, lineHeight: 22 },
});
