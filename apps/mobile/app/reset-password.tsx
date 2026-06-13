import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, ErrorText, Field, H1, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const tokenStr = typeof token === "string" ? token : "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!tokenStr) {
    return (
      <Screen>
        <H1>Invalid reset link</H1>
        <Muted>This link is missing a token. Request a new reset link from your email.</Muted>
        <Button title="Request a new link" onPress={() => router.replace("/forgot-password")} />
        <Pressable onPress={() => router.replace("/login")}>
          <Text style={styles.link}>← Back to log in</Text>
        </Pressable>
      </Screen>
    );
  }

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const data = await apiFetch<{ message?: string }>("/api/auth/reset-password", {
        method: "POST",
        noAuth: true,
        json: { token: tokenStr, password },
      });
      setSuccess(data.message ?? "Your password has been reset. You can now log in.");
      setPassword("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <H1>Set new password</H1>
      <Muted>Enter your new password below.</Muted>

      <Card>
        {success ? (
          <>
            <View style={styles.successBox}>
              <Text style={styles.successText}>{success}</Text>
            </View>
            <Button title="Go to log in" onPress={() => router.replace("/login")} />
          </>
        ) : (
          <>
            <Field
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
            <Field
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="••••••••"
            />
            <ErrorText>{error}</ErrorText>
            <Button title="Reset password" onPress={submit} loading={busy} />
          </>
        )}
      </Card>

      {!success && (
        <Pressable onPress={() => router.replace("/login")}>
          <Text style={styles.link}>← Back to log in</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { textAlign: "center", color: Brand.blue, fontWeight: "700", paddingVertical: 8 },
  successBox: {
    backgroundColor: Brand.emerald + "18",
    borderColor: Brand.emerald + "55",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  successText: { color: Brand.emerald, fontSize: 14 },
});
