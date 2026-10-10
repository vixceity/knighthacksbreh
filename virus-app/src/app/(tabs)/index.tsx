import * as Device from 'expo-device';
import { useState } from 'react';
import type { LocationObject } from 'expo-location';
import { ClassSchedule } from '@/components/class-schedule';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { HintRow } from '@/components/hint-row';
import { LocationCard } from '@/components/location-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const [position, setPosition] = useState<LocationObject | null>(null);
  const [absent, setAbsent] = useState(false);
  return (
    <ThemedView style={[styles.container, absent && { backgroundColor: '#B91C1C' }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
        {absent && <Text accessibilityRole="alert" style={styles.alert}>You are not at your scheduled class!</Text>}
        <ThemedView style={[styles.heroSection, absent && { backgroundColor: 'transparent' }]}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            My day
          </ThemedText>
        </ThemedView>

        <LocationCard onLocationChange={setPosition} />
        <ClassSchedule position={position} onAbsent={setAbsent} />

        <Link href="/lockdown" asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.demoButton, pressed && styles.demoButtonPressed]}>
            <Text style={styles.demoButtonText}>Lockdown demo</Text>
          </Pressable>
        </Link>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  alert: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', paddingTop: 20, textAlign: 'center' },
  demoButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  demoButtonPressed: {
    opacity: 0.75,
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  code: {
    textTransform: 'uppercase',
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
