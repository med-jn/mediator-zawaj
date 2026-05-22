/**
 * app/[lang]/auth/callback/page.tsx
 *
 * بعد نجاح الدخول → نكتب cookie اسمها user_role
 * يقرأها middleware.ts ويوجّه الوسيط تلقائياً عند كل زيارة
 */
'use client';

import { Suspense }                              from 'react';
import { useEffect, useRef, useState }           from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { supabase }                              from '@/lib/supabase';

const EDGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-handshake`;

/* ── يجيب الـ role + يكتب cookie + يرجع الوجهة ──────────── */
async function loginSuccess(userId: string, lang: string): Promise<string> {
  const { data } = await supabase
    .from('profiles').select('role').eq('id', userId).single();
  const role = (data?.role as string) ?? 'user';

  // cookie تدوم شهراً — يقرأها middleware بدون DB call
  document.cookie = `user_role=${role}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

  return role === 'mediator' ? `/${lang}/agent/wallet` : `/${lang}/store/coins`;
}

/* ── fallback: إذا فشلت العملية لكن الجلسة موجودة ────────── */
async function tryFallback(lang: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return loginSuccess(session.user.id, lang);
  } catch { return null; }
}

/* ─────────────────────────────────────────────────────────── */
function CallbackHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const params       = useParams();
  const lang         = (params?.lang as string) ?? 'en';

  const [status,  setStatus]  = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Signing in…');
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        const code = searchParams.get('code');

        // ── Handshake ────────────────────────────────────────
        if (code && /^\d{6}$/.test(code)) {
          const res  = await fetch(EDGE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });
          const data = await res.json();

          if (!res.ok || !data.access_token) {
            const dest = await tryFallback(lang);
            if (dest) { router.replace(dest); return; }
            setStatus('error'); setMessage(data.error ?? 'Code verification failed'); return;
          }

          const { data: { user }, error } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });

          if (error || !user) {
            const dest = await tryFallback(lang);
            if (dest) { router.replace(dest); return; }
            setStatus('error'); setMessage('Session error'); return;
          }
          router.replace(await loginSuccess(user.id, lang)); return;
        }

        // ── Google OAuth ─────────────────────────────────────
        if (code) {
          const { data: { user }, error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error || !user) {
            const dest = await tryFallback(lang);
            if (dest) { router.replace(dest); return; }
            setStatus('error'); setMessage('Google sign-in failed'); return;
          }
          router.replace(await loginSuccess(user.id, lang)); return;
        }

        // ── Session existante ────────────────────────────────
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.replace(await loginSuccess(session.user.id, lang)); return;
        }

        setStatus('error'); setMessage('Invalid link');
      } catch {
        const dest = await tryFallback(lang);
        if (dest) { router.replace(dest); return; }
        setStatus('error'); setMessage('Unexpected error');
      }
    })();
  }, [lang, router, searchParams]);

  if (status === 'error') return (
    <div className="cb-wrap">
      <span style={{ fontSize: '2rem' }}>⚠️</span>
      <p style={{ color: 'var(--red)', fontSize: '0.9rem' }}>{message}</p>
      <button className="btn-chrome" style={{ maxWidth: 180 }}
        onClick={() => router.replace(`/${lang}/auth`)}>
        Back to Sign In
      </button>
    </div>
  );

  return (
    <div className="cb-wrap">
      <div className="cb-spinner" />
      <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>{message}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <>
      <style>{`
        .cb-wrap {
          min-height: 100dvh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 1rem;
          background: var(--bg); color: var(--text-1);
        }
        .cb-spinner {
          width: 2.5rem; height: 2.5rem;
          border: 3px solid var(--border);
          border-top-color: var(--red);
          border-radius: 50%;
          animation: cb-spin 0.8s linear infinite;
        }
        @keyframes cb-spin { to { transform: rotate(360deg); } }
      `}</style>
      <Suspense fallback={<div className="cb-wrap"><div className="cb-spinner" /></div>}>
        <CallbackHandler />
      </Suspense>
    </>
  );
}