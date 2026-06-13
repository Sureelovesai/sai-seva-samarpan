import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CommunityMe } from "@/lib/types";

export default function CommunityHubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [me, setMe] = useState<CommunityMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<CommunityMe>("/api/community-outreach/me");
      setMe(data);
    } catch {
      setMe(null);
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

  if (loading) return <Loading label="Loading community…" />;

  const profile = me?.profile ?? null;
  const isAdmin = (me?.roles ?? []).includes("ADMIN");
  const canManage = isAdmin || profile?.status === "APPROVED";

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Card>
        <H2>Community Outreach</H2>
        <Muted>
          Seva in partnership with local nonprofits and community organizations. Find activities or
          join as a partner organization.
        </Muted>
      </Card>

      <View style={styles.tiles}>
        <Tile icon="search" label="Find community seva" onPress={() => router.push("/community/find")} />
        <Tile icon="business" label="Partner organizations" onPress={() => router.push("/community/partners")} />
      </View>

      <Card>
        <H2>For partner organizations</H2>
        {!user ? (
          <>
            <Muted>Sign in to register your organization and post community seva activities.</Muted>
            <Button title="Sign in" onPress={() => router.push("/login")} />
          </>
        ) : !profile && !isAdmin ? (
          <>
            <Muted>
              Register your organization to post community seva activities. An admin or coordinator
              will review your application.
            </Muted>
            <Button title="Become a partner" onPress={() => router.push("/community/profile")} />
          </>
        ) : profile && profile.status === "PENDING" ? (
          <>
            <Badge text="Application under review" color={Brand.amber} />
            <Muted>
              Your partner application for {profile.organizationName} is awaiting review. You&apos;ll be
              notified once it&apos;s approved.
            </Muted>
          </>
        ) : profile && profile.status === "REJECTED" ? (
          <>
            <Badge text="Not approved" color={Brand.rose} />
            {profile.reviewerNote ? <Muted>Reviewer note: {profile.reviewerNote}</Muted> : null}
            <Button title="Update & resubmit" onPress={() => router.push("/community/profile")} />
          </>
        ) : canManage ? (
          <>
            {profile ? <Badge text={`Partner: ${profile.organizationName}`} color={Brand.emerald} /> : null}
            {isAdmin && !profile ? <Badge text="Admin" color={Brand.purple} /> : null}
            <Button title="Post an activity" onPress={() => router.push("/community/post-activity")} />
            <Button title="Manage activities" variant="secondary" onPress={() => router.push("/community/manage")} />
            <Button title="View sign-ups" variant="ghost" onPress={() => router.push("/community/signups")} />
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

function Tile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <Ionicons name={icon} size={26} color={Brand.blue} />
      <Text style={styles.tileText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: Brand.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  tileText: { fontSize: 13, fontWeight: "700", color: Brand.ink, textAlign: "center" },
});
