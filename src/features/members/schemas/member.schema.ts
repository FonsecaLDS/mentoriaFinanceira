import { z } from "zod";

export const invitationSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const memberChangeSchema = z.object({
  tenantId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(["owner", "admin", "editor", "viewer"]),
  status: z.enum(["active", "suspended", "removed"]),
});

export type InvitationInput = z.infer<typeof invitationSchema>;
export type MemberChangeInput = z.infer<typeof memberChangeSchema>;
