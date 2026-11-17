import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../lib/auth";
import { ToastProvider } from "../lib/toast";
import { Loading } from "../components/ui";
import { colors } from "../lib/theme";

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inApp = ["(tabs)", "workout-new", "achievements", "leaderboard"].includes(segments[0] as string);
    if (!user && inApp) {
      router.replace("/login");
    } else if (user && (segments[0] === "login" || segments.length === 0)) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Loading label="Loading FitPulse…" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "fade",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workout-new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="achievements" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="leaderboard" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
