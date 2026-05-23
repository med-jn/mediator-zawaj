'use client';

import { Suspense }                    from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams }  from 'next/navigation';
import { supabase }                    from '@/lib/supabase/client';

const EDGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-handshake`;

async function loginSuccess(userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles').select('role').eq('id', userId).single();
  const role = (data?.role as string) ?? 'user';

  document.cookie = `user_role=${role}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

  return role === 'mediator' ? '/agent' : '/mediators';
}

async function tryFallback(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return loginSuccess(session.user.id);
  } catch { return null; }
}

function CallbackHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [status,  setStatus]  = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('جارٍ تسجيل الدخول…');
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        const code = searchParams.get('code');

        // ── Handshake من التطبيق (6 أرقام) ──────────────────
        if (code && /^\d{6}$/.test(code)) {
          const res  = await fetch(EDGE_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ code }),
          });
          const data = await res.json();

          if (!res.ok || !data.access_token) {
            const dest = await tryFallback();
            if (dest) { router.replace(dest); return; }
            setStatus('error'); setMessage(data.error ?? 'فشل التحقق من الرمز'); return;
          }

          const { data: { user }, error } = await supabase.auth.setSession({
            access_token:  data.access_token,
            refresh_token: data.refresh_token,
          });
          if (error || !user) {
            const dest = await tryFallback();
            if (dest) { router.replace(dest); return; }
            setStatus('error'); setMessage('خطأ في الجلسة'); return;
          }
          router.replace(await loginSuccess(user.id)); return;
        }

        // ── Google OAuth ──────────────────────────────────────
        if (code) {
          const { data: { user }, error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (error || !user) {
            const dest = await tryFallback();
            if (dest) { router.replace(dest); return; }
            setStatus('error'); setMessage('فشل تسجيل الدخول بـ Google'); return;
          }
          router.replace(await loginSuccess(user.id)); return;
        }

        // ── جلسة موجودة ──────────────────────────────────────
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.replace(await loginSuccess(session.user.id)); return;
        }

        setStatus('error'); setMessage('رابط غير صالح');
      } catch {
        const dest = await tryFallback();
        if (dest) { router.replace(dest); return; }
        setStatus('error'); setMessage('خطأ غير متوقع');
      }
    })();
  }, [router, searchParams]);

  return (
    <div className="cb-wrap">
      {status === 'error' ? (
        <>
          <span style={{ fontSize: '2.5rem' }}>⚠️</span>
          <p style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
            {message}
          </p>
          <button className="btn-premium" style={{ maxWidth: 200 }}
            onClick={() => router.replace('/auth')}>
            العودة لتسجيل الدخول
          </button>
        </>
      ) : (
        <>
          <div className="cb-spinner" />
          <p style={{ color: 'var(--tex