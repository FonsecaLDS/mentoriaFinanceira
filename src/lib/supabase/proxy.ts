import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/supabase";
import { supabasePublishableKey, supabaseUrl } from "./config";

const authRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

function redirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const protectedMatch = pathname.match(/^\/t\/([^/]+)/);

  if (!user && pathname === "/onboarding") {
    return redirect(request, "/login?next=%2Fonboarding");
  }

  if (!user && protectedMatch) {
    const next = `${pathname}${request.nextUrl.search}`;
    return redirect(request, `/login?next=${encodeURIComponent(next)}`);
  }

  if (user && authRoutes.includes(pathname)) {
    const { data, error } = await supabase
      .from("tenants")
      .select("slug")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return redirect(request, "/auth/error?code=unavailable");
    return redirect(
      request,
      data ? `/t/${data.slug}/dashboard` : "/onboarding",
    );
  }

  return response;
}
