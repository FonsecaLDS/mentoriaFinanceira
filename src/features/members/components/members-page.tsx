"use client";

import { useState } from "react";
import {
  createInvitationAction,
  resendInvitationAction,
  revokeInvitationAction,
} from "../actions/invitation.actions";
import { updateMemberAction } from "../actions/member.actions";

type Member = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  status: string;
};
type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

export function MembersPage({
  tenantId,
  members,
  invitations,
  canManage,
}: {
  tenantId: string;
  members: Member[];
  invitations: Invitation[];
  canManage: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [message, setMessage] = useState<string>();
  const [inviteUrl, setInviteUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function invite() {
    setBusy(true);
    setMessage(undefined);
    const result = await createInvitationAction({ tenantId, email, role });
    setBusy(false);
    if (result.error) setMessage(result.error);
    else {
      setEmail("");
      setInviteUrl(`${window.location.origin}${result.inviteUrl}`);
    }
  }
  async function change(member: Member, nextRole: string, nextStatus: string) {
    setMessage(undefined);
    const result = await updateMemberAction({
      tenantId,
      memberId: member.id,
      role: nextRole,
      status: nextStatus,
    });
    if (result.error) setMessage(result.error);
    else window.location.reload();
  }
  async function revoke(id: string) {
    const result = await revokeInvitationAction(id);
    if (result.error) setMessage(result.error);
    else window.location.reload();
  }
  async function resend(id: string) {
    const result = await resendInvitationAction(id);
    if (result.error) setMessage(result.error);
    else if (result.inviteUrl)
      setInviteUrl(`${window.location.origin}${result.inviteUrl}`);
  }
  return (
    <div className="space-y-6">
      {canManage && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold">Convidar membro</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input
              aria-label="E-mail do convite"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="pessoa@exemplo.com"
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 outline-none focus:border-[var(--primary)]"
            />
            <select
              aria-label="Papel do convite"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              onClick={invite}
              disabled={busy}
              className="min-h-11 rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Gerando…" : "Gerar convite"}
            </button>
          </div>
          {inviteUrl && (
            <p
              className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-sm break-all text-[var(--success)]"
              role="status"
            >
              Link local: {inviteUrl}
            </p>
          )}
        </section>
      )}
      {message && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {message}
        </p>
      )}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-bold">Membros</h2>
        <div className="mt-4 divide-y divide-[var(--border)]">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {member.full_name ||
                    member.email ||
                    member.user_id.slice(0, 8)}
                </p>
                <p className="truncate text-sm text-[var(--text-secondary)]">
                  {member.email || "E-mail protegido"}
                </p>
              </div>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">
                {member.status}
              </span>
              {canManage && member.role !== "owner" ? (
                <>
                  <select
                    aria-label={`Papel de ${member.email || member.user_id}`}
                    value={member.role}
                    onChange={(event) =>
                      change(member, event.target.value, member.status)
                    }
                    className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      change(
                        member,
                        member.role,
                        member.status === "active" ? "suspended" : "active",
                      )
                    }
                    className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm"
                  >
                    {member.status === "active" ? "Suspender" : "Reativar"}
                  </button>
                </>
              ) : (
                <span className="text-sm font-semibold text-[var(--primary)]">
                  {member.role}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
      {canManage && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold">Convites pendentes</h2>
          <div className="mt-4 divide-y divide-[var(--border)]">
            {invitations
              .filter((invitation) => invitation.status === "pending")
              .map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-wrap items-center gap-3 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{invitation.email}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {invitation.role} · expira em{" "}
                      {new Date(invitation.expires_at).toLocaleDateString(
                        "pt-BR",
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resend(invitation.id)}
                    className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm"
                  >
                    Reenviar
                  </button>
                  <button
                    type="button"
                    onClick={() => revoke(invitation.id)}
                    className="min-h-10 rounded-[var(--radius-md)] border border-[var(--danger)] px-3 text-sm text-[var(--danger)]"
                  >
                    Revogar
                  </button>
                </div>
              ))}
            {invitations.filter((invitation) => invitation.status === "pending")
              .length === 0 && (
              <p className="py-4 text-sm text-[var(--text-secondary)]">
                Nenhum convite pendente.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
