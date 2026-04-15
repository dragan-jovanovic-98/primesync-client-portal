"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UsageFilterOption {
  id: string;
  label: string;
}

interface UsageFiltersProps {
  agentOptions: UsageFilterOption[];
  locationOptions: UsageFilterOption[];
}

function useUrlBuilder() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useMemo(
    () => ({
      pathname,
      currentQuery: searchParams.toString(),
      build: (updates: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set("tab", "usage");
        next.delete("page");
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === "") {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        const q = next.toString();
        return q ? `${pathname}?${q}` : pathname;
      },
    }),
    [pathname, searchParams],
  );
}

export function UsageFilters({
  agentOptions,
  locationOptions,
}: UsageFiltersProps) {
  const searchParams = useSearchParams();
  const { build } = useUrlBuilder();

  const fromValue = searchParams.get("from") ?? "";
  const toValue = searchParams.get("to") ?? "";

  function handleDateChange(key: "from" | "to", value: string) {
    window.location.assign(build({ [key]: value || null }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-[#eeeff1] bg-[#fbfbfb] px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          From
        </span>
        <input
          type="date"
          value={fromValue}
          onChange={(e) => handleDateChange("from", e.target.value)}
          className="bg-transparent text-[13px] text-[#242529] outline-none"
        />
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-[#eeeff1] bg-[#fbfbfb] px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          To
        </span>
        <input
          type="date"
          value={toValue}
          onChange={(e) => handleDateChange("to", e.target.value)}
          className="bg-transparent text-[13px] text-[#242529] outline-none"
        />
      </div>

      <MultiSelect
        paramKey="agent"
        options={agentOptions}
        label="Agent"
        emptyLabel="All agents"
        icon={<User className="h-3.5 w-3.5" />}
      />

      <MultiSelect
        paramKey="location"
        options={locationOptions}
        label="Location"
        emptyLabel="All locations"
        icon={<MapPin className="h-3.5 w-3.5" />}
      />

      {(fromValue || toValue || searchParams.get("agent") || searchParams.get("location")) ? (
        <a
          href={build({
            from: null,
            to: null,
            agent: null,
            location: null,
          })}
          className="text-[12px] font-medium text-[#525866] transition-colors hover:text-[#242529]"
        >
          Clear all
        </a>
      ) : null}
    </div>
  );
}

interface MultiSelectProps {
  paramKey: string;
  options: UsageFilterOption[];
  label: string;
  emptyLabel: string;
  icon: React.ReactNode;
}

function MultiSelect({
  paramKey,
  options,
  label,
  emptyLabel,
  icon,
}: MultiSelectProps) {
  const searchParams = useSearchParams();
  const { build } = useUrlBuilder();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedFromUrl = useMemo(() => {
    const raw = searchParams.get(paramKey);
    if (!raw) return new Set<string>();
    return new Set(raw.split(",").filter(Boolean));
  }, [searchParams, paramKey]);

  const [draft, setDraft] = useState<Set<string>>(selectedFromUrl);
  useEffect(() => {
    setDraft(selectedFromUrl);
  }, [selectedFromUrl]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function toggleDraft(id: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply() {
    const value = Array.from(draft).join(",");
    window.location.assign(build({ [paramKey]: value || null }));
    setOpen(false);
  }

  function clearDraft() {
    setDraft(new Set());
  }

  const count = selectedFromUrl.size;
  const displayLabel =
    count === 0
      ? emptyLabel
      : count === 1
        ? (options.find((o) => selectedFromUrl.has(o.id))?.label ??
          `1 ${label.toLowerCase()}`)
        : `${count} ${label.toLowerCase()}s`;

  if (options.length === 0) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setDraft(selectedFromUrl);
          setOpen((v) => !v);
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-[#eeeff1] bg-[#fbfbfb] px-3 py-1.5 text-[13px] font-medium transition-colors",
          count > 0 || open
            ? "text-[#242529]"
            : "text-[rgba(0,0,0,0.55)] hover:text-[#242529]",
        )}
      >
        {icon}
        <span>{displayLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[260px] overflow-hidden rounded-lg border border-[#eeeff1] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between border-b border-[#eeeff1] px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {label}
            </span>
            <button
              type="button"
              onClick={clearDraft}
              className="text-[12px] font-medium text-[#525866] transition-colors hover:text-[#242529]"
            >
              Clear
            </button>
          </div>

          <div className="max-h-[240px] overflow-y-auto py-1">
            {options.map((option) => {
              const checked = draft.has(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleDraft(option.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[#242529] transition-colors hover:bg-[#f5f7fa]"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      checked
                        ? "border-[#242529] bg-[#242529] text-white"
                        : "border-[#d4d4d8] bg-white",
                    )}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="flex-1 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#eeeff1] px-3 py-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-[13px] font-medium text-[#525866] transition-colors hover:text-[#242529]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              className="rounded-md bg-[#242529] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#3a3b3f]"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
