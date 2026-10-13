"use client";

export default function GoalsError({ reset }: { reset: () => void }) {
  return (
    <div className="p-6">
      <p role="alert" className="text-sm text-[var(--danger)]">
        Não foi possível carregar metas e reservas.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-semibold"
      >
        Tentar novamente
      </button>
    </div>
  );
}
