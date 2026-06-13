import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Badge, Body, Button, Card, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { htmlToExcerpt } from "@/lib/html";
import { resolveMediaUrl } from "@/lib/media";
import { canAccessBlog } from "@/lib/roles";
import type { BlogPostListItem, SevaBlogLanding } from "@/lib/types";

export default function BlogScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const hasBlogAccess = canAccessBlog(user);

  const [landing, setLanding] = useState<SevaBlogLanding | null>(null);
  const [posts, setPosts] = useState<BlogPostListItem[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLanding = useCallback(async () => {
    try {
      const data = await apiFetch<SevaBlogLanding>("/api/seva-blog");
      setLanding(data);
    } catch {
      // soft-fail
    }
  }, []);

  const loadPosts = useCallback(async () => {
    if (!hasBlogAccess) {
      setPosts([]);
      return;
    }
    setPostsError(null);
    try {
      const suffix = query.trim()
        ? `?${new URLSearchParams({ q: query.trim() }).toString()}`
        : "";
      const data = await apiFetch<BlogPostListItem[]>(`/api/blog-posts${suffix}`);
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      setPostsError(e instanceof ApiError ? e.message : "Could not load stories.");
      setPosts([]);
    }
  }, [hasBlogAccess, query]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await Promise.all([loadLanding(), loadPosts()]);
        setLoading(false);
      })();
    }, [loadLanding, loadPosts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadLanding(), loadPosts()]);
    setRefreshing(false);
  }, [loadLanding, loadPosts]);

  if (loading) return <Loading label="Loading Seva Blog…" />;

  const featured = landing?.featured;
  const activities = landing?.activities ?? [];

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>SAI HRIDAYA</Text>
        <Text style={styles.heroTagline}>LOVE IN ACTION</Text>
        <Muted>Stories of love in action · seva that transforms · hearts that unite</Muted>
      </View>

      {landing?.impact ? (
        <Card>
          <View style={styles.statsRow}>
            <Stat label="Hours" value={landing.impact.hours} />
            <Stat label="Volunteers" value={landing.impact.volunteers} />
            <Stat label="Activities" value={landing.impact.familiesServed} />
            <Stat label="Centers" value={landing.impact.centers} />
          </View>
        </Card>
      ) : null}

      {hasBlogAccess ? (
        <Button
          title="＋ Create a post"
          onPress={() => router.push("/blog-create")}
        />
      ) : null}

      {featured ? (
        <View style={{ gap: 8 }}>
          <H2>Featured seva</H2>
          <Pressable
            onPress={() =>
              router.push({ pathname: "/seva-details", params: { id: featured.id } })
            }
          >
            <Card>
              {resolveMediaUrl(featured.imageUrl) ? (
                <Image
                  source={{ uri: resolveMediaUrl(featured.imageUrl)! }}
                  style={styles.featuredImage}
                />
              ) : null}
              <Badge text={featured.category} />
              <H2>{featured.title}</H2>
              <Muted>
                {[featured.city, formatDate(featured.startDate)].filter(Boolean).join("  •  ")}
              </Muted>
              {featured.description ? <Body>{htmlToExcerpt(featured.description, 140)}</Body> : null}
            </Card>
          </Pressable>
        </View>
      ) : null}

      {/* Community stories — only for users with blog access (matches the website). */}
      {hasBlogAccess ? (
        <View style={{ gap: 10 }}>
          <H2>Community stories</H2>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search stories…"
            placeholderTextColor={Brand.muted}
            style={styles.search}
          />
          {postsError ? (
            <Card>
              <Muted>{postsError}</Muted>
            </Card>
          ) : posts.length === 0 ? (
            <Card>
              <Muted>No community stories yet. Be the first to share one.</Muted>
            </Card>
          ) : (
            posts.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push({ pathname: "/blog-post", params: { id: p.id } })}
              >
                <Card>
                  {resolveMediaUrl(p.imageUrl) ? (
                    <Image source={{ uri: resolveMediaUrl(p.imageUrl)! }} style={styles.postImage} />
                  ) : null}
                  <View style={styles.cardRow}>
                    <Badge text={p.section} color={Brand.purple} />
                    {p.sevaCategory ? <Badge text={p.sevaCategory} /> : null}
                  </View>
                  <H2>{p.title}</H2>
                  <Muted>
                    {[p.authorName, p.centerCity, formatDate(p.createdAt)]
                      .filter(Boolean)
                      .join("  •  ")}
                  </Muted>
                  <Body>{htmlToExcerpt(p.content)}</Body>
                  <View style={styles.reactRow}>
                    <Text style={styles.reactText}>👍 {p.likeCount}</Text>
                    <Text style={styles.reactText}>👎 {p.dislikeCount}</Text>
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <Card>
          <H2>More stories</H2>
          <Muted>
            Community story posts are available to coordinators and admins. Sign in with a
            coordinator account to read and share community stories.
          </Muted>
        </Card>
      )}

      {/* Recent seva activities double as public "stories" for everyone. */}
      {activities.length > 0 ? (
        <View style={{ gap: 8 }}>
          <H2>Recent seva</H2>
          {activities.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => router.push({ pathname: "/seva-details", params: { id: a.id } })}
            >
              <Card>
                <View style={styles.cardRow}>
                  <Badge text={a.category} />
                  {a.volunteerCount > 0 ? (
                    <Badge text={`${a.volunteerCount} served`} color={Brand.emerald} />
                  ) : null}
                </View>
                <H2>{a.title}</H2>
                <Muted>{[a.city, formatDate(a.startDate)].filter(Boolean).join("  •  ")}</Muted>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}

      {landing?.popularTags?.length ? (
        <Card>
          <H2>Popular categories</H2>
          <View style={styles.tags}>
            {landing.popularTags.map((t) => (
              <View key={t.name} style={styles.tag}>
                <Ionicons name="pricetag" size={12} color={Brand.skyDark} />
                <Text style={styles.tagText}>
                  {t.name} ({t.count})
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 4, paddingVertical: 8 },
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 4,
    color: "#7a4a3a",
  },
  heroTagline: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    color: Brand.rose,
  },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: Brand.ink },
  statLabel: { fontSize: 11, color: Brand.muted },
  featuredImage: { width: "100%", height: 170, borderRadius: 12, marginBottom: 4 },
  postImage: { width: "100%", height: 150, borderRadius: 12, marginBottom: 4 },
  cardRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  search: {
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Brand.ink,
    backgroundColor: "#fff",
  },
  reactRow: { flexDirection: "row", gap: 16, marginTop: 2 },
  reactText: { fontSize: 14, color: Brand.inkSoft },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: { fontSize: 12, color: Brand.skyDark, fontWeight: "600" },
});
