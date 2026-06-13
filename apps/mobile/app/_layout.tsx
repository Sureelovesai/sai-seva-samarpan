import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { AuthProvider } from "@/lib/auth";
import { Brand } from "@/constants/theme";

export const unstable_settings = {
  anchor: "(tabs)",
};

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Brand.blue,
    background: Brand.bg,
    card: "#ffffff",
    text: Brand.ink,
    border: Brand.line,
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider value={navTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="login"
                options={{ presentation: "modal", headerShown: true, title: "Sign in" }}
              />
              <Stack.Screen
                name="seva-details"
                options={{ headerShown: true, title: "Seva details" }}
              />
              <Stack.Screen
                name="log-hours"
                options={{ headerShown: true, title: "Log hours" }}
              />
              <Stack.Screen
                name="blog-post"
                options={{ headerShown: true, title: "Story" }}
              />
              <Stack.Screen
                name="blog-create"
                options={{ presentation: "modal", headerShown: true, title: "Create post" }}
              />
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen name="community" options={{ headerShown: false }} />
              <Stack.Screen name="events" options={{ headerShown: false }} />
              <Stack.Screen
                name="terms-and-policy"
                options={{ headerShown: true, title: "Terms & Media Consent" }}
              />
              <Stack.Screen
                name="certificate"
                options={{ headerShown: true, title: "Certificate" }}
              />
              <Stack.Screen
                name="forgot-password"
                options={{ headerShown: true, title: "Forgot password" }}
              />
              <Stack.Screen
                name="reset-password"
                options={{ headerShown: true, title: "Reset password" }}
              />
              <Stack.Screen
                name="seva-mahotsavam"
                options={{ headerShown: true, title: "Seva Mahotsavam" }}
              />
              <Stack.Screen
                name="external"
                options={{ headerShown: true, title: "External Link" }}
              />
            </Stack>
            <StatusBar style="dark" />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
