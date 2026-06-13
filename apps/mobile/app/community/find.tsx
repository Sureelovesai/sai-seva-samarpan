import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, StyleSheet, TextInput, View } from "react-native";

import { Badge, Card, H2, Loading, Muted, Screen, Select } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";
import type { CommunityActivity, SevaFormMeta } from "@/lib/types";

const ALL_CAT = "All categories";
const ALL_CITY = "All centers";
const ALL_REGION = "All regions";

export default function FindCommunityScreen() {
  const router = useRouter();
  const [meta, setMeta] = useState<SevaFormMeta | null>(null);
  const [items, setItems] = useState<CommunityActivity[]>([]);
  const [category, setCategory] = useState(ALL_CAT);
  const [city, setCity] = useState(ALL_CITY);
  const [region, setRegion] = useState(ALL_REGION);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SevaFormMeta>("/api/meta/seva-form").then(setMeta).catch(() => setMeta(null));
  }, []);

  const load = useMemo(
    () => async () => {
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (category !== ALL_CAT) qs.set("category", category);
        if (city !== ALL_CITY) qs.set("city", city);
        if (region !== ALL_REGION) qs.set("usaRegion", region);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        const data = await apiFetch<CommunityActivity[]>(`/api/community-activities${suffix}`, {
          noAuth: true,
        });
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not load activities.");
      }
    },
    [category, city, region]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) =>
      [a.title, a.description, a.city, a.organizationName, a.locationName, a.address]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [items, search]);

  if (loading) return <Loading label="Loading community seva…" />;

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
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search activities…"
        placeholderTextColor={Brand.muted}
        style={styles.search}
      />
      <Select label="Category" value={category} options={[ALL_CAT, ...(meta?.categories ?? [])]} onSelect={setCategory} />
      <Select label="Center" value={city} options={[ALL_CITY, ...(meta?.cities ?? [])]} onSelect={setCity} searchable />
      <Select label="Region" value={region} options={[ALL_REGION, ...(meta?.regions ?? [])]} onSelect={setRegion} searchable />

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <Muted>No community activities match these filters.</Muted>
        </Card>
      ) : (
        filtered.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => router.push({ pathname: "/community/details", params: { id: a.id } })}
          >
            <Card>
              {resolveMediaUrl(a.imageUrl) ? (
                <Image source={{ uri: resolveMediaUrl(a.imageUrl)! }} style={styles.image} />
              ) : null}
              <View style={styles.badgeRow}>
                <Badge text={a.category} />
                {a.organizationName ? <Badge text={a.organizationName} color={Brand.purple} /> : null}
              </View>
              <H2>{a.title}</H2>
              <Muted>{[a.city, formatDate(a.startDate)].filter(Boolean).join("  •  ")}</Muted>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  image: { width: "100%", height: 150, borderRadius: 12, marginBottom: 4 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
