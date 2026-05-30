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

  useEffect(() => { setOpen(false); }, [pathname]);

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

  const bdr = 'var(--glass-border)';

  return (
    <>
      <style>{`
        .nav-drop-item { transition: background 0.15s; color: var(--text-secondary); }
        .nav-drop-item:hover { background: var(--color-primary-xsoft) !important; color: var(--color-primary) !important; }
        .nav-drop-item.is-active { background: var(--color-primary-xsoft); color: var(--color-primary); font-weight: 700; }
        .nav-drop-logout { transition: background 0.15s; }
        .nav-drop-logout:hover { background: rgba(239,68,68,0.08) !important; }
        .nav-drop-theme { transition: background 0.15s; }
        .nav-drop-theme:hover { background: var(--bg-elevated) !important; }
        .nav-menu-btn { transition: all 0.2s; }
        .nav-menu-btn:hover { border-color: var(--border-soft) !important; background: var(--color-primary-xsoft) !important; }
      `}</style>

      <nav style={{
        position:   'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        height:     'var(--nav-h)',
        display:    'flex', alignItems: 'center', justifyContent: 'space-between',
        padding:    '0 clamp(16px, 4vw, 32px)',
        background: isDark ? 'rgba(8,0,8,0.90)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${bdr}`,
      }}>

        {/* ── زر القائمة — يمين (أول عنصر في RTL) ── */}
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>

          {user ? (
            <motion.button
              whileTap={{ scale: 0.90 }}
              onClick={() => setOpen(v => !v)}
              className="nav-menu-btn"
              style={{
                width: 44, height: 44,
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${open ? 'var(--border-soft)' : bdr}`,
                background: open ? 'var(--color-primary-xsoft)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {open ? (
                  <motion.span key="x"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0,   opacity: 1 }}
                    exit={{   rotate:  90, opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    style={{ display: 'flex' }}>
                    <X size={22} style={{ color: 'var(--color-primary)' }} />
                  </motion.span>
                ) : (
                  <motion.span key="m"
                    initial={{ rotate:  90, opacity: 0 }}
                    animate={{ rotate: 0,   opacity: 1 }}
                    exit={{   rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    style={{ display: 'flex' }}>
                    <Menu size={22} style={{ color: 'var(--text-main)' }} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ) : (
            <Link href="/auth" style={{ textDecoration: 'none' }}>
              <button className="btn-premium" style={{ height: 38, padding: '0 22px', fontSize: 13 }}>
                دخول
              </button>
            </Link>
          )}

          {/* ════ DROPDOWN ════ */}
          <AnimatePresence>
            {open && user && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y:  0, scale: 1    }}
                exit={{   opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  insetInlineStart: 0,
                  minWidth: 240,
                  background: isDark ? 'var(--bg-surface)' : '#fff',
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
                      <img
                        src={user.avatar_url} alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{initials}</span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 14, fontWeight: 800,
                    color: 'var(--text-main)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1, minWidth: 0,
                  }}>
                    {user.full_name}
                  </p>
                </div>

                {/* الروابط */}
                <div style={{ padding: '6px 0' }}>
                  {!isMediator && (
                    <>
                      <DropItem href="/mediators" icon={<Users size={16}/>}  label="الوسطاء"  active={pathname === '/mediators'}      />
                      <DropItem href="/wallet"    icon={<Wallet size={16}/>} label="المحفظة"  active={pathname.startsWith('/wallet')} />
                    </>
                  )}
                  {isMediator && (
                    <>
                      <DropItem href="/agent"            icon={<LayoutDashboard size={16}/>} label="لوحة التحكم"  active={pathname.startsWith('/agent')}        />
                      <DropItem href="/mediator-pricing" icon={<Settings size={16}/>}        label="إعداد العروض" active={pathname === '/mediator-pricing'}     />
                    </>
                  )}

                  {/* الثيم */}
                  <button
                    onClick={toggleTheme}
                    className="nav-drop-theme"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', background: 'transparent', border: 'none',
                      color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {isDark ? <Sun size={16}/> : <Moon size={16}/>}
                    {isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
                  </button>
                </div>

                {/* تسجيل خروج */}
                <div style={{ borderTop: `1px solid ${bdr}`, padding: '6px 0 6px' }}>
                  <button
                    onClick={handleLogout}
                    className="nav-drop-logout"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', background: 'transparent', border: 'none',
                      color: '#f87171', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <LogOut size={16}/> تسجيل خروج
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      {/* ── براند — يسار — scale 65% ── */}
      <Link
        href={isMediator ? '/agent' : '/mediators'}
        style={{ textDecoration: 'none', flexShrink: 0 }}
      >
        <div style={{
          transform: 'scale(0.65)',
          transformOrigin: 'left center',   // ← تغيير من right إلى left
          // marginInlineStart محذوف
        }}>
          <Brand />
        </div>
      </Link>

      </nav>
    </>
  );
}

function DropItem({ href, icon, label, active }: {
  href: string; icon: React.ReactNode; label: string; active: boolean;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        className={`nav-drop-item${active ? ' is-active' : ''}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: active ? 700 : 500,
          cursor: 'pointer',
        }}
      >
        {icon}{label}
      </div>
    </Link>
  );
}