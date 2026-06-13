import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Body, Button, Card, ErrorText, Field, H2, Muted, Select, Toggle } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { resolveMediaUrl, uploadEventAsset } from "@/lib/media";

export type EventFormValues = {
  title: string;
  description: string;
  date: string;
  time: string;
  status: string;
  venue: string;
  heroImageUrl: string | null;
  flyerUrl: string | null;
  organizerEmail: string;
  signupsEnabled: boolean;
};

export function emptyEventValues(): EventFormValues {
  return {
    title: "",
    description: "",
    date: "",
    time: "",
    status: "PUBLISHED",
    venue: "",
    heroImageUrl: null,
    flyerUrl: null,
    organizerEmail: "",
    signupsEnabled: true,
  };
}

export function EventForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: EventFormValues;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
}) {
  const [v, setV] = useState<EventFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"hero" | "flyer" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  const pick = async (kind: "hero" | "flyer") => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError("Photo access is needed to attach an image.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setUploading(kind);
    try {
      const url = await uploadEventAsset(result.assets[0].uri, kind);
      set(kind === "hero" ? "heroImageUrl" : "flyerUrl", url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const validate = (): string | null => {
    if (!v.title.trim()) return "Title is required.";
    if (!v.description.trim()) return "Description is required.";
    if (!v.venue.trim()) return "Venue is required.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return "Date must be YYYY-MM-DD.";
    if (!/^\d{1,2}:\d{2}$/.test(v.time)) return "Time must be HH:MM (24-hour).";
    if (Number.isNaN(new Date(`${v.date}T${v.time}`).getTime())) return "Date/time is invalid.";
    return null;
  };

  const submit = async () => {
    setError(null);
    if (uploading) return setError("Please wait for the upload to finish.");
    const msg = validate();
    if (msg) return setError(msg);
    setSaving(true);
    try {
      await onSubmit(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save event.");
    } finally {
      setSaving(false);
    }
  };

  const hero = resolveMediaUrl(v.heroImageUrl);
  const flyer = resolveMediaUrl(v.flyerUrl);
  const flyerIsPdf = !!v.flyerUrl && /\.pdf($|\?)/i.test(v.flyerUrl);

  return (
    <Card>
      <H2>Event details</H2>
      <Field label="Title" value={v.title} onChangeText={(t) => set("title", t)} />
      <Field label="Description" value={v.description} onChangeText={(t) => set("description", t)} multiline style={styles.multiline} />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="Date (YYYY-MM-DD)" value={v.date} onChangeText={(t) => set("date", t)} placeholder="2026-06-15" />
        </View>
        <View style={{ width: 110 }}>
          <Field label="Time (HH:MM)" value={v.time} onChangeText={(t) => set("time", t)} placeholder="17:30" />
        </View>
      </View>
      <Muted>Time is entered in this device&apos;s local time. Events display in US Eastern (ET).</Muted>

      <Field label="Venue (name, address, or online link)" value={v.venue} onChangeText={(t) => set("venue", t)} multiline style={styles.multiline} />
      <Select label="Visibility" value={v.status} options={["PUBLISHED", "DRAFT", "ARCHIVED"]} onSelect={(s) => set("status", s)} />

      <Text style={styles.sectionLabel}>Hero image (optional)</Text>
      {hero ? (
        <View>
          <Image source={{ uri: hero }} style={styles.heroPreview} />
          {uploading === "hero" ? (
            <View style={styles.overlay}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <Pressable style={styles.removeBtn} onPress={() => set("heroImageUrl", null)}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable style={styles.photoBtn} onPress={() => pick("hero")} disabled={uploading === "hero"}>
          <Text style={styles.photoBtnText}>＋ Add hero image</Text>
        </Pressable>
      )}

      <Text style={styles.sectionLabel}>Flyer (optional — image or PDF link)</Text>
      {v.flyerUrl ? (
        <View style={styles.flyerRow}>
          {flyerIsPdf || !flyer ? (
            <Text style={styles.flyerText} numberOfLines={1}>
              PDF flyer attached
            </Text>
          ) : (
            <Image source={{ uri: flyer }} style={styles.flyerThumb} />
          )}
          <Pressable style={styles.removeInline} onPress={() => set("flyerUrl", null)}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.photoBtn} onPress={() => pick("flyer")} disabled={uploading === "flyer"}>
          <Text style={styles.photoBtnText}>
            {uploading === "flyer" ? "Uploading…" : "＋ Add flyer image"}
          </Text>
        </Pressable>
      )}
      <Field
        label="…or paste a flyer URL (PDF/image)"
        value={v.flyerUrl ?? ""}
        onChangeText={(t) => set("flyerUrl", t.trim() ? t.trim() : null)}
        placeholder="https://…"
        autoCapitalize="none"
        keyboardType="url"
      />

      <Field
        label="RSVP notification email (optional)"
        value={v.organizerEmail}
        onChangeText={(t) => set("organizerEmail", t)}
        placeholder="organizer@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Toggle label="Collect sign-ups (RSVP)" value={v.signupsEnabled} onValueChange={(b) => set("signupsEnabled", b)} />

      <View style={styles.divider} />
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={submit} loading={saving} />
      <Body>Events display in US Eastern time on the public events page.</Body>
    </Card>
  );
}

const styles = StyleSheet.create({
  multiline: { height: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-end" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: Brand.inkSoft, marginTop: 4 },
  photoBtn: {
    borderWidth: 1,
    borderColor: Brand.blue,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  photoBtnText: { color: Brand.blue, fontWeight: "700" },
  heroPreview: { width: "100%", height: 170, borderRadius: 12, backgroundColor: Brand.line },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  removeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  flyerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  flyerThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: Brand.line },
  flyerText: { flex: 1, fontSize: 14, color: Brand.inkSoft, fontWeight: "600" },
  removeInline: {
    backgroundColor: Brand.rose,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  divider: { height: 1, backgroundColor: Brand.line, marginVertical: 4 },
});
