"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { acceptInvitationAction } from "@/features/members/actions/invitation.actions";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    const result = await acceptInvitationAction(token);
    if (result.error) {
      setMessage(result.error);
      setBusy(false);
    } else if (result.redirectTo) router.replace(result.redirectTo);
  }
  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">
        Convite para workspace
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Entre na sua conta para validar o e-mail e aceitar este convite.
      </p>
      <button
        type="button"
        onClick={accept}
        disabled={busy}
        className="mt-8 min-h-11 w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Validando…" : "Aceitar convite"}
      </button>
      {message && (
        <p className="mt-4 text-sm text-[var(--danger)]" role="alert">
          {message}
        </p>
      )}
      <div className="mt-6 flex justify-between text-sm">
        <Link
          href={`/login?next=/invite/${token}`}
          className="text-[var(--primary)] hover:underline"
        >
          Entrar
        </Link>
        <Link
          href={`/register?next=/invite/${token}`}
          className="text-[var(--primary)] hover:underline"
        >
          Criar conta
        </Link>
      </div>
    </AuthShell>
  );
}
