import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, ErrorText, Field, H1, Muted } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          setError("First and last name are required.");
          setBusy(false);
          return;
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          setBusy(false);
          return;
        }
        await signUp({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          location: location.trim() || undefined,
          phone: phone.trim() || undefined,
        });
      }
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <H1>{mode === "signin" ? "Welcome back" : "Create your account"}</H1>
          <Muted>
            {mode === "signin"
              ? "Sign in to join seva and log your hours."
              : "Join to participate in seva activities."}
          </Muted>

          <Card>
            {mode === "signup" ? (
              <View style={styles.row}>
                <Field
                  label="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  style={{ flex: 1 }}
                />
                <Field
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  style={{ flex: 1 }}
                />
              </View>
            ) : null}

            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            />

            {mode === "signin" ? (
              <Pressable onPress={() => router.push("/forgot-password")}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </Pressable>
            ) : null}

            {mode === "signup" ? (
              <>
                <Field
                  label="City / center (optional)"
                  value={location}
                  onChangeText={setLocation}
                />
                <Field
                  label="Phone (optional)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </>
            ) : null}

            <ErrorText>{error}</ErrorText>
            <Button
              title={mode === "signin" ? "Sign in" : "Create account"}
              onPress={submit}
              loading={busy}
            />
          </Card>

          <Pressable
            onPress={() => {
              setError(null);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
          >
            <Text style={styles.toggle}>
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.bg },
  content: { padding: 16, gap: 12 },
  row: { flexDirection: "row", gap: 12 },
  toggle: { textAlign: "center", color: Brand.blue, fontWeight: "700", paddingVertical: 8 },
  forgot: { textAlign: "right", color: Brand.blue, fontWeight: "600", fontSize: 13, paddingVertical: 4 },
});
