'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter }   from 'next/navigation';
import Link            from 'next/link';
import Image           from 'next/image';
import { useApp }      from '@/context/AppContext';
import { supabase }    from '@/lib/supabase/client';
import { LoveCoin }    from '@/components/ui/LoveCoin';
import {
  CURRENCY_INFO, formatPrice,
  getCurrencyOptions, getDefaultCurrency,
} from '@/lib/currency';
import { toast }       from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Zap, Sliders, History, Check,
  ArrowRight, MapPin, LogOut, ChevronRight, Coins,
} from 'lucide-react';

const EDGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/konnect-initiate`;

const PACKAGES = [
  { id: 'pkg_s', coins: 1000, bonus: 0,   labelAr: 'مبتدئ',  popular: false },
  { id: 'pkg_m', coins: 2000, bonus: 100, labelAr: 'شائع',   popular: true  },
  { id: 'pkg_l', coins: 3000, bonus: 150, labelAr: 'النخبة', popular: false },
];

const CUSTOM_MIN = 500, CUSTOM_MAX = 10_000, CUSTOM_STEP = 100;
const fmt = (n: number) => n.toLocaleString('ar-TN');

function AvatarFallback({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #800020, var(--color-primary))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color: '#fff',
    }}>
      {initials || '؟'}
    </div>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const { isDark, currency, setCurrency, countryCode } = useApp();
  const currOptions = getCurrencyOptions(countryCode, currency);
  const currInfo    = CURRENCY_INFO[currency] ?? { symbol: currency, decimals: 2 };

  const [userId,      setUserId]      = useState('');
  const [balance,     setBalance]     = useState<number | null>(null);
  const [balanceFree, setBalanceFree] = useState<number | null>(null);
  const [prices,      setPrices]      = useState<Record<string, number>>({});
  const [mode,        setMode]        = useState<'fixed' | 'custom'>('fixed');
  const [selected,    setSelected]    = useState(1);
  const [customPts,   setCustomPts]   = useState(1000);
  const [payState,    setPayState]    = useState<'idle' | 'initiating' | 'awaiting'>('idle');
  const [checking,    setChecking]    = useState(true);
  const [fullName,    setFullName]    = useState('');
  const [avatarUrl,   setAvatarUrl]   = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [userCountry, setUserCountry] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth?return=/wallet'); return; }
      setUserId(session.user.id);
      const [w, p] = await Promise.all([
        supabase.from('wallets').select('balance,balance_free').eq('id', session.user.id).single(),
        supabase.from('profiles').select('full_name,avatar_url,country').eq('id', session.user.id).maybeSingle(),
      ]);
      if (w.data) { setBalance(w.data.balance ?? 0); setBalanceFree(w.data.balance_free ?? 0); }
      if (p.data) {
        setFullName(p.data.full_name ?? '');
        setAvatarUrl(p.data.avatar_url ?? '');
        setUserCountry(p.data.country ?? '');
      }
      setChecking(false);
    })();
  }, [router]);

  useEffect(() => {
    supabase.from('economy_config').select('value').eq('key', 'currency_pricing').single()
      .then(({ data }) => setPrices(data?.value?.[currency]?.packages ?? {}));
  }, [currency]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`wallet-realtime:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `id=eq.${userId}` },
        async () => {
          const { data } = await supabase.from('wallets').select('balance,balance_free').eq('id', userId).single();
          if (data) { setBalance(data.balance ?? 0); setBalanceFree(data.balance_free ?? 0); }
        }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    document.cookie = 'user_role=; path=/; max-age=0';
    router.replace('/auth');
  };

  const currentPkg   = PACKAGES[selected];
  const fixedPrice   = prices[currentPkg.id] ?? 0;
  const basePer1000  = prices['pkg_s'] ?? 0;
  const customPrice  = basePer1000 > 0 ? parseFloat(((customPts / 1000) * basePer1000).toFixed(3)) : 0;
  const displayPrice = mode === 'fixed' ? fixedPrice : customPrice;
  const displayCoins = mode === 'fixed' ? currentPkg.coins + currentPkg.bonus : customPts;
  const isProcessing = payState !== 'idle';

  const handleBuy = useCallback(async () => {
    if (!userId) { router.push('/auth'); return; }
    setPayState('initiating');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('غير مسجّل الدخول');

      const body = mode === 'fixed'
        ? { type: 'package', packageId: currentPkg.id, currency }
        : { type: 'custom',  coins: customPts,          currency };

      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          ...body,
          successUrl: `${window.location.origin}/wallet?payment=success`,
          failUrl:    `${window.location.origin}/wallet?payment=fail`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Error ${res.status}`);
      }

      const { payUrl, paymentId } = await res.json();
      setPayState('awaiting');

      const ch = supabase.channel(`pay:${paymentId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'konnect_payments', filter: `payment_id=eq.${paymentId}` },
          ({ new: row }: any) => {
            if (row.status === 'completed') {
              toast.success('🎉 تم الشحن بنجاح!');
              setPayState('idle');
              supabase.removeChannel(ch);
              setBalance(b => (b ?? 0) + (mode === 'fixed' ? currentPkg.coins : customPts));
            } else if (row.status === 'failed' || row.status === 'expired') {
              toast.error('فشل الدفع. لم يُخصم شيء من رصيدك.');
              setPayState('idle');
              supabase.removeChannel(ch);
            }
          }).subscribe();

      window.open(payUrl, '_blank');
    } catch (err: any) {
      toast.error(err.message ?? 'خطأ في الدفع');
      setPayState('idle');
    }
  }, [userId, mode, currentPkg, customPts, currency, router]);

  if (checking) return (
    <div style={{ minHeight: '80dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={28} style={{ color: 'var(--text-tertiary)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <main dir="rtl" style={{ minHeight: '100dvh', paddingBottom: 60 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
          <Link href="/mediators" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 13, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-main)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
            <ChevronRight size={15} /> العودة للوسطاء
          </Link>
          {userId && (
            <Link href="/wallet/history" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 12 }}>
              <History size={14} /> السجل
            </Link>
          )}
        </div>

        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 'clamp(36px,7vw,60px)', letterSpacing: '0.04em', lineHeight: 1,
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 12,
          }}>
            شحن النقاط
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', lineHeight: 'var(--lh-relaxed)' }}>
            النقاط تُزامَن فوراً مع تطبيق زواج على هاتفك
          </p>
        </div>

        {/* بطاقة المستخدم */}
        {userId && (
          <>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderRadius: 'var(--radius-lg)', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)', border: '1px solid var(--glass-border)', marginBottom: 10, flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {avatarUrl && !avatarError ? (
                  <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--glass-border)' }}>
                    <Image src={avatarUrl} alt={fullName} width={46} height={46} style={{ objectFit: 'cover', width: '100%', height: '100%' }} onError={() => setAvatarError(true)} />
                  </div>
                ) : (
                  <AvatarFallback name={fullName || 'م'} size={46} />
                )}
                <div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-main)', marginBottom: 3 }}>{fullName || 'مستخدم'}</p>
                  {userCountry && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} style={{ color: 'var(--text-tertiary)' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{userCountry}</span>
                    </div>
                  )}
                </div>
              </div>

              {balance !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <LoveCoin size={15} />
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>{fmt(balance ?? 0)}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>مشتراة</span>
                  </div>
                  <div style={{ width: 1, height: 16, background: 'var(--glass-border)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <LoveCoin size={15} />
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#22c55e' }}>{fmt(balanceFree ?? 0)}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>هدايا</span>
                  </div>
                </div>
              )}
            </motion.div>

            <button onClick={handleLogout}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}>
              <LogOut size={14} /> تسجيل خروج
            </button>
          </>
        )}

        {/* شريط العملة */}
        {userId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>العملة:</span>
            {currOptions.map(cur => (
              <button key={cur} onClick={() => setCurrency(cur)}
                style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', border: `1px solid ${currency === cur ? 'var(--border-soft)' : 'var(--glass-border)'}`, background: currency === cur ? 'var(--color-primary-xsoft)' : 'transparent', color: currency === cur ? 'var(--color-primary)' : 'var(--text-tertiary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                {cur}
              </button>
            ))}
          </div>
        )}

        {/* Mode Switch */}
        <div style={{ display: 'flex', gap: 6, padding: 5, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', marginBottom: 24 }}>
          {(['fixed', 'custom'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 'var(--radius-md)', border: 'none', background: mode === m ? (isDark ? 'rgba(255,255,255,0.1)' : '#fff') : 'transparent', color: mode === m ? 'var(--text-main)' : 'var(--text-tertiary)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: mode === m && !isDark ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
              {m === 'fixed' ? <Zap size={14} /> : <Sliders size={14} />}
              {m === 'fixed' ? 'الباقات' : 'مخصص'}
            </button>
          ))}
        </div>

        {/* Packages */}
        <AnimatePresence mode="wait">
          {mode === 'fixed' ? (
            <motion.div key="fixed" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {PACKAGES.map((pkg, i) => {
                const pPrice = prices[pkg.id] ?? 0;
                const isSel  = selected === i;
                const total  = pkg.coins + pkg.bonus;
                return (
                  <motion.button key={pkg.id} onClick={() => setSelected(i)}
                    whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.99 }}
                    style={{ width: '100%', padding: '20px 22px', borderRadius: 'var(--radius-md)', border: `2px solid ${isSel ? 'rgba(179,51,75,0.5)' : 'var(--glass-border)'}`, background: isSel ? (isDark ? 'rgba(179,51,75,0.07)' : 'rgba(179,51,75,0.04)') : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'), cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16, boxShadow: isSel ? '0 0 32px rgba(179,51,75,0.12)' : 'none', transition: 'border-color 0.2s, background 0.2s' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, border: `2px solid ${isSel ? 'var(--color-primary)' : 'var(--glass-border)'}`, background: isSel ? 'var(--color-primary-xsoft)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {isSel && <Check size={13} style={{ color: 'var(--color-primary)' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-main)' }}>{pkg.labelAr}</span>
                        {pkg.popular && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--color-primary-xsoft)', border: '1px solid var(--border-soft)', color: 'var(--color-primary)', letterSpacing: '0.08em' }}>الأكثر طلباً</span>}
                        {pkg.bonus > 0 && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>+{pkg.bonus} هدية</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>{fmt(total)}</span>
                        <LoveCoin size={13} />
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>نقطة</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left', flexShrink: 0 }}>
                      {pPrice > 0 ? (
                        <>
                          <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-main)' }}>{formatPrice(pPrice, currency)}</span>
                          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginInlineStart: 5 }}>{currInfo.symbol}</span>
                        </>
                      ) : (
                        <div style={{ width: 64, height: 30, borderRadius: 8, background: 'var(--glass-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="custom" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
              style={{ padding: '28px 24px', borderRadius: 'var(--radius-lg)', background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)', border: '1px solid var(--glass-border)', marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 28 }}>
                حدد الكمية
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 28 }}>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCustomPts(p => Math.max(CUSTOM_MIN, p - CUSTOM_STEP))}
                  style={{ width: 48, height: 48, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: 24, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  −
                </motion.button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottom: '2px solid var(--color-primary)' }}>
                    <span style={{ fontSize: 44, fontWeight: 900, color: 'var(--text-main)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(customPts)}
                    </span>
                    <LoveCoin size={30} />
                  </div>
                  <p style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--color-primary)', marginTop: 12 }}>
                    {customPrice > 0 ? `${formatPrice(customPrice, currency)} ${currInfo.symbol}` : '—'}
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCustomPts(p => Math.min(CUSTOM_MAX, p + CUSTOM_STEP))}
                  style={{ width: 48, height: 48, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: 24, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  +
                </motion.button>
              </div>
              <input type="range" min={CUSTOM_MIN} max={CUSTOM_MAX} step={CUSTOM_STEP} value={customPts}
                onChange={e => setCustomPts(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)', height: 4, cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmt(CUSTOM_MIN)}</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmt(CUSTOM_MAX)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ملخص الدفع */}
        <div style={{ padding: 24, borderRadius: 'var(--radius-lg)', background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)', border: '1px solid var(--glass-border)', boxShadow: isDark ? '0 0 40px rgba(179,51,75,0.08)' : '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>إجمالي النقاط</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>{fmt(displayCoins)}</span>
              <LoveCoin size={17} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>المبلغ</span>
            <div>
              <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-main)' }}>
                {displayPrice > 0 ? formatPrice(displayPrice, currency) : '—'}
              </span>
              {displayPrice > 0 && <span style={{ fontSize: 14, color: 'var(--text-tertiary)', marginInlineStart: 6 }}>{currInfo.symbol}</span>}
            </div>
          </div>

          <AnimatePresence>
            {isProcessing && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-xsoft)', border: '1px solid var(--border-soft)', marginBottom: 16, overflow: 'hidden' }}>
                <Loader2 size={16} style={{ color: 'var(--color-primary)', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>
                  {payState === 'initiating' ? 'جارٍ فتح بوابة الدفع…' : 'في انتظار تأكيد الدفع…'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {!userId ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>سجّل دخولك للمتابعة</p>
              <Link href="/auth" style={{ textDecoration: 'none' }}>
                <button className="btn-premium" style={{ padding: '0 40px', height: 48, fontSize: 'var(--text-sm)', gap: 8 }}>
                  تسجيل الدخول <ArrowRight size={15} />
                </button>
              </Link>
            </div>
          ) : (
            <>
              <motion.button whileTap={{ scale: 0.99 }}
                className="btn-premium"
                onClick={handleBuy}
                disabled={isProcessing || displayPrice === 0}
                style={{ width: '100%', height: 56, fontSize: 'var(--text-base)', gap: 10, opacity: displayPrice === 0 ? 0.5 : 1 }}>
                {isProcessing ? (
                  <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> {payState === 'initiating' ? 'جارٍ الفتح…' : 'انتظار التأكيد…'}</>
                ) : (
                  <><Zap size={18} /> ادفع الآن — {displayPrice > 0 ? `${formatPrice(displayPrice, currency)} ${currInfo.symbol}` : '…'}</>
                )}
              </motion.button>
              <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'var(--text-tertiary)' }}>
                🔒 دفع آمن · مشغَّل بـ Konnect
              </p>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </main>
  );
}