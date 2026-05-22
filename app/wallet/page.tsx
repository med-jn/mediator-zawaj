'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams }  from 'next/navigation';
import Link           from 'next/link';
import Image          from 'next/image';
import { useApp }     from '@/context/AppContext';
import { supabase }   from '@/lib/supabase/client';
import { CURRENCY_INFO, formatPrice, getCurrencyOptions } from '@/lib/currency';
import { LoveCoin }   from '@/components/ui/LoveCoin';
import { toast }      from 'sonner';
import {
  Loader2, Zap, Sliders, ChevronLeft, ChevronRight,
  History, Check, ArrowRight, MapPin, LogOut,
} from 'lucide-react';

const EDGE_URL = 'https://lbftmbutvtjtkxgdbndu.supabase.co/functions/v1/konnect-initiate';

const PACKAGES = [
  { id:'pkg_s', coins:1000, bonus:0,   labelEn:'Starter',  labelAr:'مبتدئ',  labelFr:'Débutant', popular:false },
  { id:'pkg_m', coins:2000, bonus:100, labelEn:'Popular',  labelAr:'شائع',   labelFr:'Populaire', popular:true  },
  { id:'pkg_l', coins:3000, bonus:150, labelEn:'Elite',    labelAr:'النخبة', labelFr:'Élite',     popular:false },
];

const CUSTOM_MIN  = 500;
const CUSTOM_MAX  = 10_000;
const CUSTOM_STEP = 100;

const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const T = {
  en: {
    back:'Back to Store', title:'Top Up Credits',
    subtitle:'Credits sync instantly with your ZAWAJ AI app.',
    balance:'Balance', currency:'Currency',
    fixed:'Packages', custom:'Custom',
    popular:'Most Popular', bonus:'bonus', credits:'credits',
    customize:'Choose your amount', paymentSummary:'Payment Summary',
    totalCredits:'Total credits', amount:'Amount',
    pay:'Pay Now', processing:'Opening payment…', confirming:'Confirming payment…',
    login:'Sign in to continue', loginBtn:'Sign In',
    secure:'Secure payment · Powered by Konnect', history:'History',
    paid:'Paid', bonusLbl:'Bonus', anonymous:'Anonymous user',
    logout:'Sign Out',
  },
  ar: {
    back:'العودة للمتجر', title:'شحن النقاط',
    subtitle:'تُزامَن النقاط فوراً مع تطبيق ZAWAJ AI.',
    balance:'رصيدك', currency:'العملة',
    fixed:'الباقات', custom:'مخصص',
    popular:'الأكثر طلباً', bonus:'هدية', credits:'نقطة',
    customize:'حدد الكمية', paymentSummary:'ملخص الدفع',
    totalCredits:'إجمالي النقاط', amount:'المبلغ',
    pay:'ادفع الآن', processing:'جارٍ فتح الدفع…', confirming:'انتظار التأكيد…',
    login:'سجّل دخولك للمتابعة', loginBtn:'تسجيل الدخول',
    secure:'دفع آمن · مشغَّل بـ Konnect', history:'السجل',
    paid:'مشتراة', bonusLbl:'هدايا', anonymous:'مستخدم مجهول',
    logout:'تسجيل الخروج',
  },
  fr: {
    back:'Retour au Store', title:'Recharger des Crédits',
    subtitle:'Les crédits se synchronisent instantanément avec votre app ZAWAJ AI.',
    balance:'Solde', currency:'Devise',
    fixed:'Forfaits', custom:'Personnalisé',
    popular:'Le Plus Populaire', bonus:'bonus', credits:'crédits',
    customize:'Choisissez votre montant', paymentSummary:'Résumé du paiement',
    totalCredits:'Total crédits', amount:'Montant',
    pay:'Payer', processing:'Ouverture du paiement…', confirming:'Confirmation…',
    login:'Connectez-vous pour continuer', loginBtn:'Se connecter',
    secure:'Paiement sécurisé · Propulsé par Konnect', history:'Historique',
    paid:'Payé', bonusLbl:'Bonus', anonymous:'Utilisateur anonyme',
    logout:'Se déconnecter',
  },
};

function AvatarFallback({ name, size = 52 }: { name: string; size?: number }) {
  const initials = name?.trim()?.split(' ')?.slice(0,2)?.map(w => w[0])?.join('') || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #800020, #c0002a)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color: '#fff', letterSpacing: '0.02em',
    }}>
      {initials.toUpperCase()}
    </div>
  );
}

