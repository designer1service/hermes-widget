import { useEffect, useState } from "react";
import Widget from "@/components/Widget";
import { applyTheme, getStoredTheme, type ThemeMode } from "@/lib/theme";

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return <Widget theme={theme} onThemeChange={setTheme} />;
}
