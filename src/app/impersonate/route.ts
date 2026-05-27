import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifyHandoffToken } from "@/lib/portal/impersonation-token";

// Admin -> portal impersonation entry point. Lives OUTSIDE the (portal) layout
// group so it is not subject to requirePortalSession. Verifies the signed handoff
// token, redeems the wrapped one-time magic-link to establish the observer session
// cookies, then redirects to /dashboard with the token stripped.
export const dynamic = "force-dynamic";

function fail(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/login?error=impersonation", request.url));
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function GET(request: NextRequest) {
  const secret = process.env.IMPERSONATION_TOKEN_SECRET;
  if (!secret) {
    console.error("[impersonate] IMPERSONATION_TOKEN_SECRET is not set");
    return fail(request);
  }

  const token = new URL(request.url).searchParams.get("t");
  if (!token) return fail(request);

  const payload = verifyHandoffToken(token, secret);
  if (!payload) return fail(request); // bad signature or expired

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("[impersonate] missing Supabase env");
    return fail(request);
  }

  // Bind the session cookies to the redirect response we will return.
  const res = NextResponse.redirect(new URL("/dashboard", request.url));
  res.headers.set("Referrer-Policy", "no-referrer");

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options),
        );
      },
    },
  });

  // Redeeming the magic-link is single-use (Supabase consumes token_hash).
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: payload.th,
    type: "magiclink",
  });
  if (error || !data.session) return fail(request);

  // Defense-in-depth: the established session's claim must match the signed target.
  const sessionCid = (data.user?.app_metadata as Record<string, unknown> | undefined)
    ?.impersonate_company_id;
  if (sessionCid !== payload.cid) return fail(request);

  return res;
}
