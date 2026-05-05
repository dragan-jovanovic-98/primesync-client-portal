import { NextRequest, NextResponse } from "next/server";
import { getRoutePortalSession } from "@/lib/portal/route-session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Redirects a portal user to the cached Stripe-hosted invoice URL.
 *
 * Historical (pre-2026-05) versions of this route also did a live `GET /v1/invoices/{id}`
 * fetch and used the live `hosted_invoice_url` / `invoice_pdf` if available, falling back
 * to the cached values. After the migration to a dual-account world (Primesync legacy +
 * TorQi primary), the portal stays single-account TorQi — but legacy invoices live in the
 * Primesync account and a live fetch with the TorQi key would 404 for those.
 *
 * Resolution: drop the live fetch entirely. The cached `hosted_invoice_url` / `invoice_pdf`
 * columns on `invoices_v2` are populated by the admin webhook handler at invoice creation
 * and don't expire on the Stripe side, so they're sufficient for both legacy and primary
 * invoices.
 */
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
    .select("hosted_invoice_url, invoice_pdf")
    .eq("id", invoiceId)
    .eq("company_id", session.companyId)
    .maybeSingle<{
      hosted_invoice_url: string | null;
      invoice_pdf: string | null;
    }>();

  if (!invoice) {
    return NextResponse.redirect(new URL("/billing", origin));
  }

  const url = invoice.hosted_invoice_url || invoice.invoice_pdf;
  if (url) {
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL("/billing", origin));
}
