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
              Fundação técnica
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
              Um espaço claro para cuidar das suas finanças.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              Aplicação web responsiva preparada para evoluir com segurança,
              acessibilidade e integração Supabase.
            </p>
            <Button asChild className="mt-8">
              <Link href="/login">
                Explorar a base{" "}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
