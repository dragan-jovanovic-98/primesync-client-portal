"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, Check, ChevronLeft, SlidersHorizontal, X } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";

interface CallFiltersProps {
  agents: Array<{ value: string; label: string }>;
  outcomes: Array<{ value: string; label: string }>;
  endedReasons: Array<{ value: string; label: string }>;
}

const btnBase =
  "flex h-9 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa]";
const chipBase =
  "flex h-9 items-center gap-2 rounded-lg bg-[#f5f7fa] px-2.5 text-[14px]";

const FILTER_KEYS = [
  "direction",
  "sentiment",
  "agent",
  "outcome",
  "ended_reason",
  "hours",
  "reviewed",
] as const;

function buildFilterDefs(
  agents: Array<{ value: string; label: string }>,
  outcomes: Array<{ value: string; label: string }>,
  endedReasons: Array<{ value: string; label: string }>,
) {
  return [
    {
      key: "direction",
      label: "Direction",
      options: [
        { value: "inbound", label: "Inbound" },
        { value: "outbound", label: "Outbound" },
      ],
    },
    {
      key: "sentiment",
      label: "Sentiment",
      options: [
        { value: "positive", label: "Positive" },
        { value: "neutral", label: "Neutral" },
        { value: "negative", label: "Negative" },
      ],
    },
    { key: "agent", label: "Agent", options: agents },
    { key: "outcome", label: "Outcome", options: outcomes },
    { key: "ended_reason", label: "Ended Reason", options: endedReasons },
    {
      key: "hours",
      label: "Hours",
      options: [
        { value: "business", label: "Business Hours" },
        { value: "after", label: "After Hours" },
      ],
    },
    {
      key: "reviewed",
      label: "Reviewed",
      options: [
        { value: "reviewed", label: "Reviewed" },
        { value: "unreviewed", label: "Unreviewed" },
      ],
    },
    { key: "duration", label: "Duration", options: [] as Array<{ value: string; label: string }> },
  ];
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    function handle(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [active, handler, ref]);
}

export function CallFilters({ agents, outcomes, endedReasons }: CallFiltersProps) {
  return (
    <>
      <div className="hidden md:contents">
        <DesktopCallFilters agents={agents} outcomes={outcomes} endedReasons={endedReasons} />
      </div>
      <div className="md:hidden">
        <MobileCallFilters agents={agents} outcomes={outcomes} endedReasons={endedReasons} />
      </div>
    </>
  );
}

