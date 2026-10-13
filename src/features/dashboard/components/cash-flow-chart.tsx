"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  period_start: string;
  currency: string;
  income: string | number;
  expense: string | number;
  result: string | number;
  cumulative_result: string | number;
};

function amount(value: string | number) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function CashFlowChart({
  series,
  currency,
  granularity,
}: {
  series: Point[];
  currency?: string;
  granularity: "day" | "week" | "month";
}) {
  const [mode, setMode] = useState<"result" | "cumulative">("result");
  const visible = series.filter(
    (point) => !currency || point.currency === currency,
  );
  const chartData = visible.map((point) => ({
    ...point,
    label: new Date(`${point.period_start}T12:00:00`).toLocaleDateString(
      "pt-BR",
      {
        day: granularity === "month" ? undefined : "2-digit",
        month: "short",
        year: granularity === "month" ? "numeric" : undefined,
      },
    ),
    displayed:
      mode === "result"
        ? Number(point.result)
        : Number(point.cumulative_result),
  }));
  const selectedCurrency = visible[0]?.currency ?? currency ?? "";
  return (
    <section
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5"
      aria-label="Gráfico de fluxo de caixa"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Fluxo de caixa</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Receitas e despesas confirmadas por período ·{" "}
            {selectedCurrency || "selecione uma moeda"}
          </p>
        </div>
        <label className="text-sm font-semibold">
          Exibir
          <select
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as "result" | "cumulative")
            }
            className="ml-2 min-h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-2 font-normal"
          >
            <option value="result">Resultado do período</option>
            <option value="cumulative">Resultado acumulado</option>
          </select>
        </label>
      </div>
      {chartData.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--text-secondary)]">
          Não há movimentos para os filtros selecionados.
        </p>
      ) : (
        <>
          <div className="mt-5 h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  minTickGap={24}
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={amount}
                  width={72}
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    amount(Number(value)),
                    name === "income"
                      ? "Receitas"
                      : name === "expense"
                        ? "Despesas"
                        : mode === "result"
                          ? "Resultado"
                          : "Acumulado",
                  ]}
                  labelFormatter={(label) => `Período: ${label}`}
                  contentStyle={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                    borderRadius: "12px",
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === "income"
                      ? "Receitas"
                      : value === "expense"
                        ? "Despesas"
                        : "Resultado"
                  }
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="income"
                  stroke="var(--success)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="expense"
                  stroke="var(--danger)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="displayed"
                  name="result"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="sr-only">
            Série com {chartData.length} períodos. Receitas, despesas e{" "}
            {mode === "result" ? "resultado" : "resultado acumulado"} em{" "}
            {selectedCurrency}.
          </p>
        </>
      )}
    </section>
  );
}