export default function CoinsPage() {
  const router = useRouter();
  const params = useParams();
  const lang   = (params?.lang as string) ?? 'en';

  const { isDark, currency, setCurrency, countryCode } = useApp();
  const isAr = lang === 'ar';
  const t    = T[lang as keyof typeof T] ?? T.en;
  const Chevron = isAr ? ChevronRight : ChevronLeft;

  const [userId,      setUserId]      = useState('');
  const [balance,     setBalance]     = useState<number | null>(null);
  const [balanceFree, setBalanceFree] = useState<number | null>(null);
  const [prices,      setPrices]      = useState<Record<string, number>>({});
  const [mode,        setMode]        = useState<'fixed'|'custom'>('fixed');
  const [selected,    setSelected]    = useState(1);
  const [customPts,   setCustomPts]   = useState(1000);
  const [payState,    setPayState]    = useState<'idle'|'initiating'|'awaiting'>('idle');
  const [checking,    setChecking]    = useState(true);

  const [fullName,    setFullName]    = useState('');
  const [avatarUrl,   setAvatarUrl]   = useState('');
  const [userCountry, setUserCountry] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  const currOptions = getCurrencyOptions(countryCode, currency);
  const currInfo    = CURRENCY_INFO[currency];

  useEffect(() => {
    const init = async () => {
      const { data:{ session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const [walletRes, profileRes] = await Promise.all([
          supabase.from('wallets').select('balance,balance_free').eq('id', session.user.id).single(),
          supabase.from('profiles').select('full_name,avatar_url,country').eq('id', session.user.id).maybeSingle(),
        ]);
        if (walletRes.data) {
          setBalance(walletRes.data.balance ?? 0);
          setBalanceFree(walletRes.data.balance_free ?? 0);
        }
        if (profileRes.data) {
          setFullName(profileRes.data.full_name ?? '');
          setAvatarUrl(profileRes.data.avatar_url ?? '');
          setUserCountry(profileRes.data.country ?? '');
        }
      }
      setChecking(false);
    };
    init();
  }, []);

  useEffect(() => {
    const loadPrices = async () => {
      const { data } = await supabase
        .from('economy_config').select('value').eq('key','currency_pricing').single();
      setPrices(data?.value?.[currency]?.packages ?? {});
    };
    loadPrices();
  }, [currency]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`ov-wallet:${userId}`)
      .on('postgres_changes',{ event:'*',schema:'public',table:'wallets',filter:`id=eq.${userId}` },
        async () => {
          const { data } = await supabase.from('wallets').select('balance,balance_free').eq('id',userId).single();
          if (data){ setBalance(data.balance ?? 0); setBalanceFree(data.balance_free ?? 0); }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // ── Logout ───────────────────────────────────────────────────
  const handleLogout = async () => {
    // ✅ local فقط — لا يمس session التطبيق أبداً
    await supabase.auth.signOut({ scope: 'local' });
    toast.success(lang === 'ar' ? 'تم تسجيل الخروج' : lang === 'fr' ? 'Déconnecté' : 'Signed out');
    router.replace(`/${lang}/auth`);
  };

  const currentPkg   = PACKAGES[selected];
  const fixedPrice   = prices[currentPkg.id] ?? 0;
  const basePer1000  = prices['pkg_s'] ?? 0;
  const customPrice  = basePer1000 > 0 ? parseFloat(((customPts/1000)*basePer1000).toFixed(3)) : 0;
  const displayPrice = mode === 'fixed' ? fixedPrice : customPrice;
  const displayCoins = mode === 'fixed' ? currentPkg.coins + currentPkg.bonus : customPts;
  const isProcessing = payState !== 'idle';
  const displayName  = fullName || t.anonymous;

  const handleBuy = useCallback(async () => {
    if (!userId) { router.push(`/${lang}/auth`); return; }
    setPayState('initiating');
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const body = mode === 'fixed'
        ? { type:'package', packageId:currentPkg.id, currency }
        : { type:'custom',  coins:customPts,          currency };

      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...body,
          successUrl: `${window.location.origin}/${lang}/store/coins/success`,
          failUrl:    `${window.location.origin}/${lang}/store/coins/fail`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Error ${res.status}`);
      }

      const { payUrl, paymentId } = await res.json();
      setPayState('awaiting');

      const ch = supabase.channel(`pay:${paymentId}`)
        .on('postgres_changes',{ event:'UPDATE',schema:'public',table:'konnect_payments',filter:`payment_id=eq.${paymentId}` },
          ({ new:row }:any) => {
            if (row.status === 'completed') {
              toast.success(isAr ? '🎉 تم الشحن بنجاح!' : '🎉 Payment successful!');
              setPayState('idle');
              supabase.removeChannel(ch);
              setBalance(b => (b ?? 0) + (mode === 'fixed' ? currentPkg.coins : customPts));
            } else if (row.status === 'failed' || row.status === 'expired') {
              toast.error(isAr ? 'فشل الدفع' : 'Payment failed');
              setPayState('idle');
              supabase.removeChannel(ch);
            }
          })
        .subscribe();

      window.open(payUrl, '_blank');
    } catch (err:any) {
      toast.error(err.message ?? 'Payment error');
      setPayState('idle');
    }
  }, [userId, mode, currentPkg, customPts, currency, isAr, router, lang]);

  if (checking) return (
    <div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Loader2 size={28} style={{ color:'var(--text-3)', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <main style={{ minHeight:'100vh', paddingBottom:80, direction: isAr ? 'rtl' : 'ltr' }}>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 20px' }}>

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:36 }}>
          <Link href={`/${lang}/store`} style={{
            textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6,
            color:'var(--text-3)', fontSize:13, transition:'color 0.2s',
          }}
            onMouseEnter={e=>(e.currentTarget.style.color='var(--text-1)')}
            onMouseLeave={e=>(e.currentTarget.style.color='var(--text-3)')}
          >
            <Chevron size={15} /> {t.back}
          </Link>
          {userId && (
            <Link href={`/${lang}/store/coins/history`} style={{
              textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6,
              color:'var(--text-3)', fontSize:12,
            }}>
              <History size={15} /> {t.history}
            </Link>
          )}
        </div>

        {/* ── Title ───────────────────────────────────────────── */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{
            fontFamily:'var(--font-display)',
            fontSize:'clamp(36px,6vw,56px)',
            letterSpacing:'0.05em', lineHeight:1,
            background:'var(--chrome)',
            WebkitBackgroundClip:'text', backgroundClip:'text', WebkitTextFillColor:'transparent',
            marginBottom:10,
          }}>
            {t.title}
          </h1>
          <p style={{ fontSize:14, color:'var(--text-3)', lineHeight:1.6 }}>{t.subtitle}</p>
        </div>

        {/* ── بطاقة المستخدم ──────────────────────────────────── */}
        {userId && (
          <>
            {/* بطاقة المعلومات */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'16px 20px',
              borderRadius:'var(--radius-lg)',
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
              border:'1px solid var(--border)',
              marginBottom:10,
              flexWrap:'wrap', gap:12,
            }}>
              {/* الأفاتار + الاسم + البلد */}
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {avatarUrl && !avatarError ? (
                  <div style={{ width:44, height:44, borderRadius:'50%', overflow:'hidden', flexShrink:0, border:'2px solid var(--border)' }}>
                    <Image
                      src={avatarUrl} alt={displayName}
                      width={44} height={44}
                      style={{ objectFit:'cover', width:'100%', height:'100%' }}
                      onError={() => setAvatarError(true)}
                    />
                  </div>
                ) : (
                  <AvatarFallback name={displayName} size={44} />
                )}
                <div>
                  <p style={{ fontSize:14, fontWeight:800, color:'var(--text-1)', marginBottom:2 }}>
                    {displayName}
                  </p>
                  {userCountry && (
                    <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                      <MapPin size={10} style={{ color:'var(--text-3)' }} />
                      <span style={{ fontSize:11, color:'var(--text-3)' }}>{userCountry}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* الرصيد */}
              {balance !== null && (
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <LoveCoin size={14} />
                    <span style={{ fontSize:15, fontWeight:800, color:'var(--text-1)' }}>{fmt(balance ?? 0)}</span>
                    <span style={{ fontSize:10, color:'var(--text-3)' }}>{t.paid}</span>
                  </div>
                  <div style={{ width:1, height:14, background:'var(--border)' }} />
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <LoveCoin size={14} />
                    <span style={{ fontSize:15, fontWeight:800, color:'#22c55e' }}>{fmt(balanceFree ?? 0)}</span>
                    <span style={{ fontSize:10, color:'var(--text-3)' }}>{t.bonusLbl}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ زر الخروج — عرض كامل، مناسب للموبايل، local scope فقط */}
            <button
              onClick={handleLogout}
              style={{
                width:'100%',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                padding:'11px 16px',
                borderRadius:'var(--radius-md)',
                border:'1px solid var(--border)',
                background:'transparent',
                color:'var(--text-3)',
                fontSize:13, fontWeight:600,
                cursor:'pointer',
                fontFamily:'var(--font-body)',
                transition:'all 0.2s',
                marginBottom:16,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.background = 'rgba(239,68,68,0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-3)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={14} />
              {t.logout}
            </button>
          </>
        )}

        {/* ── شريط العملة ─────────────────────────────────────── */}
        {userId && (
          <div style={{
            display:'flex', alignItems:'center', justifyContent: isAr ? 'flex-start' : 'flex-end',
            gap:8, marginBottom:24,
          }}>
            <span style={{ fontSize:11, color:'var(--text-3)' }}>{t.currency}:</span>
            {currOptions.map(cur => (
              <button key={cur} onClick={() => setCurrency(cur)} style={{
                padding:'4px 11px', borderRadius:'var(--radius-xl)',
                border:`1px solid ${currency===cur ? 'var(--red-border)' : 'var(--border)'}`,
                background: currency===cur ? 'var(--red-soft)' : 'transparent',
                color: currency===cur ? '#e05040' : 'var(--text-2)',
                fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)',
                transition:'all 0.15s',
              }}>
                {cur}
              </button>
            ))}
          </div>
        )}

        {/* ── Mode switch ─────────────────────────────────────── */}
        <div style={{
          display:'flex', gap:6, padding:5,
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', marginBottom:24,
        }}>
          {(['fixed','custom'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex:1, padding:'10px 0', borderRadius:'var(--radius-md)', border:'none',
              background: mode===m ? (isDark ? 'rgba(255,255,255,0.1)' : '#ffffff') : 'transparent',
              color: mode===m ? 'var(--text-1)' : 'var(--text-3)',
              fontFamily:'var(--font-body)', fontSize:13, fontWeight:700,
              cursor:'pointer', transition:'all 0.2s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow: mode===m && !isDark ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            }}>
              {m === 'fixed' ? <Zap size={14} /> : <Sliders size={14} />}
              {m === 'fixed' ? t.fixed : t.custom}
            </button>
          ))}
        </div>

        {/* ── Packages / Custom ───────────────────────────────── */}
        {mode === 'fixed' ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
            {PACKAGES.map((pkg, i) => {
              const pPrice = prices[pkg.id] ?? 0;
              const isSel  = selected === i;
              const total  = pkg.coins + pkg.bonus;
              const label  = lang === 'ar' ? pkg.labelAr : lang === 'fr' ? pkg.labelFr : pkg.labelEn;
              return (
                <button key={pkg.id} onClick={() => setSelected(i)} style={{
                  width:'100%', padding:'18px 22px', borderRadius:'var(--radius-md)',
                  border:`2px solid ${isSel ? 'rgba(192,57,43,0.45)' : 'var(--border)'}`,
                  background: isSel
                    ? (isDark ? 'rgba(192,57,43,0.07)' : 'rgba(192,57,43,0.04)')
                    : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
                  cursor:'pointer', textAlign: isAr ? 'right' : 'left',
                  display:'flex', alignItems:'center', gap:16,
                  transition:'all 0.18s',
                  boxShadow: isSel ? '0 0 28px rgba(192,57,43,0.12)' : 'none',
                }}>
                  <div style={{
                    width:22, height:22, borderRadius:'50%', flexShrink:0,
                    border:`2px solid ${isSel ? '#e05040' : 'var(--border)'}`,
                    background: isSel ? 'rgba(192,57,43,0.15)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s',
                  }}>
                    {isSel && <Check size={12} style={{ color:'#e05040' }} />}
                  </div>

                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontSize:15, fontWeight:800, color:'var(--text-1)' }}>{label}</span>
                      {pkg.popular && (
                        <span style={{
                          fontSize:9, fontWeight:700, letterSpacing:'0.12em',
                          padding:'2px 8px', borderRadius:20, textTransform:'uppercase',
                          background:'var(--red-soft)', border:'1px solid var(--red-border)', color:'#e05040',
                        }}>
                          {t.popular}
                        </span>
                      )}
                      {pkg.bonus > 0 && (
                        <span style={{
                          fontSize:10, fontWeight:600, padding:'2px 9px', borderRadius:20,
                          background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', color:'#22c55e',
                        }}>
                          +{pkg.bonus} {t.bonus}
                        </span>
                      )}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--text-2)' }}>{fmt(total)}</span>
                      <LoveCoin size={13} />
                      <span style={{ fontSize:12, color:'var(--text-3)' }}>{t.credits}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: isAr ? 'left' : 'right', flexShrink:0 }}>
                    {pPrice > 0 ? (
                      <>
                        <span style={{ fontSize:24, fontWeight:900, color:'var(--text-1)' }}>
                          {formatPrice(pPrice, currency)}
                        </span>
                        <span style={{ fontSize:13, color:'var(--text-3)', marginInlineStart:5 }}>
                          {currInfo?.symbol}
                        </span>
                      </>
                    ) : (
                      <div style={{ width:60, height:28, borderRadius:6, background:'var(--border)', animation:'pulse 1.5s ease-in-out infinite' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{
            padding:'28px 24px', borderRadius:'var(--radius-lg)',
            background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)',
            border:'1px solid var(--border)', marginBottom:24,
          }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--text-3)', textAlign:'center', marginBottom:24 }}>
              {t.customize}
            </p>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, marginBottom:24 }}>
              <button onClick={() => setCustomPts(p => Math.max(CUSTOM_MIN, p - CUSTOM_STEP))}
                style={{ width:44, height:44, borderRadius:'50%', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:22, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                −
              </button>
              <div style={{ textAlign:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, paddingBottom:8, borderBottom:'2px solid var(--red)' }}>
                  <span style={{ fontSize:40, fontWeight:900, color:'var(--text-1)', lineHeight:1 }}>{fmt(customPts)}</span>
                  <LoveCoin size={28} />
                </div>
                <p style={{ fontSize:14, fontWeight:800, color:'#e05040', marginTop:10 }}>
                  {customPrice > 0 ? `${formatPrice(customPrice, currency)} ${currInfo?.symbol}` : '—'}
                </p>
              </div>
              <button onClick={() => setCustomPts(p => Math.min(CUSTOM_MAX, p + CUSTOM_STEP))}
                style={{ width:44, height:44, borderRadius:'50%', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:22, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                +
              </button>
            </div>
            <input type="range" min={CUSTOM_MIN} max={CUSTOM_MAX} step={CUSTOM_STEP} value={customPts}
              onChange={e => setCustomPts(Number(e.target.value))}
              style={{ width:'100%', accentColor:'#c0392b', height:4, cursor:'pointer' }} />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
              <span style={{ fontSize:10, color:'var(--text-3)' }}>{fmt(CUSTOM_MIN)}</span>
              <span style={{ fontSize:10, color:'var(--text-3)' }}>{fmt(CUSTOM_MAX)}</span>
            </div>
          </div>
        )}

        {/* ── Summary + Pay ────────────────────────────────────── */}
        <div style={{
          padding:'24px', borderRadius:'var(--radius-lg)',
          background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)',
          border:'1px solid var(--border)',
          boxShadow: isDark ? '0 0 40px rgba(192,57,43,0.08)' : '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:13, color:'var(--text-3)' }}>{t.totalCredits}</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:16, fontWeight:800, color:'var(--text-1)' }}>{fmt(displayCoins)}</span>
              <LoveCoin size={16} />
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:20, marginBottom:20, borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:13, color:'var(--text-3)' }}>{t.amount}</span>
            <div>
              <span style={{ fontSize:30, fontWeight:900, color:'var(--text-1)' }}>
                {displayPrice > 0 ? formatPrice(displayPrice, currency) : '—'}
              </span>
              {displayPrice > 0 && (
                <span style={{ fontSize:14, color:'var(--text-3)', marginInlineStart:6 }}>{currInfo?.symbol}</span>
              )}
            </div>
          </div>

          {isProcessing && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:'var(--radius-sm)', background:'rgba(192,57,43,0.06)', border:'1px solid var(--red-border)', marginBottom:16 }}>
              <Loader2 size={16} style={{ color:'#e05040', animation:'spin 1s linear infinite', flexShrink:0 }} />
              <span style={{ fontSize:13, color:'#e05040', fontWeight:600 }}>
                {payState === 'initiating' ? t.processing : t.confirming}
              </span>
            </div>
          )}

          {!userId ? (
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:14 }}>{t.login}</p>
              <Link href={`/${lang}/auth`} style={{ textDecoration:'none' }}>
                <button className="btn-chrome" style={{ padding:'13px 36px', fontSize:14, gap:8 }}>
                  {t.loginBtn} <ArrowRight size={15} />
                </button>
              </Link>
            </div>
          ) : (
            <>
              <button className="btn-chrome" onClick={handleBuy}
                disabled={isProcessing || displayPrice === 0}
                style={{ width:'100%', height:56, fontSize:16, gap:10, letterSpacing:'0.02em' }}>
                {isProcessing
                  ? <><Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} /> {t.processing}</>
                  : <><Zap size={18} /> {t.pay} — {displayPrice > 0 ? `${formatPrice(displayPrice, currency)} ${currInfo?.symbol}` : '…'}</>
                }
              </button>
              <p style={{ textAlign:'center', marginTop:12, fontSize:11, color:'var(--text-3)' }}>
                🔒 {t.secure}
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