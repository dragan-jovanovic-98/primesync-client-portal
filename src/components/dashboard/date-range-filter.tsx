"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const presets = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
] as const;

function parseStoredRange(from: string, to: string): DateRange | undefined {
  if (!from) return undefined;

  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${(to || from)}T00:00:00`);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return undefined;
  }

  return {
    from: fromDate,
    to: toDate,
  };
}

export function DateRangeFilter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRange = searchParams.get("range") || "30d";
  const searchFrom = searchParams.get("from") || "";
  const searchTo = searchParams.get("to") || "";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<DateRange | undefined>(
    parseStoredRange(searchFrom, searchTo),
  );

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function applyCustomRange() {
    if (!range?.from) return;
    const to = range.to ?? range.from;
    const next = new URLSearchParams();
    next.set("range", "custom");
    next.set("from", format(range.from, "yyyy-MM-dd"));
    next.set("to", format(to, "yyyy-MM-dd"));
    window.location.assign(`${pathname}?${next.toString()}`);
    setOpen(false);
  }

  const displayLabel =
    activeRange === "custom" && searchFrom
      ? searchFrom === (searchTo || searchFrom)
        ? format(new Date(`${searchFrom}T00:00:00`), "MMM d")
        : `${format(new Date(`${searchFrom}T00:00:00`), "MMM d")} – ${format(
            new Date(`${(searchTo || searchFrom)}T00:00:00`),
            "MMM d",
          )}`
      : "Custom";

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex h-8 items-center rounded-lg border border-[#eeeff1] bg-[#fbfbfb] p-0.5">
        {presets.map((preset) => (
          <Link
            key={preset.value}
            href={`${pathname}?range=${preset.value}`}
            className={cn(
              "flex h-[26px] items-center rounded-md px-3 text-[13px] font-medium transition-colors",
              activeRange === preset.value
                ? "bg-white text-[#242529] shadow-sm"
                : "text-[rgba(0,0,0,0.45)] hover:text-[#242529]",
            )}
          >
            {preset.label}
          </Link>
        ))}
        <button
          onClick={() => {
            setRange(parseStoredRange(searchFrom, searchTo));
            setOpen((value) => !value);
          }}
          className={cn(
            "flex h-[26px] items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors",
            activeRange === "custom" || open
              ? "bg-white text-[#242529] shadow-sm"
              : "text-[rgba(0,0,0,0.45)] hover:text-[#242529]",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {displayLabel}
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 rounded-lg border border-[#e5e5e5] bg-white shadow-lg">
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
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-[13px] font-medium text-[#525866] transition-colors hover:text-[#242529]"
            >
              Cancel
            </button>
            <button
              onClick={applyCustomRange}
              disabled={!range?.from}
              className="rounded-md bg-[#242529] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#3a3b3f] disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
