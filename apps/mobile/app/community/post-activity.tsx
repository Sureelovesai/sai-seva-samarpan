import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { Card, Loading, Muted, Screen } from "@/components/kit";
import {
  CommunityActivityForm,
  emptyCommunityActivityValues,
  type CommunityActivityFormValues,
} from "@/components/CommunityActivityForm";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toCommunityPayload } from "@/lib/communityActivity";
import { fullName } from "@/lib/format";
import type { CommunityMe, SevaFormMeta } from "@/lib/types";

export default function PostCommunityActivityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [meta, setMeta] = useState<SevaFormMeta | null>(null);
  const [me, setMe] = useState<CommunityMe | null>(null);
  const [initial, setInitial] = useState<CommunityActivityFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [m, meData] = await Promise.all([
          apiFetch<SevaFormMeta>("/api/meta/seva-form"),
          apiFetch<CommunityMe>("/api/community-outreach/me"),
        ]);
        setMeta(m);
        setMe(meData);

        const isAdmin = (meData.roles ?? []).includes("ADMIN");
        const approved = meData.profile?.status === "APPROVED" ? meData.profile : null;
        if (!isAdmin && !approved) {
          setBlocked("You need an approved partner profile to post community activities.");
          return;
        }
        const base = emptyCommunityActivityValues();
        setInitial({
          ...base,
          city: approved?.city ?? "",
          organizationName: approved?.organizationName ?? "",
          coordinatorName: fullName(user?.firstName, user?.lastName, user?.name),
          coordinatorEmail: user?.email ?? "",
        });
      } catch (e) {
        setBlocked(e instanceof ApiError ? e.message : "Could not load the form.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <Loading label="Loading…" />;

  if (blocked || !meta || !initial || !me) {
    return (
      <Screen>
        <Card>
          <Muted>{blocked ?? "Could not load the form."}</Muted>
        </Card>
      </Screen>
    );
  }

  const isAdmin = (me.roles ?? []).includes("ADMIN");
  const lockedCity = me.profile?.status === "APPROVED" ? me.profile.city : null;

  const onSubmit = async (values: CommunityActivityFormValues) => {
    await apiFetch("/api/community-outreach/activity", {
      method: "POST",
      json: toCommunityPayload(values, { includeStatus: false, isAdmin }),
    });
    router.replace("/community/manage");
  };

  return (
    <Screen>
      <CommunityActivityForm
        meta={meta}
        initial={initial}
        mode="create"
        isAdmin={isAdmin}
        lockedCity={lockedCity}
        submitLabel="Publish activity"
        onSubmit={onSubmit}
      />
    </Screen>
  );
}
