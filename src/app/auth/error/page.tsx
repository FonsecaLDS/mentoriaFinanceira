import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";

const messages: Record<string, string> = {
  confirmation: "O link de confirmação é inválido ou expirou.",
  forbidden: "Você não tem acesso a esse espaço financeiro.",
  "no-tenant":
    "Sua conta foi criada, mas ainda não participa de um espaço financeiro.",
  unavailable: "Não foi possível verificar seu acesso agora.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">
        Não foi possível continuar
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {messages[code ?? ""] ?? "Ocorreu um erro de autenticação."}
      </p>
      <Link
        className="mt-8 block min-h-11 rounded-[var(--radius-md)] bg-[var(--primary)] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
        href="/login"
      >
        Voltar ao login
      </Link>
    </AuthShell>
  );
}
