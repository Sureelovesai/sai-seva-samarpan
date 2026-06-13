import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, Body, Button, Card, ErrorText, Field, H1, H2, Loading, Muted, Pill } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatEventStart } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";
import type { EventRsvp, EventRsvpResponse, PortalEventDetail } from "@/lib/types";

const RESPONSES: EventRsvpResponse[] = ["YES", "MAYBE", "NO"];
const RESPONSE_LABEL: Record<EventRsvpResponse, string> = {
  YES: "Yes, I'll attend",
  MAYBE: "Maybe",
  NO: "Can't make it",
};

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [event, setEvent] = useState<PortalEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [response, setResponse] = useState<EventRsvpResponse>("YES");
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [adults, setAdults] = useState("0");
  const [kids, setKids] = useState("0");
  const [comment, setComment] = useState("");

  const [loadingPrev, setLoadingPrev] = useState(false);
  const [prevMsg, setPrevMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const e = await apiFetch<PortalEventDetail>(`/api/portal-events/${id}`, { noAuth: true });
        setEvent(e);
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : "Could not load this event.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const loadPrevious = async () => {
    setPrevMsg(null);
    setError(null);
    if (!email.trim()) {
      setError("Enter your email to load a previous response.");
      return;
    }
    setLoadingPrev(true);
    try {
      const prev = await apiFetch<EventRsvp>(
        `/api/portal-events/${id}/signup?email=${encodeURIComponent(email.trim())}`,
        { noAuth: true }
      );
      setFirstName(prev.firstName);
      setLastName(prev.lastName);
      setResponse(prev.response);
      setAdults(String(prev.accompanyingAdults));
      setKids(String(prev.accompanyingKids));
      setComment(prev.comment);
      setPrevMsg("Loaded your previous RSVP. Update and resubmit if needed.");
    } catch (e) {
      setPrevMsg(e instanceof ApiError ? e.message : "No previous RSVP found.");
    } finally {
      setLoadingPrev(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("First name, last name, and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string }>(`/api/portal-events/${id}/signup`, {
        method: "POST",
        noAuth: true,
        json: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          response,
          accompanyingAdults: Number(adults) || 0,
          accompanyingKids: Number(kids) || 0,
          comment: comment.trim() || undefined,
        },
      });
      setDone(res.message || "Thank you for registering.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save your RSVP.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading label="Loading event…" />;

  if (loadError || !event) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <Muted>{loadError ?? "This event is no longer available."}</Muted>
        </View>
      </SafeAreaView>
    );
  }

  const hero = resolveMediaUrl(event.heroImageUrl);
  const flyer = resolveMediaUrl(event.flyerUrl);
  const flyerIsPdf = !!event.flyerUrl && /\.pdf($|\?)/i.test(event.flyerUrl);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {hero ? <Image source={{ uri: hero }} style={styles.hero} /> : null}

        <H1>{event.title}</H1>
        <Card>
          <InfoRow icon="calendar" text={formatEventStart(event.startsAt)} />
          <InfoRow icon="location" text={event.venue} />
        </Card>

        {event.description ? (
          <Card>
            <H2>About</H2>
            <Body>{event.description}</Body>
          </Card>
        ) : null}

        {flyer ? (
          <Card>
            <H2>Flyer</H2>
            {flyerIsPdf ? (
              <Button title="Open flyer (PDF)" variant="secondary" onPress={() => Linking.openURL(flyer)} />
            ) : (
              <Image source={{ uri: flyer }} style={styles.flyer} resizeMode="contain" />
            )}
          </Card>
        ) : null}

        {done ? (
          <Card style={{ borderColor: Brand.emerald }}>
            <H2>RSVP received 🙏</H2>
            <Body>{done}</Body>
          </Card>
        ) : event.signupsEnabled ? (
          <Card>
            <H2>RSVP</H2>
            <Text style={styles.label}>Will you attend?</Text>
            <View style={styles.pillRow}>
              {RESPONSES.map((r) => (
                <Pill key={r} label={RESPONSE_LABEL[r]} active={response === r} onPress={() => setResponse(r)} />
              ))}
            </View>

            <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
            <Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button title="Load my previous response" variant="ghost" onPress={loadPrevious} loading={loadingPrev} />
            {prevMsg ? <Muted>{prevMsg}</Muted> : null}

            <View style={styles.countRow}>
              <Field label="Guest adults" value={adults} onChangeText={setAdults} keyboardType="number-pad" style={styles.countInput} />
              <Field label="Guest kids" value={kids} onChangeText={setKids} keyboardType="number-pad" style={styles.countInput} />
            </View>
            <Field
              label="Comments (optional)"
              value={comment}
              onChangeText={setComment}
              placeholder="Anything you'd like the organizer to know"
              multiline
              style={styles.multiline}
            />
            <ErrorText>{error}</ErrorText>
            <Button title="Submit RSVP" onPress={submit} loading={submitting} />
            <Pressable onPress={() => router.push("/terms-and-policy")}>
              <Text style={styles.termsLink}>By registering, you agree to the Terms & Media Consent</Text>
            </Pressable>
          </Card>
        ) : (
          <Card>
            <Badge text="RSVP closed" color={Brand.muted} />
            <Muted>Sign-ups are not being collected for this event.</Muted>
          </Card>
        )}
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
  hero: { width: "100%", height: 200, borderRadius: 16 },
  flyer: { width: "100%", height: 360, borderRadius: 12, backgroundColor: Brand.line },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  infoText: { flex: 1, fontSize: 15, color: Brand.inkSoft },
  label: { fontSize: 13, fontWeight: "600", color: Brand.inkSoft },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  countRow: { flexDirection: "row", gap: 12 },
  countInput: { width: 120 },
  multiline: { height: 90, textAlignVertical: "top" },
  termsLink: { color: Brand.blue, fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 4 },
});
