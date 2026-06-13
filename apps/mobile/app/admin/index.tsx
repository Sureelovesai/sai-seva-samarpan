import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { AdminAnalyticsSection } from "@/components/AdminAnalyticsSection";
import { Badge, Body, Card, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { canAccessBlog, canAccessSevaAdmin, canReviewCommunity, isAdmin } from "@/lib/roles";
import type { AdminDashboardStats } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  PENDING: Brand.amber,
  APPROVED: Brand.emerald,
  REJECTED: Brand.rose,
  CANCELLED: Brand.muted,
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<AdminDashboardStats>("/api/admin/dashboard-stats");
      setStats(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load dashboard.");
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

  if (!canAccessSevaAdmin(user)) {
    return (
      <Screen>
        <Card>
          <H2>Coordinators only</H2>
          <Muted>
            This area is for Seva Coordinators and Admins. Sign in with a coordinator account to
            manage seva activities.
          </Muted>
        </Card>
      </Screen>
    );
  }

  if (loading) return <Loading label="Loading dashboard…" />;

  const tiles = [
    { title: "Add Seva", icon: "add-circle" as const, route: "/admin/add-seva" as const },
    { title: "Manage Seva", icon: "create" as const, route: "/admin/manage-seva" as const },
    { title: "View Sign-Ups", icon: "people" as const, route: "/admin/signups" as const },
    ...(canAccessBlog(user)
      ? [{ title: "Blog Reports", icon: "document-text" as const, route: "/admin/blog-reports" as const }]
      : []),
    ...(canReviewCommunity(user)
      ? [{ title: "Community Partners", icon: "business" as const, route: "/admin/community-review" as const }]
      : []),
    ...(isAdmin(user)
      ? [{ title: "Roles", icon: "key" as const, route: "/admin/roles" as const }]
      : []),
  ];

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : null}

      {stats ? (
        <View style={styles.statGrid}>
          <StatCard label="Activities" value={stats.totalActivities} />
          <StatCard label="Active" value={stats.activeActivities} />
          <StatCard label="Volunteers" value={stats.totalVolunteers} />
          <StatCard label="Hours" value={stats.totalHours} />
        </View>
      ) : null}

      <View style={styles.tileGrid}>
        {tiles.map((t) => (
          <Pressable key={t.title} style={styles.tile} onPress={() => router.push(t.route)}>
            <Ionicons name={t.icon} size={26} color={Brand.blue} />
            <Text style={styles.tileText}>{t.title}</Text>
          </Pressable>
        ))}
      </View>

      <AdminAnalyticsSection />

      {stats?.recentSignups?.length ? (
        <View style={{ gap: 8 }}>
          <H2>Recent sign-ups</H2>
          {stats.recentSignups.map((s) => (
            <Card key={s.id}>
              <View style={styles.signupHead}>
                <Text style={styles.signupName}>{s.volunteerName}</Text>
                <Badge text={s.status} color={STATUS_COLOR[s.status] ?? Brand.sky} />
              </View>
              <Muted>{s.activityTitle}</Muted>
              <Muted>
                {[s.email, formatDate(s.createdAt)].filter(Boolean).join("  •  ")}
              </Muted>
            </Card>
          ))}
        </View>
      ) : null}

      {stats && Object.keys(stats.categoryCounts).length > 0 ? (
        <Card>
          <H2>Activities by category</H2>
          <View style={styles.tags}>
            {Object.entries(stats.categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <View key={name} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {name} ({count})
                  </Text>
                </View>
              ))}
          </View>
        </Card>
      ) : null}

      <Body>
        Showing data for your assigned {user?.coordinatorCities?.length ? "centers" : "scope"}.
      </Body>
    </Screen>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: Brand.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 14,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "800", color: Brand.ink },
  statLabel: { fontSize: 12, color: Brand.muted },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: Brand.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  tileText: { fontSize: 14, fontWeight: "700", color: Brand.ink },
  signupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  signupName: { fontSize: 15, fontWeight: "700", color: Brand.ink },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: { fontSize: 12, color: Brand.ink, fontWeight: "600" },
});
