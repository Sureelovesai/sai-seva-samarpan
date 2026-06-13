import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, StyleSheet, View } from "react-native";

import { Badge, Button, Card, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { MyCommunityActivity } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  PUBLISHED: Brand.emerald,
  DRAFT: Brand.amber,
  ARCHIVED: Brand.muted,
};

export default function ManageCommunityScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MyCommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<MyCommunityActivity[]>("/api/community-outreach/my-activities");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your activities.");
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

  const confirmDelete = (a: MyCommunityActivity) => {
    Alert.alert("Delete activity?", `"${a.title}" and its sign-ups will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/community-outreach/activities/${a.id}`, { method: "DELETE" });
            setItems((prev) => prev.filter((x) => x.id !== a.id));
          } catch (e) {
            Alert.alert("Delete failed", e instanceof ApiError ? e.message : "Please try again.");
          }
        },
      },
    ]);
  };

  if (loading) return <Loading label="Loading your activities…" />;

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
      <Button title="＋ Post a new activity" onPress={() => router.push("/community/post-activity")} />

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <Muted>You haven&apos;t posted any community activities yet.</Muted>
        </Card>
      ) : (
        items.map((a) => (
          <Card key={a.id}>
            <View style={styles.badgeRow}>
              <Badge text={a.status} color={STATUS_COLOR[a.status] ?? Brand.muted} />
              {!a.isActive ? <Badge text="Inactive" color={Brand.rose} /> : null}
              <Badge text={`${a._count.signups} sign-ups`} color={Brand.sky} />
            </View>
            <H2>{a.title}</H2>
            <Muted>{[a.city, formatDate(a.startDate)].filter(Boolean).join("  •  ")}</Muted>
            <View style={styles.actions}>
              <Button
                title="Edit"
                onPress={() => router.push({ pathname: "/community/edit-activity", params: { id: a.id } })}
                style={styles.actionBtn}
              />
              <Button
                title="Sign-ups"
                variant="secondary"
                onPress={() => router.push({ pathname: "/community/signups", params: { activityId: a.id } })}
                style={styles.actionBtn}
              />
              <Button title="Delete" variant="ghost" onPress={() => confirmDelete(a)} style={styles.actionBtn} />
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
