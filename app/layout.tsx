/**
 * app/layout.tsx — mediator-zawaj
 * ✅ نفس إعداد الخط والثيم كالتطبيق تماماً
 */
import type { Metadata, Viewport } from 'next';
import { Cairo }      from 'next/font/google';
import { Toaster }    from 'sonner';
import './globals.css';

import { AppProvider } from '@/context/AppContext';
import { WebNavbar }   from '@/components/layout/WebNavbar';

const cairo = Cairo({
  subsets:  ['arabic', 'latin'],
  weight:   ['300', '400', '500', '600', '700', '800', '900'],
  display:  'swap',
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title:       { default: 'ZAWAJ AI | منصة الوسطاء', template: '%s | زواج' },
  description: 'التعارف الجاد قصد الزواج عبر وسطاء معتمدين',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#080008' },
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
  ],
  width: 'device-width',
  initialScale: 1,
};

const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'light') document.documentElement.classList.add('light');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ margin: 0, padding: 0, overflowX: 'hidden' }}>
        <AppProvider>
          <Toaster
            position="top-center"
            dir="rtl"
            richColors
            closeButton
            duration={4000}
            toastOptions={{
              style: {
                fontFamily:   'var(--font-cairo), Cairo, sans-serif',
                fontSize:     'var(--text-sm)',
                background:   'var(--bg-elevated)',
                color:        'var(--text-main)',
                border:       '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
              },
            }}
          />
          <WebNavbar />
          <main style={{ paddingTop: 'var(--nav-h)', minHeight: '100dvh', background: 'var(--bg-main)' }}>
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}