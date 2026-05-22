/**
 * app/[lang]/auth/page.tsx
 *
 * عند اكتشاف session موجودة → نكتب user_role cookie أيضاً
 * حتى يعمل الـ middleware من المرة الأولى
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams }        from 'next/navigation';
import { supabase }                    from '@/lib/supabase/client';
import { useApp }                      from '@/context/AppContext';
import { Eye, EyeOff, Smartphone, Mail } from 'lucide-react';

const makeHandshakeUrl = (lang: string) => {
  const CALLBACK = encodeURIComponent(`https://orcavibe.vercel.app/${lang}/auth/callback`);
  const FALLBACK = encodeURIComponent(`https://orcavibe.vercel.app/${lang}/auth`);
  return `intent://auth-handshake?return=${CALLBACK}#Intent;scheme=zawaj;package=com.zawaj.ai;S.browser_fallback_url=${FALLBACK};end`;
};

async function loginSuccess(userId: string, lang: string): Promise<string> {
  const { data } = await supabase
    .from('profiles').select('role').eq('id', userId).single();
  const role = (data?.role as string) ?? 'user';
  document.cookie = `user_role=${role}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  return role === 'mediator' ? `/${lang}/agent/wallet` : `/${lang}/store/coins`;
}

const T = {
  en: { headline:'Welcome back', sub:'Sign in to OrcaVibe', google:'Continue with Google', handshake:'Sign in with ZAWAJ AI App', waiting:'Waiting for app…', divider:'or', email:'Email address', password:'Password', submit:'Sign In', loading:'Signing in…', error:'Incorrect email or password', required:'Please fill all fields', noAccount:'New here?', goStore:'Explore Store' },
  ar: { headline:'مرحباً بعودتك', sub:'سجّل دخولك إلى OrcaVibe', google:'المتابعة عبر Google', handshake:'الدخول عبر تطبيق ZAWAJ AI', waiting:'في انتظار التطبيق…', divider:'أو', email:'البريد الإلكتروني', password:'كلمة المرور', submit:'دخول', loading:'جارٍ الدخول…', error:'البريد أو كلمة المرور غير صحيحة', required:'يرجى ملء جميع الحقول', noAccount:'جديد هنا؟', goStore:'استعرض المتجر' },
  fr: { headline:'Bon retour', sub:'Connectez-vous à OrcaVibe', google:'Continuer avec Google', handshake:"Se connecter avec ZAWAJ AI", waiting:"En attente de l'app…", divider:'ou', email:'Adresse e-mail', password:'Mot de passe', submit:'Se connecter', loading:'Connexion…', error:'E-mail ou mot de passe incorrect', required:'Veuillez remplir tous les champs', noAccount:'Nouveau ici ?', goStore:'Explorer le Store' },
};

export default function AuthPage() {
  const router     = useRouter();
  const params     = useParams();
  const { isDark } = useApp();

  const lang = (params?.lang as string) ?? 'en';
  const isAr = lang === 'ar';
  const t    = T[lang as keyof typeof T] ?? T.en;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [waiting,  setWaiting]  = useState(false);
  const [error,    setError]    = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // ← نكتب الـ cookie حتى لو كانت الجلسة محفوظة من قبل
        router.replace(await loginSuccess(session.user.id, lang));
      }
    });
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [router, lang]);

  const handleGoogle = async () => {
    setError('');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `https://orcavibe.vercel.app/${lang}/auth/callback` },
    });
  };

  const handleHandshake = () => {
    setError(''); setWaiting(false);
    const onVis = () => {
      if (document.hidden) {
        setWaiting(true);
        if (timer.current) clearTimeout(timer.current);
        document.removeEventListener('visibilitychange', onVis);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    timer.current = setTimeout(() => { document.removeEventListener('visibilitychange', onVis); setWaiting(false); }, 1500);
    const a = document.createElement('a');
    a.href = makeHandshakeUrl(lang);
    a.click();
  };

  const handleEmail = async () => {
    setError('');
    if (!email.trim() || !password) { setError(t.required); return; }
    setLoading(true);
    const { data: { user }, error: err } =
      await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err || !user) { setError(t.error); setLoading(false); return; }
    router.replace(await loginSuccess(user.id, lang));
  };

  // ── Styles utilisant les CSS variables du design system ───
  const bg   = 'var(--bg)';
  const card = 'var(--bg-surface)';
  const bdr  = 'var(--border)';
  const t1   = 'var(--text-1)';
  const t3   = 'var(--text-3)';

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 40px 12px 14px', borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)', border: `1px solid var(--border)`,
    color: t1, fontSize: 14, outline: 'none',
    fontFamily: 'var(--font-body)', direction: 'ltr', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, padding: '20px', direction: isAr ? 'rtl' : 'ltr' }}>

      {/* Fond radial brand */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% 0%, var(--red-soft), transparent)' }} />

      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 400,
        background: card, border: `1px solid ${bdr}`,
        borderRadius: 'var(--radius-lg)', padding: 'clamp(24px,5vw,40px)',
        boxShadow: 'var(--shadow-strong)',
        backdropFilter: 'var(--glass-blur)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #800020, var(--red))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--glow-red)', fontSize: 22,
          }}>💍</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: t1, marginBottom: 4 }}>{t.headline}</h1>
          <p style={{ fontSize: 12, color: t3, margin: 0 }}>{t.sub}</p>
        </div>

        {/* Google */}
        <button onClick={handleGoogle} className="btn-chrome" style={{ marginBottom: 8 }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--glow-red)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c10.5 0 19.5-7.6 19.5-20.5 0-1.4-.1-2.7-.4-5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4.5 24 4.5c-7.7 0-14.3 4.4-17.7 10.2z"/>
            <path fill="#4CAF50" d="M24 45.5c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 36.8 26.8 38 24 38c-5.2 0-9.6-3.4-11.2-8l-6.6 5.1C9.8 41.2 16.4 45.5 24 45.5z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.2C40.8 35.4 44 30.6 44 25c0-1.4-.1-2.7-.4-5z"/>
          </svg>
          {t.google}
        </button>

        {/* Handshake */}
        <button onClick={handleHandshake} disabled={waiting} style={{
          width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--red-border)',
          background: 'var(--red-soft)',
          color: t1, fontSize: 13, fontWeight: 600,
          cursor: waiting ? 'wait' : 'pointer', fontFamily: 'var(--font-body)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          transition: 'all 0.2s', marginBottom: 22, opacity: waiting ? 0.7 : 1,
        }}>
          {waiting
            ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--red)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }} />{t.waiting}</>
            : <><Smartphone size={15} style={{ color: 'var(--red)' }} />{t.handshake}</>}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: bdr }} />
          <span style={{ fontSize: 10, color: t3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t.divider}</span>
          <div style={{ flex: 1, height: 1, background: bdr }} />
        </div>

        {/* Email form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <input type="email" placeholder={t.email} value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmail()}
            style={inp}
            onFocus={e => e.target.style.borderColor = 'var(--red)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />

          <div style={{ position: 'relative' }}>
            <input type={showPass ? 'text' : 'password'} placeholder={t.password} value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
              style={inp}
              onFocus={e => e.target.style.borderColor = 'var(--red)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            <button onClick={() => setShowPass(p => !p)} style={{
              position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: t3,
              display: 'flex', alignItems: 'center', padding: 0,
            }}>
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {error && (
            <div style={{ padding: '9px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--red-soft)', border: '1px solid var(--red-border)' }}>
              <p style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center', margin: 0 }}>{error}</p>
            </div>
          )}

          <button onClick={handleEmail} disabled={loading} style={{
            width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', marginTop: 2,
            background: 'linear-gradient(135deg, #800020, var(--red))',
            border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
            fontFamily: 'var(--font-body)', boxShadow: 'var(--glow-red)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <Mail size={14} />{loading ? t.loading : t.submit}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 12, color: t3 }}>{t.noAccount} </span>
          <button onClick={() => router.push(`/${lang}/store`)} style={{
            background: 'none', border: 'none', padding: 0,
            color: 'var(--red)', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>{t.goStore}</button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}