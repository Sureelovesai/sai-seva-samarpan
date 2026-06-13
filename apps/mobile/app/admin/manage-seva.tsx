import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, H2, Loading, Muted, Pill, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { SevaActivity } from "@/lib/types";

const LEVELS = ["All", "CENTER", "REGIONAL", "NATIONAL"];
const STATES = ["All", "Active", "Inactive"];

const STATUS_COLOR: Record<string, string> = {
  PUBLISHED: Brand.emerald,
  DRAFT: Brand.amber,
  ARCHIVED: Brand.muted,
};

export default function ManageSevaScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SevaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState("All");
  const [state, setState] = useState("All");

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<SevaActivity[]>("/api/admin/seva-activities");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load activities.");
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (level !== "All" && a.scope !== level) return false;
      if (state === "Active" && !a.isActive) return false;
      if (state === "Inactive" && a.isActive) return false;
      return true;
    });
  }, [items, level, state]);

  const confirmDelete = (a: SevaActivity) => {
    Alert.alert(
      "Delete activity?",
      `"${a.title}" and its sign-ups will be removed. Volunteers will be emailed. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/admin/seva-activities/${a.id}`, { method: "DELETE" });
              setItems((prev) => prev.filter((x) => x.id !== a.id));
            } catch (e) {
              Alert.alert("Delete failed", e instanceof ApiError ? e.message : "Try again.");
            }
          },
        },
      ]
    );
  };

  if (loading) return <Loading label="Loading activities…" />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Button title="＋ Add new activity" onPress={() => router.push("/admin/add-seva")} />

      <View style={styles.filterRow}>
        {LEVELS.map((l) => (
          <Pill key={l} label={l === "All" ? "All levels" : l} active={level === l} onPress={() => setLevel(l)} />
        ))}
      </View>
      <View style={styles.filterRow}>
        {STATES.map((s) => (
          <Pill key={s} label={s} active={state === s} onPress={() => setState(s)} />
        ))}
      </View>

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <Muted>No activities match these filters.</Muted>
        </Card>
      ) : (
        filtered.map((a) => (
          <Card key={a.id}>
            <View style={styles.badgeRow}>
              <Badge text={a.scope} />
              <Badge text={a.status} color={STATUS_COLOR[a.status] ?? Brand.sky} />
              {!a.isActive ? <Badge text="Inactive" color={Brand.muted} /> : null}
              {a.isFeatured ? <Badge text="Featured" color={Brand.purple} /> : null}
            </View>
            <H2>{a.title}</H2>
            <Muted>
              {[a.city, formatDate(a.startDate)].filter(Boolean).join("  •  ")}
              {a.capacity != null ? `  •  Cap ${a.capacity}` : ""}
            </Muted>
            <View style={styles.actions}>
              <Pressable
                style={styles.action}
                onPress={() => router.push({ pathname: "/admin/edit-seva", params: { id: a.id } })}
              >
                <Text style={styles.actionText}>Edit</Text>
              </Pressable>
              <Pressable
                style={styles.action}
                onPress={() =>
                  router.push({ pathname: "/admin/signups", params: { activityId: a.id } })
                }
              >
                <Text style={styles.actionText}>Sign-ups</Text>
              </Pressable>
              <Pressable
                style={styles.action}
                onPress={() =>
                  router.push({ pathname: "/admin/contributions", params: { id: a.id } })
                }
              >
                <Text style={styles.actionText}>Items</Text>
              </Pressable>
              <Pressable style={[styles.action, styles.deleteAction]} onPress={() => confirmDelete(a)}>
                <Text style={[styles.actionText, { color: "#fff" }]}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  action: {
    borderWidth: 1,
    borderColor: Brand.blue,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionText: { color: Brand.blue, fontWeight: "700", fontSize: 13 },
  deleteAction: { backgroundColor: Brand.rose, borderColor: Brand.rose },
});
