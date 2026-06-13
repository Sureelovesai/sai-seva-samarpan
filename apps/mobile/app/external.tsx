import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { Card, ErrorText, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";

const ALLOWED_ORIGINS = [
  "https://www.srisathyasaiglobalcouncil.org",
  "https://www.sssgcf.org",
  "https://ssssoindia.org",
];

function isValidUrl(url: string | null): url is string {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_ORIGINS.some(
      (origin) =>
        parsed.origin === origin ||
        parsed.href === origin ||
        parsed.href.startsWith(origin + "/")
    );
  } catch {
    return false;
  }
}

export default function ExternalScreen() {
  const router = useRouter();
  const { url: rawUrl } = useLocalSearchParams<{ url?: string }>();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const decoded = rawUrl ? decodeURIComponent(rawUrl) : null;
    if (!isValidUrl(decoded)) {
      setError("This link is not available to view here.");
      setUrl(null);
    } else {
      setUrl(decoded);
      setError(null);
    }
  }, [rawUrl]);

  if (error) {
    return (
      <Screen>
        <Card>
          <ErrorText>{error}</ErrorText>
          <View style={{ marginTop: 8 }}>
            <Muted>Only links from approved council domains are allowed.</Muted>
          </View>
        </Card>
        <Pressable onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>← Back</Text>
        </Pressable>
      </Screen>
    );
  }

  if (!url) {
    return (
      <Screen>
        <Card>
          <ErrorText>No URL provided.</ErrorText>
        </Card>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable onPress={() => Linking.openURL(url)} style={styles.toolButton}>
          <Text style={styles.toolButtonText}>↗ Open in browser</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.toolButton}>
          <Text style={styles.toolButtonText}>← Back</Text>
        </Pressable>
      </View>
      <WebView source={{ uri: url }} style={styles.webview} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  toolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f0f4f8",
    borderBottomWidth: 1,
    borderBottomColor: Brand.line,
  },
  toolButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 6,
  },
  toolButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Brand.ink,
  },
  button: {
    alignItems: "center",
    paddingVertical: 12,
  },
  buttonText: {
    color: Brand.blue,
    fontWeight: "700",
    fontSize: 14,
  },
  webview: { flex: 1 },
});
