import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Body, Card, ErrorText, H2, Loading, Muted, Pill } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { rememberActivities } from "@/lib/activityCache";
import { formatDateRange } from "@/lib/format";
import type { SevaActivity } from "@/lib/types";

type Level = "CENTER" | "REGIONAL" | "NATIONAL";

const LEVELS: { id: Level; label: string }[] = [
  { id: "CENTER", label: "Center" },
  { id: "REGIONAL", label: "Regional" },
  { id: "NATIONAL", label: "National" },
];

export default function FindSevaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    level?: string;
    fromDate?: string;
    toDate?: string;
    city?: string;
    usaRegion?: string;
  }>();
  const initialLevel = (params.level?.toUpperCase() as Level) || "CENTER";
  const [level, setLevel] = useState<Level>(
    initialLevel === "REGIONAL" || initialLevel === "NATIONAL" ? initialLevel : "CENTER"
  );
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [fromDate] = useState(params.fromDate ?? "");
  const [toDate] = useState(params.toDate ?? "");
  const [cityFilter] = useState(params.city ?? "");
  const [regionFilter] = useState(params.usaRegion ?? "");
  const [items, setItems] = useState<SevaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("sevaScope", level);
      if (query.trim()) qs.set("q", query.trim());
      if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) qs.set("fromDate", fromDate);
      if (toDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate)) qs.set("toDate", toDate);
      if (cityFilter) qs.set("center", cityFilter);
      if (regionFilter) qs.set("usaRegion", regionFilter);
      const data = await apiFetch<SevaActivity[]>(`/api/seva-activities?${qs.toString()}`);
      const list = Array.isArray(data) ? data : [];
      rememberActivities(list);
      setItems(list);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load activities.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [level, query, fromDate, toDate, cityFilter, regionFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Debounce the search box → query
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of items) if (a.category) set.add(a.category);
    return ["All", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(
    () => (category === "All" ? items : items.filter((a) => a.category === category)),
    [items, category]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <H2>Find Seva</H2>
        <View style={styles.levelRow}>
          {LEVELS.map((l) => (
            <Pill
              key={l.id}
              label={l.label}
              active={level === l.id}
              onPress={() => setLevel(l.id)}
            />
          ))}
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search activities, city, location…"
          placeholderTextColor={Brand.muted}
          style={styles.search}
          returnKeyType="search"
        />
        {categories.length > 1 ? (
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(c) => c}
            contentContainerStyle={styles.catRow}
            renderItem={({ item }) => (
              <Pill label={item} active={category === item} onPress={() => setCategory(item)} />
            )}
          />
        ) : null}
      </View>

      {loading ? (
        <Loading label="Loading activities…" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ErrorText>{error}</ErrorText>
              {!error ? <Muted>No activities found. Try a different level or search.</Muted> : null}
            </View>
          }
          renderItem={({ item: a }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/seva-details", params: { id: a.id } })}
            >
              <Card>
                {a.imageUrl ? <Image source={{ uri: a.imageUrl }} style={styles.image} /> : null}
                <View style={styles.cardRow}>
                  <Badge text={a.category} />
                  {a.spotsRemaining != null ? (
                    <Badge
                      text={a.spotsRemaining > 0 ? `${a.spotsRemaining} spots` : "Full / waitlist"}
                      color={a.spotsRemaining > 0 ? Brand.emerald : Brand.rose}
                    />
                  ) : null}
                </View>
                <H2>{a.title}</H2>
                <Muted>
                  {[a.city, formatDateRange(a.startDate, a.endDate)].filter(Boolean).join("  •  ")}
                </Muted>
                {a.description ? (
                  <Body>
                    {a.description.length > 120
                      ? a.description.slice(0, 120).trim() + "…"
                      : a.description}
                  </Body>
                ) : null}
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.bg },
  header: { padding: 16, gap: 12, backgroundColor: Brand.bg },
  levelRow: { flexDirection: "row", gap: 8 },
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
  catRow: { gap: 8, paddingVertical: 2 },
  list: { padding: 16, paddingTop: 0, gap: 14 },
  image: { width: "100%", height: 160, borderRadius: 12, marginBottom: 4 },
  cardRow: { flexDirection: "row", gap: 8 },
  empty: { padding: 24, alignItems: "center", gap: 8 },
});
