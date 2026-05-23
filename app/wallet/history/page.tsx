'use client';

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import Link                    from 'next/link';
import { supabase }            from '@/lib/supabase/client';
import { LoveCoin }            from '@/components/ui/LoveCoin';
import { Loader2, ChevronRight } from 'lucide-react';

interface PaymentRow {
  payment_id:     string;
  coins_amount:   number;
  display_amount: number;
  currency:       string;
  status:         string;
  created_at:     string;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    completed: { bg: 'rgba(52,211,153,0.1)',       color: '#34d399',              border: 'rgba(52,211,153,0.3)',  label: 'مكتمل' },
    pending:   { bg: 'var(--color-primary-xsoft)', color: 'var(--color-primary)', border: 'var(--border-soft)',    label: 'معلّق' },
    failed:    { bg: 'rgba(239,68,68,0.1)',         color: '#f87171',              border: 'rgba(239,68,68,0.3)',   label: 'فاشل'  },
    expired:   { bg: 'rgba(107,114,128,0.1)',       color: '#9ca3af',              border: 'rgba(107,114,128,0.3)', label: 'منتهي' },
  };
  const c = map[status] ?? map.pending;
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      padding: '3px 10px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}

export default function WalletHistoryPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth?return=/wallet/history'); return; }

      const { data } = await supabase
        .from('konnect_payments')
        .select('payment_id, coins_amount, display_amount, currency, status, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(60);

      setPayments(data ?? []);
      setLoading(false);
    })();
  }, [router]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ar-TN', { day: 'numeric', month: 'long', year: 'numeric' });

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit', hour12: false });

  const fmtPrice = (amount: number, currency: string) => {
    const decimals = currency === 'TND' ? 3 : 2;
    return amount.toLocaleString('fr-TN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const currencySymbol: Record<string, string> = {
    TND: 'د.ت', USD: '$', EUR: '€',
  };

  if (loading) return (
    <div style={{ minHeight: '80dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={28} style={{ color: 'var(--text-tertiary)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <main dir="rtl" style={{ minHeight: '100dvh', paddingBottom: 60 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>

        {/* رأس الصفحة */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/wallet" style={{
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 20,
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-main)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
            <ChevronRight size={15} /> العودة للمحفظة
          </Link>
          <h1 style={{ color: 'var(--text-main)' }}>سجل العمليات</h1>
        </div>

        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ marginBottom: 16 }}><LoveCoin size={52} /></div>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginBottom: 24 }}>
              لا توجد عمليات شراء بعد
            </p>
            <Link href="/wallet" style={{ textDecoration: 'none' }}>
              <button className="btn-premium" style={{ padding: '0 32px', height: 46 }}>
                شحن النقاط الآن
              </button>
            </Link>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-soft)',
          }}>
            {payments.map((p, i) => (
              <div
                key={p.payment_id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 22px', gap: 14, flexWrap: 'wrap',
                  borderBottom: i < payments.length - 1 ? '1px solid var(--glass-border)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* يسار: عملات + تاريخ */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <LoveCoin size={15} />
                    <span style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-main)' }}>
                      {p.coins_amount.toLocaleString('ar-TN')} نقطة
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {fmtDate(p.created_at)} · {fmtTime(p.created_at)}
                  </div>
                </div>

                {/* يمين: مبلغ + حالة */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-main)' }}>
                    {fmtPrice(p.display_amount, p.currency)}{' '}
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                      {currencySymbol[p.currency] ?? p.currency}
                    </span>
                  </span>
                  <StatusPill status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}