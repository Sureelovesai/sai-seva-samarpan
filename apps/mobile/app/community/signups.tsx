import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, StyleSheet, View } from "react-native";

import { Badge, Button, Card, H2, Loading, Muted, Screen, Select } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { CommunitySignup, MyCommunityActivity } from "@/lib/types";

type ItemContribution = {
  id: string;
  volunteerName: string;
  email: string;
  phone: string | null;
  quantity: number;
  itemName: string;
  neededLabel: string | null;
  createdAt: string;
};

const ALL_ACT = "All activities";
const ALL_STATUS = "All statuses";
const STATUS_COLOR: Record<string, string> = {
  APPROVED: Brand.emerald,
  PENDING: Brand.amber,
  REJECTED: Brand.rose,
  CANCELLED: Brand.muted,
};

export default function CommunitySignupsScreen() {
  const params = useLocalSearchParams<{ activityId?: string }>();
  const [activities, setActivities] = useState<MyCommunityActivity[]>([]);
  const [activityId, setActivityId] = useState<string | null>(params.activityId ?? null);
  const [status, setStatus] = useState(ALL_STATUS);

  const [signups, setSignups] = useState<CommunitySignup[]>([]);
  const [itemContributions, setItemContributions] = useState<ItemContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<MyCommunityActivity[]>("/api/community-outreach/my-activities")
      .then((d) => setActivities(Array.isArray(d) ? d : []))
      .catch(() => setActivities([]));
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (activityId) qs.set("activityId", activityId);
      if (status !== ALL_STATUS) qs.set("status", status);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const data = await apiFetch<{ signups: CommunitySignup[]; itemContributions: ItemContribution[] }>(
        `/api/community-outreach/signups${suffix}`
      );
      setSignups(data.signups ?? []);
      setItemContributions(data.itemContributions ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load sign-ups.");
    }
  }, [activityId, status]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await load();
        setLoading(false);
      })();
    }, [load])
  );

  const activityOptions = useMemo(() => [ALL_ACT, ...activities.map((a) => a.title)], [activities]);
  const selectedTitle = useMemo(
    () => activities.find((a) => a.id === activityId)?.title ?? ALL_ACT,
    [activities, activityId]
  );

  const onSelectActivity = (title: string) => {
    if (title === ALL_ACT) return setActivityId(null);
    const found = activities.find((a) => a.title === title);
    setActivityId(found?.id ?? null);
  };

  const removeSignup = (s: CommunitySignup) => {
    Alert.alert("Remove sign-up?", `Remove ${s.volunteerName} from this activity?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/community-outreach/signups/${s.id}`, { method: "DELETE" });
            setSignups((prev) => prev.filter((x) => x.id !== s.id));
          } catch (e) {
            Alert.alert("Remove failed", e instanceof ApiError ? e.message : "Please try again.");
          }
        },
      },
    ]);
  };

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
      <Select label="Activity" value={selectedTitle} options={activityOptions} onSelect={onSelectActivity} searchable />
      <Select
        label="Status"
        value={status}
        options={[ALL_STATUS, "PENDING", "APPROVED", "REJECTED", "CANCELLED"]}
        onSelect={setStatus}
      />

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : null}

      <H2>Volunteers ({signups.length})</H2>
      {signups.length === 0 ? (
        <Card>
          <Muted>No sign-ups match these filters.</Muted>
        </Card>
      ) : (
        signups.map((s) => (
          <Card key={s.id}>
            <View style={styles.badgeRow}>
              <Badge text={s.status} color={STATUS_COLOR[s.status] ?? Brand.muted} />
              {s.activity ? <Badge text={s.activity.title} color={Brand.purple} /> : null}
            </View>
            <H2>{s.volunteerName}</H2>
            <Muted>{s.email}</Muted>
            {s.phone ? <Muted>{s.phone}</Muted> : null}
            <Muted>
              {`${s.adultsCount} adult${s.adultsCount === 1 ? "" : "s"}`}
              {s.kidsCount > 0 ? `, ${s.kidsCount} kid${s.kidsCount === 1 ? "" : "s"}` : ""}
              {`  •  ${formatDate(s.createdAt)}`}
            </Muted>
            <Button title="Remove" variant="ghost" onPress={() => removeSignup(s)} />
          </Card>
        ))
      )}

      {itemContributions.length > 0 ? (
        <>
          <H2>Item contributions ({itemContributions.length})</H2>
          {itemContributions.map((c) => (
            <Card key={c.id}>
              <H2>{c.itemName}</H2>
              <Muted>
                {`Qty ${c.quantity}`}
                {c.neededLabel ? `  •  ${c.neededLabel}` : ""}
              </Muted>
              <Muted>{`${c.volunteerName} — ${c.email}${c.phone ? ` — ${c.phone}` : ""}`}</Muted>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
