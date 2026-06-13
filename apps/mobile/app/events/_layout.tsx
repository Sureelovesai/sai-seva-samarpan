import { Stack } from "expo-router";

import { Brand } from "@/constants/theme";

export default function EventsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Brand.bg },
        headerTintColor: Brand.ink,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Events" }} />
      <Stack.Screen name="details" options={{ title: "Event" }} />
      <Stack.Screen name="admin" options={{ title: "Event Admin" }} />
      <Stack.Screen name="add" options={{ title: "Add Event" }} />
      <Stack.Screen name="manage" options={{ title: "Manage Events" }} />
      <Stack.Screen name="edit" options={{ title: "Edit Event" }} />
      <Stack.Screen name="signups" options={{ title: "Event Sign-Ups" }} />
    </Stack>
  );
}
