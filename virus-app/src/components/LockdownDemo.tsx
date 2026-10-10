
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";

const APPS = ["Instagram", "TikTok", "YouTube", "Games"];

export default function LockdownDemo() {
  const [selected, setSelected] = useState<string[]>([
    "Instagram",
    "TikTok",
  ]);
  const [locked, setLocked] = useState(false);
  const [openedApp, setOpenedApp] = useState<string | null>(null);

  function toggleApp(app: string) {
    setSelected((prev) =>
      prev.includes(app)
        ? prev.filter((item) => item !== app)
        : [...prev, app]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Late Lockdown</Text>

      <Text style={styles.subtitle}>
        Choose apps to restrict when you're late.
      </Text>

      {APPS.map((app) => (
        <Pressable
          key={app}
          style={styles.appRow}
          onPress={() => toggleApp(app)}
        >
          <Text style={styles.appName}>{app}</Text>
          <Text style={styles.check}>
            {selected.includes(app) ? "✓" : "○"}
          </Text>
        </Pressable>
      ))}

      <Pressable
        style={styles.button}
        onPress={() => {
          setLocked(!locked);
          setOpenedApp(null);
        }}
      >
        <Text style={styles.buttonText}>
          {locked ? "End Lockdown" : "Simulate Being Late"}
        </Text>
      </Pressable>

      {locked && (
        <View style={styles.demo}>
          <Text style={styles.demoTitle}>
            Try opening an app:
          </Text>

          {selected.map((app) => (
            <Pressable
              key={app}
              style={styles.fakeApp}
              onPress={() => setOpenedApp(app)}
            >
              <Text style={styles.fakeAppText}>
                {app}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {openedApp && (
        <View style={styles.overlay}>
          <Text style={styles.lockIcon}>🔒</Text>

          <Text style={styles.blockTitle}>
            App Restricted
          </Text>

          <Text style={styles.blockDescription}>
            {openedApp} is unavailable because
            you're late to class!
          </Text>

          <Pressable
            style={styles.button}
            onPress={() => setOpenedApp(null)}
          >
            <Text style={styles.buttonText}>
              Back to Demo
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101827",
    padding: 24,
    paddingTop: 70,
  },
  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#9CA3AF",
    marginTop: 8,
    marginBottom: 24,
  },
  appRow: {
    padding: 18,
    marginBottom: 10,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  appName: {
    color: "white",
    fontSize: 17,
  },
  check: {
    color: "#60A5FA",
    fontSize: 22,
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  demo: {
    marginTop: 24,
  },
  demoTitle: {
    color: "white",
    fontSize: 18,
    marginBottom: 12,
  },
  fakeApp: {
    backgroundColor: "#374151",
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  fakeAppText: {
    color: "white",
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  lockIcon: {
    fontSize: 60,
  },
  blockTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 20,
  },
  blockDescription: {
    color: "#9CA3AF",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
  },
});
