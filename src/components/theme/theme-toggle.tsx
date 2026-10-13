"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "./theme-provider";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Laptop },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      className="flex rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-1"
      aria-label="Tema"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={`Tema ${label}`}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={`min-h-9 min-w-9 rounded-[var(--radius-sm)] p-2 transition-colors ${theme === value ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
        >
          <Icon className="mx-auto size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
