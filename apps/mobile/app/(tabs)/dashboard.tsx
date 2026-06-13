import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { RefreshControl, StyleSheet, View } from "react-native";

import { Badge, Body, Button, Card, H1, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { LoggedHoursResponse, UpcomingItem } from "@/lib/types";

export default function DashboardScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [hours, setHours] = useState<LoggedHoursResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [up, hrs] = await Promise.all([
        apiFetch<UpcomingItem[]>(
          `/api/dashboard/upcoming?email=${encodeURIComponent(user.email)}`
        ).catch(() => []),
        apiFetch<LoggedHoursResponse>("/api/log-hours?limit=5").catch(() => ({ entries: [] })),
      ]);
      setUpcoming(Array.isArray(up) ? up : []);
      setHours(hrs);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (authLoading) return <Loading />;

  if (!user) {
    return (
      <Screen>
        <H1>My Seva Dashboard</H1>
        <Card>
          <H2>Sign in to continue</H2>
          <Muted>Log in to see the activities you joined and your service hours.</Muted>
          <Button title="Sign in" onPress={() => router.push("/login")} />
        </Card>
      </Screen>
    );
  }

  if (loading) return <Loading label="Loading your dashboard…" />;

  const totalHours = (hours?.entries ?? []).reduce((s, e) => s + (e.hours || 0), 0);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <H1>Welcome, {user.firstName ?? "Volunteer"}</H1>

      <View style={styles.actions}>
        <Button title="Log hours" onPress={() => router.push("/log-hours")} style={styles.action} />
        <Button
          title="Find seva"
          variant="secondary"
          onPress={() => router.push("/find-seva")}
          style={styles.action}
        />
      </View>

      <Card>
        <H2>Upcoming seva</H2>
        {upcoming.length === 0 ? (
          <Muted>You haven&apos;t joined any upcoming activities yet.</Muted>
        ) : (
          upcoming.map((u) => (
            <View key={u.signupId} style={styles.upRow}>
              <View style={{ flex: 1 }}>
                <Body>{u.title}</Body>
                <Muted>{[u.city, formatDate(u.startDate)].filter(Boolean).join("  •  ")}</Muted>
              </View>
            </View>
          ))
        )}
      </Card>

      <Card>
        <View style={styles.sectionHead}>
          <H2>Recent hours</H2>
          <Badge text={`${totalHours} h logged`} color={Brand.emerald} />
        </View>
        {(hours?.entries ?? []).length === 0 ? (
          <Muted>No hours logged yet. Tap “Log hours” to add your seva time.</Muted>
        ) : (
          (hours?.entries ?? []).map((e) => (
            <View key={e.id} style={styles.hourRow}>
              <View style={styles.hourTop}>
                <View style={{ flex: 1 }}>
                  <Body>{e.activityCategory}</Body>
                  <Muted>
                    {[formatDate(e.date), e.location].filter(Boolean).join("  •  ")}
                  </Muted>
                </View>
                <Badge text={`${e.hours} h`} />
              </View>
              <Button
                title="Certificate"
                variant="ghost"
                style={styles.certBtn}
                onPress={() =>
                  router.push({
                    pathname: "/certificate",
                    params: {
                      name: e.volunteerName ?? "",
                      hours: String(e.hours ?? ""),
                      activity: e.activityCategory ?? "",
                      location: e.location ?? "",
                      date: (e.date ?? "").slice(0, 10),
                    },
                  })
                }
              />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 12 },
  action: { flex: 1 },
  upRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.line,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hourRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.line,
    paddingTop: 8,
    gap: 6,
  },
  certBtn: { paddingVertical: 8, alignSelf: "flex-start", paddingHorizontal: 14 },
  hourTop: { flexDirection: "row", alignItems: "center", gap: 10 },
});
