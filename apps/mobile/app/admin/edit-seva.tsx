import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { Card, H1, Loading, Muted, Screen } from "@/components/kit";
import {
  ActivityFormValues,
  SevaActivityForm,
} from "@/components/SevaActivityForm";
import { apiFetch, ApiError } from "@/lib/api";
import type { AdminSevaActivity, SevaFormMeta } from "@/lib/types";
import { fromActivity, toActivityPayload } from "@/lib/sevaActivity";

export default function EditSevaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meta, setMeta] = useState<SevaFormMeta | null>(null);
  const [initial, setInitial] = useState<ActivityFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [m, activity] = await Promise.all([
          apiFetch<SevaFormMeta>("/api/meta/seva-form"),
          apiFetch<AdminSevaActivity>(`/api/admin/seva-activities/${id}`),
        ]);
        setMeta(m);
        setInitial(fromActivity(activity));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not load activity.");
      }
    })();
  }, [id]);

  if (error) {
    return (
      <Screen>
        <Card>
          <Muted>{error}</Muted>
        </Card>
      </Screen>
    );
  }

  if (!meta || !initial) return <Loading label="Loading activity…" />;

  const onSubmit = async (values: ActivityFormValues) => {
    await apiFetch(`/api/admin/seva-activities/${id}`, {
      method: "PATCH",
      json: toActivityPayload(values),
    });
    router.replace("/admin/manage-seva");
  };

  return (
    <Screen>
      <H1>Edit activity</H1>
      <SevaActivityForm
        meta={meta}
        initial={initial}
        mode="edit"
        submitLabel="Save changes"
        onSubmit={onSubmit}
      />
    </Screen>
  );
}
