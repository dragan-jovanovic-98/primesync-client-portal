export type DashboardDateRange = {
  key: "7d" | "30d" | "90d" | "custom";
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
};

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function diffInDaysInclusive(from: Date, to: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = startOfDay(from).getTime();
  const end = startOfDay(to).getTime();
  return Math.max(1, Math.round((end - start) / msPerDay) + 1);
}

export function getDashboardDateRange(searchParams: URLSearchParams): DashboardDateRange {
  const rawRange = searchParams.get("range");
  const range =
    rawRange === "7d" || rawRange === "90d" || rawRange === "custom"
      ? rawRange
      : "30d";
  const today = new Date();
  const currentEnd = endOfDay(today);

  if (range === "custom") {
    const rawFrom = searchParams.get("from");
    const rawTo = searchParams.get("to");

    if (rawFrom && rawTo) {
      const from = startOfDay(new Date(`${rawFrom}T00:00:00`));
      const to = endOfDay(new Date(`${rawTo}T00:00:00`));

      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
        const dayCount = diffInDaysInclusive(from, to);
        const previousTo = endOfDay(addDays(from, -1));
        const previousFrom = startOfDay(addDays(from, -dayCount));

        return {
          key: "custom",
          from,
          to,
          previousFrom,
          previousTo,
        };
      }
    }
  }

  const dayCount = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const from = startOfDay(addDays(today, -(dayCount - 1)));
  const previousTo = endOfDay(addDays(from, -1));
  const previousFrom = startOfDay(addDays(from, -dayCount));

  return {
    key: range,
    from,
    to: currentEnd,
    previousFrom,
    previousTo,
  };
}
