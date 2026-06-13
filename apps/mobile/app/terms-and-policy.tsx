import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Body, Button, Card, ErrorText, H1, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { buildWaiverHtml, WAIVER_INTRO, WAIVER_SECTIONS, WAIVER_TITLE } from "@/lib/waiver";

export default function TermsAndPolicyScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sharePdf = async () => {
    setBusy(true);
    setError(null);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildWaiverHtml() });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Service Activities Waiver",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Saved", `Waiver PDF created at:\n${uri}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <H1>{WAIVER_TITLE}</H1>
      <Body>{WAIVER_INTRO}</Body>

      {WAIVER_SECTIONS.map((s) => (
        <Card key={s.num}>
          <View style={styles.headRow}>
            <View style={styles.numBadge}>
              <Text style={styles.numText}>{s.num}</Text>
            </View>
            <Text style={styles.sectionTitle}>{s.title}</Text>
          </View>
          <Body>{s.body}</Body>
        </Card>
      ))}

      <ErrorText>{error}</ErrorText>
      <Button title="Download / share waiver (PDF)" onPress={sharePdf} loading={busy} />
      <Muted>
        By joining a seva activity or event, participants acknowledge and agree to the terms above.
      </Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  numBadge: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { color: "#4338ca", fontWeight: "800", fontSize: 14 },
  sectionTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: Brand.ink },
});
