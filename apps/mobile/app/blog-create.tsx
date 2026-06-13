import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Card, ErrorText, Field, H1, H2, Muted, Pill } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateKey, fullName } from "@/lib/format";
import { resolveMediaUrl, uploadBlogImage } from "@/lib/media";
import type { SevaFormMeta } from "@/lib/types";

/** Convert plain-text paragraphs into simple HTML the blog/WebView can render. */
function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br/>").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("");
}

export default function BlogCreateScreen() {
  const { user } = useAuth();
  const [meta, setMeta] = useState<SevaFormMeta | null>(null);

  const [section, setSection] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sevaDate, setSevaDate] = useState(dateKey(new Date()));
  const [authorName, setAuthorName] = useState(fullName(user?.firstName, user?.lastName, user?.name));
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pickImage = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo access is needed to attach an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    setImagePreview(uri);
    setUploading(true);
    try {
      const url = await uploadBlogImage(uri);
      setImageUrl(url);
    } catch (e) {
      setImagePreview(null);
      setError(e instanceof ApiError ? e.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    setImagePreview(null);
  };

  useEffect(() => {
    apiFetch<SevaFormMeta>("/api/meta/seva-form")
      .then((m) => {
        setMeta(m);
        if (m.blogSections?.[0]) setSection(m.blogSections[0]);
      })
      .catch(() => setError("Could not load form options. Check your connection."));
  }, []);

  const cityMatches = useMemo(() => {
    const all = meta?.cities ?? [];
    const f = cityFilter.trim().toLowerCase();
    const list = f ? all.filter((c) => c.toLowerCase().includes(f)) : all;
    return list.slice(0, 12);
  }, [meta, cityFilter]);

  const submit = async () => {
    setError(null);
    if (!section) return setError("Pick a section.");
    if (!title.trim()) return setError("Title is required.");
    if (!content.trim()) return setError("Content is required.");
    if (!authorName.trim()) return setError("Your name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (!category) return setError("Pick a seva category.");
    if (!city) return setError("Pick a center / city.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sevaDate)) return setError("Date must be YYYY-MM-DD.");
    if (uploading) return setError("Please wait for the image to finish uploading.");

    setSaving(true);
    try {
      await apiFetch("/api/blog-posts", {
        method: "POST",
        json: {
          title: title.trim(),
          content: textToHtml(content),
          section,
          sevaCategory: category,
          centerCity: city,
          sevaDate,
          authorName: authorName.trim(),
          posterEmail: email.trim(),
          posterPhone: phone.trim() || undefined,
          imageUrl: imageUrl || undefined,
        },
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit the post.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.content}>
          <Card style={{ borderColor: Brand.emerald }}>
            <H2>Submitted for review 🙏</H2>
            <Body>
              Thank you for sharing. Your post will be reviewed and published shortly. Jai Sairam!
            </Body>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <H1>Share a seva story</H1>

          <Card>
            <Text style={styles.label}>Section</Text>
            <View style={styles.pillWrap}>
              {(meta?.blogSections ?? []).map((s) => (
                <Pill key={s} label={s} active={section === s} onPress={() => setSection(s)} />
              ))}
            </View>

            <Field label="Title" value={title} onChangeText={setTitle} placeholder="Story title" />
            <Field
              label="Your story"
              value={content}
              onChangeText={setContent}
              placeholder="Write what happened…"
              multiline
              style={styles.multiline}
            />

            <Text style={styles.label}>Photo (optional)</Text>
            {imagePreview ? (
              <View style={styles.previewWrap}>
                <Image
                  source={{ uri: resolveMediaUrl(imageUrl) ?? imagePreview }}
                  style={styles.preview}
                />
                {uploading ? (
                  <View style={styles.previewOverlay}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.overlayText}>Uploading…</Text>
                  </View>
                ) : (
                  <Pressable style={styles.removeBtn} onPress={removeImage}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <Pressable style={styles.photoBtn} onPress={pickImage} disabled={uploading}>
                <Text style={styles.photoBtnText}>＋ Add a photo</Text>
              </Pressable>
            )}

            <Text style={styles.label}>Seva category</Text>
            <View style={styles.pillWrap}>
              {(meta?.categories ?? []).map((c) => (
                <Pill key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>

            <Field
              label="Center / city"
              value={cityFilter}
              onChangeText={setCityFilter}
              placeholder={city || "Type to search your center…"}
            />
            <View style={styles.pillWrap}>
              {cityMatches.map((c) => (
                <Pill
                  key={c}
                  label={c}
                  active={city === c}
                  onPress={() => {
                    setCity(c);
                    setCityFilter("");
                  }}
                />
              ))}
            </View>
            {city ? <Muted>Selected center: {city}</Muted> : null}

            <Field
              label="Seva / story date (YYYY-MM-DD)"
              value={sevaDate}
              onChangeText={setSevaDate}
              placeholder="2026-06-05"
            />
            <Field label="Your name" value={authorName} onChangeText={setAuthorName} />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              label="Phone (optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <ErrorText>{error}</ErrorText>
            <Button title="Submit for review" onPress={submit} loading={saving} />
            <Muted>Posts are reviewed by an admin before appearing on the blog.</Muted>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.bg },
  content: { padding: 16, gap: 14 },
  label: { fontSize: 13, fontWeight: "600", color: Brand.inkSoft },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  multiline: { height: 140, textAlignVertical: "top" },
  photoBtn: {
    borderWidth: 1,
    borderColor: Brand.blue,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
  },
  photoBtnText: { color: Brand.blue, fontWeight: "700", fontSize: 15 },
  previewWrap: { position: "relative" },
  preview: { width: "100%", height: 190, borderRadius: 12, backgroundColor: Brand.line },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 6,
  },
  overlayText: { color: "#fff", fontWeight: "600" },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  removeText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});
