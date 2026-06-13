import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Body, Button, Card, ErrorText, Field, H2, Loading, Muted, Screen, Select } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { resolveMediaUrl, uploadCommunityLogo } from "@/lib/media";
import type { CommunityMe, CommunityProfile, SevaFormMeta } from "@/lib/types";

export default function CommunityProfileScreen() {
  const router = useRouter();
  const [meta, setMeta] = useState<SevaFormMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);

  const [organizationName, setOrganizationName] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      apiFetch<SevaFormMeta>("/api/meta/seva-form").then(setMeta).catch(() => setMeta(null));
      try {
        const me = await apiFetch<CommunityMe>("/api/community-outreach/me");
        if (me.profile) {
          setProfile(me.profile);
          setOrganizationName(me.profile.organizationName);
          setCity(me.profile.city);
          setDescription(me.profile.description ?? "");
          setContactPhone(me.profile.contactPhone ?? "");
          setWebsite(me.profile.website ?? "");
          setLogoUrl(me.profile.logoUrl ?? null);
        }
      } catch {
        // treat as new profile
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pickLogo = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError("Photo access is needed to attach a logo.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    setPreview(uri);
    setUploading(true);
    try {
      const url = await uploadCommunityLogo(uri);
      setLogoUrl(url);
    } catch (e) {
      setPreview(null);
      setError(e instanceof ApiError ? e.message : "Logo upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (uploading) return setError("Please wait for the logo to finish uploading.");
    if (!organizationName.trim()) return setError("Organization name is required.");
    if (!city) return setError("Pick a center / city.");
    setSaving(true);
    try {
      await apiFetch("/api/community-outreach/profile", {
        method: "POST",
        json: {
          organizationName: organizationName.trim(),
          city,
          description: description.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          website: website.trim() || undefined,
          logoUrl: logoUrl || undefined,
        },
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading…" />;

  if (profile && profile.status === "APPROVED") {
    return (
      <Screen>
        <Card>
          <Badge text="Approved partner" color={Brand.emerald} />
          <H2>{profile.organizationName}</H2>
          <Muted>{profile.city}</Muted>
          <Body>
            Your organization is an approved community partner. To change your profile details, please
            contact an administrator.
          </Body>
          <Button title="Post an activity" onPress={() => router.replace("/community/post-activity")} />
        </Card>
      </Screen>
    );
  }

  const logo = resolveMediaUrl(logoUrl);

  return (
    <Screen>
      <Card>
        <H2>Partner organization</H2>
        {profile?.status === "PENDING" ? (
          <Badge text="Under review" color={Brand.amber} />
        ) : profile?.status === "REJECTED" ? (
          <Badge text="Not approved — update & resubmit" color={Brand.rose} />
        ) : (
          <Muted>Tell us about your organization. An admin or coordinator will review your application.</Muted>
        )}
        {profile?.status === "REJECTED" && profile.reviewerNote ? (
          <Muted>Reviewer note: {profile.reviewerNote}</Muted>
        ) : null}

        <Field label="Organization name" value={organizationName} onChangeText={setOrganizationName} />
        <Select label="Center / city" value={city} options={meta?.cities ?? []} onSelect={setCity} searchable />
        <Field label="Description (optional)" value={description} onChangeText={setDescription} multiline style={styles.multiline} />
        <Field label="Contact phone (optional)" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
        <Field label="Website (optional)" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" placeholder="https://…" />

        <Text style={styles.sectionLabel}>Logo (optional)</Text>
        {logo || preview ? (
          <View>
            <Image source={{ uri: logo ?? preview ?? "" }} style={styles.preview} />
            {uploading ? (
              <View style={styles.overlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <Pressable
                style={styles.removeBtn}
                onPress={() => {
                  setLogoUrl(null);
                  setPreview(null);
                }}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable style={styles.photoBtn} onPress={pickLogo} disabled={uploading}>
            <Text style={styles.photoBtnText}>＋ Add a logo</Text>
          </Pressable>
        )}

        <ErrorText>{error}</ErrorText>
        <Button title="Submit for review" onPress={submit} loading={saving} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  multiline: { height: 110, textAlignVertical: "top" },
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
  preview: { width: 120, height: 120, borderRadius: 12, backgroundColor: Brand.line },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 120,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    left: 88,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  removeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
