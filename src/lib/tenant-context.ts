import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export const getTenantContext = cache(async (tenantSlug: string) => {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user)
    return {
      client,
      user: null,
      tenant: null,
      tenants: [],
      membership: null,
    };

  const { data: tenants } = await client
    .from("tenants")
    .select("id, name, slug, base_currency")
    .order("name");
  const tenant = tenants?.find((item) => item.slug === tenantSlug) ?? null;
  const { data: membership } = tenant
    ? await client
        .from("tenant_members")
        .select("role")
        .eq("tenant_id", tenant.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle()
    : { data: null };

  return {
    client,
    user,
    tenant,
    tenants: tenants ?? [],
    membership,
  };
});
