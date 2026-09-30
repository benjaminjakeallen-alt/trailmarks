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
  if (user || isPublic) return response;

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
  matcher: ["/((?!_next/static|_next/image|vendor/|icon.svg|apple-icon.png|favicon.ico).*)"],
};
