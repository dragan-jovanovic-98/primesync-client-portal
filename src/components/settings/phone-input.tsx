"use client";

import { useState, useCallback } from "react";

const COUNTRY_CODES = [
  { code: "US", label: "US +1", dialCode: "+1" },
  { code: "CA", label: "CA +1", dialCode: "+1" },
];

function parsePhone(raw: string | null | undefined): {
  country: string;
  number: string;
} {
  if (!raw) return { country: "US", number: "" };
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return { country: "US", number: digits.slice(1) };
  }
  return { country: "US", number: digits.slice(0, 10) };
}

function formatDisplay(digits: string): string {
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function PhoneInput({
  name,
  label,
  defaultValue,
  disabled = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  disabled?: boolean;
}) {
  const parsed = parsePhone(defaultValue);
  const [country, setCountry] = useState(parsed.country);
  const [number, setNumber] = useState(parsed.number);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
      setNumber(digits);
    },
    [],
  );

  const storedValue = number ? `+1${number}` : "";

  return (
    <div className="space-y-1.5">
      <label className="text-[13px] text-zinc-500">{label}</label>
      <input type="hidden" name={name} value={storedValue} />
      <div className="flex gap-2">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={disabled}
          className="h-10 w-[90px] shrink-0 rounded-xl border border-[#e9e9ee] px-2 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)] disabled:bg-zinc-50 disabled:text-zinc-500"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={formatDisplay(number)}
          onChange={handleChange}
          disabled={disabled}
          placeholder="(555) 123-4567"
          className="h-10 w-full rounded-xl border border-[#e9e9ee] px-3 text-[14px] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[rgba(15,24,65,0.12)] disabled:bg-zinc-50 disabled:text-zinc-500"
        />
      </div>
    </div>
  );
}
