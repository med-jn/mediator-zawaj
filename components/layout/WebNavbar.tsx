'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname }       from 'next/navigation';
import Link                             from 'next/link';
import { motion, AnimatePresence }      from 'framer-motion';
import { supabase }                     from '@/lib/supabase/client';
import { Brand }                        from '@/components/ui/brand';
import { LoveCoin }                     from '@/components/ui/LoveCoin';
import { useApp }                       from '@/context/AppContext';
import {
  Sun, Moon, LogOut, Wallet,
  Users, LayoutDashboard, Menu, X, Settings,
} from 'lucide-react';

interface NavUser {
  id:         string;
  full_name:  string;
  avatar_url: string | null;
  role:       'user' | 'mediator';
}

function AvatarFallback({ name, size = 36 }: { name: string; size?: number }) {
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

export function WebNavbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useApp();

  const [user,         setUser]         = useState<NavUser | null>(null);
  const [balance,      setBalance]      = useState<number | null>(null);
  const [avatarError,  setAvatarError]  = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthPage = pathname.startsWith('/auth');
  const isMediator = user?.role === 'mediator';
  const bdr        = 'var(--glass-border)';
  const navBg      = isDark ? 'rgba(8,0,8,0.88)' : 'rgba(255,255,255,0.88)';

  /* ── كشف الموبايل ── */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ── إغلاق القائمة عند تغيير الصفحة ── */
  useEffect(() => {
    setMenuOpen(false);
    setShowDropdown(false);
  }, [pathname]);

  /* ── جلب بيانات المستخدم ── */
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [profileRes, walletRes] = await Promise.all([
        supabase.from('profiles').select('id,full_name,avatar_url,role').eq('id', session.user.id).single(),
        supabase.from('wallets').select('balance').eq('id', session.user.id).single(),
      ]);
      if (profileRes.data) setUser(profileRes.data as NavUser);
      if (walletRes.data)  setBalance(walletRes.data.balance ?? 0);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setUser(null); setBalance(null); }
      if (event === 'SIGNED_IN')  init();
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── real-time الرصيد ── */
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`nav-wallet:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `id=eq.${user.id}` },
        async () => {
          const { data } = await supabase.from('wallets').select('balance').eq('id', user.id).single();
          if (data) setBalance(data.balance ?? 0);
        }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  /* ── إغلاق dropdown خارجه ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    document.cookie = 'user_role=; path=/; max-age=0';
    await supabase.auth.signOut({ scope: 'local' });
    setMenuOpen(false);
    router.replace('/auth');
  };

  if (isAuthPage) return null;

  return (
    <>
      {/* ════════════════════════════════
          NAVBAR
      ════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        height: 'var(--nav-h)',
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(12px, 4vw, 32px)',
        background: navBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${bdr}`,
      }}>

        {/* ══ ديسكتوب ══ */}
        {!isMobile && (
          <>
            {/* يمين: روابط + رصيد + ثيم + أفاتار */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

              {/* روابط المستخدم */}
              {user && !isMediator && (
                <>
                  <NavLink href="/mediators" active={pathname === '/mediators'}        icon={<Users size={15}/>}           label="الوسطاء"      />
                  <NavLink href="/wallet"    active={pathname.startsWith('/wallet')}   icon={<Wallet size={15}/>}          label="المحفظة"      />
                </>
              )}
              {/* روابط الوسيط */}
              {user && isMediator && (
                <>
                  <NavLink href="/agent"            active={pathname.startsWith('/agent')}           icon={<LayoutDashboard size={15}/>} label="لوحة التحكم"  />
                  <NavLink href="/mediator-pricing" active={pathname === '/mediator-pricing'}         icon={<Settings size={15}/>}        label="إعداد العروض" />
                </>
              )}

              <div style={{ width: 1, height: 20, background: bdr, margin: '0 4px' }} />

              {/* الرصيد */}
              {user && !isMediator && balance !== null && (
                <Link href="/wallet" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 'var(--radius-full)', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${bdr}` }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>{balance.toLocaleString('ar-TN')}</span>
                  <LoveCoin size={15} />
                </Link>
              )}

              {/* الثيم */}
              <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${bdr}`, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                {isDark ? <Sun size={16}/> : <Moon size={16}/>}
              </button>

              {/* أفاتار */}
              {user ? (
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                  <button onClick={() => setShowDropdown(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 4px', borderRadius: 'var(--radius-full)', border: `1px solid ${bdr}`, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', cursor: 'pointer' }}>
                    {user.avatar_url && !avatarError
                      ? <img src={user.avatar_url} alt={user.full_name} width={28} height={28} style={{ borderRadius: '50%', objectFit: 'cover' }} onError={() => setAvatarError(true)} />
                      : <AvatarFallback name={user.full_name} size={28} />}
                  </button>
                  {showDropdown && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', insetInlineStart: 0, minWidth: 180, background: isDark ? 'var(--bg-surface)' : '#fff', border: `1px solid ${bdr}`, borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-soft)', overflow: 'hidden', zIndex: 100 }}>
                      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${bdr}` }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>{user.full_name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{isMediator ? 'وسيط' : 'مستخدم'}</p>
                      </div>
                      <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: 'transparent', border: 'none', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.07)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <LogOut size={14}/> تسجيل خروج
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/auth" style={{ textDecoration: 'none' }}>
                  <button className="btn-premium" style={{ padding: '0 20px', height: 36, fontSize: 13 }}>دخول</button>
                </Link>
              )}
            </div>

            {/* فاصل مرن */}
            <div style={{ flex: 1 }} />

            {/* يسار: البراند */}
            <Link href={isMediator ? '/agent' : '/mediators'} style={{ textDecoration: 'none' }}>
              <Brand />
            </Link>
          </>
        )}

        {/* ══ موبايل ══ */}
        {isMobile && (
          <>
            {/* البراند — يمين */}
            <Link href={isMediator ? '/agent' : '/mediators'} style={{ textDecoration: 'none' }}>
              <Brand />
            </Link>

            <div style={{ flex: 1 }} />

            {/* الثيم */}
            <button onClick={toggleTheme} style={{ width: 38, height: 38, borderRadius: '50%', border: `1px solid ${bdr}`, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', marginInlineEnd: 8 }}>
              {isDark ? <Sun size={16}/> : <Moon size={16}/>}
            </button>

            {/* هامبرغر — يسار */}
            <button onClick={() => setMenuOpen(v => !v)} style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', border: `1px solid ${menuOpen ? 'var(--border-soft)' : bdr}`, background: menuOpen ? 'var(--color-primary-xsoft)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: menuOpen ? 'var(--color-primary)' : 'var(--text-main)', transition: 'all 0.2s' }}>
              {menuOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </>
        )}
      </nav>

      {/* ════════════════════════════════
          MOBILE DRAWER
      ════════════════════════════════ */}
      <AnimatePresence>
        {menuOpen && isMobile && (
          <>
            {/* backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            />

            {/* drawer */}
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: 'min(300px, 85vw)',
                zIndex: 1002,
                background: isDark ? 'var(--bg-surface)' : '#fafafa',
                borderInlineEnd: `1px solid ${bdr}`,
                display: 'flex', flexDirection: 'column',
                overflowY: 'auto',
              }}
            >
              {/* ── رأس القائمة ── */}
              <div style={{ padding: '52px 20px 20px', borderBottom: `1px solid ${bdr}`, background: isDark ? 'rgba(179,51,75,0.06)' : 'rgba(179,51,75,0.03)' }}>
                {user ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      {user.avatar_url && !avatarError
                        ? <img src={user.avatar_url} alt={user.full_name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-soft)', flexShrink: 0 }} onError={() => setAvatarError(true)} />
                        : <AvatarFallback name={user.full_name} size={52} />}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</p>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: isMediator ? 'rgba(212,175,55,0.15)' : 'var(--color-primary-xsoft)', color: isMediator ? '#D4AF37' : 'var(--color-primary)', border: `1px solid ${isMediator ? 'rgba(212,175,55,0.3)' : 'var(--border-soft)'}` }}>
                          {isMediator ? 'وسيط' : 'مستخدم'}
                        </span>
                      </div>
                    </div>
                    {/* الرصيد */}
                    {!isMediator && balance !== null && (
                      <Link href="/wallet" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${bdr}` }}>
                          <LoveCoin size={18} />
                          <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-main)' }}>{balance.toLocaleString('ar-TN')}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginInlineStart: 'auto' }}>اضغط للشحن →</span>
                        </div>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 14 }}>مرحباً بك في زواج</p>
                    <Link href="/auth" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                      <button className="btn-premium" style={{ width: '100%', height: 46, fontSize: 15 }}>تسجيل الدخول</button>
                    </Link>
                  </>
                )}
              </div>

              {/* ── روابط التنقل ── */}
              <div style={{ flex: 1, padding: '10px 10px' }}>
                {user && !isMediator && (
                  <>
                    <DrawerLink href="/mediators" label="الوسطاء"  icon={<Users size={18}/>}  active={pathname === '/mediators'}          onClick={() => setMenuOpen(false)} />
                    <DrawerLink href="/wallet"    label="المحفظة"   icon={<Wallet size={18}/>} active={pathname.startsWith('/wallet')}     onClick={() => setMenuOpen(false)} />
                  </>
                )}
                {user && isMediator && (
                  <>
                    <DrawerLink href="/agent"            label="لوحة التحكم"   icon={<LayoutDashboard size={18}/>} active={pathname.startsWith('/agent')}        onClick={() => setMenuOpen(false)} />
                    <DrawerLink href="/mediator-pricing" label="إعداد العروض"  icon={<Settings size={18}/>}        active={pathname === '/mediator-pricing'}     onClick={() => setMenuOpen(false)} />
                  </>
                )}
              </div>

              {/* ── تسجيل خروج ── */}
              {user && (
                <div style={{ padding: '10px 10px 32px', borderTop: `1px solid ${bdr}` }}>
                  <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', color: '#f87171', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <LogOut size={17}/> تسجيل خروج
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── NavLink ── */
function NavLink({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 'var(--radius-full)', background: active ? 'var(--color-primary-xsoft)' : 'transparent', border: `1px solid ${active ? 'var(--border-soft)' : 'transparent'}`, color: active ? 'var(--color-primary)' : 'var(--text-tertiary)', fontSize: 13, fontWeight: active ? 700 : 500, transition: 'all 0.15s', cursor: 'pointer' }}>
        {icon}{label}
      </div>
    </Link>
  );
}

/* ── DrawerLink ── */
function DrawerLink({ href, active, icon, label, onClick }: { href: string; active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 'var(--radius-md)', background: active ? 'var(--color-primary-xsoft)' : 'transparent', color: active ? 'var(--color-primary)' : 'var(--text-secondary)', fontSize: 15, fontWeight: active ? 700 : 500, marginBottom: 2, transition: 'background 0.15s', cursor: 'pointer' }}>
        {icon}{label}
      </div>
    </Link>
  );
}