import { NextRequest, NextResponse } from "next/server";
import { getRoutePortalSession } from "@/lib/portal/route-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasStripeSecretKey, stripeRequest } from "@/lib/stripe";

type StripeInvoice = {
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invoiceId: string }> },
) {
  const origin = request.nextUrl.origin;
  const session = await getRoutePortalSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const { invoiceId } = await context.params;
  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("invoices_v2")
    .select("stripe_invoice_id, hosted_invoice_url, invoice_pdf")
    .eq("id", invoiceId)
    .eq("company_id", session.companyId)
    .maybeSingle<{
      stripe_invoice_id: string | null;
      hosted_invoice_url: string | null;
      invoice_pdf: string | null;
    }>();

  if (!invoice) {
    return NextResponse.redirect(new URL("/billing", origin));
  }

  if (invoice.stripe_invoice_id && hasStripeSecretKey()) {
    try {
      const liveInvoice = await stripeRequest<StripeInvoice>(
        `/v1/invoices/${invoice.stripe_invoice_id}`,
      );
      const directUrl = liveInvoice.hosted_invoice_url || liveInvoice.invoice_pdf;
      if (directUrl) {
        return NextResponse.redirect(directUrl);
      }
    } catch {
      // Fall through to stored links.
    }
  }

  const fallbackUrl = invoice.hosted_invoice_url || invoice.invoice_pdf;
  if (fallbackUrl) {
    return NextResponse.redirect(fallbackUrl);
  }

  return NextResponse.redirect(new URL("/billing", origin));
}
