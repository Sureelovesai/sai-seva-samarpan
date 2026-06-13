/**
 * Lightweight UI kit (StyleSheet-based, no extra deps) used across screens.
 */

import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand } from "@/constants/theme";

export function Screen({
  children,
  scroll = true,
  refreshControl,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: ScrollViewProps["refreshControl"];
  contentStyle?: ViewStyle;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scrollContent, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Body({
  children,
  numberOfLines,
}: {
  children: React.ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text style={styles.body} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  const bg =
    variant === "primary" ? Brand.blue : variant === "secondary" ? Brand.emerald : "transparent";
  const textColor = variant === "ghost" ? Brand.blue : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1 },
        variant === "ghost" && styles.buttonGhost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Brand.muted}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

export function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Select({
  label,
  value,
  placeholder = "Select…",
  options,
  onSelect,
  searchable,
  dark,
}: {
  label?: string;
  value: string | null;
  placeholder?: string;
  options: string[];
  onSelect: (value: string) => void;
  searchable?: boolean;
  /** Dark panel styling (e.g. Seva Activity Calendar on home). */
  dark?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const shown = searchable && filter.trim()
    ? options.filter((o) => o.toLowerCase().includes(filter.trim().toLowerCase()))
    : options;
  const labelStyle = dark ? styles.labelDark : styles.label;
  const inputStyle = dark ? styles.inputDark : styles.input;
  const valueColor = dark ? (value ? "#fff" : "#94a3b8") : value ? Brand.ink : Brand.muted;

  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={labelStyle}>{label}</Text> : null}
      <Pressable style={inputStyle} onPress={() => setOpen(true)}>
        <Text style={{ fontSize: 14, color: valueColor }} numberOfLines={1}>
          {value || placeholder}
        </Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            {label ? <Text style={styles.h2}>{label}</Text> : null}
            {searchable ? (
              <TextInput
                value={filter}
                onChangeText={setFilter}
                placeholder="Search…"
                placeholderTextColor={Brand.muted}
                style={styles.input}
                autoFocus
              />
            ) : null}
            <FlatList
              data={shown}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.optionRow}
                  onPress={() => {
                    onSelect(item);
                    setFilter("");
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === item && { color: Brand.blue, fontWeight: "700" },
                    ]}
                  >
                    {item}
                  </Text>
                  {value === item ? <Text style={{ color: Brand.blue }}>✓</Text> : null}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.muted}>No matches.</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Toggle({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: Brand.blue, false: "#cbd5e1" }}
      />
    </View>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Brand.blue} />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </View>
  );
}

export function Badge({ text, color = Brand.sky }: { text: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.bg },
  scrollContent: { padding: 16, gap: 14 },
  card: {
    backgroundColor: Brand.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    gap: 8,
  },
  h1: { fontSize: 26, fontWeight: "800", color: Brand.ink },
  h2: { fontSize: 18, fontWeight: "700", color: Brand.ink },
  body: { fontSize: 15, color: Brand.inkSoft, lineHeight: 21 },
  muted: { fontSize: 13, color: Brand.muted },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonGhost: { borderWidth: 1, borderColor: Brand.blue },
  buttonText: { fontSize: 16, fontWeight: "700" },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: Brand.inkSoft },
  input: {
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Brand.ink,
    backgroundColor: "#fff",
  },
  labelDark: { fontSize: 12, fontWeight: "700", color: "#bae6fd" },
  inputDark: {
    borderWidth: 1,
    borderColor: "#0369a1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: "#fff",
    backgroundColor: "#0f172a",
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: "#fff",
  },
  pillActive: { backgroundColor: Brand.blue, borderColor: Brand.blue },
  pillText: { fontSize: 14, fontWeight: "600", color: Brand.inkSoft },
  pillTextActive: { color: "#fff" },
  error: { color: Brand.rose, fontSize: 14, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 12,
    maxHeight: "80%",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  optionText: { fontSize: 16, color: Brand.ink },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  toggleLabel: { fontSize: 15, color: Brand.inkSoft, fontWeight: "600", flex: 1 },
});
