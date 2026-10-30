import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { PUBLIC_PATHS, SUPABASE_PUBLISHABLE_KEY, supabaseUrl } from "@/lib/supabaseConfig";

/**
 * Keeps the Supabase session cookie fresh on every request and sends anyone
 * who isn't signed in to /login (API calls get a 401 instead). Pages and
 * route handlers still check the viewer themselves; this is the outer gate.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`));
  // The dev-only scene gallery (it 404s in production anyway).
  const devTool = process.env.NODE_ENV !== "production" && path.startsWith("/dev/");
  if (user || isPublic || devTool) return response;

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  if (path !== "/") login.searchParams.set("next", path);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except build assets and the static files the sign-in page itself needs.
  // /p/ (photos), /a/ (avatars) and /v/ (voice notes) check the viewer themselves, so a page of thumbnails skips a session round trip each.
  // /api/cron/ is called by Vercel Cron, not a signed-in person, and checks CRON_SECRET itself.
  // /3d/ is the CC0 character and prop models: static, public, and fetched in bursts.
  matcher: ["/((?!_next/static|_next/image|vendor/|api/cron/|3d/|p/|a/|v/|icon.svg|apple-icon.png|favicon.ico).*)"],
};
