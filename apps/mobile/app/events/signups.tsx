import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, StyleSheet, View } from "react-native";

import { Badge, Button, Card, H2, Loading, Muted, Screen, Select } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatEventStart } from "@/lib/format";
import { canManageEvents } from "@/lib/roles";
import type { EventSignupAdmin, PortalEventAdmin } from "@/lib/types";

const ALL_EVENT = "All events";
const ALL_RESP = "All responses";
const RESP_COLOR: Record<string, string> = {
  YES: Brand.emerald,
  MAYBE: Brand.amber,
  NO: Brand.rose,
};

export default function EventSignupsScreen() {
  const params = useLocalSearchParams<{ eventId?: string }>();
  const { user } = useAuth();
  const [events, setEvents] = useState<PortalEventAdmin[]>([]);
  const [eventId, setEventId] = useState<string | null>(params.eventId ?? null);
  const [response, setResponse] = useState(ALL_RESP);

  const [signups, setSignups] = useState<EventSignupAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PortalEventAdmin[]>("/api/admin/portal-events")
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setEvents([]));
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (eventId) qs.set("eventId", eventId);
      if (response !== ALL_RESP) qs.set("response", response);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const data = await apiFetch<EventSignupAdmin[]>(`/api/admin/event-signups${suffix}`);
      setSignups(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load sign-ups.");
    }
  }, [eventId, response]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await load();
        setLoading(false);
      })();
    }, [load])
  );

  const eventOptions = useMemo(() => [ALL_EVENT, ...events.map((e) => e.title)], [events]);
  const selectedTitle = useMemo(
    () => events.find((e) => e.id === eventId)?.title ?? ALL_EVENT,
    [events, eventId]
  );

  const onSelectEvent = (title: string) => {
    if (title === ALL_EVENT) return setEventId(null);
    setEventId(events.find((e) => e.title === title)?.id ?? null);
  };

  const totals = useMemo(() => {
    let adults = 0;
    let kids = 0;
    for (const s of signups) {
      if (s.response === "NO") continue;
      adults += s.accompanyingAdults;
      kids += s.accompanyingKids;
    }
    return { adults, kids, count: signups.length };
  }, [signups]);

  const remove = (s: EventSignupAdmin) => {
    Alert.alert("Remove RSVP?", `Remove ${s.participantName}'s response?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/admin/event-signups/${s.id}`, { method: "DELETE" });
            setSignups((prev) => prev.filter((x) => x.id !== s.id));
          } catch (e) {
            Alert.alert("Remove failed", e instanceof ApiError ? e.message : "Please try again.");
          }
        },
      },
    ]);
  };

  if (!canManageEvents(user)) {
    return (
      <Screen>
        <Card>
          <Muted>You don&apos;t have permission to view event sign-ups.</Muted>
        </Card>
      </Screen>
    );
  }

  if (loading) return <Loading label="Loading sign-ups…" />;

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
      <Select label="Event" value={selectedTitle} options={eventOptions} onSelect={onSelectEvent} searchable />
      <Select label="Response" value={response} options={[ALL_RESP, "YES", "MAYBE", "NO"]} onSelect={setResponse} />

      <Card>
        <H2>
          {totals.count} RSVP{totals.count === 1 ? "" : "s"}
        </H2>
        <Muted>{`${totals.adults} guest adult(s), ${totals.kids} kid(s) (excludes "No" responses)`}</Muted>
      </Card>

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : signups.length === 0 ? (
        <Card>
          <Muted>No sign-ups match these filters.</Muted>
        </Card>
      ) : (
        signups.map((s) => (
          <Card key={s.id}>
            <View style={styles.badgeRow}>
              <Badge text={s.response} color={RESP_COLOR[s.response] ?? Brand.muted} />
              <Badge text={s.event.title} color={Brand.purple} />
            </View>
            <H2>{s.participantName}</H2>
            <Muted>{s.email}</Muted>
            <Muted>
              {`${s.accompanyingAdults} adult(s), ${s.accompanyingKids} kid(s)  •  ${formatEventStart(s.event.startsAt)}`}
            </Muted>
            {s.comment ? <Muted>“{s.comment}”</Muted> : null}
            <Button title="Remove" variant="ghost" onPress={() => remove(s)} />
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
