"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { FieldError } from "@/features/auth/components/field-error";
import {
  getAuthErrorMessage,
  isInternalPath,
} from "@/features/auth/lib/auth-errors";
import { type LoginInput, loginSchema } from "@/features/auth/schemas";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string>();
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setMessage(undefined);
    const { error } = await createClient().auth.signInWithPassword(values);
    if (error) {
      setMessage(getAuthErrorMessage(error.message));
      return;
    }

    const next = searchParams.get("next");
    const nextPath = next ?? "";
    if (isInternalPath(nextPath)) {
      router.replace(nextPath);
      return;
    }

    const { data, error: tenantError } = await createClient()
      .from("tenants")
      .select("slug")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (tenantError) {
      setMessage("Não foi possível carregar seu espaço financeiro.");
      return;
    }
    router.replace(data ? `/t/${data.slug}/dashboard` : "/onboarding");
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Acesse seu espaço financeiro com segurança.
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
        <label className="block space-y-2 text-sm font-semibold">
          <span>Senha</span>
          <input
            {...register("password")}
            type="password"
            autoComplete="current-password"
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
          />
          <FieldError message={formState.errors.password?.message} />
        </label>
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="min-h-11 w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          {formState.isSubmitting ? "Entrando…" : "Entrar"}
        </button>
        {message && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {message}
          </p>
        )}
      </form>
      <div className="mt-6 flex justify-between gap-4 text-sm">
        <Link
          className="text-[var(--primary)] hover:underline"
          href="/forgot-password"
        >
          Esqueci minha senha
        </Link>
        <Link
          className="text-[var(--primary)] hover:underline"
          href="/register"
        >
          Criar conta
        </Link>
      </div>
      {searchParams.get("confirmed") && (
        <p className="mt-4 text-sm text-[var(--success)]" role="status">
          E-mail confirmado. Você já pode entrar.
        </p>
      )}
      {searchParams.get("reset") && (
        <p className="mt-4 text-sm text-[var(--success)]" role="status">
          Senha atualizada. Entre novamente.
        </p>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="text-sm text-[var(--text-secondary)]">Carregando…</p>
        </AuthShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
