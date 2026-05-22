import type { Metadata } from 'next';
import './globals.css';
import { AppProvider }  from '@/context/AppContext';
import { Toaster }      from 'sonner';
import { WebNavbar }    from '@/components/layout/WebNavbar';

export const metadata: Metadata = {
  title:       'زواج — منصة الوسطاء',
  description: 'التعارف الإسلامي الموثوق عبر وسطاء معتمدين',
  // subdomain: mediator.orcaup.com
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <AppProvider>
          {/* الـ Navbar ثابت — الصفحات تأخذ padding-top تلقائياً */}
          <WebNavbar />

          {/* padding-top = ارتفاع الـ Navbar */}
          <main style={{ paddingTop: 'var(--nav-h)' }}>
            {children}
          </main>

          <Toaster position="top-center" richColors />
        </AppProvider>
      </body>
    </html>
  );
}