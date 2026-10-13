import { PageContainer } from "@/components/layout/page-container";
export default function Loading() {
  return (
    <PageContainer>
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--surface-muted)]" />
      <div className="mt-6 h-48 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-muted)]" />
    </PageContainer>
  );
}
