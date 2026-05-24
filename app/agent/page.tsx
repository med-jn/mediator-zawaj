'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter }   from 'next/navigation';
import { motion }      from 'framer-motion';
import { supabase }    from '@/lib/supabase/client';
import { LoveCoin }    from '@/components/ui/LoveCoin';
import { LevelBadge }  from '@/components/gems';

/* ── Types ── */
interface MediatorProfile { full_name: string; avatar_url: string | null; mediator_level: string | null; created_at: string; }
interface Wallet { total_coins: number; total_tnd: number; pending_tnd: number; paid_tnd: number; }
interface Tx { transaction_id: string; amount: number; source: string; created_at: string; value_tnd: number | null; user_name: string | null; }
interface Client { id: string; user_id: string; coins: number; tnd_value: number; status: string; created_at: string; expires_at: string; user_profile: { full_name: string | null; avatar_url: string | null } | null; }
interface Payout { id: string; amount: number; currency: string; status: string; created_at: string; paid_at: string | null; admin_note: string | null; }

/* ── Helpers ── */
const fmtTND  = (n: number) => n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ar-TN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtMonth = (iso: string) => new Date(iso).toLocaleDateString('ar-TN', { month: 'long', year: 'numeric' });

function DateCell({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <div>
      <div>{fmtDate(iso)}</div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
        {d.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit', hour12: false })}
      </div>
    </div>
  );
}

function MiniAvatar({ name, src, size = 32 }: { name: string | null; src: string | null; size?: number }) {
  const initials = (name ?? '؟').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return src
    ? <img src={src} alt={name ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#800020,var(--color-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.33, fontWeight: 800, color: '#fff' }}>{initials}</div>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    active:    { bg: 'rgba(52,211,153,0.1)',  color: '#34d399', border: 'rgba(52,211,153,0.3)',  label: 'نشط'     },
    cancelled: { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.3)',   label: 'ملغى'    },
    pending:   { bg: 'var(--color-primary-xsoft)', color: 'var(--color-primary)', border: 'var(--border-soft)', label: 'معلّق' },
    completed: { bg: 'rgba(99,102,241,0.1)',  color: '#818cf8', border: 'rgba(99,102,241,0.3)',  label: 'مكتمل'   },
    paid:      { bg: 'rgba(99,102,241,0.1)',  color: '#818cf8', border: 'rgba(99,102,241,0.3)',  label: 'مدفوع'   },
    failed:    { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.3)',   label: 'فاشل'    },
  };
  const c = map[status] ?? map.pending;
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

const thS: React.CSSProperties = { padding: '10px 14px', textAlign: 'right', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid var(--glass-border)' };
const tdS: React.CSSProperties = { padding: '13px 14px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)', verticalAlign: 'middle' };

export default function AgentPage() {
  const router = useRouter();

  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [profile,        setProfile]        = useState<MediatorProfile | null>(null);
  const [wallet,         setWallet]         = useState<Wallet | null>(null);
  const [txs,            setTxs]            = useState<Tx[]>([]);
  const [clients,        setClients]        = useState<Client[]>([]);
  const [payouts,        setPayouts]        = useState<Payout[]>([]);
  const [tab,            setTab]            = useState<'tx' | 'clients' | 'payouts'>('tx');
  const [totalClients,   setTotalClients]   = useState(0);
  const [clientFilter,   setClientFilter]   = useState<'all' | 'active' | 'inactive'>('all');
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutAmount,   setPayoutAmount]   = useState('');
  const [payoutIban,     setPayoutIban]     = useState('');
  const [payoutNotes,    setPayoutNotes]    = useState('');
  const [payoutLoading,  setPayoutLoading]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth'); return; }

      const { data: prof } = await supabase.from('profiles')
        .select('role,full_name,avatar_url,mediator_level,created_at')
        .eq('id', user.id).single();

      if (prof?.role !== 'mediator') { setError('هذا الحساب ليس وسيطاً'); setLoading(false); return; }
      setProfile(prof);

      const [wRes, txRes, cRes, pRes] = await Promise.all([
        supabase.from('mediator_wallets').select('*').eq('mediator_id', user.id).single(),
        supabase.from('point_transactions')
          .select('transaction_id,amount,source,created_at,value_tnd,user_name')
          .eq('mediator_id', user.id)
          .in('source', ['mediator_income', 'payout'])
          .order('created_at', { ascending: false }).limit(40),
        supabase.from('mediator_clients')
          .select('id,user_id,coins,tnd_value,status,created_at,expires_at')
          .eq('mediator_id', user.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('payouts')
          .select('id,amount,currency,status,created_at,paid_at,admin_note')
          .eq('mediator_id', user.id).order('created_at', { ascending: false }),
      ]);

      setWallet(wRes.data);
      setTxs(txRes.data ?? []);

      const clientRows = cRes.data ?? [];
      const userIds = clientRows.map((c: any) => c.user_id).filter(Boolean);
      let pMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id,full_name,avatar_url').in('id', userIds);
        for (const p of profs ?? []) pMap[p.id] = p;
      }
      setClients(clientRows.map((c: any) => ({ ...c, user_profile: pMap[c.user_id] ?? null })));

      const { count } = await supabase.from('mediator_clients')
        .select('id', { count: 'exact', head: true }).eq('mediator_id', user.id);
      setTotalClients(count ?? clientRows.length);
      setPayouts(pRes.data ?? []);
    } catch { setError('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const handleSignOut = async () => {
    document.cookie = 'user_role=; path=/; max-age=0';
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  const submitPayout = async () => {
    const amount = parseFloat(payoutAmount.replace(',', '.'));
    const maxAmount = wallet?.pending_tnd ?? 0;
    if (!amount || amount <= 0 || amount > maxAmount) return;
    const thisMonth = new Date().toISOString().slice(0, 7);
    if (payouts.some(p => p.created_at.slice(0, 7) === thisMonth && p.status === 'pending')) {
      alert('لديك طلب معلق هذا الشهر'); return;
    }
    setPayoutLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('payouts').insert({
        mediator_id: user!.id, amount, currency: 'TND', status: 'pending',
        notes: payoutNotes || null, iban: payoutIban || null, period: thisMonth,
      });
      if (error) throw error;
      setShowPayoutForm(false); setPayoutAmount(''); setPayoutIban(''); setPayoutNotes('');
      load();
    } catch { alert('حدث خطأ، حاول مرة أخرى.'); }
    finally { setPayoutLoading(false); }
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
    border:     active ? '1px solid var(--border-soft)' : '1px solid transparent',
    background: active ? 'var(--color-primary-xsoft)' : 'transparent',
    color:      active ? 'var(--color-primary)' : 'var(--text-tertiary)',
  });

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--glass-border)', borderTopColor: 'var(--color-primary)', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>جارٍ التحميل…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--color-primary)', marginBottom: 16 }}>{error}</p>
        <button onClick={() => router.replace('/auth')} style={{ color: 'var(--text-tertiary)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          تسجيل الدخول
        </button>
      </div>
    </div>
  );

  const activeCount = clients.filter(c => c.status === 'active').length;

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .aw-tr { transition: background 0.15s; }
        .aw-tr:hover { background: var(--bg-elevated) !important; }
      `}</style>

      {/* وهج الخلفية */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 35% at 50% 0%, var(--color-primary-xsoft), transparent)' }} />

      <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* ── Profile Header ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 24, boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--color-primary), transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid var(--border-soft)', boxShadow: '0 0 0 1px var(--glass-border)' }} />
              : <div style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#800020,var(--color-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff' }}>
                  {(profile?.full_name ?? '؟').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 'clamp(18px,3vw,24px)', fontWeight: 900, color: 'var(--text-main)' }}>{profile?.full_name}</span>
                {totalClients > 0 && <LevelBadge subscribers={totalClients} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {activeCount > 0 && <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}><span style={{ color: '#34d399', fontWeight: 700 }}>{activeCount}</span> عميل نشط</p>}
                {totalClients > 0 && <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>إجمالي المشتركين: <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{totalClients}</span></p>}
                {profile?.created_at && <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>عضو منذ {fmtMonth(profile.created_at)}</p>}
              </div>
            </div>
            <button onClick={handleSignOut}
              style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-xsoft)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}>
              تسجيل خروج
            </button>
          </div>
        </motion.div>

        {/* ── Stats Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 28 }}>
          {([
            { label: 'العملات',          val: (wallet?.total_coins ?? 0).toLocaleString(), unit: 'عملة', accent: 'rgba(251,191,36,0.35)', isCoins: true },
            { label: 'إجمالي المكتسب',   val: fmtTND(wallet?.total_tnd   ?? 0),            unit: 'د.ت',  accent: 'rgba(52,211,153,0.35)'  },
            { label: 'قيد الانتظار',     val: fmtTND(wallet?.pending_tnd ?? 0),            unit: 'د.ت',  accent: 'var(--border-soft)'     },
            { label: 'المدفوع',          val: fmtTND(wallet?.paid_tnd    ?? 0),            unit: 'د.ت',  accent: 'rgba(99,102,241,0.35)'  },
          ] as any[]).map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: 'var(--bg-surface)', border: `1px solid ${s.accent}`, borderRadius: 'var(--radius-md)', padding: '20px 22px', boxShadow: 'var(--shadow-soft)' }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 10 }}>{s.label}</p>
              {s.isCoins
                ? <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 8 }}>{s.val} <LoveCoin size={22} /></div>
                : <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{s.val}</p>}
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>{s.unit}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button style={tabBtn(tab === 'tx')}      onClick={() => setTab('tx')}>المعاملات</button>
          <button style={tabBtn(tab === 'clients')} onClick={() => setTab('clients')}>
            العملاء
            {clients.length > 0 && (
              <span style={{ background: 'var(--color-primary-xsoft)', color: 'var(--color-primary)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-full)', padding: '0 7px', fontSize: 10, marginInlineStart: 6 }}>
                {clients.length}
              </span>
            )}
          </button>
          <button style={tabBtn(tab === 'payouts')} onClick={() => setTab('payouts')}>السحوبات</button>
        </div>

        {/* ── Panel ── */}
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-soft)' }}>

          {/* المعاملات */}
          {tab === 'tx' && (txs.length === 0
            ? <p style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>لا توجد معاملات بعد</p>
            : <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={thS}>التاريخ</th>
                    <th style={thS}>المصدر</th>
                    <th style={{ ...thS, textAlign: 'end' }}>العملات</th>
                    <th style={{ ...thS, textAlign: 'end' }}>د.ت</th>
                  </tr></thead>
                  <tbody>
                    {txs.map(tx => (
                      <tr key={tx.transaction_id} className="aw-tr">
                        <td style={tdS}><DateCell iso={tx.created_at} /></td>
                        <td style={tdS}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {tx.source === 'mediator_income' ? 'دخل اشتراك' : tx.source === 'payout' ? 'سحب رصيد' : tx.source}
                          </span>
                          {tx.user_name && <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{tx.user_name}</span>}
                        </td>
                        <td style={{ ...tdS, textAlign: 'end' }}>
                          <span style={{ color: tx.amount > 0 ? '#34d399' : 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount} <LoveCoin size={13} />
                          </span>
                        </td>
                        <td style={{ ...tdS, textAlign: 'end', color: 'var(--text-tertiary)', fontSize: 12 }}>
                          {tx.value_tnd != null ? fmtTND(tx.value_tnd) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}

          {/* العملاء */}
          {tab === 'clients' && (() => {
            const filtered = clientFilter === 'all' ? clients
              : clientFilter === 'active' ? clients.filter(c => c.status === 'active')
              : clients.filter(c => c.status !== 'active');
            return (
              <div>
                <div style={{ padding: '14px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {([
                    { key: 'all',      label: 'الكل',     count: clients.length },
                    { key: 'active',   label: 'نشط',      count: clients.filter(c => c.status === 'active').length },
                    { key: 'inactive', label: 'غير نشط',  count: clients.filter(c => c.status !== 'active').length },
                  ] as const).map(f => (
                    <button key={f.key} onClick={() => setClientFilter(f.key)}
                      style={{ padding: '5px 14px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: clientFilter === f.key ? '1px solid var(--border-soft)' : '1px solid var(--glass-border)', background: clientFilter === f.key ? 'var(--color-primary-xsoft)' : 'transparent', color: clientFilter === f.key ? 'var(--color-primary)' : 'var(--text-tertiary)' }}>
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>
                {filtered.length === 0
                  ? <p style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>لا توجد بيانات</p>
                  : <div style={{ overflowX: 'auto', marginTop: 12 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>
                          <th style={thS}>التاريخ</th>
                          <th style={thS}>المشترك</th>
                          <th style={thS}>العملات</th>
                          <th style={{ ...thS, textAlign: 'end' }}>د.ت (70%)</th>
                          <th style={thS}>ينتهي</th>
                          <th style={thS}>الحالة</th>
                        </tr></thead>
                        <tbody>
                          {filtered.map(c => (
                            <tr key={c.id} className="aw-tr">
                              <td style={{ ...tdS, fontSize: 11, color: 'var(--text-tertiary)' }}>{fmtDate(c.created_at)}</td>
                              <td style={tdS}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <MiniAvatar name={c.user_profile?.full_name ?? '—'} src={c.user_profile?.avatar_url ?? null} size={32} />
                                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.user_profile?.full_name ?? '—'}</span>
                                </div>
                              </td>
                              <td style={tdS}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#fbbf24' }}>
                                  {c.coins.toLocaleString()} <LoveCoin size={13} />
                                </span>
                              </td>
                              <td style={{ ...tdS, textAlign: 'end', fontSize: 12 }}>{fmtTND(c.tnd_value * 0.7)}</td>
                              <td style={{ ...tdS, fontSize: 11, color: 'var(--text-tertiary)' }}>{fmtDate(c.expires_at)}</td>
                              <td style={tdS}><StatusPill status={c.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>}
              </div>
            );
          })()}

          {/* السحوبات */}
          {tab === 'payouts' && (
            <div>
              <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'flex-start' }}>
                <button onClick={() => setShowPayoutForm(v => !v)}
                  style={{ padding: '9px 20px', borderRadius: 'var(--radius-sm)', background: showPayoutForm ? 'var(--color-primary-xsoft)' : 'transparent', border: '1px solid var(--border-soft)', color: 'var(--color-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {showPayoutForm ? '✕ إلغاء' : '+ طلب سحب'}
                </button>
              </div>

              {showPayoutForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  style={{ margin: '12px 16px', padding: 20, borderRadius: 'var(--radius-md)', background: 'var(--bg-main)', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
                    المتاح للسحب: <span style={{ color: 'var(--color-primary)', fontWeight: 900 }}>{fmtTND(wallet?.pending_tnd ?? 0)} د.ت</span>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input type="number" placeholder="المبلغ (TND)" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                    <input type="text" placeholder="IBAN / رقم الحساب (اختياري)" value={payoutIban} onChange={e => setPayoutIban(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                    <textarea placeholder="ملاحظات (اختياري)" rows={2} value={payoutNotes} onChange={e => setPayoutNotes(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                    <button onClick={submitPayout} disabled={payoutLoading}
                      style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg,#800020,var(--color-primary))', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: payoutLoading ? 'wait' : 'pointer', opacity: payoutLoading ? 0.7 : 1, fontFamily: 'inherit' }}>
                      {payoutLoading ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
                    </button>
                  </div>
                </motion.div>
              )}

              {payouts.length === 0
                ? <p style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>لا توجد سحوبات بعد</p>
                : <div style={{ overflowX: 'auto', marginTop: 12 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        <th style={thS}>التاريخ</th>
                        <th style={{ ...thS, textAlign: 'end' }}>المبلغ</th>
                        <th style={thS}>الحالة</th>
                        <th style={thS}>تاريخ الدفع</th>
                        <th style={thS}>رد الإدارة</th>
                      </tr></thead>
                      <tbody>
                        {payouts.map(p => (
                          <tr key={p.id} className="aw-tr">
                            <td style={{ ...tdS, fontSize: 11, color: 'var(--text-tertiary)' }}>{fmtDate(p.created_at)}</td>
                            <td style={{ ...tdS, textAlign: 'end', fontWeight: 700 }}>
                              {fmtTND(p.amount)} <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{p.currency}</span>
                            </td>
                            <td style={tdS}><StatusPill status={p.status} /></td>
                            <td style={{ ...tdS, fontSize: 11, color: 'var(--text-tertiary)' }}>{p.paid_at ? fmtDate(p.paid_at) : '—'}</td>
                            <td style={{ ...tdS, fontSize: 12, color: 'var(--text-tertiary)' }}>{p.admin_note ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}