function DesktopCallFilters({ agents, outcomes, endedReasons }: CallFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateOpen, setDateOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPage, setFilterPage] = useState<string | null>(null);
  const [pendingSelections, setPendingSelections] = useState<string[]>([]);
  const [durationMin, setDurationMin] = useState("");
  const [durationMax, setDurationMax] = useState("");
  const dateRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useClickOutside(dateRef, useCallback(() => setDateOpen(false), []), dateOpen);
  useClickOutside(
    filterRef,
    useCallback(() => {
      setFilterOpen(false);
      setFilterPage(null);
    }, []),
    filterOpen,
  );

  const filterDefs = buildFilterDefs(agents, outcomes, endedReasons);

  function navigate(params: URLSearchParams) {
    params.set("page", "1");
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  function applyDateRange() {
    if (!range?.from) return;
    const to = range.to ?? range.from;
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", format(range.from, "yyyy-MM-dd"));
    params.set("to", format(to, "yyyy-MM-dd"));
    navigate(params);
    setDateOpen(false);
  }

  function removeDateFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    navigate(params);
  }

  function openFilterCategory(key: string) {
    setFilterPage(key);
    if (key === "duration") {
      setDurationMin(searchParams.get("duration_min") ?? "");
      setDurationMax(searchParams.get("duration_max") ?? "");
      return;
    }
    const current = searchParams.get(key);
    setPendingSelections(current ? current.split(",") : []);
  }

  function toggleSelection(value: string) {
    setPendingSelections((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  }

  function applyFilter() {
    const params = new URLSearchParams(searchParams.toString());
    if (filterPage === "duration") {
      if (durationMin) params.set("duration_min", durationMin);
      else params.delete("duration_min");
      if (durationMax) params.set("duration_max", durationMax);
      else params.delete("duration_max");
    } else if (filterPage) {
      if (pendingSelections.length > 0) {
        params.set(filterPage, pendingSelections.join(","));
      } else {
        params.delete(filterPage);
      }
    }
    navigate(params);
    setFilterOpen(false);
    setFilterPage(null);
  }

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    navigate(params);
  }

  function getFilterDisplay(key: string) {
    const def = filterDefs.find((filter) => filter.key === key);
    const rawValue = searchParams.get(key) ?? "";
    const labels = rawValue.split(",").map((value) => {
      return def?.options.find((option) => option.value === value)?.label ?? value;
    });

    return {
      label: def?.label ?? key,
      value: labels.join(", "),
    };
  }

  function getDurationDisplay() {
    const min = searchParams.get("duration_min");
    const max = searchParams.get("duration_max");
    if (!min && !max) return null;
    if (min && max) return `${min}s – ${max}s`;
    if (min) return `≥ ${min}s`;
    return `≤ ${max}s`;
  }

  const activeFilterKeys = FILTER_KEYS.filter((key) => searchParams.get(key));
  const durationDisplay = getDurationDisplay();
  const searchFrom = searchParams.get("from");
  const searchTo = searchParams.get("to");
  const dateLabel =
    searchFrom && searchTo
      ? searchFrom === searchTo
        ? format(new Date(`${searchFrom}T00:00:00`), "MMM d")
        : `${format(new Date(`${searchFrom}T00:00:00`), "MMM d")} – ${format(
            new Date(`${searchTo}T00:00:00`),
            "MMM d",
          )}`
      : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative" ref={dateRef}>
        <button
          onClick={() => {
            setDateOpen((current) => !current);
            setFilterOpen(false);
          }}
          className={btnBase}
        >
          <CalendarIcon className="h-4 w-4" />
          Date Range
        </button>
        {dateOpen ? (
          <div className="absolute left-0 top-full z-50 mt-1.5 rounded-lg border border-[#e5e5e5] bg-white shadow-lg">
            <div className="p-3">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={1}
                disabled={{ after: new Date() }}
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] px-3 py-2">
              <button
                onClick={() => setDateOpen(false)}
                className="px-3 py-1.5 text-[13px] font-medium text-[#525866] transition-colors hover:text-[#242529]"
              >
                Cancel
              </button>
              <button
                onClick={applyDateRange}
                disabled={!range?.from}
                className="rounded-md bg-[#242529] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#3a3b3f] disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {dateLabel ? (
        <div className={chipBase}>
          <span className="text-[#242529]">Date</span>
          <span className="text-[#335cff]">{dateLabel}</span>
          <button
            onClick={removeDateFilter}
            className="ml-0.5 text-[rgba(0,0,0,0.3)] transition-colors hover:text-[#242529]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {activeFilterKeys.map((key) => {
        const { label, value } = getFilterDisplay(key);
        return (
          <div key={key} className={chipBase}>
            <span className="text-[#242529]">{label}</span>
            <span className="text-[#335cff]">{value}</span>
            <button
              onClick={() => removeFilter(key)}
              className="ml-0.5 text-[rgba(0,0,0,0.3)] transition-colors hover:text-[#242529]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      {durationDisplay ? (
        <div className={chipBase}>
          <span className="text-[#242529]">Duration</span>
          <span className="text-[#335cff]">{durationDisplay}</span>
          <button
            onClick={() => {
              removeFilter("duration_min");
              removeFilter("duration_max");
            }}
            className="ml-0.5 text-[rgba(0,0,0,0.3)] transition-colors hover:text-[#242529]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="relative" ref={filterRef}>
        <button
          onClick={() => {
            setFilterOpen((current) => !current);
            setFilterPage(null);
            setDateOpen(false);
          }}
          className={btnBase}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </button>

        {filterOpen ? (
          <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[240px] rounded-lg border border-[#e5e5e5] bg-white shadow-lg">
            {filterPage === null ? (
              <div className="py-1">
                {filterDefs.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => openFilterCategory(filter.key)}
                    className="flex w-full items-center justify-between px-3 py-2 text-[14px] text-[#242529] transition-colors hover:bg-[#f5f7fa]"
                  >
                    <span>{filter.label}</span>
                    <span className="text-[rgba(0,0,0,0.25)]">›</span>
                  </button>
                ))}
              </div>
            ) : filterPage === "duration" ? (
              <div>
                <div className="flex items-center gap-2 border-b border-[#e5e5e5] px-3 py-2.5">
                  <button
                    onClick={() => setFilterPage(null)}
                    className="text-[rgba(0,0,0,0.4)] transition-colors hover:text-[#242529]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[14px] font-medium text-[#242529]">Duration</span>
                </div>
                <div className="space-y-3 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.4)]">
                        Min
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={durationMin}
                          onChange={(event) => setDurationMin(event.target.value)}
                          placeholder="0"
                          className="h-8 w-full rounded-md border border-[#e5e5e5] px-2 pr-7 text-[14px] text-[#242529] placeholder:text-[rgba(0,0,0,0.25)] focus:border-[#335cff] focus:outline-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[rgba(0,0,0,0.3)]">
                          sec
                        </span>
                      </div>
                    </div>
                    <span className="mt-5 text-[rgba(0,0,0,0.25)]">–</span>
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.4)]">
                        Max
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={durationMax}
                          onChange={(event) => setDurationMax(event.target.value)}
                          placeholder="∞"
                          className="h-8 w-full rounded-md border border-[#e5e5e5] px-2 pr-7 text-[14px] text-[#242529] placeholder:text-[rgba(0,0,0,0.25)] focus:border-[#335cff] focus:outline-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[rgba(0,0,0,0.3)]">
                          sec
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] px-3 py-2">
                  <button
                    onClick={() => setFilterPage(null)}
                    className="px-3 py-1.5 text-[13px] font-medium text-[#525866] transition-colors hover:text-[#242529]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyFilter}
                    className="rounded-md bg-[#242529] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#3a3b3f]"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 border-b border-[#e5e5e5] px-3 py-2.5">
                  <button
                    onClick={() => setFilterPage(null)}
                    className="text-[rgba(0,0,0,0.4)] transition-colors hover:text-[#242529]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[14px] font-medium text-[#242529]">
                    {filterDefs.find((filter) => filter.key === filterPage)?.label}
                  </span>
                </div>
                <div className="max-h-[240px] overflow-y-auto py-1">
                  {filterDefs
                    .find((filter) => filter.key === filterPage)
                    ?.options.map((option) => {
                      const selected = pendingSelections.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => toggleSelection(option.value)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-[14px] text-[#242529] transition-colors hover:bg-[#f5f7fa]"
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                              selected
                                ? "border-[#335cff] bg-[#335cff]"
                                : "border-[#d4d4d8]",
                            )}
                          >
                            {selected ? <Check className="h-3 w-3 text-white" /> : null}
                          </div>
                          {option.label}
                        </button>
                      );
                    })}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] px-3 py-2">
                  <button
                    onClick={() => setFilterPage(null)}
                    className="px-3 py-1.5 text-[13px] font-medium text-[#525866] transition-colors hover:text-[#242529]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyFilter}
                    className="rounded-md bg-[#242529] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#3a3b3f]"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Mobile filters (bottom sheet) ---------- */

