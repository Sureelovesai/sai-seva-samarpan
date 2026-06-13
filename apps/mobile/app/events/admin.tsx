import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, H2, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { canManageEvents } from "@/lib/roles";

export default function EventAdminScreen() {
  const router = useRouter();
  const { user } = useAuth();

  if (!canManageEvents(user)) {
    return (
      <Screen>
        <Card>
          <H2>Event admins only</H2>
          <Muted>
            This area is for Event Admins, Seva Coordinators, and Admins. Sign in with the right
            account to manage events.
          </Muted>
        </Card>
      </Screen>
    );
  }

  const tiles = [
    { title: "Add Event", icon: "add-circle" as const, route: "/events/add" as const },
    { title: "Manage Events", icon: "create" as const, route: "/events/manage" as const },
    { title: "View Sign-Ups", icon: "people" as const, route: "/events/signups" as const },
  ];

  return (
    <Screen>
      <Card>
        <H2>Event Admin</H2>
        <Muted>Create and manage center events, and review RSVPs.</Muted>
      </Card>
      <View style={styles.tileGrid}>
        {tiles.map((t) => (
          <Pressable key={t.title} style={styles.tile} onPress={() => router.push(t.route)}>
            <Ionicons name={t.icon} size={26} color={Brand.blue} />
            <Text style={styles.tileText}>{t.title}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: Brand.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  tileText: { fontSize: 14, fontWeight: "700", color: Brand.ink },
});
