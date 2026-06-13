import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Body, Button, Card, ErrorText, Field, H1, H2, Muted } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { getCachedActivity } from "@/lib/activityCache";
import { useAuth } from "@/lib/auth";
import { formatDateRange, fullName } from "@/lib/format";

export default function SevaDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const activity = useMemo(() => (id ? getCachedActivity(id) : undefined), [id]);

  const [joining, setJoining] = useState(false);
  const [done, setDone] = useState<null | "APPROVED" | "PENDING">(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(fullName(user?.firstName, user?.lastName, user?.name));
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [adults, setAdults] = useState("1");
  const [kids, setKids] = useState("0");

  if (!activity) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <Muted>This activity is no longer available. Go back to Find Seva and tap it again.</Muted>
        </View>
      </SafeAreaView>
    );
  }

  const canJoin = activity.joinSevaEnabled && !activity.hasContributionList;

  const submit = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Name, email, and phone are required.");
      return;
    }
    setJoining(true);
    try {
      const res = await apiFetch<{ status: "APPROVED" | "PENDING" }>("/api/seva-signups", {
        method: "POST",
        json: {
          activityId: activity.id,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          adultsCount: Number(adults) || 0,
          kidsCount: Number(kids) || 0,
        },
      });
      setDone(res.status);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not complete sign-up.";
      setError(msg);
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {activity.imageUrl ? (
          <Image source={{ uri: activity.imageUrl }} style={styles.image} />
        ) : null}

        <View style={styles.row}>
          <Badge text={activity.category} />
          {activity.scope ? <Badge text={activity.scope} color={Brand.purple} /> : null}
          {activity.spotsRemaining != null ? (
            <Badge
              text={activity.spotsRemaining > 0 ? `${activity.spotsRemaining} spots` : "Full / waitlist"}
              color={activity.spotsRemaining > 0 ? Brand.emerald : Brand.rose}
            />
          ) : null}
        </View>

        <H1>{activity.title}</H1>

        <Card>
          <InfoRow icon="calendar" text={formatDateRange(activity.startDate, activity.endDate)} />
          {activity.startTime ? (
            <InfoRow
              icon="time"
              text={[activity.startTime, activity.endTime].filter(Boolean).join(" – ")}
            />
          ) : null}
          {activity.locationName || activity.address || activity.city ? (
            <InfoRow
              icon="location"
              text={[activity.locationName, activity.address, activity.city]
                .filter(Boolean)
                .join(", ")}
            />
          ) : null}
          {activity.coordinatorName ? (
            <InfoRow icon="person" text={`Coordinator: ${activity.coordinatorName}`} />
          ) : null}
          {activity.coordinatorPhone ? (
            <InfoRow icon="call" text={activity.coordinatorPhone} />
          ) : null}
        </Card>

        {activity.description ? (
          <Card>
            <H2>About this seva</H2>
            <Body>{activity.description}</Body>
          </Card>
        ) : null}

        {done ? (
          <Card style={{ borderColor: Brand.emerald }}>
            <H2>
              {done === "APPROVED" ? "You're signed up! 🙏" : "Added to the waitlist"}
            </H2>
            <Body>
              {done === "APPROVED"
                ? "A confirmation email is on its way. Thank you for your seva."
                : "This activity is at capacity, so you've been waitlisted. The coordinator will be in touch."}
            </Body>
          </Card>
        ) : canJoin ? (
          <Card>
            <H2>Join this seva</H2>
            <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="Contact number"
              keyboardType="phone-pad"
            />
            <View style={styles.countRow}>
              <Field
                label="Adults"
                value={adults}
                onChangeText={setAdults}
                keyboardType="number-pad"
                style={styles.countInput}
              />
              {activity.allowKids ? (
                <Field
                  label="Kids"
                  value={kids}
                  onChangeText={setKids}
                  keyboardType="number-pad"
                  style={styles.countInput}
                />
              ) : null}
            </View>
            <ErrorText>{error}</ErrorText>
            <Button title="Join Seva" onPress={submit} loading={joining} />
            <Pressable onPress={() => router.push("/terms-and-policy")}>
              <Text style={styles.termsLink}>By joining, you agree to the Terms & Media Consent</Text>
            </Pressable>
          </Card>
        ) : (
          <Card>
            <Muted>
              {activity.hasContributionList
                ? "This activity uses an item/supply sign-up. Please use the website to choose items to contribute."
                : "Online join is not enabled for this activity. Contact the coordinator to participate."}
            </Muted>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
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
  countInput: { width: 90 },
  termsLink: { color: Brand.blue, fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 4 },
});
