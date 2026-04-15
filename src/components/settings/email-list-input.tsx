"use client";

import { useState, useCallback, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailListInput({
  name,
  label,
  initialEmails,
  placeholder,
  disabled = false,
}: {
  name: string;
  label: string;
  initialEmails: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [emails, setEmails] = useState<string[]>(initialEmails);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmail = useCallback(
    (raw: string) => {
      const email = raw.trim().toLowerCase();
      if (!email || !EMAIL_PATTERN.test(email)) return false;
      if (emails.includes(email)) return false;
      setEmails((prev) => [...prev, email]);
      return true;
    },
    [emails],
  );

  const removeEmail = useCallback((email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
        e.preventDefault();
        if (addEmail(inputValue)) {
          setInputValue("");
        }
      }
      if (e.key === "Backspace" && !inputValue && emails.length > 0) {
        setEmails((prev) => prev.slice(0, -1));
      }
    },
    [inputValue, emails, addEmail],
  );

  const handleBlur = useCallback(() => {
    if (inputValue.trim()) {
      if (addEmail(inputValue)) {
        setInputValue("");
      }
    }
  }, [inputValue, addEmail]);

  return (
    <div className="space-y-1.5">
      <label className="text-[13px] text-zinc-500">{label}</label>
      <input type="hidden" name={name} value={emails.join(",")} />
      <div
        className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-xl border border-[#e9e9ee] px-2.5 py-1.5 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-200"
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[13px] text-zinc-700"
          >
            {email}
            {!disabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEmail(email);
                }}
                className="text-zinc-400 transition-colors hover:text-zinc-700"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </span>
        ))}
        {!disabled ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={emails.length === 0 ? (placeholder ?? "Add email") : ""}
            className="min-w-[120px] flex-1 border-0 bg-transparent py-0.5 text-[14px] outline-none placeholder:text-[rgba(0,0,0,0.35)]"
          />
        ) : null}
      </div>
    </div>
  );
}
