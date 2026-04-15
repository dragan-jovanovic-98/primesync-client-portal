"use client";

import { useState, useCallback } from "react";
import { updateBusinessHours } from "@/app/(portal)/settings/actions";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type DayEntry = {
  enabled: boolean;
  open: string;
  close: string;
};

type BusinessHoursSchedule = Partial<
  Record<DayKey, { open?: string | null; close?: string | null } | null>
>;

const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "17:00";

function initializeHours(
  initial: BusinessHoursSchedule | null,
): Record<DayKey, DayEntry> {
  const result = {} as Record<DayKey, DayEntry>;
  for (const { key } of DAYS) {
    const entry = initial?.[key];
    if (entry?.open && entry?.close) {
      result[key] = { enabled: true, open: entry.open, close: entry.close };
    } else {
      result[key] = { enabled: false, open: DEFAULT_OPEN, close: DEFAULT_CLOSE };
    }
  }
  return result;
}

function serializeHours(hours: Record<DayKey, DayEntry>): string {
  const result: Record<string, { open: string; close: string }> = {};
  for (const { key } of DAYS) {
    const entry = hours[key];
    if (entry.enabled) {
      result[key] = { open: entry.open, close: entry.close };
    }
  }
  return JSON.stringify(result);
}

export function BusinessHoursEditor({
  locationId,
  initialHours,
  disabled = false,
}: {
  locationId: string;
  initialHours: BusinessHoursSchedule | null;
  disabled?: boolean;
}) {
  const [hours, setHours] = useState(() => initializeHours(initialHours));

  const updateDay = useCallback(
    (day: DayKey, patch: Partial<DayEntry>) => {
      setHours((prev) => ({
        ...prev,
        [day]: { ...prev[day], ...patch },
      }));
    },
    [],
  );

  const applyToWeekdays = useCallback(() => {
    const mon = hours.mon;
    setHours((prev) => ({
      ...prev,
      tue: { ...mon },
      wed: { ...mon },
      thu: { ...mon },
      fri: { ...mon },
    }));
  }, [hours.mon]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-medium text-zinc-900">
          Business hours
        </h4>
        {!disabled ? (
          <button
            type="button"
            onClick={applyToWeekdays}
            className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            Apply Mon to all weekdays
          </button>
        ) : null}
      </div>

      <div className="rounded-lg border border-zinc-200">
        {DAYS.map(({ key, label }, index) => {
          const entry = hours[key];
          const isLast = index === DAYS.length - 1;

          return (
            <div
              key={key}
              className={`flex items-center gap-3 px-3 py-2.5 ${
                !isLast ? "border-b border-zinc-100" : ""
              }`}
            >
              <label className="flex w-[100px] shrink-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  disabled={disabled}
                  onChange={(e) =>
                    updateDay(key, { enabled: e.target.checked })
                  }
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-[#242529] focus:ring-zinc-300"
                />
                <span className="text-[13px] font-medium text-zinc-700">
                  {label.slice(0, 3)}
                </span>
              </label>

              {entry.enabled ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={entry.open}
                    disabled={disabled}
                    step="900"
                    onChange={(e) => updateDay(key, { open: e.target.value })}
                    className="h-8 rounded-lg border border-[#eeeff1] px-2 text-[13px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-500"
                  />
                  <span className="text-[12px] text-zinc-400">to</span>
                  <input
                    type="time"
                    value={entry.close}
                    disabled={disabled}
                    step="900"
                    onChange={(e) => updateDay(key, { close: e.target.value })}
                    className="h-8 rounded-lg border border-[#eeeff1] px-2 text-[13px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-500"
                  />
                </div>
              ) : (
                <span className="text-[13px] text-zinc-400">Closed</span>
              )}
            </div>
          );
        })}
      </div>

      {!disabled ? (
        <form action={updateBusinessHours}>
          <input type="hidden" name="locationId" value={locationId} />
          <input
            type="hidden"
            name="businessHours"
            value={serializeHours(hours)}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-[#242529] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#111214]"
            >
              Save hours
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
