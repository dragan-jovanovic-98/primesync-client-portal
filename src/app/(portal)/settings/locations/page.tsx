import Link from "next/link";
import { requirePortalSession } from "@/lib/portal/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateLocationDetails } from "@/app/(portal)/settings/actions";
import { BusinessHoursEditor } from "@/components/settings/business-hours-editor";
import { EmailListInput } from "@/components/settings/email-list-input";
import { PhoneInput } from "@/components/settings/phone-input";

type BusinessHoursEntry = {
  open?: string | null;
  close?: string | null;
} | null;

type BusinessHoursSchedule = Partial<
  Record<
    "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
    BusinessHoursEntry
  >
>;

type LocationRow = {
  id: string;
  location_name: string | null;
  address: string | null;
  timezone: string | null;
  phone_number: string | null;
  notification_emails: string[] | null;
  post_call_emails: string[] | null;
  business_hours: BusinessHoursSchedule | null;
  config_editable: boolean | null;
  created_at: string | null;
};

type AssistantRow = {
  assistant_id: string;
  agent_name: string | null;
  phone_number: string | null;
  status: boolean | null;
  type: string | null;
  location_id: string | null;
  appointment_setting_agent: boolean | null;
};

const statusMessages: Record<string, string> = {
  "location-saved": "Location details updated.",
  "location-error": "We could not save that location.",
  "location-invalid": "Location name and timezone are required.",
  "hours-saved": "Business hours updated.",
  "hours-error": "We could not save business hours.",
  "hours-invalid": "Invalid business hours data.",
};

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Toronto", label: "Eastern Time — Canada" },
  { value: "America/Vancouver", label: "Pacific Time — Canada" },
  { value: "Europe/London", label: "GMT / London" },
  { value: "Europe/Paris", label: "CET / Paris" },
  { value: "Australia/Sydney", label: "AET / Sydney" },
];

