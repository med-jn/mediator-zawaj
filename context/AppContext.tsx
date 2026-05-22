'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Currency = 'TND' | 'USD' | 'EUR';

type AppContextType = {
  isDark:       boolean;
  toggleTheme:  () => void;
  currency:     Currency;
  setCurrency:  (c: Currency) => void;
  mounted:      boolean;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isDark,    setIsDark]    = useState(true);   // dark افتراضي
  const [currency,  setCurrencyS] = useState<Currency>('TND');
  const [mounted,   setMounted]   = useState(false);

  // ── ثيم ──────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    // افتراضي: dark (يتناسب مع هوية التطبيق)
    setIsDark(saved ? saved === 'dark' : true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // نستخدم class="light" فقط لأن globals.css يستهدف html.light
    document.documentElement.classList.toggle('light', !isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark, mounted]);

  // ── عملة ─────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('currency') as Currency;
    if (saved && (['TND', 'USD', 'EUR'] as Currency[]).includes(saved)) {
      setCurrencyS(saved);
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyS(c);
    localStorage.setItem('currency', c);
  };

  return (
    <AppContext.Provider value={{
      isDark,
      toggleTheme: () => setIsDark(p => !p),
      currency,
      setCurrency,
      mounted,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}