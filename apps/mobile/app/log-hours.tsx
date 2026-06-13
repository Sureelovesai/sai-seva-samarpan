import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Card, ErrorText, Field, H1, H2, Muted, Pill } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateKey, fullName } from "@/lib/format";

const CATEGORIES = [
  "Food / Annadanam",
  "Education",
  "Medical",
  "Environmental",
  "Community Outreach",
  "Bhajans / Devotional",
  "Other",
];

export default function LogHoursScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState(fullName(user?.firstName, user?.lastName, user?.name));
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(dateKey(new Date()));
  const [location, setLocation] = useState(user?.location ?? "");
  const [comments, setComments] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    const hoursNum = Number(hours);
    if (!name.trim()) return setError("Your name is required.");
    if (!category) return setError("Pick a seva category.");
    if (!Number.isFinite(hoursNum) || hoursNum <= 0) return setError("Enter valid hours.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Date must be YYYY-MM-DD.");

    setSaving(true);
    try {
      await apiFetch("/api/log-hours", {
        method: "POST",
        json: {
          volunteerName: name.trim(),
          email: user?.email,
          location: location.trim() || undefined,
          activityCategory: category,
          hours: hoursNum,
          date,
          comments: comments.trim() || undefined,
        },
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save your hours.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.content}>
          <Card style={{ borderColor: Brand.emerald }}>
            <H2>Hours logged 🙏</H2>
            <Body>Thank you for your seva. Your hours have been recorded.</Body>
            <Button title="Back to dashboard" onPress={() => router.back()} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.content}>
        <H1>Log seva hours</H1>
        <Card>
          <Field label="Volunteer name" value={name} onChangeText={setName} />
          <Text style={styles.label}>Seva category</Text>
          <View style={styles.cats}>
            {CATEGORIES.map((c) => (
              <Pill key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
          <View style={styles.row}>
            <Field
              label="Hours"
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
              placeholder="e.g. 2.5"
              style={{ flex: 1 }}
            />
            <Field
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              placeholder="2026-06-05"
              style={{ flex: 1 }}
            />
          </View>
          <Field
            label="Location (optional)"
            value={location}
            onChangeText={setLocation}
            placeholder="City / center"
          />
          <Field
            label="Comments (optional)"
            value={comments}
            onChangeText={setComments}
            placeholder="What did you do?"
            multiline
            style={styles.multiline}
          />
          <ErrorText>{error}</ErrorText>
          <Button title="Submit hours" onPress={submit} loading={saving} />
          {Platform.OS === "web" ? null : (
            <Muted>Tip: pull down on the dashboard to refresh after logging.</Muted>
          )}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.bg },
  content: { padding: 16, gap: 14, flex: 1 },
  label: { fontSize: 13, fontWeight: "600", color: Brand.inkSoft },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", gap: 12 },
  multiline: { height: 90, textAlignVertical: "top" },
});
