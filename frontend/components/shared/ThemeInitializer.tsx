"use client";

import { useEffect } from "react";
import { useCompilerStore } from "@/store/compilerStore";

export default function ThemeInitializer() {
  const { theme } = useCompilerStore();

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  }, [theme]);

  return null;
}
