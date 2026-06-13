import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { Card, H1, Loading, Muted, Screen } from "@/components/kit";
import {
  ActivityFormValues,
  emptyActivityValues,
  SevaActivityForm,
} from "@/components/SevaActivityForm";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { allowedScopes, canManageActivities } from "@/lib/roles";
import { toActivityPayload } from "@/lib/sevaActivity";
import type { SevaFormMeta } from "@/lib/types";

export default function AddSevaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [meta, setMeta] = useState<SevaFormMeta | null>(null);
  const [initial, setInitial] = useState<ActivityFormValues | null>(null);

  useEffect(() => {
    const scope = allowedScopes(user)[0] ?? "CENTER";
    const base = emptyActivityValues(scope);
    base.coordinatorName = fullName(user?.firstName, user?.lastName, user?.name);
    base.coordinatorEmail = user?.email ?? "";
    if (scope === "CENTER" && user?.role !== "ADMIN" && user?.coordinatorCities?.length === 1) {
      base.city = user.coordinatorCities[0];
    }
    setInitial(base);
    apiFetch<SevaFormMeta>("/api/meta/seva-form").then(setMeta).catch(() => setMeta(null));
  }, [user]);

  if (!canManageActivities(user)) {
    return (
      <Screen>
        <Card>
          <Muted>You don&apos;t have permission to create seva activities.</Muted>
        </Card>
      </Screen>
    );
  }

  if (!meta || !initial) return <Loading label="Loading form…" />;

  const onSubmit = async (values: ActivityFormValues) => {
    await apiFetch("/api/admin/seva-activities", {
      method: "POST",
      json: toActivityPayload(values),
    });
    router.replace("/admin/manage-seva");
  };

  return (
    <Screen>
      <H1>New seva activity</H1>
      <SevaActivityForm
        meta={meta}
        initial={initial}
        mode="create"
        submitLabel="Create activity"
        onSubmit={onSubmit}
      />
    </Screen>
  );
}
