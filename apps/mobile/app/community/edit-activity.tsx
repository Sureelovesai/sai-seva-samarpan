import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { Card, Loading, Muted, Screen } from "@/components/kit";
import {
  CommunityActivityForm,
  type CommunityActivityFormValues,
} from "@/components/CommunityActivityForm";
import { apiFetch, ApiError } from "@/lib/api";
import { fromCommunityActivity, toCommunityPayload } from "@/lib/communityActivity";
import type { CommunityMe, SevaFormMeta } from "@/lib/types";

type ActivityDetail = Parameters<typeof fromCommunityActivity>[0] & { id: string };

export default function EditCommunityActivityScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meta, setMeta] = useState<SevaFormMeta | null>(null);
  const [me, setMe] = useState<CommunityMe | null>(null);
  const [initial, setInitial] = useState<CommunityActivityFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [m, meData, activity] = await Promise.all([
          apiFetch<SevaFormMeta>("/api/meta/seva-form"),
          apiFetch<CommunityMe>("/api/community-outreach/me"),
          apiFetch<ActivityDetail>(`/api/community-outreach/activities/${id}`),
        ]);
        setMeta(m);
        setMe(meData);
        setInitial(fromCommunityActivity(activity));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not load this activity.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Loading label="Loading activity…" />;

  if (error || !meta || !initial || !me) {
    return (
      <Screen>
        <Card>
          <Muted>{error ?? "Could not load this activity."}</Muted>
        </Card>
      </Screen>
    );
  }

  const isAdmin = (me.roles ?? []).includes("ADMIN");
  const lockedCity = me.profile?.status === "APPROVED" ? me.profile.city : null;

  const onSubmit = async (values: CommunityActivityFormValues) => {
    await apiFetch(`/api/community-outreach/activities/${id}`, {
      method: "PATCH",
      json: toCommunityPayload(values, { includeStatus: true, isAdmin }),
    });
    router.back();
  };

  return (
    <Screen>
      <CommunityActivityForm
        meta={meta}
        initial={initial}
        mode="edit"
        isAdmin={isAdmin}
        lockedCity={lockedCity}
        submitLabel="Save changes"
        onSubmit={onSubmit}
      />
    </Screen>
  );
}
