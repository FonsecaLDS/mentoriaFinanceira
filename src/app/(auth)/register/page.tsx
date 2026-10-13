"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { FieldError } from "@/features/auth/components/field-error";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import { isInternalPath } from "@/features/auth/lib/auth-errors";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const { register, handleSubmit, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterInput) {
    setMessage(undefined);
    const requestedNext = new URLSearchParams(window.location.search).get(
      "next",
    );
    const next =
      requestedNext && isInternalPath(requestedNext)
        ? requestedNext
        : undefined;
    const { data, error } = await createClient().auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm${next ? `?next=${encodeURIComponent(next)}` : ""}`,
      },
    });
    if (error) {
      setMessage(getAuthErrorMessage(error.message));
      return;
    }

    if (data.session) {
      router.replace(next ?? "/onboarding");
      return;
    }
    setMessage("Conta criada. Verifique seu e-mail para confirmar o cadastro.");
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Comece sua organização financeira com uma conta segura.
      </p>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-5"
        noValidate
      >
        <label className="block space-y-2 text-sm font-semibold">
          <span>Nome completo</span>
          <input
            {...register("fullName")}
            autoComplete="name"
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
          />
          <FieldError message={formState.errors.fullName?.message} />
        </label>
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
        <label className="block space-y-2 text-sm font-semibold">
          <span>Senha</span>
          <input
            {...register("password")}
            type="password"
            autoComplete="new-password"
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
          />
          <span className="text-xs font-normal text-[var(--text-secondary)]">
            Use pelo menos 8 caracteres.
          </span>
          <FieldError message={formState.errors.password?.message} />
        </label>
        <label className="block space-y-2 text-sm font-semibold">
          <span>Confirmar senha</span>
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
          {formState.isSubmitting ? "Criando conta…" : "Criar conta"}
        </button>
        {message && (
          <p className="text-sm text-[var(--success)]" role="status">
            {message}
          </p>
        )}
      </form>
      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        Já tem uma conta?{" "}
        <Link className="text-[var(--primary)] hover:underline" href="/login">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
