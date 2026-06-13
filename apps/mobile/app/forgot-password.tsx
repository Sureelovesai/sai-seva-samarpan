import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Body, Button, Card, ErrorText, Field, H1, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSuccess(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    setBusy(true);
    try {
      const data = await apiFetch<{ message?: string }>("/api/auth/forgot-password", {
        method: "POST",
        noAuth: true,
        json: { email: trimmed },
      });
      setSuccess(
        data.message ??
          "If an account exists with this email, you will receive a password reset link."
      );
      setEmail("");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Something went wrong. Please try again.";
      const detail = e instanceof ApiError ? e.detail : undefined;
      setError(detail ? `${msg} ${detail}` : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <H1>Forgot password</H1>
      <Muted>Enter your email and we&apos;ll send you a link to reset your password.</Muted>

      <Card>
        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          editable={!success}
        />

        <ErrorText>{error}</ErrorText>
        <Button title="Send reset link" onPress={submit} loading={busy} disabled={!!success} />
      </Card>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>← Back to log in</Text>
      </Pressable>
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
