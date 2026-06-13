import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { HomeHeroBanner } from "@/components/HomeHeroBanner";
import { SevaActivityCalendar } from "@/components/SevaActivityCalendar";
import { Button, Card, H2, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { rememberActivities } from "@/lib/activityCache";
import { useAuth } from "@/lib/auth";
import { categoryStyle } from "@/lib/categoryColors";
import { FEATURED_DEFAULT_IMAGE } from "@/lib/homeHero";
import { resolveMediaUrl } from "@/lib/media";
import { canAccessSevaAdmin } from "@/lib/roles";
import type { SevaActivity } from "@/lib/types";

type ImpactStats = {
  activities?: number;
  volunteers?: number;
  hours?: number;
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [featured, setFeatured] = useState<SevaActivity[]>([]);
  const [impact, setImpact] = useState<ImpactStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const [feat, stats] = await Promise.all([
        apiFetch<SevaActivity[]>("/api/seva-activities?featured=true").catch(() => []),
        apiFetch<ImpactStats>("/api/impact-stats").catch(() => null),
      ]);
      const list = Array.isArray(feat) ? feat.slice(0, 6) : [];
      rememberActivities(list);
      setFeatured(list);
      setImpact(stats);
    } catch {
      // soft-fail on home
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      load();
    }, [load, refresh])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentStyle={{ paddingTop: 0 }}
    >
      <HomeHeroBanner />

      <View style={styles.ctaSection}>
        <View style={styles.ctaRow}>
        <Button
          title="Find Seva"
          onPress={() => router.push("/find-seva")}
          style={styles.ctaBtn}
        />
        <Button
          title="My Seva"
          variant="secondary"
          onPress={() => router.push("/dashboard")}
          style={styles.ctaBtn}
        />
        </View>
      </View>

      <SevaActivityCalendar />

      {canAccessSevaAdmin(user) ? (
        <Pressable onPress={() => router.push("/admin")}>
          <Card style={styles.adminCard}>
            <View style={styles.communityRow}>
              <Ionicons name="shield-checkmark" size={24} color={Brand.blue} />
              <View style={{ flex: 1 }}>
                <H2>Seva Admin Dashboard</H2>
                <Muted>Add & manage seva, view sign-ups{user?.role === "ADMIN" ? ", roles" : ""}.</Muted>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Brand.muted} />
            </View>
          </Card>
        </Pressable>
      ) : null}

      <Pressable onPress={() => router.push("/community")}>
        <Card style={styles.communityCard}>
          <View style={styles.communityRow}>
            <Ionicons name="business" size={24} color={Brand.purple} />
            <View style={{ flex: 1 }}>
              <H2>Community Outreach</H2>
              <Muted>Find community seva, partner organizations, and post as a partner.</Muted>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Brand.muted} />
          </View>
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push("/events")}>
        <Card style={styles.eventsCard}>
          <View style={styles.communityRow}>
            <Ionicons name="calendar" size={24} color={Brand.sky} />
            <View style={{ flex: 1 }}>
              <H2>Events</H2>
              <Muted>Browse upcoming center events and RSVP.</Muted>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Brand.muted} />
          </View>
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push("/seva-mahotsavam")}>
        <Card style={styles.mahotsavamCard}>
          <View style={styles.communityRow}>
            <Ionicons name="star" size={24} color={Brand.amber} />
            <View style={{ flex: 1 }}>
              <H2>Seva Mahotsavam</H2>
              <Muted>Sri Sathya Sai regional seva celebration.</Muted>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Brand.muted} />
          </View>
        </Card>
      </Pressable>

      <View style={styles.impactSection}>
        <Card style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            &ldquo;Selfless Service Alone Can Achieve Unity Of Mankind.&rdquo;
          </Text>
          <Text style={styles.quoteAuthor}>— Sri Sathya Sai Baba</Text>
        </Card>
        <Text style={styles.impactTitle}>Our Impact</Text>
        <View style={styles.statsRow}>
          <ImpactStat label="Activities" value={impact?.activities} tone="amber" />
          <ImpactStat label="Volunteers" value={impact?.volunteers} tone="emerald" />
          <ImpactStat label="Hours" value={impact?.hours} tone="indigo" />
        </View>
      </View>

      <View style={styles.sectionHead}>
        <H2>Featured seva</H2>
        <Pressable onPress={() => router.push("/find-seva")}>
          <Text style={styles.link}>See all</Text>
        </Pressable>
      </View>

      {featured.length === 0 ? (
        <Card>
          <Muted>No featured activities right now. Tap Find Seva to browse all activities.</Muted>
        </Card>
      ) : (
        featured.map((a) => {
          const cat = categoryStyle(a.category);
          const img = resolveMediaUrl(a.imageUrl) ?? FEATURED_DEFAULT_IMAGE;
          return (
            <Pressable
              key={a.id}
              onPress={() => router.push({ pathname: "/seva-details", params: { id: a.id } })}
            >
              <View style={[styles.featuredCard, { borderColor: cat.border }]}>
                <View style={[styles.featuredTextCol, { backgroundColor: cat.bg }]}>
                  <Text style={[styles.featuredTitle, { color: cat.text }]}>{a.title}</Text>
                  <Text style={[styles.featuredCity, { color: cat.text }]}>{a.city}</Text>
                  {a.description ? (
                    <Text style={[styles.featuredDesc, { color: cat.text }]} numberOfLines={3}>
                      {a.description}
                    </Text>
                  ) : null}
                  <Text style={styles.viewMore}>View More</Text>
                </View>
                <Image source={{ uri: img }} style={styles.featuredImage} resizeMode="contain" />
              </View>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

function ImpactStat({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone: "amber" | "emerald" | "indigo";
}) {
  const palette = {
    amber: { bg: "#fef3c7", border: "#f59e0b", value: "#78350f", label: "#92400e" },
    emerald: { bg: "#d1fae5", border: "#10b981", value: "#064e3b", label: "#047857" },
    indigo: { bg: "#e0e7ff", border: "#6366f1", value: "#312e81", label: "#4338ca" },
  }[tone];
  return (
    <View style={[styles.impactBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.impactValue, { color: palette.value }]}>
        {value != null ? value.toLocaleString() : "—"}
      </Text>
      <Text style={[styles.impactLabel, { color: palette.label }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ctaSection: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#e8f0dc",
  },
  ctaRow: { flexDirection: "row", gap: 12 },
  ctaBtn: { flex: 1 },
  impactSection: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#c8bfb8",
    gap: 14,
  },
  quoteCard: { backgroundColor: "rgba(255,255,255,0.95)" },
  quoteText: {
    fontSize: 17,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#b91c1b",
    textAlign: "center",
    lineHeight: 24,
  },
  quoteAuthor: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: Brand.ink,
    textAlign: "center",
  },
  impactTitle: {
    textAlign: "center",
    letterSpacing: 2,
    fontSize: 22,
    fontWeight: "800",
    color: Brand.ink,
  },
  statsRow: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  impactBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 100,
  },
  impactValue: { fontSize: 22, fontWeight: "800" },
  impactLabel: { marginTop: 6, fontSize: 13, fontWeight: "800" },
  featuredCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#fff",
    minHeight: 160,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  featuredTextCol: { flex: 1, padding: 12, gap: 4 },
  featuredTitle: { fontSize: 15, fontWeight: "800" },
  featuredCity: { fontSize: 14, fontWeight: "600", opacity: 0.9 },
  featuredDesc: { fontSize: 12, lineHeight: 17, flex: 1, opacity: 0.85 },
  viewMore: {
    marginTop: 4,
    alignSelf: "flex-start",
    fontSize: 13,
    fontWeight: "700",
    color: Brand.ink,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  featuredImage: { width: 130, height: "100%", minHeight: 160, backgroundColor: "#f1f5f9" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  link: { color: Brand.blue, fontWeight: "700" },
  cardImage: { width: "100%", height: 150, borderRadius: 12, marginBottom: 4 },
  cardRow: { flexDirection: "row", gap: 8 },
  adminCard: { borderColor: Brand.blue + "55" },
  communityCard: { borderColor: Brand.purple + "55" },
  eventsCard: { borderColor: Brand.sky + "55" },
  mahotsavamCard: { borderColor: Brand.amber + "55" },
  communityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
