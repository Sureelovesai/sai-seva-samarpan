import { useCallback, useEffect, useMemo, useState } from "react";
import { Share, StyleSheet, Text, TextInput, View } from "react-native";

import { Button, Muted, Select } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AnalyticsData, SevaFormMeta } from "@/lib/types";

type Filters = {
  center: string;
  category: string;
  from: string;
  to: string;
  search: string;
};

const EMPTY_FILTERS: Filters = {
  center: "All",
  category: "All",
  from: "",
  to: "",
  search: "",
};

export function AdminAnalyticsSection() {
  const [meta, setMeta] = useState<SevaFormMeta | null>(null);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SevaFormMeta>("/api/meta/seva-form").then(setMeta).catch(() => setMeta(null));
  }, []);

  const centerOptions = useMemo(
    () => ["All Centers", ...(meta?.cities ?? []).sort((a, b) => a.localeCompare(b))],
    [meta?.cities]
  );
  const categoryOptions = useMemo(
    () => ["All Categories", ...(meta?.categories ?? [])],
    [meta?.categories]
  );

  const load = useCallback(async (filters: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.center && filters.center !== "All") params.set("center", filters.center);
      if (filters.category && filters.category !== "All") params.set("category", filters.category);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.search.trim()) params.set("search", filters.search.trim());
      const qs = params.toString();
      const result = await apiFetch<AnalyticsData>(`/api/analytics${qs ? `?${qs}` : ""}`);
      setData(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(applied);
  }, [applied, load]);

  const onExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (applied.center && applied.center !== "All") params.set("center", applied.center);
      if (applied.category && applied.category !== "All") params.set("category", applied.category);
      if (applied.from) params.set("from", applied.from);
      if (applied.to) params.set("to", applied.to);
      if (applied.search.trim()) params.set("search", applied.search.trim());
      const rows = await apiFetch<
        Array<{
          sevaActivity?: string;
          title?: string;
          category: string;
          city: string;
          startDate: string | null;
          endDate: string | null;
          startTime: string | null;
          endTime: string | null;
          status: string;
          isActive: boolean;
          capacity: number | null;
          signupCount: number;
        }>
      >(`/api/admin/export-activities?${params.toString()}`);
      const header = [
        "Seva Activity",
        "Category",
        "Center",
        "Start Date",
        "End Date",
        "Start Time",
        "End Time",
        "Status",
        "Active",
        "Capacity",
        "Signups",
      ];
      const csvRows = [
        header,
        ...rows.map((a) => [
          (a.sevaActivity ?? a.title ?? "").trim(),
          a.category,
          a.city,
          a.startDate ? formatDate(a.startDate) : "",
          a.endDate ? formatDate(a.endDate) : "",
          a.startTime ?? "",
          a.endTime ?? "",
          a.status,
          a.isActive ? "Yes" : "No",
          a.capacity != null ? String(a.capacity) : "",
          String(a.signupCount),
        ]),
      ];
      const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
      await Share.share({
        message: csv,
        title: `seva-activities-${new Date().toISOString().slice(0, 10)}.csv`,
      });
    } catch {
      setError("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const maxCat = Math.max(1, ...Object.values(data?.categoryCounts ?? {}));

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <View style={styles.titleLine} />
        <Text style={styles.title}>Analytics</Text>
        <View style={styles.titleLine} />
      </View>

      <View style={styles.filters}>
        <Select
          label="Center"
          value={draft.center === "All" ? "All Centers" : draft.center}
          options={centerOptions}
          onSelect={(v) => setDraft((d) => ({ ...d, center: v === "All Centers" ? "All" : v }))}
          searchable
        />
        <Select
          label="Category"
          value={draft.category === "All" ? "All Categories" : draft.category}
          options={categoryOptions}
          onSelect={(v) => setDraft((d) => ({ ...d, category: v === "All Categories" ? "All" : v }))}
        />
        <View style={styles.filterRow}>
          <View style={styles.filterHalf}>
            <Text style={styles.label}>From (YYYY-MM-DD)</Text>
            <TextInput
              value={draft.from}
              onChangeText={(from) => setDraft((d) => ({ ...d, from }))}
              placeholder="2026-01-01"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
          </View>
          <View style={styles.filterHalf}>
            <Text style={styles.label}>To (YYYY-MM-DD)</Text>
            <TextInput
              value={draft.to}
              onChangeText={(to) => setDraft((d) => ({ ...d, to }))}
              placeholder="2026-12-31"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
          </View>
        </View>
        <Text style={styles.label}>Search</Text>
        <TextInput
          value={draft.search}
          onChangeText={(search) => setDraft((d) => ({ ...d, search }))}
          placeholder="Search activities…"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        <View style={styles.btnRow}>
          <Button title="Apply" onPress={() => setApplied({ ...draft })} style={styles.btn} />
          <Button
            title="Reset"
            variant="secondary"
            onPress={() => {
              setDraft(EMPTY_FILTERS);
              setApplied(EMPTY_FILTERS);
            }}
            style={styles.btn}
          />
          <Button
            title={exporting ? "Exporting…" : "Export CSV"}
            variant="secondary"
            onPress={onExport}
            disabled={exporting}
            style={styles.btn}
          />
        </View>
      </View>

      {loading ? (
        <Text style={styles.centered}>Loading analytics…</Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : data ? (
        <View style={styles.body}>
          <View style={styles.summaryRow}>
            <SummaryCard label="Active Projects" value={data.activeActivities} tone="emerald" />
            <SummaryCard label="Volunteers" value={data.totalVolunteers} tone="blue" />
          </View>
          <View style={styles.summaryRow}>
            <SummaryCard label="Seva Hours" value={data.totalHours} tone="amber" />
            <SummaryCard label="This Month" value={data.thisMonthCount} tone="violet" />
          </View>
          <View style={styles.topCat}>
            <Text style={styles.topCatLabel}>Top Category</Text>
            <Text style={styles.topCatValue}>{data.topCategory ?? "—"}</Text>
          </View>

          <Text style={styles.subTitle}>Category Distribution</Text>
          <View style={styles.barChart}>
            {Object.entries(data.categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([name, count]) => (
                <View key={name} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max(8, (count / maxCat) * 80), backgroundColor: "#818cf8" },
                    ]}
                  />
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {name.split(" ")[0]}
                  </Text>
                  <Text style={styles.barCount}>{count}</Text>
                </View>
              ))}
          </View>

          <Text style={styles.subTitle}>Center Overview</Text>
          <View style={styles.tags}>
            {Object.entries(data.cityCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([name, count]) => (
                <View key={name} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {name} ({count})
                  </Text>
                </View>
              ))}
          </View>

          <Text style={styles.subTitle}>Recent Activities</Text>
          {data.recentActivities.length === 0 ? (
            <Muted>No recent activities.</Muted>
          ) : (
            data.recentActivities.map((a) => (
              <View key={a.id} style={styles.activityRow}>
                <Text style={styles.activityTitle}>{a.title}</Text>
                <Muted>
                  {[a.category, a.city, a.startDate ? formatDate(a.startDate) : null]
                    .filter(Boolean)
                    .join("  •  ")}
                </Muted>
              </View>
            ))
          )}
        </View>
      ) : (
        <Text style={styles.centered}>Could not load analytics</Text>
      )}
    </View>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "blue" | "amber" | "violet";
}) {
  const bg = {
    emerald: "#064e3b",
    blue: "#1e3a8a",
    amber: "#78350f",
    violet: "#4c1d95",
  }[tone];
  return (
    <View style={[styles.summaryCard, { backgroundColor: bg }]}>
      <Text style={styles.summaryValue}>{value.toLocaleString()}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0f172a",
    overflow: "hidden",
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleLine: { flex: 1, height: 1, backgroundColor: "#475569", maxWidth: 40 },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 2,
  },
  filters: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterHalf: { flex: 1 },
  label: { fontSize: 12, fontWeight: "700", color: "#cbd5e1", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#fff",
    backgroundColor: "#1e293b",
  },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: { flexGrow: 1, minWidth: "30%" },
  body: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  centered: { textAlign: "center", paddingVertical: 24, color: "#94a3b8" },
  error: { color: "#fecaca", textAlign: "center", padding: 12 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  summaryValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  summaryLabel: { fontSize: 12, color: "#e2e8f0", marginTop: 4, textAlign: "center" },
  topCat: {
    backgroundColor: "#312e81",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  topCatLabel: { fontSize: 12, color: "#c7d2fe" },
  topCatValue: { fontSize: 18, fontWeight: "800", color: "#fff", marginTop: 4 },
  subTitle: { fontSize: 14, fontWeight: "800", color: "#e2e8f0", marginTop: 4 },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    minHeight: 110,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 10,
  },
  barCol: { flex: 1, alignItems: "center", gap: 2 },
  bar: { width: "100%", borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 9, color: "#94a3b8", maxWidth: "100%" },
  barCount: { fontSize: 10, fontWeight: "700", color: "#e2e8f0" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: { fontSize: 12, color: "#e2e8f0", fontWeight: "600" },
  activityRow: {
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 10,
    gap: 2,
  },
  activityTitle: { fontSize: 14, fontWeight: "700", color: "#f8fafc" },
});
