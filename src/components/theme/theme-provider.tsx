"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
const storageKey = "mentoria-financeira-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey) as Theme | null;
    // The browser owns this preference; the server must stay on the system default.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(saved === "light" || saved === "dark" ? saved : "system");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme === "system" ? "" : theme;
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      root.dataset.theme = media.matches ? "dark" : "light";
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: "system",
  setTheme: () => undefined,
});

export function useTheme() {
  const value = useContext(ThemeContext);
  const setTheme = (theme: Theme) => {
    window.localStorage.setItem(storageKey, theme);
    value.setTheme(theme);
  };
  return { ...value, setTheme };
}
