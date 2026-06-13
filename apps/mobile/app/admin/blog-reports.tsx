import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { canAccessBlog } from "@/lib/roles";
import type { BlogReportListRow } from "@/lib/types";

export default function BlogReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [rows, setRows] = useState<BlogReportListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<BlogReportListRow[]>("/api/blog-reports");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load reports.");
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

  if (!canAccessBlog(user)) {
    return (
      <Screen>
        <Card>
          <Muted>Blog analytics reports are available to admins, blog admins, and coordinators.</Muted>
        </Card>
      </Screen>
    );
  }

  if (loading) return <Loading label="Loading reports…" />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Button title="＋ Generate a report" onPress={() => router.push("/admin/blog-report-generate")} />

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <Muted>No reports yet. Generate one to summarize seva stories over a date range.</Muted>
        </Card>
      ) : (
        rows.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => router.push({ pathname: "/admin/blog-report", params: { id: r.id } })}
          >
            <Card>
              <H2>{r.reportTitle || "Untitled report"}</H2>
              <View style={styles.badgeRow}>
                <Badge text={`${r.sourcePostCount} stories`} />
                <Badge text={`~${r.targetWordCount} words`} color={Brand.purple} />
                {r.sevaCategoryFilter ? <Badge text={r.sevaCategoryFilter} color={Brand.emerald} /> : null}
              </View>
              <Muted>
                {[
                  formatDate(r.createdAt),
                  r.centerFilter || r.regionFilter || "All centers",
                ]
                  .filter(Boolean)
                  .join("  •  ")}
              </Muted>
              <Text style={styles.open}>Open report →</Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  open: { color: Brand.blue, fontWeight: "700", marginTop: 2 },
});
