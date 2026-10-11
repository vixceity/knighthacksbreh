import { LOCKDOWN_APPS, useLockdownApps } from '@/hooks/use-lockdown-apps';

import React from "react";
import {
  View,
  ScrollView,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";

import { SymbolView } from 'expo-symbols';
import { MaxContentWidth, Palette, Typography } from '@/constants/theme';


export default function LockdownDemo() {
  const { apps: selected, ready, error, toggleApp } = useLockdownApps();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Lockdown Options</Text>

      <Text style={styles.subtitle}>
        Choose which apps to lock down during class.
      </Text>

      {LOCKDOWN_APPS.map((app) => (
        <Pressable
          key={app}
          disabled={!ready}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected.includes(app), disabled: !ready }}
          style={({ pressed }) => [styles.appRow, selected.includes(app) && styles.appRowSelected, pressed && styles.pressed]}
          onPress={() => toggleApp(app)}
        >
          <Text style={styles.appName}>{app}</Text>
          <SymbolView
            name={{ ios: selected.includes(app) ? 'checkmark.square.fill' : 'square', android: selected.includes(app) ? 'check_box' : 'check_box_outline_blank', web: selected.includes(app) ? 'check_box' : 'check_box_outline_blank' }}
            size={22}
            tintColor={selected.includes(app) ? Palette.accent : Palette.muted}
          />
        </Pressable>
      ))}

      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Text style={styles.subtitle}>{ready ? 'Choices save automatically.' : 'Loading choices...'}</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    color: Palette.text,
    fontFamily: Typography.headingStrong,
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    color: Palette.muted,
    fontFamily: Typography.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  appRow: {
    padding: 16,
    minHeight: 60,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  appName: {
    color: Palette.text,
    fontFamily: Typography.medium,
    fontSize: 15,
    lineHeight: 24,
  },
  appRowSelected: { backgroundColor: Palette.surface },
  pressed: { opacity: 0.65 },
  error: { color: Palette.accent, fontFamily: Typography.body, fontSize: 14, lineHeight: 22, marginTop: 12 },
});
