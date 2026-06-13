import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, H1, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { canAccessSevaAdmin, canManageEvents } from "@/lib/roles";

const ABOUT_LINKS = [
  { label: "Sri Sathya Sai Global Council", url: "https://www.srisathyasaiglobalcouncil.org/" },
  { label: "Sri Sathya Sai Global Council Foundation", url: "https://www.sssgcf.org/" },
] as const;

const RESOURCE_LINKS = [
  { label: "Divine Directives & Guidelines", url: "https://ssssoindia.org/divine-directives-guidelines/" },
  { label: "Sri Sathya Sai Sahithya", url: "https://www.ssssahitya.org/" },
  { label: "Sri Sathya Sai Media Centre", url: "https://www.sssmediacentre.org/" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  BLOG_ADMIN: "Blog Admin",
  VOLUNTEER: "Volunteer",
  SEVA_COORDINATOR: "Seva Coordinator",
  REGIONAL_SEVA_COORDINATOR: "Regional Coordinator",
  NATIONAL_SEVA_COORDINATOR: "National Coordinator",
  EVENT_ADMIN: "Event Admin",
};

export default function AccountScreen() {
  const router = useRouter();
  const { user, loading, signOut, refresh } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (loading) return <Loading />;

  if (!user) {
    return (
      <Screen>
        <H1>Account</H1>
        <Card>
          <Ionicons name="person-circle-outline" size={48} color={Brand.blue} />
          <H2>You&apos;re browsing as a guest</H2>
          <Muted>
            Sign in to join seva activities, track your sign-ups, and log your service hours.
          </Muted>
          <Button title="Sign in / Create account" onPress={() => router.push("/login")} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>Account</H1>
      <Card>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user.firstName?.[0] ?? user.email[0] ?? "?").toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <H2>{fullName(user.firstName, user.lastName, user.name) || user.email}</H2>
            <Muted>{user.email}</Muted>
          </View>
        </View>
        {user.location ? <Body>📍 {user.location}</Body> : null}
        <View style={styles.roles}>
          {(user.roles?.length ? user.roles : ["VOLUNTEER"]).map((r) => (
            <Badge key={r} text={ROLE_LABELS[r] ?? r} color={Brand.purple} />
          ))}
        </View>
      </Card>

      {canAccessSevaAdmin(user) ? (
        <Pressable onPress={() => router.push("/admin")}>
          <Card style={styles.adminCard}>
            <View style={styles.adminRow}>
              <Ionicons name="shield-checkmark" size={26} color={Brand.blue} />
              <View style={{ flex: 1 }}>
                <H2>Seva Admin Dashboard</H2>
                <Muted>Add & manage seva, view sign-ups{user.role === "ADMIN" ? ", roles" : ""}.</Muted>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Brand.muted} />
            </View>
          </Card>
        </Pressable>
      ) : (
        <Card>
          <Muted>
            Seva Admin Dashboard is for coordinators and admins only. If you test as a Seva Coordinator on
            the website, sign in here with the same account — an admin must assign that role first (Roles
            page on web or mobile, admin-only).
          </Muted>
        </Card>
      )}

      {canManageEvents(user) ? (
        <Pressable onPress={() => router.push("/events/admin")}>
          <Card style={styles.eventCard}>
            <View style={styles.adminRow}>
              <Ionicons name="calendar" size={26} color={Brand.sky} />
              <View style={{ flex: 1 }}>
                <H2>Event Admin Dashboard</H2>
                <Muted>Add & manage events, view RSVPs.</Muted>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Brand.muted} />
            </View>
          </Card>
        </Pressable>
      ) : null}

      {user.coordinatorCities?.length ? (
        <Card>
          <H2>Coordinator cities</H2>
          <Body>{user.coordinatorCities.join(", ")}</Body>
        </Card>
      ) : null}

      <Card>
        <H2>About Us</H2>
        {ABOUT_LINKS.map((link) => (
          <Pressable key={link.url} style={styles.linkRow} onPress={() => Linking.openURL(link.url)}>
            <Text style={styles.linkText}>{link.label}</Text>
            <Ionicons name="open-outline" size={18} color={Brand.blue} />
          </Pressable>
        ))}
      </Card>

      <Card>
        <H2>Resources</H2>
        {RESOURCE_LINKS.map((link) => (
          <Pressable key={link.url} style={styles.linkRow} onPress={() => Linking.openURL(link.url)}>
            <Text style={styles.linkText}>{link.label}</Text>
            <Ionicons name="open-outline" size={18} color={Brand.blue} />
          </Pressable>
        ))}
      </Card>

      <Card>
        <H2>Legal</H2>
        <Button
          title="Terms & Media Consent"
          variant="ghost"
          onPress={() => router.push("/terms-and-policy")}
        />
      </Card>

      <Button title="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "800" },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  adminCard: { borderColor: Brand.blue },
  eventCard: { borderColor: Brand.sky },
  adminRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  linkText: { flex: 1, fontSize: 15, color: Brand.blue, fontWeight: "600" },
});

