'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams }    from 'next/navigation';
import { supabase }                      from '@/lib/supabase/client';
import { GoogleButton }                  from '@/components/ui/googlebutton';
import { Brand }                         from '@/components/ui/brand';
import { Loader2, Mail, CheckCircle }    from 'lucide-react';
import { toast }                         from 'sonner';

function AuthForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const returnTo     = searchParams.get('return') ?? '/mediators';

  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(returnTo);
      else setChecking(false);
    });
  }, [router, returnTo]);

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo:  `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

  if (checking) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <Loader2 size={28} style={{ color: 'var(--text-tertiary)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-main)', padding: '24px 16px',
    }}>

      {/* وهج خلفي */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(179,51,75,0.18), transparent)',
      }} />

      <div style={{
        position: 'relative', width: '100%', maxWidth: 420,
        background: 'var(--bg-surface)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'clamp(32px,5vw,48px)',
        boxShadow: 'var(--shadow-deep)',
      }}>

        {/* شريط علوي بلون التمييز */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          background: 'linear-gradient(90deg, var(--color-primary) 0%, #D4AF37 50%, transparent 100%)',
        }} />

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <Brand />
        </div>
        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 36, lineHeight: 'var(--lh-relaxed)' }}>
          منصة الوسطاء الموثوقين للتعارف الإسلامي
        </p>

        {sent ? (
          /* ── تم الإرسال ── */
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle size={30} style={{ color: '#22c55e' }} />
            </div>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-main)', marginBottom: 10 }}>
              تحقق من بريدك الإلكتروني
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', lineHeight: 'var(--lh-relaxed)', marginBottom: 28 }}>
              أرسلنا رابط الدخول إلى<br />
              <strong style={{ color: 'var(--text-main)' }}>{email}</strong>
            </p>
            <button
              onClick={() => setSent(false)}
              style={{
                background: 'transparent',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-tertiary)',
                fontSize: 'var(--text-sm)',
                padding: '8px 24px',
                cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              تغيير البريد الإلكتروني
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <GoogleButton onClick={handleGoogle} />

            {/* فاصل */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                أو عبر البريد الإلكتروني
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
            </div>

            <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                required
                className="lux-input"
                style={{ textAlign: 'right' }}
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-premium"
                style={{ width: '100%', height: 48, fontSize: 'var(--text-sm)', gap: 8 }}
              >
                {loading
                  ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <Mail size={16} />}
                {loading ? 'جارٍ الإرسال…' : 'إرسال رابط الدخول'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 'var(--lh-relaxed)' }}>
              بتسجيل دخولك توافق على شروط الاستخدام وسياسة الخصوصية
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <Loader2 size={28} style={{ color: 'var(--text-tertiary)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}