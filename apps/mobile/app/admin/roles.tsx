import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, ErrorText, Field, H1, H2, Loading, Muted, Screen, Select } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import type { AppRole, RoleAssignment } from "@/lib/types";

const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Admin",
  BLOG_ADMIN: "Blog Admin",
  VOLUNTEER: "Volunteer",
  SEVA_COORDINATOR: "Seva Coordinator (center)",
  REGIONAL_SEVA_COORDINATOR: "Regional Seva Coordinator",
  NATIONAL_SEVA_COORDINATOR: "National Seva Coordinator",
  EVENT_ADMIN: "Event Admin",
};
const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as AppRole[];

export default function RolesScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole | null>(null);
  const [cities, setCities] = useState("");
  const [regions, setRegions] = useState("");
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<RoleAssignment[]>("/api/admin/roles");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load roles.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await load();
        setLoading(false);
      })();
    }, [load])
  );

  useEffect(() => {
    apiFetch<{ cities?: string[] }>("/api/meta/seva-form")
      .then((meta) => setCityOptions(meta.cities ?? []))
      .catch(() => setCityOptions([]));
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setEmail("");
    setRole(null);
    setCities("");
    setRegions("");
    setFormError(null);
  };

  const startEdit = (r: RoleAssignment) => {
    setEditingId(r.id);
    setEmail(r.email);
    setRole(r.role);
    setCities(r.cities?.split(",")[0]?.trim() ?? "");
    setRegions(r.regions ?? "");
    setFormError(null);
  };

  const save = async () => {
    setFormError(null);
    if (!email.trim()) return setFormError("Email is required.");
    if (!role) return setFormError("Role is required.");
    const body: Record<string, unknown> = {
      email: email.trim(),
      role,
      cities: role === "SEVA_COORDINATOR" ? cities.trim() : null,
      regions: role === "REGIONAL_SEVA_COORDINATOR" ? regions.trim() : null,
    };
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/api/admin/roles/${editingId}`, { method: "PATCH", json: body });
      } else {
        await apiFetch("/api/admin/roles", { method: "POST", json: body });
      }
      resetForm();
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Could not save role.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (r: RoleAssignment) => {
    Alert.alert("Remove role?", `Remove ${ROLE_LABELS[r.role]} from ${r.email}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/admin/roles/${r.id}`, { method: "DELETE" });
            setRows((prev) => prev.filter((x) => x.id !== r.id));
          } catch (e) {
            Alert.alert("Delete failed", e instanceof ApiError ? e.message : "Try again.");
          }
        },
      },
    ]);
  };

  if (!isAdmin(user)) {
    return (
      <Screen>
        <Card>
          <Muted>Role management is restricted to Admins.</Muted>
        </Card>
      </Screen>
    );
  }

  if (loading) return <Loading label="Loading roles…" />;

  return (
    <Screen>
      <H1>Roles</H1>

      <Card>
        <H2>{editingId ? "Edit role" : "Add role"}</H2>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Select label="Role" value={role ? ROLE_LABELS[role] : null} placeholder="Select role" options={ROLE_OPTIONS.map((r) => ROLE_LABELS[r])} onSelect={(label) => {
          const found = ROLE_OPTIONS.find((r) => ROLE_LABELS[r] === label);
          if (found) setRole(found);
        }} />
        {role === "SEVA_COORDINATOR" ? (
          <Select
            label="Sri Sathya Sai Center/Group"
            value={cities || null}
            placeholder="Select city"
            options={cityOptions}
            onSelect={setCities}
            searchable
          />
        ) : null}
        {role === "REGIONAL_SEVA_COORDINATOR" ? (
          <Field label="Regions (comma-separated)" value={regions} onChangeText={setRegions} placeholder="Region 3, Region 7/8" />
        ) : null}
        <ErrorText>{formError}</ErrorText>
        <Button title={editingId ? "Save changes" : "Add role"} onPress={save} loading={saving} />
        {editingId ? <Button title="Cancel edit" variant="ghost" onPress={resetForm} /> : null}
      </Card>

      {error ? (
        <Card>
          <Muted>{error}</Muted>
        </Card>
      ) : null}

      {rows.map((r) => (
        <Card key={r.id}>
          <Text style={styles.email}>{r.email}</Text>
          <Muted>{ROLE_LABELS[r.role]}</Muted>
          {r.cities ? <Muted>Cities: {r.cities}</Muted> : null}
          {r.regions ? <Muted>Regions: {r.regions}</Muted> : null}
          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={() => startEdit(r)}>
              <Text style={styles.actionText}>Edit</Text>
            </Pressable>
            <Pressable style={[styles.action, styles.deleteAction]} onPress={() => confirmDelete(r)}>
              <Text style={[styles.actionText, { color: "#fff" }]}>Remove</Text>
            </Pressable>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  email: { fontSize: 16, fontWeight: "700", color: Brand.ink },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  action: {
    borderWidth: 1,
    borderColor: Brand.blue,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionText: { color: Brand.blue, fontWeight: "700", fontSize: 13 },
  deleteAction: { backgroundColor: Brand.rose, borderColor: Brand.rose },
});
