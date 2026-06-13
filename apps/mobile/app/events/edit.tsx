import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { Card, Loading, Muted, Screen } from "@/components/kit";
import { EventForm, type EventFormValues } from "@/components/EventForm";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canManageEvents } from "@/lib/roles";
import { cloneEventValues, fromEvent, toEventPayload } from "@/lib/portalEvent";
import type { PortalEventAdmin } from "@/lib/types";

export default function EditEventScreen() {
  const router = useRouter();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { user } = useAuth();
  const isClone = mode === "clone";

  const [initial, setInitial] = useState<EventFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const e = await apiFetch<PortalEventAdmin>(`/api/admin/portal-events/${id}`);
        const values = fromEvent(e);
        setInitial(isClone ? cloneEventValues(values) : values);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load this event.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isClone]);

  if (!canManageEvents(user)) {
    return (
      <Screen>
        <Card>
          <Muted>You don&apos;t have permission to edit events.</Muted>
        </Card>
      </Screen>
    );
  }

  if (loading) return <Loading label="Loading event…" />;

  if (error || !initial) {
    return (
      <Screen>
        <Card>
          <Muted>{error ?? "Could not load this event."}</Muted>
        </Card>
      </Screen>
    );
  }

  const onSubmit = async (values: EventFormValues) => {
    if (isClone) {
      await apiFetch("/api/admin/portal-events", { method: "POST", json: toEventPayload(values) });
    } else {
      await apiFetch(`/api/admin/portal-events/${id}`, { method: "PATCH", json: toEventPayload(values) });
    }
    router.replace("/events/manage");
  };

  return (
    <Screen>
      <EventForm
        initial={initial}
        submitLabel={isClone ? "Create clone" : "Save changes"}
        onSubmit={onSubmit}
      />
    </Screen>
  );
}
