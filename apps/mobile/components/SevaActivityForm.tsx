import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Body, Button, Card, ErrorText, Field, H2, Muted, Select, Toggle } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { resolveMediaUrl, uploadActivityImage } from "@/lib/media";
import { allowedScopes } from "@/lib/roles";
import type { SevaFormMeta, SevaScope } from "@/lib/types";

export type ContributionItemDraft = { id?: string; name: string; maxQuantity: string };

export type ActivityFormValues = {
  title: string;
  category: string;
  scope: SevaScope;
  sevaUsaRegion: string;
  city: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  durationHours: string;
  locationName: string;
  address: string;
  capacity: string;
  coordinatorName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
  organizationName: string;
  imageUrl: string | null;
  allowKids: boolean;
  joinSevaEnabled: boolean;
  isActive: boolean;
  isFeatured: boolean;
  status: string;
  contributionItems: ContributionItemDraft[];
};

export function emptyActivityValues(scope: SevaScope): ActivityFormValues {
  return {
    title: "",
    category: "",
    scope,
    sevaUsaRegion: "",
    city: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    durationHours: "",
    locationName: "",
    address: "",
    capacity: "",
    coordinatorName: "",
    coordinatorEmail: "",
    coordinatorPhone: "",
    organizationName: "",
    imageUrl: null,
    allowKids: true,
    joinSevaEnabled: true,
    isActive: true,
    isFeatured: false,
    status: "PUBLISHED",
    contributionItems: [],
  };
}

