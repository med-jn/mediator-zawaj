'use client';

import { useState, useEffect }     from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Users, Flag, Crown, Send,
  X, ShieldCheck, UserX, MessageCircle,
} from 'lucide-react';
import { LoveCoin }       from '@/components/ui/LoveCoin';
import { MediatorCard }   from '@/components/mediators/MediatorCard';
import { SubscribeSheet } from '@/components/mediators/SubscribeSheet';
import { SuccessScreen }  from '@/components/mediators/SuccessScreen';
import { Stars }          from '@/components/mediators/Stars';
import { Icon }           from '@/components/mediators/Icon';
import { LevelBadge }     from '@/components/gems';
import { useMediators }   from '@/hooks/useMediators';
import { toast }          from 'sonner';
import type { MediatorRow, SuccessData } from '@/components/mediators/types';

function Spinner({ size = 24 }: { size?: number }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
      style={{
        display: 'inline-block', width: size, height: size,
        border: '2px solid rgba(255,255,255,0.15)',
        borderTopColor: 'var(--color-primary)', borderRadius: '50%',
      }}
    />
  );
}

export default function MediatorsPage() {
  const {
    mediators, loading, currentUser, balance,
    subscribers, subLoading, load,
    openMediator, submitRating, reportMediator, unsubscribe,
  } = useMediators();

  const [selected,           setSelected]           = useState<MediatorRow | null>(null);
  const [subscribeTarget,    setSubscribeTarget]    = useState<MediatorRow | null>(null);
  const [successData,        setSuccessData]        = useState<SuccessData | null>(null);
  const [showRate,           setShowRate]           = useState(false);
  const [myRating,           setMyRating]           = useState(0);
  const [myComment,          setMyComment]          = useState('');
  const [submitting,         setSubmitting]         = useState(false);
  const [showReport,         setShowReport]         = useState(false);
  const [showUnsubscribe,    setShowUnsubscribe]    = useState(false);
  const [unsubscribeLoading, setUnsubscribeLoading] = useState(false);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (m: MediatorRow) => {
    setSelected(m);
    setShowRate(false); setShowReport(false); setShowUnsubscribe(false);
    await openMediator(m);
  };
  const closeDetail = () => { setSelected(null); setShowUnsubscribe(false); };

  const doRating = async () => {
    if (!selected || myRating === 0) return;
    setSubmitting(true);
    await submitRating(selected.id, myRating, myComment);
    setShowRate(false); setMyRating(0); setMyComment('');
    setSubmitting(false);
  };

  const doReport = async () => {
    if (!selected) return;
    await reportMediator(selected.id);
    setShowReport(false);
    toast.success('تم إرسال البلاغ');
  };

  const doUnsubscribe = async () => {
    if (!selected) return;
    setUnsubscribeLoading(true);
    const ok = await unsubscribe(selected);
    setUnsubscribeLoading(false);
    if (ok) { setSelected(null); setShowUnsubscribe(false); }
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
      >
        <Icon i={Crown} size={52} color="var(--color-primary)" />
      </motion.div>
    </div>
  );

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: 'var(--bg-main)' }}>

      {/* وهج الخلفية */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(179,51,75,0.08), transparent)' }} />

      <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto', padding: 'clamp(20px,4vw,36px) clamp(12px,3vw,24px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={{ color: 'var(--text-main)' }}>الوسطاء</h1>
          {currentUser && (
            <motion.div whileHover={{ scale: 1.03 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-full)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              <span style={{ fontWeight: 800, fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>
                {balance.toLocaleString('ar-TN')}
              </span>
              <LoveCoin size={16} />
            </motion.div>
          )}
        </div>

        {/* قائمة الوسطاء */}
        {mediators.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Icon i={Crown} size={48} color="var(--text-tertiary)" />
            <p style={{ color: 'var(--text-tertiary)', marginTop: 16, fontSize: 'var(--text-sm)' }}>لا يوجد وسطاء حالياً</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mediators.map((m, i) => (
              <MediatorCard
                key={m.id}
                mediator={m}
                rank={i + 1}
                isAuthenticated={!!currentUser}
                onSubscribe={setSubscribeTarget}
                onOpenDetail={openDetail}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Subscribe Sheet ── */}
      <AnimatePresence>
        {subscribeTarget && !successData && (
          <SubscribeSheet
            mediator={subscribeTarget}
            balance={balance}
            userName={currentUser?.full_name ?? 'مستخدم'}
            onClose={() => setSubscribeTarget(null)}
            onSuccess={d => {
              setSubscribeTarget(null);
              setSuccessData(d);
              load();
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Success Screen ── */}
      <AnimatePresence>
        {successData && (
          <SuccessScreen data={successData} onClose={() => setSuccessData(null)} />
        )}
      </AnimatePresence>

      {/* ── Detail Sheet ── */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Backdrop */}
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDetail}
              style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
            />

            {/* Sheet */}
            <motion.div
              role="dialog" aria-modal="true" dir="rtl"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 400,
                borderRadius: '32px 32px 0 0',
                display: 'flex', flexDirection: 'column',
                background: 'var(--bg-surface)',
                border: '1px solid var(--glass-border)',
                maxHeight: '90vh',
              }}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
                <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--glass-border)' }} />
              </div>

              {/* Sheet Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--border-gold)' }}>
                    {selected.avatar_url
                      ? <img src={selected.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-soft)' }}>
                          <Icon i={Crown} size={22} color="var(--text-tertiary)" />
                        </div>}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 900, fontSize: 'var(--text-base)', color: 'var(--text-main)' }}>
                        {selected.full_name}
                      </p>
                      <LevelBadge subscribers={selected.total_subscribers} />
                    </div>
                    <Stars value={selected.avg_rating} size={12} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {currentUser?.mediator_id === selected.id && (
                    <button onClick={() => setShowRate(v => !v)}
                      style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: showRate ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', cursor: 'pointer' }}>
                      <Icon i={Star} size={15} color="#D4AF37" />
                    </button>
                  )}
                  <button onClick={() => setShowReport(v => !v)}
                    style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: showReport ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                    <Icon i={Flag} size={14} color="#f87171" />
                  </button>
                  <button onClick={closeDetail}
                    style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>
                    <Icon i={X} size={15} color="var(--text-tertiary)" />
                  </button>
                </div>
              </div>

              {/* Sheet Body */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* نموذج التقييم */}
                <AnimatePresence>
                  {showRate && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ borderRadius: 20, padding: 18, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.22)', overflow: 'hidden' }}
                    >
                      <p style={{ fontWeight: 900, fontSize: 'var(--text-sm)', color: '#D4AF37', marginBottom: 14 }}>قيّم الوسيط</p>
                      <Stars value={myRating} size={30} interactive onChange={setMyRating} />
                      <textarea
                        value={myComment} onChange={e => setMyComment(e.target.value)}
                        placeholder="اكتب تعليقك…" rows={3}
                        style={{ width: '100%', marginTop: 14, borderRadius: 16, padding: '12px 16px', outline: 'none', resize: 'none', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: 'var(--text-sm)', boxSizing: 'border-box' }}
                      />
                      <motion.button whileTap={{ scale: 0.97 }} onClick={doRating} disabled={submitting || myRating === 0}
                        style={{ marginTop: 12, width: '100%', padding: '12px', borderRadius: 16, background: myRating > 0 ? 'linear-gradient(135deg, #800020, var(--color-primary))' : 'var(--glass-bg)', border: 'none', color: myRating > 0 ? '#fff' : 'var(--text-tertiary)', fontWeight: 900, cursor: myRating > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Icon i={Send} size={14} color={myRating > 0 ? '#fff' : 'var(--text-tertiary)'} />
                        {submitting ? 'جارٍ الإرسال…' : 'إرسال التقييم'}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* نموذج البلاغ */}
                <AnimatePresence>
                  {showReport && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ borderRadius: 20, padding: 18, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', overflow: 'hidden' }}
                    >
                      <p style={{ fontWeight: 900, fontSize: 'var(--text-sm)', color: '#f87171', marginBottom: 14 }}>الإبلاغ عن هذا الوسيط</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={doReport}
                          style={{ flex: 1, padding: '11px', borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <Icon i={Flag} size={13} color="#f87171" /> تأكيد البلاغ
                        </button>
                        <button onClick={() => setShowReport(false)}
                          style={{ padding: '11px 20px', borderRadius: 14, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}>
                          إلغاء
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* نبذة */}
                {selected.bio && (
                  <div style={{ borderRadius: 20, padding: 18, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10 }}>نبذة عن الوسيط</p>
                    <p style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-relaxed)', color: 'var(--text-secondary)' }}>
                      {selected.bio}
                    </p>
                  </div>
                )}

                {/* المشتركون */}
                <div>
                  <p style={{ fontWeight: 900, fontSize: 'var(--text-sm)', color: 'var(--text-main)', marginBottom: 14 }}>
                    المشتركون ({currentUser?.gender === 'male' ? 'الإناث' : 'الذكور'})
                  </p>

                  {subLoading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                      <Spinner />
                    </div>
                  )}

                  {!subLoading && subscribers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Icon i={Users} size={32} color="var(--text-tertiary)" />
                      <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginTop: 12 }}>لا يوجد مشتركون بعد</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {subscribers.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 18, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
                          {s.avatar_url
                            ? <img src={s.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-soft)' }}>
                                <Icon i={Crown} size={18} color="var(--text-tertiary)" />
                              </div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 800, fontSize: 'var(--text-sm)', color: 'var(--text-main)', marginBottom: 2 }}>
                            {s.full_name || '—'}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {s.city && <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>📍 {s.city}</span>}
                            {s.age  && <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>{s.age} سنة</span>}
                          </div>
                          {s.profile_completion_percent > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                              <div style={{ flex: 1, height: 3, borderRadius: 99, overflow: 'hidden', background: 'var(--glass-border)' }}>
                                <div style={{ height: '100%', borderRadius: 99, width: `${s.profile_completion_percent}%`, background: s.profile_completion_percent >= 80 ? '#22c55e' : s.profile_completion_percent >= 50 ? '#D4AF37' : 'var(--color-primary)', transition: 'width 0.6s ease' }} />
                              </div>
                              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                                {s.profile_completion_percent}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sheet Footer */}
              <div style={{ borderTop: '1px solid var(--glass-border)', padding: '14px 20px 24px' }}>

                {/* تأكيد إلغاء الاشتراك */}
                <AnimatePresence>
                  {showUnsubscribe && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ marginBottom: 12, borderRadius: 20, padding: 16, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)', overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Icon i={UserX} size={15} color="#f87171" />
                        <p style={{ fontWeight: 900, fontSize: 'var(--text-sm)', color: '#f87171' }}>تأكيد إلغاء الاشتراك</p>
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 'var(--lh-relaxed)' }}>
                        ستفقد الوصول إلى قائمة المشتركين. لا يمكن استرداد العملات المدفوعة.
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={doUnsubscribe} disabled={unsubscribeLoading}
                          style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontWeight: 800, cursor: unsubscribeLoading ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {unsubscribeLoading ? <Spinner size={16} /> : <><Icon i={UserX} size={13} color="#f87171" /> تأكيد الإلغاء</>}
                        </button>
                        <button onClick={() => setShowUnsubscribe(false)} disabled={unsubscribeLoading}
                          style={{ padding: '12px 20px', borderRadius: 14, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-xs)' }}>
                          تراجع
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* أزرار الاشتراك */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {selected.isSubscribed ? (
                    <div style={{ flex: 2, display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, padding: '14px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900, background: 'rgba(212,175,55,0.1)', border: '1px solid var(--border-gold)', color: '#D4AF37', fontSize: 'var(--text-xs)' }}>
                        <Icon i={Crown} size={14} color="#D4AF37" /> مشترك ✓
                      </div>
                      <button onClick={() => setShowUnsubscribe(v => !v)}
                        style={{ width: 46, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: showUnsubscribe ? 'rgba(239,68,68,0.12)' : 'var(--glass-bg)', border: showUnsubscribe ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--glass-border)', cursor: 'pointer' }}>
                        <Icon i={UserX} size={15} color={showUnsubscribe ? '#f87171' : 'var(--text-tertiary)'} />
                      </button>
                    </div>
                  ) : (
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={() => { setSelected(null); setSubscribeTarget(selected); }}
                      disabled={!currentUser}
                      style={{ flex: 2, padding: '14px', borderRadius: 16, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #800020, var(--color-primary))', boxShadow: '0 8px 24px var(--shadow-red-glow)', border: 'none', cursor: currentUser ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: 'var(--text-sm)', opacity: currentUser ? 1 : 0.5 }}>
                      <Icon i={Crown} size={15} color="#fff" /> اشتراك الآن
                    </motion.button>
                  )}

                  <motion.button whileTap={{ scale: 0.92 }}
                    style={{ flex: 1, padding: '14px', borderRadius: 16, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: '#38BDF8', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}>
                    <Icon i={MessageCircle} size={15} color="#38BDF8" /> رسالة
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}