import { useEffect, useMemo, useState } from "react";
import { Image, Linking, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import { Body, Card, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import type { CommunityPartner } from "@/lib/types";

export default function PartnersScreen() {
  const [partners, setPartners] = useState<CommunityPartner[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await apiFetch<CommunityPartner[]>("/api/community-outreach/partners", { noAuth: true });
      setPartners(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load partner organizations.");
    }
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) =>
      [p.organizationName, p.city, p.description, p.contactPhone, p.website]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [partners, search]);

  if (loading) return <Loading label="Loading partners…" />;

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
        placeholder="Search partners…"
        placeholderTextColor={Brand.muted}
        style={styles.search}
      />

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <Muted>No partner organizations yet.</Muted>
        </Card>
      ) : (
        filtered.map((p) => {
          const logo = resolveMediaUrl(p.logoUrl);
          return (
            <Card key={p.id}>
              <View style={styles.header}>
                {logo ? (
                  <Image source={{ uri: logo }} style={styles.logo} />
                ) : (
                  <View style={[styles.logo, styles.logoFallback]}>
                    <Text style={styles.logoLetter}>{p.organizationName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <H2>{p.organizationName}</H2>
                  <Muted>{p.city}</Muted>
                </View>
              </View>
              {p.description ? <Body>{p.description}</Body> : null}
              {p.contactPhone ? <Muted>{p.contactPhone}</Muted> : null}
              {p.website ? (
                <Text style={styles.link} onPress={() => Linking.openURL(normalizeUrl(p.website!))}>
                  {p.website}
                </Text>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
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
  header: { flexDirection: "row", gap: 12, alignItems: "center" },
  logo: { width: 52, height: 52, borderRadius: 12, backgroundColor: "#fff" },
  logoFallback: { alignItems: "center", justifyContent: "center", backgroundColor: Brand.sky + "22" },
  logoLetter: { fontSize: 22, fontWeight: "800", color: Brand.sky },
  link: { color: Brand.blue, fontSize: 14, fontWeight: "600" },
});
