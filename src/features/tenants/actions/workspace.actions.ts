"use server";

import { workspaceSchema } from "../schemas/workspace.schema";
import { createWorkspace } from "../services/workspace.service";
import { createClient } from "@/lib/supabase/server";

export async function createWorkspaceAction(input: unknown) {
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira os dados informados." };

  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente." };

  const { data, error } = await createWorkspace(client, parsed.data);
  if (error) {
    if (error.code === "23505") return { error: "Este slug já está em uso." };
    if (error.code === "42501")
      return {
        error: "Você precisa estar autenticado para criar um workspace.",
      };
    return { error: "Não foi possível criar o workspace." };
  }
  return { data };
}
