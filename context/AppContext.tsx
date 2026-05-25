'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getDefaultCurrency } from '@/lib/currency';

type AppContextType = {
  isDark:      boolean;
  toggleTheme: () => void;
  currency:    string;
  setCurrency: (c: string) => void;
  countryCode: string;
  mounted:     boolean;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isDark,      setIsDark]      = useState(true);
  const [currency,    setCurrencyS]   = useState('TND');
  const [countryCode, setCountryCode] = useState('TN');
  const [mounted,     setMounted]     = useState(false);

  useEffect(() => {
    // ── الدولة من cookie (تكتبها proxy.ts من Vercel Geo) ──
    const match = document.cookie.match(/(?:^|;\s*)geo_country=([A-Z]{2})/);
    const code  = match?.[1] ?? 'TN';
    setCountryCode(code);

    // ── العملة: المحفوظة أو الافتراضية للدولة ──
    const savedCurrency = localStorage.getItem('currency');
    setCurrencyS(savedCurrency ?? getDefaultCurrency(code));

    // ── الثيم ──
    const savedTheme = localStorage.getItem('theme');
    setIsDark(savedTheme ? savedTheme === 'dark' : true);

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle('light', !isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark, mounted]);

  const setCurrency = (c: string) => {
    setCurrencyS(c);
    localStorage.setItem('currency', c);
  };

  return (
    <AppContext.Provider value={{
      isDark,
      toggleTheme: () => setIsDark(p => !p),
      currency,
      setCurrency,
      countryCode,
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