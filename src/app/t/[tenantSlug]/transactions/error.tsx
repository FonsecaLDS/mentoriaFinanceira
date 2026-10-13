"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl p-6">
      <div
        role="alert"
        className="rounded-[var(--radius-lg)] border border-[var(--danger)] p-5"
      >
        <h1 className="font-bold">Não foi possível carregar as transações.</h1>
        <button
          onClick={reset}
          className="mt-4 min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-4"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
