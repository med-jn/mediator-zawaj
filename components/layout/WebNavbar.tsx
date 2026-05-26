'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname }       from 'next/navigation';
import Link                             from 'next/link';
import { motion, AnimatePresence }      from 'framer-motion';
import { supabase }                     from '@/lib/supabase/client';
import { Brand }                        from '@/components/ui/brand';
import { useApp }                       from '@/context/AppContext';
import {
  Menu, X, LogOut, Wallet,
  Users, LayoutDashboard, Settings, Sun, Moon,
} from 'lucide-react';

interface NavUser {
  id:         string;
  full_name:  string;
  avatar_url: string | null;
  role:       'user' | 'mediator';
}

export function WebNavbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useApp();

  const [user,        setUser]        = useState<NavUser | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [open,        setOpen]        = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthPage = pathname.startsWith('/auth');
  const isMediator = user?.role === 'mediator';

  /* ── إغلاق عند تغيير الصفحة ── */
  useEffect(() => { setOpen(false); }, [pathname]);

  /* ── جلب بيانات المستخدم ── */
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('profiles').select('id,full_name,avatar_url,role')
        .eq('id', session.user.id).single();
      if (data) setUser(data as NavUser);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null);
      if (event === 'SIGNED_IN')  init();
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── إغلاق القائمة بالنقر خارجها ── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = async () => {
    document.cookie = 'user_role=; path=/; max-age=0';
    await supabase.auth.signOut({ scope: 'local' });
    setOpen(false);
    router.replace('/auth');
  };

  if (isAuthPage) return null;

  const initials = user
    ? user.full_name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '';

  const surface = isDark ? 'var(--bg-surface)' : '#fff';
  const bdr     = 'var(--glass-border)';

  return (
    <>
      <style>{`
        .drop-item { transition: background 0.15s; }
        .drop-item:hover { background: var(--color-primary-xsoft) !important; }
        .drop-item.active { background: var(--color-primary-xsoft); }
        .drop-logout:hover { background: rgba(239,68,68,0.08) !important; }
        .drop-theme:hover  { background: var(--bg-elevated) !important; }
      `}</style>

      <nav style={{
        position:   'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        height:     'var(--nav-h)',
        display:    'flex', alignItems: 'center', justifyContent: 'space-between',
        padding:    '0 clamp(16px, 4vw, 36px)',
        background: isDark ? 'rgba(8,0,8,0.88)' : 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${bdr}`,
      }}>

        {/* ── براند — يمين (RTL start) ── */}
        <Link href={isMediator ? '/agent' : '/mediators'} style={{ textDecoration: 'none' }}>
          <Brand />
        </Link>

        {/* ── زر القائمة — يسار (RTL end) ── */}
        <div ref={menuRef} style={{ position: 'relative' }}>

          {user ? (
            /* مستخدم مسجّل — زر هامبرغر مع أفاتار */
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 10px 5px 5px',
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${open ? 'var(--border-soft)' : bdr}`,
                background: open
                  ? 'var(--color-primary-xsoft)'
                  : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {/* أفاتار دائري */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                overflow: 'hidden', flexShrink: 0,
                background: 'linear-gradient(135deg, #800020, var(--color-primary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {user.avatar_url && !avatarError ? (
                  <img
                    src={user.avatar_url} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {initials}
                  </span>
                )}
              </div>

              {/* أيقونة Menu/X */}
              <AnimatePresence mode="wait" initial={false}>
                {open ? (
                  <motion.span key="x"
                    initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X size={15} style={{ color: 'var(--color-primary)', display: 'block' }} />
                  </motion.span>
                ) : (
                  <motion.span key="m"
                    initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu size={15} style={{ color: 'var(--text-tertiary)', display: 'block' }} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ) : (
            /* زائر — زر دخول */
            <Link href="/auth" style={{ textDecoration: 'none' }}>
              <button className="btn-premium" style={{ height: 38, padding: '0 24px', fontSize: 13 }}>
                دخول
              </button>
            </Link>
          )}

          {/* ════════ DROPDOWN ════════ */}
          <AnimatePresence>
            {open && user && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  insetInlineEnd: 0,
                  minWidth: 232,
                  background: surface,
                  border: `1px solid ${bdr}`,
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-deep)',
                  overflow: 'hidden',
                  zIndex: 100,
                }}
              >

                {/* الهوية */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px',
                  borderBottom: `1px solid ${bdr}`,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    overflow: 'hidden', flexShrink: 0,
                    background: 'linear-gradient(135deg, #800020, var(--color-primary))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {user.avatar_url && !avatarError ? (
                      <img src={user.avatar_url} alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={() => setAvatarError(true)} />
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{initials}</span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 14, fontWeight: 800, color: 'var(--text-main)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {user.full_name}
                  </p>
                </div>

                {/* الروابط */}
                <div style={{ padding: '6px 0' }}>
                  {!isMediator && (
                    <>
                      <DropItem href="/mediators" icon={<Users size={15}/>}  label="الوسطاء"  active={pathname === '/mediators'}        />
                      <DropItem href="/wallet"    icon={<Wallet size={15}/>} label="المحفظة"  active={pathname.startsWith('/wallet')}   />
                    </>
                  )}
                  {isMediator && (
                    <>
                      <DropItem href="/agent"            icon={<LayoutDashboard size={15}/>} label="لوحة التحكم"  active={pathname.startsWith('/agent')}        />
                      <DropItem href="/mediator-pricing" icon={<Settings size={15}/>}        label="إعداد العروض" active={pathname === '/mediator-pricing'}     />
                    </>
                  )}

                  {/* الثيم */}
                  <button
                    onClick={toggleTheme}
                    className="drop-theme"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 16px', background: 'transparent', border: 'none',
                      color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {isDark ? <Sun size={15}/> : <Moon size={15}/>}
                    {isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
                  </button>
                </div>

                {/* تسجيل خروج */}
                <div style={{ padding: '6px 0 8px', borderTop: `1px solid ${bdr}` }}>
                  <button
                    onClick={handleLogout}
                    className="drop-logout"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 16px', background: 'transparent', border: 'none',
                      color: '#f87171', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <LogOut size={15}/> تسجيل خروج
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </>
  );
}

/* ── عنصر في القائمة ── */
function DropItem({ href, icon, label, active }: {
  href: string; icon: React.ReactNode; label: string; active: boolean;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        className={`drop-item${active ? ' active' : ''}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px',
          color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
          fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
        }}
      >
        {icon}{label}
      </div>
    </Link>
  );
}