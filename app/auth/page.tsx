'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams }    from 'next/navigation';
import { motion, AnimatePresence }       from 'framer-motion';
import { supabase }                      from '@/lib/supabase/client';
import { GoogleButton }                  from '@/components/ui/googlebutton';
import { Brand }                         from '@/components/ui/brand';
import { Loader2, Mail, CheckCircle, ArrowRight } from 'lucide-react';
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

  /* ── تحميل ── */
  if (checking) return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)',
    }}>
      <div style={{ marginBottom: 24 }}><Brand /></div>
      <Loader2 size={22} style={{ color: 'var(--text-tertiary)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: '20px 16px',
    }}>

      {/* ── خلفية ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 100% 60% at 50% -10%, rgba(179,51,75,0.22), transparent 70%)',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, pointerEvents: 'none', height: '40%',
        background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(128,0,32,0.08), transparent)',
      }} />

      {/* ── الكارت ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 'min(420px, 100%)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(28px, 6vw, 48px) clamp(20px, 5vw, 40px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* خط علوي */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          background: 'linear-gradient(90deg, var(--color-primary), #D4AF37, transparent)',
        }} />

        {/* ── Brand ── */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <Brand />
        </div>
        <p style={{
          textAlign: 'center',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-tertiary)',
          marginBottom: 32,
          lineHeight: 'var(--lh-relaxed)',
        }}>
          التعارف الإسلامي عبر وسطاء موثوقين
        </p>

        {/* ── حالة: تم الإرسال ── */}
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              style={{ textAlign: 'center', padding: '8px 0' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <CheckCircle size={32} style={{ color: '#22c55e' }} />
              </motion.div>

              <p style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-main)', marginBottom: 10 }}>
                تحقق من بريدك
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
                  padding: '9px 24px',
                  cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--border-soft)';
                  e.currentTarget.style.color = 'var(--color-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                }}
              >
                تغيير البريد الإلكتروني
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {/* Google */}
              <GoogleButton onClick={handleGoogle} />

              {/* فاصل */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                  أو عبر البريد الإلكتروني
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="البريد الإلكتروني"
                  required
                  className="lux-input"
                  style={{ textAlign: 'right', fontSize: 'var(--text-base)' }}
                  autoComplete="email"
                  inputMode="email"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-premium"
                  style={{
                    width: '100%',
                    height: 50,
                    fontSize: 'var(--text-sm)',
                    gap: 8,
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {loading
                    ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                    : <Mail size={16} />}
                  {loading ? 'جارٍ الإرسال…' : 'إرسال رابط الدخول'}
                </button>
              </form>

              <p style={{
                textAlign: 'center', fontSize: 10,
                color: 'var(--text-tertiary)', lineHeight: 'var(--lh-relaxed)',
                marginTop: 4,
              }}>
                بتسجيل دخولك توافق على{' '}
                <span style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>شروط الاستخدام</span>
                {' '}و{' '}
                <span style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>سياسة الخصوصية</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)',
      }}>
        <div style={{ marginBottom: 24 }}><Brand /></div>
        <Loader2 size={22} style={{ color: 'var(--text-tertiary)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}