import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { Body, Button, Card, ErrorText, Field, H1, H2, Muted, Pill, Screen, Toggle } from "@/components/kit";
import { Brand } from "@/constants/theme";
import {
  buildCertificateHtml,
  CertificateLayout,
  certificateFileBase,
} from "@/lib/certificate";

export default function CertificateScreen() {
  const params = useLocalSearchParams<{
    name?: string;
    hours?: string;
    activity?: string;
    location?: string;
    date?: string;
  }>();

  const [certName, setCertName] = useState(params.name ?? "");
  const [parentName, setParentName] = useState("");
  const [ageAttested, setAgeAttested] = useState(false);
  const [layout, setLayout] = useState<CertificateLayout>("portrait");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const html = useMemo(
    () =>
      buildCertificateHtml(
        {
          volunteerName: certName,
          hours: params.hours ?? "0",
          activity: params.activity ?? "",
          location: params.location ?? "",
          serviceDate: params.date ?? "",
        },
        layout
      ),
    [certName, params.hours, params.activity, params.location, params.date, layout]
  );

  const generate = () => {
    setError(null);
    if (!certName.trim()) return setError("Enter the name to appear on the certificate.");
    if (!parentName.trim()) return setError("Enter the parent or legal guardian's name.");
    if (!ageAttested) return setError("Please confirm the volunteer is 18 years old or younger.");
    setReady(true);
  };

  const sharePdf = async () => {
    setBusy(true);
    setError(null);
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: certificateFileBase(certName),
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Saved", `Certificate PDF created at:\n${uri}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the PDF.");
    } finally {
      setBusy(false);
    }
  };

  const printNow = async () => {
    setBusy(true);
    setError(null);
    try {
      await Print.printAsync({
        html,
        orientation:
          layout === "landscape" ? Print.Orientation.landscape : Print.Orientation.portrait,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open print.");
    } finally {
      setBusy(false);
    }
  };

  if (ready) {
    return (
      <Screen scroll={false} contentStyle={styles.previewScreen}>
        <View style={styles.previewWrap}>
          <WebView
            originWhitelist={["*"]}
            source={{ html }}
            style={styles.webview}
            scalesPageToFit
          />
        </View>
        <View style={styles.layoutRow}>
          <Pill label="Portrait" active={layout === "portrait"} onPress={() => setLayout("portrait")} />
          <Pill label="Landscape" active={layout === "landscape"} onPress={() => setLayout("landscape")} />
        </View>
        <ErrorText>{error}</ErrorText>
        <View style={styles.actions}>
          <Button title="Share / Save PDF" onPress={sharePdf} loading={busy} style={styles.action} />
          <Button title="Print" variant="secondary" onPress={printNow} loading={busy} style={styles.action} />
        </View>
        <Button title="Edit details" variant="ghost" onPress={() => setReady(false)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>Certificate details</H1>
      <Card>
        <H2>Volunteer certificate</H2>
        <Muted>
          Certificates are issued for SSSE students and volunteers 18 years old or younger. Confirm
          the details below.
        </Muted>

        <Field
          label="Name on the certificate"
          value={certName}
          onChangeText={setCertName}
          placeholder="Full legal name"
        />
        <Field
          label="Parent or legal guardian"
          value={parentName}
          onChangeText={setParentName}
          placeholder="Parent or guardian full name"
        />
        <Toggle
          label="I certify the volunteer is 18 years old or younger."
          value={ageAttested}
          onValueChange={setAgeAttested}
        />

        <View style={styles.summary}>
          <Muted>Service: {params.activity || "Seva"}</Muted>
          <Muted>Hours: {params.hours || "0"}</Muted>
          {params.location ? <Muted>Center: {params.location}</Muted> : null}
          {params.date ? <Muted>Date: {params.date}</Muted> : null}
        </View>

        <ErrorText>{error}</ErrorText>
        <Button title="Preview certificate" onPress={generate} />
        <Body>You can choose portrait or landscape and then share or print on the next screen.</Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  previewScreen: { flex: 1, gap: 12 },
  previewWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: "#fff",
  },
  webview: { flex: 1, backgroundColor: "#fff" },
  layoutRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  actions: { flexDirection: "row", gap: 12 },
  action: { flex: 1 },
  summary: { gap: 2, marginTop: 4 },
});
