"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, Check, ChevronLeft, SlidersHorizontal, X } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface CallFiltersProps {
  agents: Array<{ value: string; label: string }>;
  outcomes: Array<{ value: string; label: string }>;
}

const btnBase =
  "flex h-9 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 text-[14px] font-medium text-[#525866] transition-colors hover:bg-[#f8f9fa]";
const chipBase =
  "flex h-9 items-center gap-2 rounded-lg bg-[#f5f7fa] px-2.5 text-[14px]";

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

export function CallFilters({ agents, outcomes }: CallFiltersProps) {
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

  const filterDefs = [
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

  const activeFilterKeys = [
    "direction",
    "sentiment",
    "agent",
    "outcome",
    "hours",
    "reviewed",
  ].filter((key) => searchParams.get(key));
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
