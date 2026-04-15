"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LocationFilterOption {
  id: string;
  name: string;
}

interface LocationFilterProps {
  locations: LocationFilterOption[];
}

export function LocationFilter({ locations }: LocationFilterProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedFromUrl = useMemo(() => {
    const raw = searchParams.get("locations");
    if (!raw) return new Set<string>();
    return new Set(raw.split(",").filter(Boolean));
  }, [searchParams]);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(selectedFromUrl);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const selectedCount = selectedFromUrl.size;
  const displayLabel =
    selectedCount === 0
      ? "All locations"
      : selectedCount === 1
        ? (locations.find((l) => selectedFromUrl.has(l.id))?.name ??
          "1 location")
        : `${selectedCount} locations`;

  function toggleDraft(id: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply() {
    const next = new URLSearchParams(searchParams.toString());
    if (draft.size === 0) {
      next.delete("locations");
    } else {
      next.set("locations", Array.from(draft).join(","));
    }
    const query = next.toString();
    window.location.assign(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  }

  function clearAll() {
    setDraft(new Set());
  }

  if (locations.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setDraft(selectedFromUrl);
          setOpen((value) => !value);
        }}
        className={cn(
          "flex h-[30px] items-center gap-1.5 rounded-lg border border-[#eeeff1] bg-[#fbfbfb] px-3 text-[13px] font-medium transition-colors",
          selectedCount > 0 || open
            ? "text-[#242529]"
            : "text-[rgba(0,0,0,0.55)] hover:text-[#242529]",
        )}
      >
        <MapPin className="h-3.5 w-3.5" />
        <span>{displayLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[260px] overflow-hidden rounded-lg border border-[#eeeff1] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between border-b border-[#eeeff1] px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Locations
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[12px] font-medium text-[#525866] transition-colors hover:text-[#242529]"
            >
              Clear
            </button>
          </div>

          <div className="max-h-[240px] overflow-y-auto py-1">
            {locations.map((location) => {
              const checked = draft.has(location.id);
              return (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => toggleDraft(location.id)}
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
                  <span className="flex-1 truncate">{location.name}</span>
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
