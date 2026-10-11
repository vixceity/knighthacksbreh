import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Palette, Typography } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const unstable_settings = { initialRouteName: '(tabs)' };

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Palette.accent,
    background: Palette.background,
    card: Palette.background,
    text: Palette.text,
    border: Palette.border,
    notification: Palette.accent,
  },
};

export default function TabLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [Typography.brand]: require('@/assets/fonts/Telma-Bold.ttf'),
    [Typography.heading]: require('@/assets/fonts/CrimsonPro-SemiBold.ttf'),
    [Typography.headingStrong]: require('@/assets/fonts/CrimsonPro-Bold.ttf'),
    [Typography.body]: require('@/assets/fonts/Sora-Regular.ttf'),
    [Typography.medium]: require('@/assets/fonts/Sora-Medium.ttf'),
    [Typography.semibold]: require('@/assets/fonts/Sora-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <AnimatedSplashOverlay />
      <StatusBar style="light" />
      <Stack screenOptions={{
        contentStyle: { backgroundColor: Palette.background },
        headerStyle: { backgroundColor: Palette.background },
        headerTintColor: Palette.text,
        headerTitleStyle: { fontFamily: Typography.heading, fontSize: 24 },
        headerShadowVisible: false,
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lockdown" options={{ title: 'Lockdown Options' }} />
      </Stack>
    </ThemeProvider>
  );
}
