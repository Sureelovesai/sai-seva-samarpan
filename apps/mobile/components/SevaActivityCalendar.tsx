import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Select } from "@/components/kit";
import { apiFetch } from "@/lib/api";
import type { SevaFormMeta } from "@/lib/types";

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LEVEL_INFO = {
  center: "Center Level tab displays all the activities conducted at the center level.",
  regional:
    "Regional Level tab displays activities conducted at regional level — Example: Seva activities at regional Retreat.",
  national:
    "National Level tab displays activities conducted at National Level. Example — Activities conducted by US members in Parthi like Grama Seva.",
} as const;

type LevelTab = "center" | "regional" | "national";

const LEVEL_TABS: { id: LevelTab; label: string }[] = [
  { id: "center", label: "Center level" },
  { id: "regional", label: "Regional level" },
  { id: "national", label: "National level" },
];

const SCREEN_W = Dimensions.get("window").width;
const CARD_PAD = 12;
const GRID_GAP = 4;
const CELL = Math.floor((SCREEN_W - CARD_PAD * 2 - GRID_GAP * 6) / 7);

/**
 * Public Seva Activity Calendar — mobile layout matching the web portrait home page.
 */
export function SevaActivityCalendar() {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [levelTab, setLevelTab] = useState<LevelTab>("center");
  const [center, setCenter] = useState("All");
  const [usaRegion, setUsaRegion] = useState("All");
  const [meta, setMeta] = useState<SevaFormMeta | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SevaFormMeta>("/api/meta/seva-form").then(setMeta).catch(() => setMeta(null));
  }, []);

  const centerOptions = useMemo(
    () => ["All centers", ...(meta?.cities ?? []).sort((a, b) => a.localeCompare(b))],
    [meta?.cities]
  );
  const regionOptions = useMemo(
    () => ["All regions", ...(meta?.regions ?? [])],
    [meta?.regions]
  );
  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 7 }, (_, i) => String(y - 3 + i));
  }, [now]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("year", String(year));
      params.set("month", String(month));
      if (levelTab === "center") {
        params.set("sevaScope", "CENTER");
        if (center !== "All") params.set("center", center);
        if (usaRegion !== "All") params.set("usaRegion", usaRegion);
      } else if (levelTab === "regional") {
        params.set("sevaScope", "REGIONAL");
        if (usaRegion !== "All") params.set("usaRegion", usaRegion);
      } else {
        params.set("sevaScope", "NATIONAL");
      }
      const data = await apiFetch<{ counts?: Record<string, number> }>(`/api/seva-calendar?${params}`);
      setCounts(data.counts ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calendar");
      setCounts({});
    } finally {
      setLoading(false);
    }
  }, [year, month, levelTab, center, usaRegion]);

  useEffect(() => {
    load();
  }, [load]);

  const { leadingBlanks, dayKeys, weekRows } = useMemo(() => {
    const idx = month - 1;
    const first = new Date(year, idx, 1);
    const leading = first.getDay();
    const last = new Date(year, idx + 1, 0).getDate();
    const keys: string[] = [];
    const y = String(year);
    const m = String(month).padStart(2, "0");
    for (let d = 1; d <= last; d++) {
      keys.push(`${y}-${m}-${String(d).padStart(2, "0")}`);
    }
    const rows = Math.ceil((leading + keys.length) / 7);
    return { leadingBlanks: leading, dayKeys: keys, weekRows: rows };
  }, [year, month]);

  const openDay = (dateKey: string) => {
    const nav: Record<string, string> = { fromDate: dateKey, toDate: dateKey };
    if (levelTab === "center") {
      nav.level = "CENTER";
      if (center !== "All") nav.city = center;
      if (usaRegion !== "All") nav.usaRegion = usaRegion;
    } else if (levelTab === "regional") {
      nav.level = "REGIONAL";
      if (usaRegion !== "All") nav.usaRegion = usaRegion;
    } else {
      nav.level = "NATIONAL";
    }
    router.push({ pathname: "/find-seva", params: nav });
  };

  return (
    <View style={styles.outer}>
      <View style={styles.card}>
        <View style={styles.titleBar}>
          <View style={styles.titleLine} />
          <Text style={styles.title}>Seva Activity Calendar</Text>
          <View style={styles.titleLine} />
        </View>

        <View style={styles.tabRow}>
          {LEVEL_TABS.map((tab, i) => {
            const active = levelTab === tab.id;
            return (
              <View
                key={tab.id}
                style={[
                  styles.tab,
                  i === 0 && styles.tabFirst,
                  i === LEVEL_TABS.length - 1 && styles.tabLast,
                  active && styles.tabActive,
                ]}
              >
                <Pressable style={styles.tabPress} onPress={() => setLevelTab(tab.id)}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={2}>
                    {tab.label}
                  </Text>
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() => Alert.alert(tab.label, LEVEL_INFO[tab.id])}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={15}
                    color={active ? "#fff" : "#7dd3fc"}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>

        {(levelTab === "regional" || levelTab === "national") && (
          <Text style={styles.levelHint}>
            {levelTab === "regional"
              ? "Regional coordinators post by USA region — use USA Region below."
              : "National coordinators post organization-wide activities (no center or region filters)."}
          </Text>
        )}

        <View style={styles.filters}>
          {levelTab === "center" ? (
            <View style={styles.filterRow}>
              <View style={styles.filterGrow}>
                <Select
                  label="Center"
                  value={center === "All" ? "All centers" : center}
                  options={centerOptions}
                  onSelect={(v) => setCenter(v === "All centers" ? "All" : v)}
                  searchable
                  dark
                />
              </View>
              <View style={styles.filterGrow}>
                <Select
                  label="USA Region"
                  value={usaRegion === "All" ? "All regions" : usaRegion}
                  options={regionOptions}
                  onSelect={(v) => setUsaRegion(v === "All regions" ? "All" : v)}
                  dark
                />
              </View>
            </View>
          ) : levelTab === "regional" ? (
            <Select
              label="USA Region"
              value={usaRegion === "All" ? "All regions" : usaRegion}
              options={regionOptions}
              onSelect={(v) => setUsaRegion(v === "All regions" ? "All" : v)}
              dark
            />
          ) : null}

          <View style={styles.filterRow}>
            <View style={styles.filterThird}>
              <Select
                label="Month"
                value={MONTH_LABELS[month - 1]}
                options={MONTH_LABELS}
                onSelect={(v) => setMonth(MONTH_LABELS.indexOf(v) + 1)}
                dark
              />
            </View>
            <View style={styles.filterThird}>
              <Select
                label="Year"
                value={String(year)}
                options={yearOptions}
                onSelect={(v) => setYear(Number(v))}
                dark
              />
            </View>
            <View style={styles.refreshWrap}>
              <Text style={styles.refreshLabel}> </Text>
              <Pressable
                style={[styles.refreshBtn, loading && styles.refreshBtnDisabled]}
                onPress={load}
                disabled={loading}
              >
                <Text style={styles.refreshText}>{loading ? "Loading…" : "Refresh"}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.weekHead}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={[styles.weekLabel, { width: CELL }]}>
              {w}
            </Text>
          ))}
        </View>

        <View style={[styles.grid, { minHeight: weekRows * (CELL + GRID_GAP) }]}>
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <View key={`pad-${i}`} style={[styles.padCell, { width: CELL, height: CELL }]} />
          ))}
          {dayKeys.map((dateKey) => {
            const n = counts[dateKey] ?? 0;
            const dayNum = Number(dateKey.slice(-2));
            const hasActivity = n > 0;
            return (
              <Pressable
                key={dateKey}
                style={[
                  styles.dayCell,
                  { width: CELL, height: CELL },
                  hasActivity && styles.dayCellActive,
                ]}
                onPress={() => openDay(dateKey)}
              >
                <Text style={[styles.dayNum, hasActivity && styles.dayNumActive]}>{dayNum}</Text>
                {hasActivity ? (
                  <Text style={styles.activityCount} numberOfLines={2}>
                    {n} {n === 1 ? "activity" : "activities"}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#e0f2fe",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#075985",
    backgroundColor: "#082f49",
    overflow: "hidden",
    paddingBottom: 12,
  },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(14,165,233,0.35)",
  },
  titleLine: {
    flex: 1,
    height: 1,
    maxWidth: 40,
    backgroundColor: "rgba(56,189,248,0.5)",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#e0f2fe",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#0284c7",
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 2,
    backgroundColor: "#0f172a",
    borderRightWidth: 1,
    borderRightColor: "#0369a1",
  },
  tabFirst: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  tabLast: { borderRightWidth: 0, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  tabActive: { backgroundColor: "#0284c7" },
  tabPress: { flex: 1, alignItems: "center" },
  tabText: { fontSize: 11, fontWeight: "700", color: "#bae6fd", textAlign: "center" },
  tabTextActive: { color: "#fff" },
  levelHint: {
    marginHorizontal: 12,
    marginTop: 8,
    fontSize: 11,
    color: "rgba(186,230,253,0.9)",
    textAlign: "center",
    lineHeight: 16,
  },
  filters: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  filterRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  filterGrow: { flex: 1, minWidth: 0 },
  filterThird: { flex: 1, minWidth: 0 },
  refreshWrap: { justifyContent: "flex-end" },
  refreshLabel: { fontSize: 12, height: 18 },
  refreshBtn: {
    backgroundColor: "#0284c7",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
    justifyContent: "center",
  },
  refreshBtnDisabled: { opacity: 0.6 },
  refreshText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  error: { color: "#fecaca", textAlign: "center", fontSize: 13, paddingHorizontal: 12 },
  weekHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: GRID_GAP,
  },
  weekLabel: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    color: "#7dd3fc",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: GRID_GAP,
  },
  padCell: {
    borderRadius: 6,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  dayCell: {
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.65)",
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 1,
  },
  dayCellActive: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(12,74,110,0.75)",
  },
  dayNum: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  dayNumActive: { color: "#f0f9ff" },
  activityCount: {
    fontSize: 7,
    fontWeight: "800",
    color: "#fcd34d",
    textAlign: "center",
    lineHeight: 9,
    marginTop: 1,
  },
});
