import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { Badge, Body, Button, Card, ErrorText, H1, H2, Loading, Muted, Screen } from "@/components/kit";
import { Brand } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { buildPostHtmlDocument } from "@/lib/html";
import type { BlogReportDetail } from "@/lib/types";

const HEIGHT_JS = `
  (function () {
    var send = function () {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));
      }
    };
    send();
    window.addEventListener('load', send);
    setTimeout(send, 400);
  })();
  true;
`;

export default function BlogReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<BlogReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bodyHeight, setBodyHeight] = useState(400);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch<BlogReportDetail>(`/api/blog-reports/${id}`)
      .then(setReport)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load report."));
  }, [id]);

  const sharePdf = async () => {
    if (!report) return;
    setBusy(true);
    setError(null);
    try {
      const html = buildPostHtmlDocument(
        report.editedBody || report.generatedBody,
        report.reportTitle || "Seva blog report"
      );
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export PDF.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !report) {
    return (
      <Screen>
        <Card>
          <Muted>{error}</Muted>
        </Card>
      </Screen>
    );
  }

  if (!report) return <Loading label="Loading report…" />;

  const html = buildPostHtmlDocument(
    report.editedBody || report.generatedBody,
    report.reportTitle || "Seva blog report"
  );

  return (
    <Screen>
      <H1>{report.reportTitle || "Seva blog report"}</H1>
      <View style={styles.badgeRow}>
        <Badge text={`${report.sourcePostCount} stories`} />
        <Badge text={`~${report.targetWordCount} words`} color={Brand.purple} />
        {report.sevaCategoryFilter ? <Badge text={report.sevaCategoryFilter} color={Brand.emerald} /> : null}
      </View>
      <Muted>
        {`Range ${formatDate(report.dateFrom)} – ${formatDate(report.dateTo)}  •  ${
          report.centerFilter || report.regionFilter || "All centers"
        }`}
      </Muted>

      <Button title="Share / Save PDF" onPress={sharePdf} loading={busy} />
      <ErrorText>{error}</ErrorText>

      <Card>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={{ height: bodyHeight, backgroundColor: "#fff" }}
          scrollEnabled={false}
          injectedJavaScript={HEIGHT_JS}
          onMessage={(e) => {
            const h = Number(e.nativeEvent.data);
            if (h > 0) setBodyHeight(h + 24);
          }}
        />
      </Card>

      {report.userInstructions ? (
        <Card>
          <H2>Instructions used</H2>
          <Body>{report.userInstructions}</Body>
        </Card>
      ) : null}

      {report.sourcePosts.length > 0 ? (
        <Card>
          <H2>Source stories ({report.sourcePosts.length})</H2>
          {report.sourcePosts.map((p) => (
            <View key={p.id} style={styles.row}>
              <Body>{p.title}</Body>
              <Muted>
                {[p.authorName, p.centerCity, p.section].filter(Boolean).join("  •  ")}
              </Muted>
            </View>
          ))}
        </Card>
      ) : null}

      {report.relatedSevaActivities.length > 0 ? (
        <Card>
          <H2>Related seva activities</H2>
          {report.relatedSevaActivities.map((a) => (
            <View key={a.id} style={styles.row}>
              <Body>{a.title}</Body>
              <Muted>{[a.category, a.city, formatDate(a.startDate)].filter(Boolean).join("  •  ")}</Muted>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.line,
    paddingTop: 8,
    gap: 2,
  },
});
