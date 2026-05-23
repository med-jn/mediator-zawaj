'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname }       from 'next/navigation';
import Link                             from 'next/link';
import { supabase }                     from '@/lib/supabase/client';
import { Brand }                           from '@/components/ui/brand';
import { LoveCoin }                     from '@/components/ui/LoveCoin';
import { useApp }                       from '@/context/AppContext';
import {
  Sun, Moon, LogOut, Wallet,
  Users, LayoutDashboard, ChevronDown,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────── */
interface NavUser {
  id:         string;
  full_name:  string;
  avatar_url: string | null;
  role:       'user' | 'mediator';
}

/* ── Helpers ─────────────────────────────────────────────── */
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

/* ── Component ───────────────────────────────────────────── */
export function WebNavbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useApp();

  const [user,         setUser]         = useState<NavUser | null>(null);
  const [balance,      setBalance]      = useState<number | null>(null);
  const [avatarError,  setAvatarError]  = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── إخفاء الـ Navbar في صفحات المصادقة ───────────────
  const isAuthPage = pathname.startsWith('/auth');

  // ── جلب بيانات المستخدم ──────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [profileRes, walletRes] = await Promise.all([
        supabase.from('profiles')
          .select('id,full_name,avatar_url,role')
          .eq('id', session.user.id).single(),
        supabase.from('wallets')
          .select('balance')
          .eq('id', session.user.id).single(),
      ]);

      if (profileRes.data) setUser(profileRes.data as NavUser);
      if (walletRes.data)  setBalance(walletRes.data.balance ?? 0);
    };

    init();

    // مراقبة تغييرات الجلسة
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setUser(null); setBalance(null); }
      if (event === 'SIGNED_IN')  init();
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── real-time للرصيد ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`nav-wallet:${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'wallets', filter: `id=eq.${user.id}`,
      }, async () => {
        const { data } = await supabase.from('wallets').select('balance').eq('id', user.id).single();
        if (data) setBalance(data.balance ?? 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // ── إغلاق الـ dropdown عند النقر خارجه ───────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    document.cookie = 'user_role=; path=/; max-age=0';
    await supabase.auth.signOut({ scope: 'local' });
    setShowDropdown(false);
    router.replace('/auth');
  };

  // ── لا Navbar في صفحات الـ auth ─────────────────────
  if (isAuthPage) return null;

  const isMediator = user?.role === 'mediator';
  const bdr        = 'var(--glass-border)';

  return (
    <nav style={{
      position:    'fixed',
      top:         0, left: 0, right: 0,
      zIndex:      1000,
      height:      'var(--nav-h)',
      display:     'flex',
      alignItems:  'center',
      padding:     '0 clamp(16px, 4vw, 40px)',
      background:  isDark ? 'rgba(8,0,8,0.85)' : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${bdr}`,
    }}>

      {/* ── Logo / Brand ──────────────────────────────── */}
      <Link href={isMediator ? '/agent' : '/mediators'} style={{
        textDecoration: 'none',
        display:        'flex',
        alignItems:     'center',
        gap:            8,
        marginInlineEnd: 'auto',  // يدفع باقي العناصر لليسار في RTL
      }}>
        
        <Brand/> 
    
      </Link>

      {/* ── روابط التنقل (مستخدم عادي فقط) ──────────── */}
      {user && !isMediator && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginInlineEnd: 16 }}>
          <NavLink href="/mediators" active={pathname === '/mediators'} icon={<Users size={15}/>} label="الوسطاء" />
          <NavLink href="/wallet"    active={pathname.startsWith('/wallet')} icon={<Wallet size={15}/>} label="المحفظة" />
        </div>
      )}

      {/* ── روابط التنقل (وسيط) ──────────────────────── */}
      {user && isMediator && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginInlineEnd: 16 }}>
          <NavLink href="/agent" active={pathname.startsWith('/agent')} icon={<LayoutDashboard size={15}/>} label="لوحة التحكم" />
        </div>
      )}

      {/* ── اليمين: رصيد + ثيم + أفاتار ─────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* الرصيد — للمستخدم العادي فقط */}
        {user && !isMediator && balance !== null && (
          <Link href="/wallet" style={{
            textDecoration: 'none',
            display:        'flex',
            alignItems:     'center',
            gap:            5,
            padding:        '6px 12px',
            borderRadius:   'var(--radius-full)',
            background:     isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border:         `1px solid ${bdr}`,
            transition:     'background 0.2s',
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>
              {balance.toLocaleString('ar-TN')}
            </span>
            <LoveCoin size={15} />
          </Link>
        )}

        {/* زر الثيم */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
          style={{
            width: 36, height: 36,
            borderRadius: '50%',
            border:     `1px solid ${bdr}`,
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            display:    'flex', alignItems: 'center', justifyContent: 'center',
            cursor:     'pointer',
            color:      'var(--text-secondary)',
            transition: 'all 0.2s',
          }}>
          {isDark
            ? <Sun  size={16} />
            : <Moon size={16} />}
        </button>

        {/* أفاتار + Dropdown */}
        {user ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDropdown(v => !v)}
              style={{
                display:    'flex', alignItems: 'center', gap: 6,
                padding:    '4px 8px 4px 4px',
                borderRadius: 'var(--radius-full)',
                border:     `1px solid ${bdr}`,
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                cursor:     'pointer',
              }}
            >
              {user.avatar_url && !avatarError ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  width={28}
                  height={28}
                  style={{ borderRadius: '50%', objectFit: 'cover' }}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <AvatarFallback name={user.full_name} size={28} />
              )}
              <ChevronDown
                size={13}
                style={{
                  color:     'var(--text-tertiary)',
                  transform: showDropdown ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div style={{
                position:   'absolute',
                top:        'calc(100% + 8px)',
                insetInlineStart: 0,    // RTL: يفتح من اليسار
                minWidth:   180,
                background: isDark ? 'var(--bg-surface)' : '#fff',
                border:     `1px solid ${bdr}`,
                borderRadius: 'var(--radius-md)',
                boxShadow:  'var(--shadow-soft)',
                overflow:   'hidden',
                zIndex:     100,
              }}>
                {/* اسم المستخدم */}
                <div style={{
                  padding:      '12px 16px',
                  borderBottom: `1px solid ${bdr}`,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>
                    {user.full_name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {isMediator ? 'وسيط' : 'مستخدم'}
                  </p>
                </div>

                {/* تسجيل خروج */}
                <button
                  onClick={handleLogout}
                  style={{
                    width:      '100%',
                    display:    'flex', alignItems: 'center', gap: 8,
                    padding:    '11px 16px',
                    background: 'transparent',
                    border:     'none',
                    color:      '#f87171',
                    fontSize:   13, fontWeight: 600,
                    cursor:     'pointer',
                    textAlign:  'right',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={14} />
                  تسجيل خروج
                </button>
              </div>
            )}
          </div>
        ) : (
          /* زر الدخول للزوار */
          <Link href="/auth" style={{ textDecoration: 'none' }}>
            <button className="btn-premium" style={{ padding: '0 20px', height: 36, fontSize: 13 }}>
              دخول
            </button>
          </Link>
        )}
      </div>
    </nav>
  );
}

/* ── NavLink مساعد ─────────────────────────────────────── */
function NavLink({
  href, active, icon, label,
}: {
  href: string; active: boolean; icon: React.ReactNode; label: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        display:      'flex', alignItems: 'center', gap: 5,
        padding:      '6px 12px',
        borderRadius: 'var(--radius-full)',
        background:   active ? 'var(--color-primary-xsoft)' : 'transparent',
        border:       `1px solid ${active ? 'var(--border-soft)' : 'transparent'}`,
        color:        active ? 'var(--color-primary)' : 'var(--text-tertiary)',
        fontSize:     13, fontWeight: active ? 700 : 500,
        transition:   'all 0.15s',
        cursor:       'pointer',
      }}>
        {icon}
        {label}
      </div>
    </Link>
  );
}