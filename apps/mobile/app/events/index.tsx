import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, StyleSheet, View } from "react-native";

import { Badge, Body, Card, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { formatEventStart } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";
import { canManageEvents } from "@/lib/roles";
import { useAuth } from "@/lib/auth";
import type { PortalEventListItem } from "@/lib/types";

export default function EventsListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<PortalEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<PortalEventListItem[]>("/api/portal-events", { noAuth: true });
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

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: PortalEventListItem[] = [];
    const pa: PortalEventListItem[] = [];
    for (const e of events) {
      if (new Date(e.startsAt).getTime() >= now) up.push(e);
      else pa.push(e);
    }
    return { upcoming: up, past: pa };
  }, [events]);

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
      {canManageEvents(user) ? (
        <Pressable onPress={() => router.push("/events/admin")}>
          <Card style={styles.adminCard}>
            <Body>You can manage events.</Body>
            <Muted>Open the Event Admin dashboard to add or edit events.</Muted>
          </Card>
        </Pressable>
      ) : null}

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : null}

      <H2>Upcoming</H2>
      {upcoming.length === 0 ? (
        <Card>
          <Muted>No upcoming events right now.</Muted>
        </Card>
      ) : (
        upcoming.map((e) => <EventCard key={e.id} event={e} onPress={() => router.push({ pathname: "/events/details", params: { id: e.id } })} />)
      )}

      {past.length > 0 ? (
        <>
          <H2>Past</H2>
          {past.map((e) => (
            <EventCard key={e.id} event={e} onPress={() => router.push({ pathname: "/events/details", params: { id: e.id } })} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function EventCard({ event, onPress }: { event: PortalEventListItem; onPress: () => void }) {
  const hero = resolveMediaUrl(event.heroImageUrl);
  return (
    <Pressable onPress={onPress}>
      <Card>
        {hero ? <Image source={{ uri: hero }} style={styles.hero} /> : null}
        <View style={styles.badgeRow}>
          <Badge
            text={event.signupsEnabled ? "RSVP open" : "RSVP closed"}
            color={event.signupsEnabled ? Brand.emerald : Brand.muted}
          />
        </View>
        <H2>{event.title}</H2>
        <Muted>{formatEventStart(event.startsAt)}</Muted>
        <Muted>{event.venue}</Muted>
        {event.description ? <Body numberOfLines={2}>{event.description}</Body> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  adminCard: { borderColor: Brand.purple + "55" },
  hero: { width: "100%", height: 160, borderRadius: 12, marginBottom: 4 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
