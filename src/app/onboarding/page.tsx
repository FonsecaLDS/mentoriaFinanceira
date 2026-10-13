"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { FieldError } from "@/features/auth/components/field-error";
import { createWorkspaceAction } from "@/features/tenants/actions/workspace.actions";
import {
  slugifyWorkspaceName,
  type WorkspaceInput,
  workspaceSchema,
} from "@/features/tenants/schemas/workspace.schema";

const timezones = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "UTC",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const { register, setValue, handleSubmit, formState } =
    useForm<WorkspaceInput>({
      resolver: zodResolver(workspaceSchema),
      defaultValues: {
        type: "individual",
        baseCurrency: "BRL",
        timezone: "America/Sao_Paulo",
      },
    });

  async function onSubmit(input: WorkspaceInput) {
    setMessage(undefined);
    const result = await createWorkspaceAction(input);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    if (!result.data) {
      setMessage("Workspace criado, mas não foi possível abrir o destino.");
      return;
    }
    router.replace(`/t/${result.data.slug}/dashboard`);
    router.refresh();
  }

  return (
    <AuthShell>
      <p className="text-sm font-semibold text-[var(--primary)]">
        Primeiro passo
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        Crie seu workspace
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Organize sua vida financeira em um espaço isolado e seguro.
      </p>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-5"
        noValidate
      >
        <label className="block space-y-2 text-sm font-semibold">
          <span>Nome do workspace</span>
          <input
            {...register("name", {
              onChange: (event) =>
                setValue("slug", slugifyWorkspaceName(event.target.value), {
                  shouldValidate: true,
                }),
            })}
            autoComplete="organization"
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
            placeholder="Ex.: Minha família"
          />
          <FieldError message={formState.errors.name?.message} />
        </label>
        <label className="block space-y-2 text-sm font-semibold">
          <span>Slug da URL</span>
          <input
            {...register("slug")}
            autoCapitalize="none"
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-3 font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
            placeholder="minha-familia"
          />
          <FieldError message={formState.errors.slug?.message} />
        </label>
        <label className="block space-y-2 text-sm font-semibold">
          <span>Tipo</span>
          <select
            {...register("type")}
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal outline-none focus:border-[var(--primary)]"
          >
            <option value="individual">Individual</option>
            <option value="family">Família</option>
            <option value="business">Negócio</option>
          </select>
          <FieldError message={formState.errors.type?.message} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-semibold">
            <span>Moeda principal</span>
            <select
              {...register("baseCurrency")}
              className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal outline-none focus:border-[var(--primary)]"
            >
              <option value="BRL">BRL — Real</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
            <FieldError message={formState.errors.baseCurrency?.message} />
          </label>
          <label className="block space-y-2 text-sm font-semibold">
            <span>Fuso horário</span>
            <select
              {...register("timezone")}
              className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal outline-none focus:border-[var(--primary)]"
            >
              {timezones.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
            <FieldError message={formState.errors.timezone?.message} />
          </label>
        </div>
        {message && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="min-h-11 w-full rounded-[var(--radius-md)] bg-[var(--primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          {formState.isSubmitting ? "Criando…" : "Criar workspace"}
        </button>
      </form>
      <Link
        href="/login"
        className="mt-6 block text-center text-sm text-[var(--primary)] hover:underline"
      >
        Voltar ao login
      </Link>
    </AuthShell>
  );
}