export default async function LocationsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; location?: string }>;
}) {
  const session = await requirePortalSession({ page: "settings" });
  const { status, location: selectedLocationId } = await searchParams;
  const feedback = status ? statusMessages[status] : null;
  const supabase = await createServerSupabaseClient();
  const isAdmin = session.role === "admin";

  const [{ data: locationRows }, { data: assistantRows }] = await Promise.all([
    supabase
      .from("locations")
      .select(
        "id, location_name, address, timezone, phone_number, notification_emails, post_call_emails, business_hours, config_editable, created_at",
      )
      .eq("company_id", session.membership.company_id)
      .order("created_at", { ascending: true })
      .returns<LocationRow[]>(),
    supabase
      .from("assistants")
      .select(
        "assistant_id, agent_name, phone_number, status, type, location_id, appointment_setting_agent",
      )
      .eq("company_id", session.membership.company_id)
      .order("agent_name", { ascending: true })
      .returns<AssistantRow[]>(),
  ]);

  const locations = locationRows ?? [];
  const assistants = assistantRows ?? [];

  const activeLocation =
    locations.find((l) => l.id === selectedLocationId) || locations[0] || null;

  const agentsByLocation = new Map<string, AssistantRow[]>();
  const unassignedAgents: AssistantRow[] = [];
  for (const agent of assistants) {
    if (agent.location_id) {
      const existing = agentsByLocation.get(agent.location_id) ?? [];
      existing.push(agent);
      agentsByLocation.set(agent.location_id, existing);
    } else {
      unassignedAgents.push(agent);
    }
  }

  const locationAgents = activeLocation
    ? (agentsByLocation.get(activeLocation.id) ?? [])
    : [];

  return (
    <div className="max-w-3xl space-y-6 pb-8">
      {feedback ? (
        <p className="text-[13px] text-emerald-600">{feedback}</p>
      ) : null}

      <div>
        <h2 className="text-sm font-medium text-zinc-900">Locations</h2>
        <p className="mt-1 text-[13px] text-zinc-500">
          Manage location details, business hours, and view assigned agents.
        </p>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-zinc-200 bg-[#fbfbfb] px-5 py-8 text-[13px] text-[rgba(0,0,0,0.35)]">
          No locations found for this company.
        </div>
      ) : (
        <>
          {/* Location tabs — hidden when only one location */}
          {locations.length > 1 ? (
            <div className="flex gap-1 rounded-xl bg-[#f5f5f6] p-1">
              {locations.map((loc) => {
                const isActive = activeLocation?.id === loc.id;
                return (
                  <Link
                    key={loc.id}
                    href={`?location=${loc.id}`}
                    className={`rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                      isActive
                        ? "bg-white font-medium text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    {loc.location_name || "Untitled"}
                  </Link>
                );
              })}
            </div>
          ) : null}

          {/* Active location card */}
          {activeLocation ? (
            <div
              key={activeLocation.id}
              className="rounded-[20px] border border-zinc-200 bg-white"
            >
              {/* Location header */}
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-900">
                    {activeLocation.location_name || "Untitled location"}
                  </h3>
                  <p className="mt-1 text-[13px] text-zinc-500">
                    {TIMEZONES.find(
                      (tz) => tz.value === activeLocation.timezone,
                    )?.label ||
                      activeLocation.timezone ||
                      "No timezone set"}
                  </p>
                </div>
                {activeLocation.config_editable ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    Editable config
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                    Limited edit mode
                  </span>
                )}
              </div>

              {/* Location details form */}
              <form
                action={updateLocationDetails}
                className="space-y-5 px-5 py-5"
              >
                <input
                  type="hidden"
                  name="locationId"
                  value={activeLocation.id}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="locationName"
                      className="text-[13px] text-zinc-500"
                    >
                      Location name
                    </label>
                    <input
                      id="locationName"
                      name="locationName"
                      type="text"
                      defaultValue={activeLocation.location_name ?? ""}
                      disabled={!isAdmin}
                      className="h-10 w-full rounded-xl border border-[#e9e9ee] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)] disabled:bg-zinc-50 disabled:text-zinc-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="timezone"
                      className="text-[13px] text-zinc-500"
                    >
                      Timezone
                    </label>
                    <select
                      id="timezone"
                      name="timezone"
                      defaultValue={activeLocation.timezone ?? ""}
                      disabled={!isAdmin}
                      className="h-10 w-full rounded-xl border border-[#e9e9ee] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)] disabled:bg-zinc-50 disabled:text-zinc-500"
                    >
                      <option value="">Select timezone</option>
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label
                      htmlFor="address"
                      className="text-[13px] text-zinc-500"
                    >
                      Address
                    </label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      defaultValue={activeLocation.address ?? ""}
                      disabled={!isAdmin}
                      className="h-10 w-full rounded-xl border border-[#e9e9ee] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)] disabled:bg-zinc-50 disabled:text-zinc-500"
                    />
                  </div>

                  <PhoneInput
                    name="phoneNumber"
                    label="Location phone"
                    defaultValue={activeLocation.phone_number}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="h-px bg-zinc-200" />

                <div className="grid gap-4 md:grid-cols-2">
                  <EmailListInput
                    name="notificationEmails"
                    label="Notification emails"
                    initialEmails={activeLocation.notification_emails ?? []}
                    placeholder="Add email address"
                    disabled={!isAdmin}
                  />

                  <EmailListInput
                    name="postCallEmails"
                    label="Post-call emails"
                    initialEmails={activeLocation.post_call_emails ?? []}
                    placeholder="Add email address"
                    disabled={!isAdmin}
                  />
                </div>

                {isAdmin ? (
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-[#242529] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#111214]"
                    >
                      Save location
                    </button>
                  </div>
                ) : null}
              </form>

              {/* Business hours */}
              <div className="border-t border-zinc-200 px-5 py-5">
                <BusinessHoursEditor
                  locationId={activeLocation.id}
                  initialHours={activeLocation.business_hours}
                  disabled={!isAdmin}
                />
              </div>

              {/* Agents assigned to this location */}
              {locationAgents.length > 0 ? (
                <div className="border-t border-zinc-200 px-5 py-5">
                  <h4 className="text-[13px] font-medium text-zinc-900">
                    Assigned agents
                  </h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {locationAgents.map((agent) => (
                      <div
                        key={agent.assistant_id}
                        className="rounded-xl border border-zinc-100 bg-[#fbfbfb] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[13px] font-medium text-zinc-900">
                              {agent.agent_name || agent.assistant_id}
                            </p>
                            <p className="mt-0.5 text-[12px] text-zinc-500">
                              {agent.phone_number || "No phone number"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              agent.status === false
                                ? "bg-zinc-100 text-zinc-600"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {agent.status === false ? "Inactive" : "Active"}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-4 text-[12px] text-zinc-500">
                          <span>
                            Type:{" "}
                            <span className="capitalize text-zinc-700">
                              {agent.type || "Standard"}
                            </span>
                          </span>
                          <span>
                            {agent.appointment_setting_agent
                              ? "Handles appointments"
                              : "No appointment flows"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Unassigned agents */}
          {unassignedAgents.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-zinc-900">
                Unassigned agents
              </h3>
              <p className="mt-1 text-[13px] text-zinc-500">
                These agents are not tied to a specific location.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {unassignedAgents.map((agent) => (
                  <div
                    key={agent.assistant_id}
                    className="rounded-xl border border-zinc-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-medium text-zinc-900">
                          {agent.agent_name || agent.assistant_id}
                        </p>
                        <p className="mt-0.5 text-[12px] text-zinc-500">
                          {agent.phone_number || "No phone number"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          agent.status === false
                            ? "bg-zinc-100 text-zinc-600"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {agent.status === false ? "Inactive" : "Active"}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-4 text-[12px] text-zinc-500">
                      <span>
                        Type:{" "}
                        <span className="capitalize text-zinc-700">
                          {agent.type || "Standard"}
                        </span>
                      </span>
                      <span>
                        {agent.appointment_setting_agent
                          ? "Handles appointments"
                          : "No appointment flows"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
