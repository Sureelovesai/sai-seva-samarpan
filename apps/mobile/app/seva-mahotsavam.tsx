import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { API_BASE_URL } from "@/constants/config";
import { useFocusEffect } from "@react-navigation/native";

import { Badge, Body, Card, H1, H2, Muted, Screen, Loading, ErrorText } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { rememberActivities } from "@/lib/activityCache";
import { formatDateRange } from "@/lib/format";
import type { SevaActivity } from "@/lib/types";

const BANNER_URLS = [
  `${API_BASE_URL}/seva_mahotsavam_banner.png`,
  `${API_BASE_URL}/seva_mahotsavam_banner.svg`,
];

export default function SevaMahotsavamScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<SevaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerUri = bannerIndex < BANNER_URLS.length ? BANNER_URLS[bannerIndex] : null;

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<SevaActivity[]>(
        "/api/seva-activities?sevaScope=REGIONAL&sevaProgram=regional-mahotsavam"
      );
      const list = Array.isArray(data) ? data : [];
      rememberActivities(list);
      setActivities(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activities");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading && activities.length === 0) {
    return (
      <Screen>
        <Loading label="Loading Seva Mahotsavam activities" />
      </Screen>
    );
  }

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {bannerUri ? (
        <Image
          source={{ uri: bannerUri }}
          style={styles.banner}
          resizeMode="contain"
          onError={() => setBannerIndex((i) => i + 1)}
        />
      ) : null}
      <View style={styles.hero}>
        <H1>Sri Sathya Sai Seva Mahotsavam</H1>
        <Body>Regional seva activities in the Mahotsavam program.</Body>
      </View>

      {error ? (
        <Card>
          <ErrorText>{error}</ErrorText>
        </Card>
      ) : null}

      {activities.length === 0 && !error ? (
        <Card>
          <Muted>
            No regional Seva Mahotsavam activities are available right now. They must be
            published, not past end date, in scope REGIONAL, and linked to a published program
            group with "Mahotsavam" in the name.
          </Muted>
        </Card>
      ) : (
        activities.map((activity) => (
          <Pressable
            key={activity.id}
            onPress={() => router.push({ pathname: "/seva-details", params: { id: activity.id } })}
          >
            <Card>
              {activity.imageUrl ? (
                <Image source={{ uri: activity.imageUrl }} style={styles.image} />
              ) : null}
              <View style={styles.badges}>
                <Badge text={activity.category} />
                {activity.scope ? <Badge text={activity.scope} color={Brand.purple} /> : null}
              </View>
              <H2>{activity.title}</H2>
              <Muted>
                {[
                  activity.city,
                  formatDateRange(activity.startDate, activity.endDate),
                ].filter(Boolean).join("  •  ")}
              </Muted>
              {activity.description ? (
                <Body numberOfLines={2}>{activity.description}</Body>
              ) : null}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { width: "100%", height: 160, borderRadius: 12, backgroundColor: Brand.line },
  hero: { gap: 6, marginBottom: 12 },
  image: { width: "100%", height: 150, borderRadius: 12, marginBottom: 8 },
  badges: { flexDirection: "row", gap: 8, marginBottom: 4 },
});
