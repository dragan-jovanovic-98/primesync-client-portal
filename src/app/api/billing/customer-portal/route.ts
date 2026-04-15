import { NextRequest, NextResponse } from "next/server";
import { getRoutePortalSession } from "@/lib/portal/route-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasStripeSecretKey, stripeRequest } from "@/lib/stripe";

type StripePortalSession = {
  url: string;
};

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const session = await getRoutePortalSession();
  if (!session || session.role !== "admin") {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("stripe_customer_id")
    .eq("company_id", session.companyId)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  const settingsUrl = new URL("/settings/billing?status=billing-portal-unavailable", origin);

  if (!client?.stripe_customer_id || !hasStripeSecretKey()) {
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const portalSession = await stripeRequest<StripePortalSession>(
      "/v1/billing_portal/sessions",
      {
        method: "POST",
        params: {
          customer: client.stripe_customer_id,
          return_url: new URL("/settings/billing", origin).toString(),
        },
      },
    );

    return NextResponse.redirect(portalSession.url);
  } catch {
    return NextResponse.redirect(settingsUrl);
  }
}
