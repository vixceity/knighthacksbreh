import { LOCKDOWN_APPS, useLockdownApps } from '@/hooks/use-lockdown-apps';

import React from "react";
import {
  View,
  ScrollView,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";

import { MaxContentWidth } from '@/constants/theme';


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
          style={({ pressed }) => [styles.appRow, pressed && styles.pressed]}
          onPress={() => toggleApp(app)}
        >
          <Text style={styles.appName}>{app}</Text>
          <Text style={styles.check}>
            {selected.includes(app) ? "✓" : "○"}
          </Text>
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
    backgroundColor: "#0B0B0C",
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
    color: "#F5F5F7",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#9B9BA2",
    marginTop: 8,
    marginBottom: 24,
  },
  appRow: {
    padding: 18,
    minHeight: 60,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#2A2A2D",
    marginBottom: 10,
    backgroundColor: "#171719",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  appName: {
    color: "#F5F5F7",
    fontSize: 17,
  },
  check: {
    color: "#5A9CFF",
    fontSize: 22,
  },
  pressed: { opacity: 0.65 },
  error: { color: '#FCA5A5', marginTop: 12 },
});
