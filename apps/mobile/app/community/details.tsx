import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Body, Button, Card, ErrorText, Field, H1, H2, Loading, Muted, Toggle } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateRange, fullName } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";
import type { CommunityActivity } from "@/lib/types";

type ContribItem = {
  id: string;
  name: string;
  category: string | null;
  neededLabel: string | null;
  maxQuantity: number | null;
  filledQuantity: number;
  remaining: number;
};

export default function CommunityDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [activity, setActivity] = useState<CommunityActivity | null>(null);
  const [items, setItems] = useState<ContribItem[]>([]);
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState(fullName(user?.firstName, user?.lastName, user?.name));
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [adults, setAdults] = useState("1");
  const [kids, setKids] = useState("0");
  const [joining, setJoining] = useState(false);
  const [joinDone, setJoinDone] = useState<null | "APPROVED" | "PENDING">(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [picked, setPicked] = useState<Record<string, string>>({});
  const [registering, setRegistering] = useState(false);
  const [itemsDone, setItemsDone] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const a = await apiFetch<CommunityActivity>(`/api/community-activities/${id}`, { noAuth: true });
        setActivity(a);
        try {
          const c = await apiFetch<{ items: ContribItem[]; ended: boolean }>(
            `/api/seva-activities/${id}/contributions`,
            { noAuth: true }
          );
          setItems(c.items ?? []);
          setEnded(Boolean(c.ended));
        } catch {
          setItems([]);
        }
      } catch (e) {
        setLoadError(e instanceof ApiError ? e.message : "Could not load this activity.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const submitJoin = async () => {
    setJoinError(null);
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setJoinError("Name, email, and phone are required.");
      return;
    }
    setJoining(true);
    try {
      const res = await apiFetch<{ status: "APPROVED" | "PENDING" }>("/api/seva-signups", {
        method: "POST",
        noAuth: true,
        json: {
          activityId: id,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          adultsCount: Number(adults) || 0,
          kidsCount: Number(kids) || 0,
        },
      });
      setJoinDone(res.status);
    } catch (e) {
      setJoinError(e instanceof ApiError ? e.message : "Could not complete sign-up.");
    } finally {
      setJoining(false);
    }
  };

  const submitItems = async () => {
    setItemsError(null);
    const chosen = Object.entries(picked)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([itemId, qty]) => ({ itemId, quantity: Number(qty) }));
    if (chosen.length === 0) {
      setItemsError("Select at least one item and quantity.");
      return;
    }
    if (!name.trim() || !email.trim()) {
      setItemsError("Name and email are required.");
      return;
    }
    setRegistering(true);
    try {
      await apiFetch(`/api/seva-activities/${id}/contributions/register-items`, {
        method: "POST",
        noAuth: true,
        json: {
          volunteerName: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          items: chosen,
        },
      });
      setItemsDone(true);
    } catch (e) {
      setItemsError(e instanceof ApiError ? e.message : "Could not register items.");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <Loading label="Loading activity…" />;

  if (loadError || !activity) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <Muted>{loadError ?? "This activity is no longer available."}</Muted>
        </View>
      </SafeAreaView>
    );
  }

  const img = resolveMediaUrl(activity.imageUrl);
  const hasItems = items.length > 0 && !ended;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {img ? <Image source={{ uri: img }} style={styles.image} /> : null}

        <View style={styles.row}>
          <Badge text={activity.category} />
          {activity.organizationName ? <Badge text={activity.organizationName} color={Brand.purple} /> : null}
        </View>

        <H1>{activity.title}</H1>

        <Card>
          <InfoRow icon="calendar" text={formatDateRange(activity.startDate, activity.endDate)} />
          {activity.startTime ? (
            <InfoRow icon="time" text={[activity.startTime, activity.endTime].filter(Boolean).join(" – ")} />
          ) : null}
          {activity.locationName || activity.address || activity.city ? (
            <InfoRow
              icon="location"
              text={[activity.locationName, activity.address, activity.city].filter(Boolean).join(", ")}
            />
          ) : null}
          {activity.coordinatorName ? (
            <InfoRow icon="person" text={`Coordinator: ${activity.coordinatorName}`} />
          ) : null}
          {activity.coordinatorPhone ? <InfoRow icon="call" text={activity.coordinatorPhone} /> : null}
        </Card>

        {activity.description ? (
          <Card>
            <H2>About this activity</H2>
            <Body>{activity.description}</Body>
          </Card>
        ) : null}

        {joinDone ? (
          <Card style={{ borderColor: Brand.emerald }}>
            <H2>{joinDone === "APPROVED" ? "You're signed up! 🙏" : "Added to the waitlist"}</H2>
            <Body>
              {joinDone === "APPROVED"
                ? "A confirmation email is on its way. Thank you for your seva."
                : "This activity is at capacity, so you've been waitlisted. The organizer will be in touch."}
            </Body>
          </Card>
        ) : ended ? (
          <Card>
            <Muted>This activity has ended. Sign-ups are closed.</Muted>
          </Card>
        ) : (
          <Card>
            <H2>Sign up to volunteer</H2>
            <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Contact number" keyboardType="phone-pad" />
            <View style={styles.countRow}>
              <Field label="Adults" value={adults} onChangeText={setAdults} keyboardType="number-pad" style={styles.countInput} />
              <Field label="Kids" value={kids} onChangeText={setKids} keyboardType="number-pad" style={styles.countInput} />
            </View>
            <ErrorText>{joinError}</ErrorText>
            <Button title="Join" onPress={submitJoin} loading={joining} />
            <Pressable onPress={() => router.push("/terms-and-policy")}>
              <Text style={styles.termsLink}>By joining, you agree to the Terms & Media Consent</Text>
            </Pressable>
          </Card>
        )}

        {hasItems ? (
          itemsDone ? (
            <Card style={{ borderColor: Brand.emerald }}>
              <H2>Thank you! 🙏</H2>
              <Body>Your item contribution has been registered. The organizer will be in touch.</Body>
            </Card>
          ) : (
            <Card>
              <H2>Items to bring</H2>
              <Muted>Choose what you can contribute. Uses the name, email, and phone above.</Muted>
              {items.map((it) => {
                const on = Number(picked[it.id]) > 0;
                return (
                  <View key={it.id} style={styles.itemBlock}>
                    <Toggle
                      label={it.name}
                      value={on}
                      onValueChange={(v) =>
                        setPicked((p) => ({ ...p, [it.id]: v ? "1" : "0" }))
                      }
                    />
                    <Muted>
                      {[it.neededLabel, it.remaining != null ? `${it.remaining} still needed` : null]
                        .filter(Boolean)
                        .join("  •  ")}
                    </Muted>
                    {on ? (
                      <Field
                        label="Quantity"
                        value={picked[it.id] ?? "1"}
                        onChangeText={(v) => setPicked((p) => ({ ...p, [it.id]: v }))}
                        keyboardType="number-pad"
                        style={styles.countInput}
                      />
                    ) : null}
                  </View>
                );
              })}
              <ErrorText>{itemsError}</ErrorText>
              <Button title="Register items" variant="secondary" onPress={submitItems} loading={registering} />
            </Card>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={Brand.blue} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.bg },
  content: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  image: { width: "100%", height: 200, borderRadius: 16 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  infoText: { flex: 1, fontSize: 15, color: Brand.inkSoft },
  countRow: { flexDirection: "row", gap: 12 },
  countInput: { width: 110 },
  itemBlock: { gap: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.line, paddingTop: 8 },
  termsLink: { color: Brand.blue, fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 4 },
});