type StagedFilters = {
  from: string;
  to: string;
  direction: string[];
  sentiment: string[];
  agent: string[];
  outcome: string[];
  ended_reason: string[];
  hours: string[];
  reviewed: string[];
  duration_min: string;
  duration_max: string;
};

function readStagedFromParams(searchParams: URLSearchParams): StagedFilters {
  return {
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    direction: (searchParams.get("direction") ?? "").split(",").filter(Boolean),
    sentiment: (searchParams.get("sentiment") ?? "").split(",").filter(Boolean),
    agent: (searchParams.get("agent") ?? "").split(",").filter(Boolean),
    outcome: (searchParams.get("outcome") ?? "").split(",").filter(Boolean),
    ended_reason: (searchParams.get("ended_reason") ?? "").split(",").filter(Boolean),
    hours: (searchParams.get("hours") ?? "").split(",").filter(Boolean),
    reviewed: (searchParams.get("reviewed") ?? "").split(",").filter(Boolean),
    duration_min: searchParams.get("duration_min") ?? "",
    duration_max: searchParams.get("duration_max") ?? "",
  };
}

function MobileCallFilters({ agents, outcomes, endedReasons }: CallFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<StagedFilters>(() =>
    readStagedFromParams(new URLSearchParams(searchParams.toString())),
  );

  function openSheet() {
    // Re-sync staged state from current URL params each time the sheet opens.
    setStaged(readStagedFromParams(new URLSearchParams(searchParams.toString())));
    setOpen(true);
  }

  const filterDefs = useMemo(
    () => buildFilterDefs(agents, outcomes, endedReasons),
    [agents, outcomes, endedReasons],
  );

  const activeCount = useMemo(() => {
    let count = 0;
    if (searchParams.get("from") || searchParams.get("to")) count += 1;
    for (const key of FILTER_KEYS) {
      if (searchParams.get(key)) count += 1;
    }
    if (searchParams.get("duration_min") || searchParams.get("duration_max")) count += 1;
    return count;
  }, [searchParams]);

  function toggle(key: keyof StagedFilters, value: string) {
    setStaged((prev) => {
      const list = prev[key] as string[];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      return { ...prev, [key]: next };
    });
  }

  function setRange(field: "from" | "to" | "duration_min" | "duration_max", value: string) {
    setStaged((prev) => ({ ...prev, [field]: value }));
  }

  function reset() {
    setStaged({
      from: "",
      to: "",
      direction: [],
      sentiment: [],
      agent: [],
      outcome: [],
      ended_reason: [],
      hours: [],
      reviewed: [],
      duration_min: "",
      duration_max: "",
    });
  }

  function apply() {
    const params = new URLSearchParams(searchParams.toString());

    if (staged.from) params.set("from", staged.from);
    else params.delete("from");
    if (staged.to) params.set("to", staged.to);
    else params.delete("to");

    for (const key of FILTER_KEYS) {
      const list = staged[key] as string[];
      if (list.length > 0) params.set(key, list.join(","));
      else params.delete(key);
    }

    if (staged.duration_min) params.set("duration_min", staged.duration_min);
    else params.delete("duration_min");
    if (staged.duration_max) params.set("duration_max", staged.duration_max);
    else params.delete("duration_max");

    params.set("page", "1");
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={btnBase}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters{activeCount > 0 ? ` · ${activeCount}` : ""}
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Filters">
        <div className="space-y-6 px-5 py-5">
          {/* Date range */}
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
              Date range
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[12px] text-zinc-500">From</label>
                <input
                  type="date"
                  value={staged.from}
                  onChange={(e) => setRange("from", e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#e5e5e5] px-2.5 text-[14px] text-[#242529] focus:border-[#335cff] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-zinc-500">To</label>
                <input
                  type="date"
                  value={staged.to}
                  onChange={(e) => setRange("to", e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#e5e5e5] px-2.5 text-[14px] text-[#242529] focus:border-[#335cff] focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Multi-select sections */}
          {filterDefs
            .filter((def) => def.key !== "duration")
            .map((def) => (
              <section key={def.key}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
                  {def.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {def.options.length === 0 ? (
                    <p className="text-[13px] text-zinc-500">No options available</p>
                  ) : (
                    def.options.map((option) => {
                      const list = staged[def.key as keyof StagedFilters] as string[];
                      const selected = list.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggle(def.key as keyof StagedFilters, option.value)}
                          className={cn(
                            "h-8 rounded-full border px-3 text-[13px] font-medium transition-colors",
                            selected
                              ? "border-[#0F1841] bg-[#0F1841] text-white"
                              : "border-[#e5e5e5] bg-white text-[#525866] hover:bg-[#f8f9fa]",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            ))}

          {/* Duration */}
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
              Duration (seconds)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <label className="mb-1 block text-[12px] text-zinc-500">Min</label>
                <input
                  type="number"
                  min="0"
                  value={staged.duration_min}
                  onChange={(e) => setRange("duration_min", e.target.value)}
                  placeholder="0"
                  className="h-9 w-full rounded-lg border border-[#e5e5e5] px-2.5 text-[14px] text-[#242529] placeholder:text-[rgba(0,0,0,0.3)] focus:border-[#335cff] focus:outline-none"
                />
              </div>
              <div className="relative">
                <label className="mb-1 block text-[12px] text-zinc-500">Max</label>
                <input
                  type="number"
                  min="0"
                  value={staged.duration_max}
                  onChange={(e) => setRange("duration_max", e.target.value)}
                  placeholder="∞"
                  className="h-9 w-full rounded-lg border border-[#e5e5e5] px-2.5 text-[14px] text-[#242529] placeholder:text-[rgba(0,0,0,0.3)] focus:border-[#335cff] focus:outline-none"
                />
              </div>
            </div>
          </section>
        </div>

        <BottomSheet.Footer>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={reset}
              className="text-[13px] font-medium text-[#525866] transition-colors hover:text-[#242529]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={apply}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#242529] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#111214]"
            >
              Apply filters
            </button>
          </div>
        </BottomSheet.Footer>
      </BottomSheet>
    </>
  );
}
