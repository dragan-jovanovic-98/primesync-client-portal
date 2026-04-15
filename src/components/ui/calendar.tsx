"use client";

import * as React from "react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: "ghost";
};

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  locale,
  formatters,
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("bg-white p-2", className)}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          "inline-flex h-7 w-7 select-none items-center justify-center rounded-md border-0 bg-transparent p-0 text-[rgba(0,0,0,0.45)] transition-colors hover:bg-[#f5f5f5] hover:text-[#242529] aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "inline-flex h-7 w-7 select-none items-center justify-center rounded-md border-0 bg-transparent p-0 text-[rgba(0,0,0,0.45)] transition-colors hover:bg-[#f5f5f5] hover:text-[#242529] aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-7 w-full items-center justify-center px-7",
          defaultClassNames.month_caption,
        ),
        caption_label: cn("select-none text-[13px] font-semibold text-[#242529]", defaultClassNames.caption_label),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 text-center text-[11px] font-medium uppercase tracking-wide text-[rgba(0,0,0,0.35)] select-none",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        day: cn(
          "group/day relative h-9 w-9 p-0 text-center select-none",
          defaultClassNames.day,
        ),
        range_start: cn(
          "rounded-l-md bg-[#f1f3f5]",
          defaultClassNames.range_start,
        ),
        range_middle: cn("rounded-none bg-[#f1f3f5]", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-[#f1f3f5]", defaultClassNames.range_end),
        today: cn("text-[#242529]", defaultClassNames.today),
        outside: cn(
          "text-[rgba(0,0,0,0.22)] aria-selected:text-[rgba(0,0,0,0.22)]",
          defaultClassNames.outside,
        ),
        disabled: cn("text-[rgba(0,0,0,0.2)] opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...iconProps }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("h-4 w-4", className)} {...iconProps} />;
          }
          if (orientation === "right") {
            return <ChevronRightIcon className={cn("h-4 w-4", className)} {...iconProps} />;
          }
          return <ChevronDownIcon className={cn("h-4 w-4", className)} {...iconProps} />;
        },
        DayButton: ({ ...dayButtonProps }) => (
          <CalendarDayButton locale={locale} {...dayButtonProps} />
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus();
    }
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative isolate z-10 flex h-9 w-9 items-center justify-center rounded-md border-0 bg-transparent p-0 text-[13px] font-medium leading-none text-[#242529] transition-colors hover:bg-[#f5f5f5] data-[range-end=true]:bg-[#242529] data-[range-end=true]:text-white data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-[#f1f3f5] data-[range-middle=true]:text-[#242529] data-[range-start=true]:bg-[#242529] data-[range-start=true]:text-white data-[selected-single=true]:bg-[#242529] data-[selected-single=true]:text-white",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}
