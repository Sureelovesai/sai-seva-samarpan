import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, H1, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AdminSevaActivity } from "@/lib/types";

export default function ContributionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<AdminSevaActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<AdminSevaActivity>(`/api/admin/seva-activities/${id}`)
      .then(setActivity)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load contributions."));
  }, [id]);

  if (error) {
    return (
      <Screen>
        <Card>
          <Muted>{error}</Muted>
        </Card>
      </Screen>
    );
  }

  if (!activity) return <Loading label="Loading contributions…" />;

  const items = activity.contributionItems ?? [];

  return (
    <Screen>
      <H1>{activity.title}</H1>
      <Muted>Item contributions</Muted>

      {items.length === 0 ? (
        <Card>
          <Muted>This activity has no contribution items.</Muted>
        </Card>
      ) : (
        items.map((it) => {
          const filled = (it.claims ?? []).reduce((sum, c) => sum + c.quantity, 0);
          return (
            <Card key={it.id}>
              <View style={styles.head}>
                <H2>{it.name}</H2>
                <Badge
                  text={`${filled}/${it.maxQuantity}`}
                  color={filled >= it.maxQuantity ? Brand.emerald : Brand.amber}
                />
              </View>
              {it.category ? <Muted>{it.category}</Muted> : null}
              {(it.claims ?? []).length === 0 ? (
                <Muted>No contributions yet.</Muted>
              ) : (
                (it.claims ?? []).map((c) => (
                  <View key={c.id} style={styles.claimRow}>
                    <Text style={styles.claimName}>
                      {c.volunteerName} × {c.quantity}
                    </Text>
                    <Muted>
                      {[c.email, formatDate(c.createdAt)].filter(Boolean).join("  •  ")}
                    </Muted>
                  </View>
                ))
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  claimRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.line,
    paddingTop: 8,
    gap: 2,
  },
  claimName: { fontSize: 15, fontWeight: "600", color: Brand.ink },
});
