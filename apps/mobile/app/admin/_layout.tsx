import { Stack } from "expo-router";

import { Brand } from "@/constants/theme";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Brand.bg },
        headerTintColor: Brand.ink,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Seva Admin" }} />
      <Stack.Screen name="add-seva" options={{ title: "Add Seva Activity" }} />
      <Stack.Screen name="manage-seva" options={{ title: "Manage Seva" }} />
      <Stack.Screen name="edit-seva" options={{ title: "Edit Activity" }} />
      <Stack.Screen name="signups" options={{ title: "Sign-Ups" }} />
      <Stack.Screen name="contributions" options={{ title: "Contributions" }} />
      <Stack.Screen name="roles" options={{ title: "Roles" }} />
      <Stack.Screen name="blog-reports" options={{ title: "Blog Reports" }} />
      <Stack.Screen name="blog-report-generate" options={{ title: "Generate Report" }} />
      <Stack.Screen name="blog-report" options={{ title: "Report" }} />
      <Stack.Screen name="community-review" options={{ title: "Community Partners" }} />
    </Stack>
  );
}
