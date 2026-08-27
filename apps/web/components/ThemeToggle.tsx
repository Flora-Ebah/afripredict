"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

type Mode = "light" | "dark" | "system";
const STORAGE_KEY = "afripredict-theme";

function applyTheme(mode: Mode) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && systemDark);
  document.documentElement.classList.toggle("dark", dark);
}

/** Sélecteur clair / système / sombre (pilule de la charte). */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Mode) || "system";
    setMode(stored);
    applyTheme(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem(STORAGE_KEY) as Mode) || "system";
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const select = (m: Mode) => {
    setMode(m);
    localStorage.setItem(STORAGE_KEY, m);
    applyTheme(m);
  };

  const Btn = ({ m, icon: Icon, label }: { m: Mode; icon: any; label: string }) => (
    <button
      aria-label={label}
      title={label}
      onClick={() => select(m)}
      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
        mode === m
          ? "bg-[color:var(--surface)] shadow-sm text-terra-600"
          : "text-[color:var(--gris-400)] hover:text-[color:var(--gris-700)]"
      }`}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <div className="hidden sm:flex items-center gap-0.5 rounded-full bg-[color:var(--gris-100)] p-0.5">
      <Btn m="light" icon={Sun} label="Thème clair" />
      <Btn m="system" icon={Monitor} label="Thème système" />
      <Btn m="dark" icon={Moon} label="Thème sombre" />
    </div>
  );
}
