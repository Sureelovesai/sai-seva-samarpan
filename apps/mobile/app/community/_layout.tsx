import { Stack } from "expo-router";

import { Brand } from "@/constants/theme";

export default function CommunityLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Brand.bg },
        headerTintColor: Brand.ink,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Community Outreach" }} />
      <Stack.Screen name="find" options={{ title: "Find Community Seva" }} />
      <Stack.Screen name="details" options={{ title: "Activity" }} />
      <Stack.Screen name="partners" options={{ title: "Partner Organizations" }} />
      <Stack.Screen name="profile" options={{ title: "Partner Profile" }} />
      <Stack.Screen name="post-activity" options={{ title: "Post Activity" }} />
      <Stack.Screen name="manage" options={{ title: "Manage Activities" }} />
      <Stack.Screen name="edit-activity" options={{ title: "Edit Activity" }} />
      <Stack.Screen name="signups" options={{ title: "Sign-Ups" }} />
    </Stack>
  );
}
