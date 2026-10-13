"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { FieldError } from "@/features/auth/components/field-error";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const { register, handleSubmit, formState } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(values: ResetPasswordInput) {
    setMessage(undefined);
    const { error } = await createClient().auth.updateUser({
      password: values.password,
    });
    if (error) {
      setMessage(getAuthErrorMessage(error.message));
      return;
    }
    router.replace("/login?reset=success");
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">Criar nova senha</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Defina uma senha nova para continuar protegendo sua conta.
      </p>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-5"
        noValidate
      >
        <label className="block space-y-2 text-sm font-semibold">
          <span>Nova senha</span>
          <input
            {...register("password")}
            type="password"
            autoComplete="new-password"
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
          />
          <FieldError message={formState.errors.password?.message} />
        </label>
        <label className="block space-y-2 text-sm font-semibold">
          <span>Confirmar nova senha</span>
          <input
            {...register("confirmPassword")}
            type="password"
            autoComplete="new-password"
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
          />
          <FieldError message={formState.errors.confirmPassword?.message} />
        </label>
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="min-h-11 w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          {formState.isSubmitting ? "Atualizando…" : "Atualizar senha"}
        </button>
        {message && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {message}
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
