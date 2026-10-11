import { useLockdownApps } from '@/hooks/use-lockdown-apps';
import { useState } from 'react';
import type { LocationObject } from 'expo-location';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClassSchedule } from '@/components/class-schedule';
import { LocationCard } from '@/components/location-card';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';

export default function HomeScreen() {
  const { apps } = useLockdownApps();
  const [position, setPosition] = useState<LocationObject | null>(null);
  const [absent, setAbsent] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
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
            <SymbolView name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} size={27} tintColor="#A7A7AE" />
          </Pressable>
        </View>
        {absent && <View style={styles.alert}><Text accessibilityRole="alert" style={styles.alertText}>Locking down{'\n'}{apps.length ? apps.join(', ') : 'No apps selected'}{'\n'}Pestering you with notifications</Text>
          <Link href="/blocked-preview" asChild>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}>
              <Text style={styles.alertText}>See what it looks like</Text>
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
  safeArea: { flex: 1, backgroundColor: '#0B0B0C' },
  screen: { flexGrow: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: Math.max(BottomTabInset, 80) + 28 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1 },
  appName: { color: '#F5F5F7', fontSize: 38, lineHeight: 44, fontWeight: '700' },
  tagline: { marginTop: 4, color: '#9B9BA2', fontSize: 18, lineHeight: 24 },
  settingsButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  hidden: { display: 'none' },
  settingsTitle: { color: '#F5F5F7', fontSize: 22, fontWeight: '600', marginVertical: 20 },
  demoButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  demoText: { color: '#5A9CFF', fontSize: 16 },
  alert: { backgroundColor: '#B91C1C', padding: 16, borderRadius: 8, marginTop: 20 },
  alertText: { color: '#FFFFFF', fontWeight: '600' },
  previewButton: { minHeight: 44, marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: '#7F1D1D', alignItems: 'center' },
});
