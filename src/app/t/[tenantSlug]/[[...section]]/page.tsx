import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

const titles: Record<string, string> = {
  transactions: "Transações",
  accounts: "Contas",
  cards: "Cartões",
  planning: "Planejamento",
  goals: "Metas",
  reports: "Relatórios",
  "settings/general": "Configurações",
};

export default async function SectionPlaceholder({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const section = (await params).section?.join("/") ?? "dashboard";
  return (
    <PageContainer>
      <PageHeader
        title={titles[section] ?? "Módulo"}
        description="Este espaço está preparado para receber o próximo módulo do produto."
      />
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--text-secondary)]">
        Nenhuma funcionalidade financeira foi implementada nesta etapa.
      </div>
    </PageContainer>
  );
}
