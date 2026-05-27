import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Ends an admin "view as client" observer session: signs out (clears the observer
// auth cookies) and redirects to the admin dashboard. The observer *principal*
// (auth user + portal_observers row) is reaped admin-side (Phase D); this only
// ends the browser session.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || "https://admin.torqi.ai";

  const res = NextResponse.redirect(adminUrl);
  res.headers.set("Referrer-Policy", "no-referrer");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
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
    await supabase.auth.signOut(); // clears the auth cookies on `res`
  }

  return res;
}