export function SevaActivityForm({
  meta,
  initial,
  mode,
  submitLabel,
  onSubmit,
}: {
  meta: SevaFormMeta;
  initial: ActivityFormValues;
  mode: "create" | "edit";
  submitLabel: string;
  onSubmit: (values: ActivityFormValues) => Promise<void>;
}) {
  const { user } = useAuth();
  const [v, setV] = useState<ActivityFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scopes = useMemo(() => allowedScopes(user), [user]);
  const isCenterAdmin = user?.role === "ADMIN";
  const cityOptions = useMemo(() => {
    if (v.scope !== "CENTER") return meta.cities;
    if (!isCenterAdmin && user?.coordinatorCities?.length) return user.coordinatorCities;
    return meta.cities;
  }, [v.scope, meta.cities, isCenterAdmin, user]);

  const statusOptions = mode === "edit" ? ["DRAFT", "PUBLISHED", "ARCHIVED"] : ["DRAFT", "PUBLISHED"];

  const set = <K extends keyof ActivityFormValues>(key: K, value: ActivityFormValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  const pickImage = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError("Photo access is needed to attach an image.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    setPreview(uri);
    setUploading(true);
    try {
      const url = await uploadActivityImage(uri);
      set("imageUrl", url);
    } catch {
      setPreview(null);
      setError("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const addItem = () =>
    set("contributionItems", [...v.contributionItems, { name: "", maxQuantity: "1" }]);
  const updateItem = (i: number, patch: Partial<ContributionItemDraft>) =>
    set(
      "contributionItems",
      v.contributionItems.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
    );
  const removeItem = (i: number) =>
    set("contributionItems", v.contributionItems.filter((_, idx) => idx !== i));

  const validate = (): string | null => {
    if (!v.title.trim()) return "Title is required.";
    if (!v.category) return "Pick a category.";
    if (v.scope === "REGIONAL" && !v.sevaUsaRegion) return "Pick a USA region.";
    if (v.scope !== "NATIONAL" && !v.city) return "Pick a center / city.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.startDate)) return "Start date must be YYYY-MM-DD.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.endDate)) return "End date must be YYYY-MM-DD.";
    if (!/^\d{1,2}:\d{2}$/.test(v.startTime)) return "Start time must be HH:MM.";
    if (!/^\d{1,2}:\d{2}$/.test(v.endTime)) return "End time must be HH:MM.";
    if (!(Number(v.durationHours) > 0)) return "Duration (hours) must be greater than 0.";
    if (!v.address.trim()) return "Address is required.";
    if (!v.coordinatorName.trim()) return "Coordinator name is required.";
    if (!v.coordinatorEmail.trim()) return "Coordinator email is required.";
    if (!v.coordinatorPhone.trim()) return "Coordinator phone is required.";
    if (!(Number(v.capacity) >= 1)) return "Capacity must be at least 1.";
    for (const it of v.contributionItems) {
      if (!it.name.trim()) return "Each contribution item needs a name (or remove it).";
      if (!(Number(it.maxQuantity) >= 1)) return "Contribution quantity must be at least 1.";
    }
    return null;
  };

  const submit = async () => {
    setError(null);
    if (uploading) return setError("Please wait for the image to finish uploading.");
    const msg = validate();
    if (msg) return setError(msg);
    setSaving(true);
    try {
      await onSubmit(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save activity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <H2>Activity level</H2>
      <Select
        value={v.scope}
        options={scopes}
        onSelect={(s) => set("scope", s as SevaScope)}
      />
      {v.scope === "REGIONAL" ? (
        <Select
          label="USA region"
          value={v.sevaUsaRegion || null}
          options={user?.coordinatorRegions?.length ? user.coordinatorRegions : meta.regions}
          onSelect={(r) => set("sevaUsaRegion", r)}
          searchable
        />
      ) : null}
      {v.scope !== "NATIONAL" ? (
        <Select
          label="Center / city"
          value={v.city || null}
          options={cityOptions}
          onSelect={(c) => set("city", c)}
          searchable
        />
      ) : (
        <Muted>National activities are listed under the &quot;National&quot; center.</Muted>
      )}

      <Field label="Title" value={v.title} onChangeText={(t) => set("title", t)} />
      <Select
        label="Category"
        value={v.category || null}
        options={meta.categories}
        onSelect={(c) => set("category", c)}
      />
      <Field
        label="Description"
        value={v.description}
        onChangeText={(t) => set("description", t)}
        multiline
        style={styles.multiline}
      />

      <Field label="Start date (YYYY-MM-DD)" value={v.startDate} onChangeText={(t) => set("startDate", t)} placeholder="2026-06-15" />
      <Field label="End date (YYYY-MM-DD)" value={v.endDate} onChangeText={(t) => set("endDate", t)} placeholder="2026-06-15" />
      <Field label="Start time (HH:MM)" value={v.startTime} onChangeText={(t) => set("startTime", t)} placeholder="09:00" />
      <Field label="End time (HH:MM)" value={v.endTime} onChangeText={(t) => set("endTime", t)} placeholder="12:00" />
      <Field label="Duration (hours)" value={v.durationHours} onChangeText={(t) => set("durationHours", t)} keyboardType="decimal-pad" placeholder="3" />

      <Field label="Location name (optional)" value={v.locationName} onChangeText={(t) => set("locationName", t)} />
      <Field label="Address" value={v.address} onChangeText={(t) => set("address", t)} />
      <Field label="Organization (optional)" value={v.organizationName} onChangeText={(t) => set("organizationName", t)} />
      <Field label="Capacity" value={v.capacity} onChangeText={(t) => set("capacity", t)} keyboardType="number-pad" placeholder="20" />

      <Field label="Coordinator name" value={v.coordinatorName} onChangeText={(t) => set("coordinatorName", t)} />
      <Field label="Coordinator email" value={v.coordinatorEmail} onChangeText={(t) => set("coordinatorEmail", t)} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Coordinator phone" value={v.coordinatorPhone} onChangeText={(t) => set("coordinatorPhone", t)} keyboardType="phone-pad" />

      <Text style={styles.sectionLabel}>Photo (optional)</Text>
      {preview || v.imageUrl ? (
        <View>
          <Image source={{ uri: resolveMediaUrl(v.imageUrl) ?? preview ?? "" }} style={styles.preview} />
          {uploading ? (
            <View style={styles.overlay}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <Pressable
              style={styles.removeBtn}
              onPress={() => {
                set("imageUrl", null);
                setPreview(null);
              }}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable style={styles.photoBtn} onPress={pickImage} disabled={uploading}>
          <Text style={styles.photoBtnText}>＋ Add a photo</Text>
        </Pressable>
      )}

      <Toggle label="Active (visible to volunteers)" value={v.isActive} onValueChange={(b) => set("isActive", b)} />
      <Toggle label="Featured" value={v.isFeatured} onValueChange={(b) => set("isFeatured", b)} />
      <Toggle label="Allow kids" value={v.allowKids} onValueChange={(b) => set("allowKids", b)} />
      <Toggle label="Join Seva enabled" value={v.joinSevaEnabled} onValueChange={(b) => set("joinSevaEnabled", b)} />
      <Select label="Status" value={v.status} options={statusOptions} onSelect={(s) => set("status", s)} />

      <View style={styles.divider} />
      <H2>Contribution items (optional)</H2>
      <Muted>What volunteers can bring/contribute. Leave empty if not needed.</Muted>
      {v.contributionItems.map((it, i) => (
        <View key={i} style={styles.itemRow}>
          <View style={{ flex: 1 }}>
            <Field label={`Item ${i + 1}`} value={it.name} onChangeText={(t) => updateItem(i, { name: t })} placeholder="e.g. Water bottles" />
          </View>
          <View style={{ width: 80 }}>
            <Field label="Qty" value={it.maxQuantity} onChangeText={(t) => updateItem(i, { maxQuantity: t })} keyboardType="number-pad" />
          </View>
          <Pressable style={styles.itemRemove} onPress={() => removeItem(i)}>
            <Text style={styles.removeText}>✕</Text>
          </Pressable>
        </View>
      ))}
      <Button title="＋ Add item" variant="ghost" onPress={addItem} />

      <View style={styles.divider} />
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={submit} loading={saving} />
      <Body>Coordinators can only create activities within their assigned scope.</Body>
    </Card>
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
  preview: { width: "100%", height: 170, borderRadius: 12, backgroundColor: Brand.line },
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
  divider: { height: 1, backgroundColor: Brand.line, marginVertical: 4 },
  itemRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  itemRemove: {
    backgroundColor: Brand.rose,
    width: 38,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
