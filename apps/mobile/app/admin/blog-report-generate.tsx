import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { Body, Button, Card, ErrorText, Field, H1, Muted, Screen, Select } from "@/components/kit";
import { apiFetch, ApiError } from "@/lib/api";
import type { SevaFormMeta } from "@/lib/types";

const ALL_CENTERS = "All centers";
const ALL_REGIONS = "All regions";
const ALL_CATEGORIES = "All categories";
const WORD_OPTIONS = ["100", "300", "500", "800", "1200", "2000"];

export default function BlogReportGenerateScreen() {
  const router = useRouter();
  const [meta, setMeta] = useState<SevaFormMeta | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [center, setCenter] = useState(ALL_CENTERS);
  const [region, setRegion] = useState(ALL_REGIONS);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [wordCount, setWordCount] = useState("300");
  const [instructions, setInstructions] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SevaFormMeta>("/api/meta/seva-form").then(setMeta).catch(() => setMeta(null));
    apiFetch<{ openaiConfigured: boolean }>("/api/blog-reports/ready")
      .then((r) => setAiReady(r.openaiConfigured))
      .catch(() => setAiReady(null));
  }, []);

  const generate = async () => {
    setError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) return setError("From date must be YYYY-MM-DD.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) return setError("To date must be YYYY-MM-DD.");
    setBusy(true);
    try {
      const res = await apiFetch<{ id: string }>("/api/blog-reports/generate", {
        method: "POST",
        json: {
          dateFrom,
          dateTo,
          centerFilter: center === ALL_CENTERS ? null : center,
          regionFilter: region === ALL_REGIONS ? null : region,
          sevaCategoryFilter: category === ALL_CATEGORIES ? null : category,
          targetWordCount: Number(wordCount),
          userInstructions: instructions.trim() || undefined,
        },
      });
      router.replace({ pathname: "/admin/blog-report", params: { id: res.id } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not generate the report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <H1>Generate report</H1>

      {aiReady === false ? (
        <Card style={{ borderColor: "#f59e0b" }}>
          <Muted>
            AI report generation isn&apos;t configured on the server (missing OpenAI key). Generation
            will fail until it&apos;s set up.
          </Muted>
        </Card>
      ) : null}

      <Card>
        <Muted>
          Summarizes approved seva stories in a date range into a narrative report. Choose a range
          and optional filters.
        </Muted>

        <Field label="From date (YYYY-MM-DD)" value={dateFrom} onChangeText={setDateFrom} placeholder="2026-01-01" />
        <Field label="To date (YYYY-MM-DD)" value={dateTo} onChangeText={setDateTo} placeholder="2026-06-30" />

        <Select
          label="Center"
          value={center}
          options={[ALL_CENTERS, ...(meta?.cities ?? [])]}
          onSelect={setCenter}
          searchable
        />
        <Select
          label="Region"
          value={region}
          options={[ALL_REGIONS, ...(meta?.regions ?? [])]}
          onSelect={setRegion}
          searchable
        />
        <Select
          label="Category"
          value={category}
          options={[ALL_CATEGORIES, ...(meta?.categories ?? [])]}
          onSelect={setCategory}
        />
        <Select label="Target length (words)" value={wordCount} options={WORD_OPTIONS} onSelect={setWordCount} />
        <Field
          label="Instructions (optional)"
          value={instructions}
          onChangeText={setInstructions}
          placeholder="Tone, focus areas, audience…"
          multiline
          style={{ height: 100, textAlignVertical: "top" }}
        />

        <ErrorText>{error}</ErrorText>
        <Button title="Generate report" onPress={generate} loading={busy} />
        <Body>Generation can take up to a minute while the AI writes your report.</Body>
      </Card>
    </Screen>
  );
}
