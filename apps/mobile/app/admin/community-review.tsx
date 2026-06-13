import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Image, RefreshControl, StyleSheet, View } from "react-native";

import { Badge, Body, Button, Card, Field, H2, Loading, Muted, Screen, Select } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";
import { canReviewCommunity, isAdmin } from "@/lib/roles";
import type { CommunityProfileAdmin } from "@/lib/types";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export default function CommunityReviewScreen() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const [status, setStatus] = useState("PENDING");
  const [profiles, setProfiles] = useState<CommunityProfileAdmin[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<CommunityProfileAdmin[]>(
        `/api/admin/community-outreach/profiles?status=${status}`
      );
      setProfiles(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load partner applications.");
    }
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await load();
        setLoading(false);
      })();
    }, [load])
  );

  const review = async (p: CommunityProfileAdmin, action: "approve" | "reject") => {
    setBusy(p.id);
    try {
      await apiFetch(`/api/admin/community-outreach/profiles/${p.id}`, {
        method: "PATCH",
        json: { action, reviewerNote: notes[p.id]?.trim() || undefined },
      });
      setProfiles((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      Alert.alert("Action failed", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const remove = (p: CommunityProfileAdmin) => {
    Alert.alert("Delete application?", `Remove ${p.organizationName}'s pending application?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/admin/community-outreach/profiles/${p.id}`, { method: "DELETE" });
            setProfiles((prev) => prev.filter((x) => x.id !== p.id));
          } catch (e) {
            Alert.alert("Delete failed", e instanceof ApiError ? e.message : "Please try again.");
          }
        },
      },
    ]);
  };

  if (!canReviewCommunity(user)) {
    return (
      <Screen>
        <Card>
          <H2>Reviewers only</H2>
          <Muted>This area is for Admins and Seva Coordinators.</Muted>
        </Card>
      </Screen>
    );
  }

  if (loading) return <Loading label="Loading applications…" />;

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
      <Select label="Status" value={status} options={STATUSES} onSelect={setStatus} />

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : profiles.length === 0 ? (
        <Card>
          <Muted>No {status.toLowerCase()} applications.</Muted>
        </Card>
      ) : (
        profiles.map((p) => {
          const logo = resolveMediaUrl(p.logoUrl);
          return (
            <Card key={p.id}>
              <View style={styles.head}>
                {logo ? <Image source={{ uri: logo }} style={styles.logo} /> : null}
                <View style={{ flex: 1 }}>
                  <H2>{p.organizationName}</H2>
                  <Muted>{p.city}</Muted>
                </View>
                <Badge
                  text={p.status}
                  color={p.status === "APPROVED" ? Brand.emerald : p.status === "REJECTED" ? Brand.rose : Brand.amber}
                />
              </View>
              {p.description ? <Body>{p.description}</Body> : null}
              <Muted>
                Applicant: {fullName(p.user.firstName, p.user.lastName, p.user.name) || p.user.email}
              </Muted>
              <Muted>{p.user.email}</Muted>
              {p.contactPhone ? <Muted>{p.contactPhone}</Muted> : null}
              {p.website ? <Muted>{p.website}</Muted> : null}
              <Muted>Submitted {formatDate(p.submittedAt)}</Muted>
              {p.reviewerNote ? <Muted>Reviewer note: {p.reviewerNote}</Muted> : null}

              {p.status === "PENDING" ? (
                <>
                  <Field
                    label="Reviewer note (used when rejecting)"
                    value={notes[p.id] ?? ""}
                    onChangeText={(t) => setNotes((n) => ({ ...n, [p.id]: t }))}
                    placeholder="Optional note to the applicant"
                  />
                  <View style={styles.actions}>
                    <Button
                      title="Approve"
                      onPress={() => review(p, "approve")}
                      loading={busy === p.id}
                      style={styles.actionBtn}
                    />
                    <Button
                      title="Reject"
                      variant="secondary"
                      onPress={() => review(p, "reject")}
                      loading={busy === p.id}
                      style={styles.actionBtn}
                    />
                    {admin ? (
                      <Button title="Delete" variant="ghost" onPress={() => remove(p)} style={styles.actionBtn} />
                    ) : null}
                  </View>
                </>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", gap: 12, alignItems: "center" },
  logo: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#fff" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { flexGrow: 1, paddingVertical: 10, paddingHorizontal: 12 },
});
