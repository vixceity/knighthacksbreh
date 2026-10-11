import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, StyleSheet } from 'react-native';

import LocationMap from '@/components/location-map';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Radius, Spacing } from '@/constants/theme';

export function LocationCard({ onLocationChange }: { onLocationChange?: (location: Location.LocationObject | null) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { onLocationChange?.(error ? null : location); }, [location, error, onLocationChange]);

  useFocusEffect(useCallback(() => {
    let active = true;
    let inFlight = false;
    let permissionDenied = false;
    let permissionChecked = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function loadLocation() {
      if (!active || inFlight || permissionDenied || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
      inFlight = true;
      setLoading(true);
      setError(null);
      try {
        const permission = permissionChecked
          ? await Location.getForegroundPermissionsAsync()
          : await Location.requestForegroundPermissionsAsync();
        permissionChecked = true;
        if (!active) return;
        if (!permission.granted) {
          permissionDenied = true;
          setLocation(null);
          setError(Platform.OS === 'web'
            ? 'Location access is off. Allow location in your browser’s site settings, then try again.'
            : 'Location access is off. Allow location for this app in Settings, then try again.');
          return;
        }
        if (!(await Location.hasServicesEnabledAsync())) {
          if (active) setError('Turn on your device’s location services, then try again.');
          return;
        }
        if (!active) return;
        const result = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('timeout')), 20000);
          }),
        ]);
        if (active) setLocation(result);
      } catch {
        if (active) setError('Unable to find your location. Check location services and try again.');
      } finally {
        inFlight = false;
        clearTimeout(timer);
        if (active) setLoading(false);
      }
    }

    void loadLocation();
    const interval = setInterval(() => void loadLocation(), 10000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadLocation();
    });
    return () => {
      active = false;
      clearInterval(interval);
      subscription.remove();
      clearTimeout(timer);
    };
  }, [attempt]));

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="subtitle">Your location</ThemedText>
      <ThemedText type="small">Updates every 10 seconds while this screen is open.</ThemedText>
      {loading && <ActivityIndicator color={Palette.accent} accessibilityLabel="Finding your location" />}
      <ThemedText type="small" accessibilityLiveRegion="polite">
        {loading ? 'Finding your location…' : error ?? 'Current location'}
      </ThemedText>
      {location && (
        <>
          <LocationMap latitude={location.coords.latitude} longitude={location.coords.longitude} />
          <ThemedText selectable>
            Latitude: {location.coords.latitude.toFixed(5)}{'\n'}
            Longitude: {location.coords.longitude.toFixed(5)}
          </ThemedText>
          {location.coords.accuracy != null && (
            <ThemedText type="small">Accuracy: within {Math.round(location.coords.accuracy)} m</ThemedText>
          )}
          <ThemedText type="small">
            Last updated {new Date(location.timestamp).toLocaleTimeString()}
          </ThemedText>
        </>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={loading}
        accessibilityState={{ disabled: loading }}
        onPress={() => setAttempt((value) => value + 1)}
        style={({ pressed }) => [styles.button, (pressed || loading) && styles.dimmed]}>
        <ThemedText type="smallBold">{error ? 'Try again' : 'Refresh location'}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.four,
    backgroundColor: Palette.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.border,
    gap: Spacing.two,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.accentBorder,
    borderRadius: Radius.button,
    backgroundColor: Palette.surface,
  },
  dimmed: { opacity: 0.5 },
});
