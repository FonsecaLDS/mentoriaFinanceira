import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 sm:px-8 lg:px-12">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
        <div className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-10">
          <div className="mb-10 flex items-center gap-3 text-sm font-semibold text-[var(--primary)]">
            <ShieldCheck aria-hidden="true" className="size-5" />
            <span>Mentoria Financeira</span>
          </div>
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold tracking-[0.14em] text-[var(--text-secondary)] uppercase">
              Mais clareza para suas escolhas
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
              Um espaço claro para cuidar das suas finanças.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              Organize suas contas, acompanhe os gastos e planeje seus próximos
              passos. Tenha uma visão do seu mês e saiba quanto pode reservar
              para o que importa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/register">
                  Começar a organizar
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Já tenho uma conta</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              No celular ou no computador, direto pelo navegador.
            </p>
          </div>
          <div className="mt-10 grid gap-6 border-t border-[var(--border)] pt-8 md:grid-cols-3">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">
                Seu mês em perspectiva
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Acompanhe o que entra, o que sai e as contas que ainda vão vencer.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">
                Cartões sem surpresas
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Veja suas compras, parcelas e faturas para planejar os próximos
                pagamentos.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">
                Planos que ganham forma
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Defina orçamentos, organize suas reservas e acompanhe cada passo
                em direção às suas metas.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
