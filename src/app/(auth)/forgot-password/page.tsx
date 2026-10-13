"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { FieldError } from "@/features/auth/components/field-error";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordInput) {
    await createClient().auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    // Keep the response neutral to avoid account enumeration.
    setSent(true);
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Informe seu e-mail e enviaremos instruções, se houver uma conta
        associada.
      </p>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-5"
        noValidate
      >
        <label className="block space-y-2 text-sm font-semibold">
          <span>E-mail</span>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
          />
          <FieldError message={formState.errors.email?.message} />
        </label>
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="min-h-11 w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          {formState.isSubmitting ? "Enviando…" : "Enviar instruções"}
        </button>
        {sent && (
          <p className="text-sm text-[var(--success)]" role="status">
            Se o e-mail estiver cadastrado, você receberá as instruções em
            instantes.
          </p>
        )}
      </form>
      <Link
        className="mt-6 block text-center text-sm text-[var(--primary)] hover:underline"
        href="/login"
      >
        Voltar ao login
      </Link>
    </AuthShell>
  );
}
