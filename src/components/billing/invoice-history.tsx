import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatBillingCurrency,
  formatShortBillingDate,
  type BillingInvoice,
} from "@/lib/billing";

const cols = "140px 120px 100px 1fr";
const cellBase = "flex items-center px-3 border-r border-[#eeeff1]";
const cellLast = "flex items-center px-3";
const headerText =
  "text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.4)]";

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  open: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  draft: { bg: "bg-zinc-100", text: "text-zinc-600", dot: "bg-zinc-400" },
  void: { bg: "bg-zinc-100", text: "text-zinc-600", dot: "bg-zinc-400" },
  uncollectible: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

export function InvoiceHistory({ invoices }: { invoices: BillingInvoice[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#eeeff1] bg-white">
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Invoice History
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="px-5 pb-5">
          <p className="text-[14px] text-[rgba(0,0,0,0.55)]">No invoices yet.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div
              className="grid border-y border-[#eeeff1]"
              style={{ gridTemplateColumns: cols }}
            >
              <div className={cn(cellBase, headerText, "h-10")}>Date</div>
              <div className={cn(cellBase, headerText, "h-10")}>Amount</div>
              <div className={cn(cellBase, headerText, "h-10")}>Status</div>
              <div className={cn(cellLast, headerText, "h-10")}>Invoice</div>
            </div>

            {invoices.map((invoice, index) => {
              const status = statusStyles[invoice.status] || statusStyles.draft;
              return (
                <div
                  key={invoice.id}
                  className={cn(
                    "grid",
                    index < invoices.length - 1 && "border-b border-[#eeeff1]",
                  )}
                  style={{ gridTemplateColumns: cols, minHeight: 40 }}
                >
                  <div className={cn(cellBase, "py-2 text-[14px] text-[#242529]")}>
                    {formatShortBillingDate(invoice.createdAt)}
                  </div>
                  <div
                    className={cn(
                      cellBase,
                      "py-2 text-[14px] font-medium tabular-nums text-[#242529]",
                    )}
                  >
                    {formatBillingCurrency(invoice.amount, invoice.currency)}
                  </div>
                  <div className={cn(cellBase, "py-2")}>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium capitalize",
                        status.bg,
                        status.text,
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                      {invoice.status}
                    </span>
                  </div>
                  <div className={cn(cellLast, "py-2")}>
                    {invoice.hostedInvoiceUrl || invoice.invoicePdf || invoice.stripeInvoiceId ? (
                      <a
                        href={`/api/billing/invoices/${invoice.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#335cff] hover:underline"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[13px] text-[rgba(0,0,0,0.3)]">Unavailable</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile card list */}
          <div className="border-t border-[#eeeff1] divide-y divide-[#eeeff1] md:hidden">
            {invoices.map((invoice) => {
              const status = statusStyles[invoice.status] || statusStyles.draft;
              const hasLink =
                invoice.hostedInvoiceUrl || invoice.invoicePdf || invoice.stripeInvoiceId;
              return (
                <div key={invoice.id} className="flex flex-col gap-1.5 px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[14px] font-medium text-[#242529]">
                      {formatShortBillingDate(invoice.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-[14px] font-medium text-[#242529]">
                        {formatBillingCurrency(invoice.amount, invoice.currency)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium capitalize",
                          status.bg,
                          status.text,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                  {hasLink ? (
                    <a
                      href={`/api/billing/invoices/${invoice.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-[#335cff] hover:underline"
                    >
                      View invoice
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-[13px] text-[rgba(0,0,0,0.35)]">
                      Invoice unavailable
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
