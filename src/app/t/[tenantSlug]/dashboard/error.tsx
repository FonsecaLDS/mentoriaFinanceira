"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="p-6">
      <section className="mx-auto max-w-xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="text-xl font-bold">
          Não foi possível carregar o dashboard
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Tente novamente para consultar os dados financeiros.
        </p>
        <button
          onClick={reset}
          className="mt-5 min-h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 font-semibold text-white"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
