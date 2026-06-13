import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, StyleSheet, View } from "react-native";

import { Badge, Button, Card, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatEventStart } from "@/lib/format";
import { canManageEvents } from "@/lib/roles";
import type { PortalEventAdmin } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  PUBLISHED: Brand.emerald,
  DRAFT: Brand.amber,
  ARCHIVED: Brand.muted,
};

export default function ManageEventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<PortalEventAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<PortalEventAdmin[]>("/api/admin/portal-events");
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load events.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await load();
        setLoading(false);
      })();
    }, [load])
  );

  const confirmDelete = (e: PortalEventAdmin) => {
    Alert.alert("Delete event?", `"${e.title}" and its ${e._count.signups} RSVP(s) will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/admin/portal-events/${e.id}`, { method: "DELETE" });
            setEvents((prev) => prev.filter((x) => x.id !== e.id));
          } catch (err) {
            Alert.alert("Delete failed", err instanceof ApiError ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  if (!canManageEvents(user)) {
    return (
      <Screen>
        <Card>
          <Muted>You don&apos;t have permission to manage events.</Muted>
        </Card>
      </Screen>
    );
  }

  if (loading) return <Loading label="Loading events…" />;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <Button title="＋ Add a new event" onPress={() => router.push("/events/add")} />

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <Muted>No events yet.</Muted>
        </Card>
      ) : (
        events.map((e) => (
          <Card key={e.id}>
            <View style={styles.badgeRow}>
              <Badge text={e.status} color={STATUS_COLOR[e.status] ?? Brand.muted} />
              <Badge text={e.signupsEnabled ? "RSVP open" : "RSVP closed"} color={e.signupsEnabled ? Brand.sky : Brand.muted} />
              <Badge text={`${e._count.signups} RSVPs`} color={Brand.purple} />
            </View>
            <H2>{e.title}</H2>
            <Muted>{formatEventStart(e.startsAt)}</Muted>
            <Muted>{e.venue}</Muted>
            <View style={styles.actions}>
              <Button
                title="Edit"
                onPress={() => router.push({ pathname: "/events/edit", params: { id: e.id } })}
                style={styles.actionBtn}
              />
              <Button
                title="Clone"
                variant="secondary"
                onPress={() => router.push({ pathname: "/events/edit", params: { id: e.id, mode: "clone" } })}
                style={styles.actionBtn}
              />
              <Button
                title="Sign-ups"
                variant="ghost"
                onPress={() => router.push({ pathname: "/events/signups", params: { eventId: e.id } })}
                style={styles.actionBtn}
              />
              <Button title="Delete" variant="ghost" onPress={() => confirmDelete(e)} style={styles.actionBtn} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { flexGrow: 1, paddingVertical: 10, paddingHorizontal: 12 },
});
