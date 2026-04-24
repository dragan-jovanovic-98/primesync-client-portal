"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function CallSearch() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchValue = searchParams.get("search") || "";

  return (
    <CallSearchInput
      key={searchValue}
      initialValue={searchValue}
      pathname={pathname}
      searchParamsString={searchParams.toString()}
    />
  );
}

function CallSearchInput({
  initialValue,
  pathname,
  searchParamsString,
}: {
  initialValue: string;
  pathname: string;
  searchParamsString: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  function updateSearch(nextValue: string) {
    setValue(nextValue);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsString);
      if (nextValue) {
        params.set("search", nextValue);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    }, 300);
  }

  function clearSearch() {
    updateSearch("");
  }

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(0,0,0,0.35)]" />
      <input
        type="text"
        placeholder="Search calls..."
        value={value}
        onChange={(event) => updateSearch(event.target.value)}
        className="h-9 w-full rounded-lg border border-[#eeeff1] bg-white pl-9 pr-9 text-[14px] text-[#242529] placeholder:text-[rgba(0,0,0,0.35)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)]"
      />
      {value ? (
        <button
          onClick={clearSearch}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[rgba(0,0,0,0.35)] transition-colors hover:bg-[#f5f5f5] hover:text-[#242529]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
