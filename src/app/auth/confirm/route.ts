import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isInternalPath } from "@/features/auth/lib/auth-errors";
import type { Database } from "@/types/supabase";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const successPath =
    next && isInternalPath(next) ? String(next) : "/login?confirmed=1";
  const pendingCookies: Array<{
    name: string;
    value: string;
    options: CookieOptions;
  }> = [];
  const pendingHeaders: Record<string, string> = {};
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          pendingCookies.push(...cookiesToSet);
          Object.assign(pendingHeaders, headers);
        },
      },
    },
  );

  const error = code
    ? (await supabase.auth.exchangeCodeForSession(code)).error
    : new Error("missing code");
  const response = NextResponse.redirect(
    new URL(error ? "/auth/error?code=confirmation" : successPath, request.url),
  );
  pendingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  Object.entries(pendingHeaders).forEach(([key, value]) =>
    response.headers.set(key, value),
  );
  return response;
}
