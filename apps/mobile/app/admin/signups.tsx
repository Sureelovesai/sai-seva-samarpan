import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, Loading, Muted, Pill, Screen, Select } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AdminSignup, SevaActivity, SevaSignupStatus } from "@/lib/types";

const STATUS_FILTERS = ["All", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const STATUS_COLOR: Record<string, string> = {
  PENDING: Brand.amber,
  APPROVED: Brand.emerald,
  REJECTED: Brand.rose,
  CANCELLED: Brand.muted,
};

const ALL = "All activities";

export default function SignupsScreen() {
  const params = useLocalSearchParams<{ activityId?: string }>();
  const [activities, setActivities] = useState<SevaActivity[]>([]);
  const [activityId, setActivityId] = useState<string | null>(params.activityId ?? null);
  const [status, setStatus] = useState("All");
  const [signups, setSignups] = useState<AdminSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SevaActivity[]>("/api/admin/seva-activities")
      .then((a) => setActivities(Array.isArray(a) ? a : []))
      .catch(() => setActivities([]));
  }, []);

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    activities.forEach((a) => m.set(a.id, a.title));
    return m;
  }, [activities]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (activityId) qs.set("activityId", activityId);
      if (status !== "All") qs.set("status", status);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const data = await apiFetch<{ signups: AdminSignup[] }>(`/api/admin/seva-signups${suffix}`);
      setSignups(data.signups ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load sign-ups.");
    }
  }, [activityId, status]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const setSignupStatus = async (s: AdminSignup, next: SevaSignupStatus) => {
    setBusyId(s.id);
    try {
      await apiFetch(`/api/admin/seva-signups/${s.id}`, {
        method: "PATCH",
        json: { status: next },
      });
      setSignups((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: next } : x)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update status.");
    } finally {
      setBusyId(null);
    }
  };

  const activityOptions = useMemo(
    () => [ALL, ...activities.map((a) => a.title)],
    [activities]
  );

  if (loading) return <Loading label="Loading sign-ups…" />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Select
        label="Activity"
        value={activityId ? titleById.get(activityId) ?? ALL : ALL}
        options={activityOptions}
        searchable
        onSelect={(title) => {
          if (title === ALL) return setActivityId(null);
          const found = activities.find((a) => a.title === title);
          setActivityId(found?.id ?? null);
        }}
      />

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((s) => (
          <Pill key={s} label={s} active={status === s} onPress={() => setStatus(s)} />
        ))}
      </View>

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : null}

      <Muted>
        {signups.length} sign-up{signups.length === 1 ? "" : "s"}
      </Muted>

      {signups.map((s) => (
        <Card key={s.id}>
          <View style={styles.head}>
            <Text style={styles.name}>{s.volunteerName}</Text>
            <Badge text={s.status} color={STATUS_COLOR[s.status] ?? Brand.sky} />
          </View>
          {s.activity?.title ? <Muted>{s.activity.title}</Muted> : null}
          <Muted>{[s.email, s.phone].filter(Boolean).join("  •  ")}</Muted>
          <Muted>
            {`Adults ${s.adultsCount} · Kids ${s.kidsCount}  •  ${formatDate(s.createdAt)}`}
          </Muted>
          {s.comment ? <Text style={styles.comment}>“{s.comment}”</Text> : null}
          <View style={styles.actions}>
            {s.status !== "APPROVED" ? (
              <Button
                title="Approve"
                variant="secondary"
                loading={busyId === s.id}
                onPress={() => setSignupStatus(s, "APPROVED")}
                style={styles.actionBtn}
              />
            ) : null}
            {s.status !== "REJECTED" ? (
              <Button
                title="Reject"
                variant="ghost"
                loading={busyId === s.id}
                onPress={() => setSignupStatus(s, "REJECTED")}
                style={styles.actionBtn}
              />
            ) : null}
            {s.status !== "CANCELLED" ? (
              <Button
                title="Cancel"
                variant="ghost"
                loading={busyId === s.id}
                onPress={() => setSignupStatus(s, "CANCELLED")}
                style={styles.actionBtn}
              />
            ) : null}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "700", color: Brand.ink, flexShrink: 1 },
  comment: { fontStyle: "italic", color: Brand.inkSoft },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  actionBtn: { flexGrow: 1, flexBasis: "30%", paddingVertical: 10 },
});
