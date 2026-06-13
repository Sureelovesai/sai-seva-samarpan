import { useRouter } from "expo-router";

import { Card, Muted, Screen } from "@/components/kit";
import { EventForm, emptyEventValues, type EventFormValues } from "@/components/EventForm";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canManageEvents } from "@/lib/roles";
import { toEventPayload } from "@/lib/portalEvent";

export default function AddEventScreen() {
  const router = useRouter();
  const { user } = useAuth();

  if (!canManageEvents(user)) {
    return (
      <Screen>
        <Card>
          <Muted>You don&apos;t have permission to add events.</Muted>
        </Card>
      </Screen>
    );
  }

  const onSubmit = async (values: EventFormValues) => {
    await apiFetch("/api/admin/portal-events", {
      method: "POST",
      json: toEventPayload(values),
    });
    router.replace("/events/manage");
  };

  return (
    <Screen>
      <EventForm initial={emptyEventValues()} submitLabel="Create event" onSubmit={onSubmit} />
    </Screen>
  );
}
