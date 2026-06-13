import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { Badge, Loading, Muted } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { getBlogUid } from "@/lib/blogUid";
import { formatDate } from "@/lib/format";
import { buildPostHtmlDocument } from "@/lib/html";
import { resolveMediaUrl } from "@/lib/media";
import type { BlogPostDetail } from "@/lib/types";

type ReactionResponse = {
  likeCount: number;
  dislikeCount: number;
  myReaction: { type: string } | null;
};

export default function BlogPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiFetch<BlogPostDetail>(`/api/blog-posts/${id}`);
      setPost(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this story.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const react = async (type: "LIKE" | "DISLIKE") => {
    if (!id || reacting) return;
    setReacting(true);
    try {
      const uid = await getBlogUid();
      const res = await apiFetch<ReactionResponse>(`/api/blog-posts/${id}/reaction`, {
        method: "POST",
        json: { type },
        cookies: { blog_uid: uid },
      });
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likeCount: res.likeCount,
              dislikeCount: res.dislikeCount,
              myReaction: res.myReaction,
            }
          : prev
      );
    } catch {
      // ignore reaction errors
    } finally {
      setReacting(false);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <Muted>{error}</Muted>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) return <Loading label="Loading story…" />;

  const mine = post.myReaction?.type;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Badge text={post.section} color={Brand.purple} />
        </View>
        <Text style={styles.title}>{post.title}</Text>
        <Muted>
          {[post.authorName, formatDate(post.createdAt)].filter(Boolean).join("  •  ")}
        </Muted>
      </View>

      {resolveMediaUrl(post.imageUrl) ? (
        <Image source={{ uri: resolveMediaUrl(post.imageUrl)! }} style={styles.image} />
      ) : null}

      <WebView
        originWhitelist={["*"]}
        source={{ html: buildPostHtmlDocument(post.content, post.title) }}
        style={styles.webview}
        showsVerticalScrollIndicator
      />

      <View style={styles.footer}>
        <Pressable
          style={[styles.reactBtn, mine === "LIKE" && styles.reactBtnActive]}
          onPress={() => react("LIKE")}
          disabled={reacting}
        >
          <Ionicons
            name={mine === "LIKE" ? "thumbs-up" : "thumbs-up-outline"}
            size={20}
            color={mine === "LIKE" ? "#fff" : Brand.blue}
          />
          <Text style={[styles.reactLabel, mine === "LIKE" && styles.reactLabelActive]}>
            {post.likeCount}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.reactBtn, mine === "DISLIKE" && styles.reactBtnActive]}
          onPress={() => react("DISLIKE")}
          disabled={reacting}
        >
          <Ionicons
            name={mine === "DISLIKE" ? "thumbs-down" : "thumbs-down-outline"}
            size={20}
            color={mine === "DISLIKE" ? "#fff" : Brand.blue}
          />
          <Text style={[styles.reactLabel, mine === "DISLIKE" && styles.reactLabelActive]}>
            {post.dislikeCount}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  badgeRow: { flexDirection: "row" },
  title: { fontSize: 24, fontWeight: "800", color: Brand.ink },
  image: { width: "100%", height: 200, marginTop: 12 },
  webview: { flex: 1, marginTop: 8 },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.line,
  },
  reactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.blue,
  },
  reactBtnActive: { backgroundColor: Brand.blue },
  reactLabel: { fontSize: 15, fontWeight: "700", color: Brand.blue },
  reactLabelActive: { color: "#fff" },
});
