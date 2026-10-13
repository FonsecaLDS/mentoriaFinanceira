"use server";

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { invitationSchema } from "../schemas/member.schema";

const expiresInDays = 7;
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createInvitationAction(input: unknown) {
  const parsed = invitationSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Confira o e-mail e o papel escolhido." };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };
  const token = randomBytes(32).toString("hex");
  const { data, error } = await client.rpc("create_tenant_invitation", {
    p_tenant_id: parsed.data.tenantId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
    p_token_hash: tokenHash(token),
    p_expires_at: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
  });
  if (error || !data?.[0]) {
    if (
      error?.code === "23505" ||
      error?.message.includes("pending invitation")
    )
      return { error: "Já existe um convite pendente para este e-mail." };
    return {
      error: error?.message.includes("permission")
        ? "Você não pode convidar membros."
        : "Não foi possível criar o convite.",
    };
  }
  return { inviteUrl: `/invite/${token}` };
}

export async function revokeInvitationAction(invitationId: string) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };
  const { data, error } = await client.rpc("revoke_tenant_invitation", {
    p_invitation_id: invitationId,
  });
  return error || !data
    ? { error: "Não foi possível revogar o convite." }
    : { ok: true };
}

export async function resendInvitationAction(invitationId: string) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };
  const token = randomBytes(32).toString("hex");
  const { data, error } = await client.rpc("resend_tenant_invitation", {
    p_invitation_id: invitationId,
    p_token_hash: tokenHash(token),
    p_expires_at: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
  });
  return error || !data?.[0]
    ? { error: "Não foi possível reenviar o convite." }
    : { inviteUrl: `/invite/${token}` };
}

export async function acceptInvitationAction(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return { error: "Convite inválido." };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Faça login para aceitar este convite." };
  const { data, error } = await client.rpc("accept_tenant_invitation_by_hash", {
    p_token_hash: tokenHash(token),
  });
  if (error || !data)
    return {
      error: "Este convite é inválido, expirou ou pertence a outro e-mail.",
    };
  const { data: tenant } = await client
    .from("tenants")
    .select("slug")
    .eq("id", data.tenant_id)
    .maybeSingle();
  return tenant
    ? { redirectTo: `/t/${tenant.slug}/dashboard` }
    : { error: "Workspace indisponível." };
}
