"use server";

import { createClient } from "@/lib/supabase/server";
import { memberChangeSchema } from "../schemas/member.schema";

export async function updateMemberAction(input: unknown) {
  const parsed = memberChangeSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados de membro inválidos." };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };
  const { error } = await client.rpc("update_tenant_member", {
    p_tenant_id: parsed.data.tenantId,
    p_member_id: parsed.data.memberId,
    p_role: parsed.data.role,
    p_status: parsed.data.status,
  });
  return error
    ? {
        error: error.message.includes("permission")
          ? "Você não pode executar essa ação."
          : "Não foi possível atualizar o membro.",
      }
    : { ok: true };
}

export async function removeMemberAction(tenantId: string, memberId: string) {
  return updateMemberAction({
    tenantId,
    memberId,
    role: "viewer",
    status: "removed",
  });
}
