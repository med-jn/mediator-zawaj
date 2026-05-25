'use client';
/**
 * app/mediator-pricing/page.tsx — الموقع فقط
 * ✅ صفحة مستقلة لإعداد عروض الاشتراك
 * ✅ يصلها الوسيط من الموقع بعد تسجيل الدخول
 * ✅ تحفظ في mediator_pricing مباشرة في Supabase
 * ✅ لا توجد في التطبيق إطلاقاً
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter }                         from 'next/navigation';
import { motion, AnimatePresence }           from 'framer-motion';
import { Save, Plus, X, Check, Crown, Info } from 'lucide-react';
import { createClient }                      from '@supabase/supabase-js';
import { toast }                             from 'sonner';

// ── Supabase client للموقع ──────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/* ── Types ────────────────────────────────────────────── */
interface MedPricing {
  tier_1_coins: number; tier_1_label: string;
  tier_1_desc:  string; tier_1_perks: string[];
  tier_2_coins: number; tier_2_label: string;
  tier_2_desc:  string; tier_2_perks: string[];
  popular_tier: 1 | 2;
}

const DEFAULT_PRICING: MedPricing = {
  tier_1_coins: 2000, tier_1_label: 'أساسية',
  tier_1_desc:  'دخول قائمة الأعضاء والتواصل مع الوسيط',
  tier_1_perks: ['ظهور في قائمة الأعضاء', 'تواصل مع الوسيط', 'صالحة 30 يوم'],
  tier_2_coins: 5000, tier_2_label: 'مميزة',
  tier_2_desc:  'أولوية في المطابقة واهتمام شخصي من الوسيط',
  tier_2_perks: ['كل مزايا الأساسية', 'أولوية في المطابقة', 'اهتمام شخصي', 'صالحة 30 يوم'],
  popular_tier: 2,
};

/* ── Sub-components ───────────────────────────────────── */
function Spin() {
  return (
    <motion.span animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      style={{ display: 'inline-block', width: 18, height: 18,
        border: '2px solid rgba(255,255,255,0.2)',
        borderTopColor: '#fff', borderRadius: '50%' }} />
  );
}

function PerksList({ perks, onChange }: { perks: string[]; onChange: (p: string[]) => void }) {
  const add    = ()           => { if (perks.length < 5) onChange([...perks, '']); };
  const remove = (i: number) => onChange(perks.filter((_, j) => j !== i));
  const update = (i: number, v: string) => onChange(perks.map((p, j) => j === i ? v : p));
  return (
    <div className="space-y-2">
      {perks.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Check size={12} color="#22c55e" strokeWidth={2.5} className="shrink-0" />
            <input value={p} onChange={e => update(i, e.target.value)}
              placeholder={`ميزة ${i + 1}...`}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 13, fontFamily: 'inherit' }} />
          </div>
          {perks.length > 1 && (
            <button onClick={() => remove(i)}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <X size={11} color="#f87171" />
            </button>
          )}
        </div>
      ))}
      {perks.length < 5 && (
        <button onClick={add} className="flex items-center gap-1.5 mt-1"
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          <Plus size={12} /> إضافة ميزة
        </button>
      )}
    </div>
  );
}

/* ── Coins Stepper ────────────────────────────────────── */
function CoinsStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-4 justify-center py-3">
      <button onClick={() => onChange(Math.max(1000, value - 500))}
        disabled={value <= 1000}
        className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-black transition-all"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          color: value <= 1000 ? 'rgba(255,255,255,0.2)' : '#fff' }}>
        −
      </button>
      <div className="text-center">
        <span className="font-black tabular-nums"
          style={{ fontSize: 28, color: '#fff', letterSpacing: -1 }}>
          {value.toLocaleString('ar-TN')}
        </span>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>عملة</p>
      </div>
      <button onClick={() => onChange(Math.min(10000, value + 500))}
        disabled={value >= 10000}
        className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-black transition-all"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          color: value >= 10000 ? 'rgba(255,255,255,0.2)' : '#fff' }}>
        +
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
export default function MediatorPricingPage() {
  const router  = useRouter();
  const [userId,  setUserId]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [form,    setForm]    = useState<MedPricing>(DEFAULT_PRICING);

  /* ── Load ── */
  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }

    const { data: prof } = await supabase.from('profiles')
      .select('role').eq('id', user.id).single();
    if (prof?.role !== 'mediator') { router.replace('/'); return; }
    setUserId(user.id);

    const { data } = await supabase.from('mediator_pricing')
      .select('*').eq('mediator_id', user.id).maybeSingle();

    if (data) {
      setForm({
        tier_1_coins: data.tier_1_coins, tier_1_label: data.tier_1_label,
        tier_1_desc:  data.tier_1_desc,  tier_1_perks: [...data.tier_1_perks],
        tier_2_coins: data.tier_2_coins, tier_2_label: data.tier_2_label,
        tier_2_desc:  data.tier_2_desc,  tier_2_perks: [...data.tier_2_perks],
        popular_tier: data.popular_tier,
      });
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  /* ── Save ── */
  const save = async () => {
    if (!userId) return;

    if (!form.tier_1_label.trim() || !form.tier_2_label.trim()) {
      toast.error('اسم الباقة لا يمكن أن يكون فارغاً'); return;
    }
    if (form.tier_1_coins < 1000 || form.tier_2_coins < 1000) {
      toast.error('الحد الأدنى 1,000 عملة لكل باقة'); return;
    }

    setSaving(true);
    const { error } = await supabase.from('mediator_pricing').upsert({
      mediator_id:  userId,
      ...form,
      tier_1_perks: form.tier_1_perks.filter(Boolean),
      tier_2_perks: form.tier_2_perks.filter(Boolean),
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'mediator_id' });

    setSaving(false);
    if (error) { toast.error('فشل الحفظ: ' + error.message); return; }

    setSaved(true);
    toast.success('تم حفظ العروض بنجاح ✓');
    setTimeout(() => setSaved(false), 3000);
  };

  const update = (key: keyof MedPricing, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#0a0a0f' }}>
      <motion.div animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ width: 36, height: 36, borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#800020' }} />
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen py-10 px-4"
      style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #12020a 100%)' }}>

      <div className="max-w-lg mx-auto">

        {/* ── عنوان الصفحة ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(128,0,32,0.2)', border: '1px solid rgba(128,0,32,0.4)' }}>
              <Crown size={20} color="#800020" />
            </div>
            <h1 className="font-black text-white" style={{ fontSize: 22 }}>عروض الاشتراك</h1>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            حدّد عروضك للأعضاء الراغبين في الانضمام إلى قائمتك. تُعرض هذه الباقات عند إتمام الدفع.
          </p>
        </div>

        {/* ── تنبيه ── */}
        <div className="flex items-start gap-3 p-4 rounded-2xl mb-6"
          style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
          <Info size={15} color="#D4AF37" className="shrink-0 mt-0.5" />
          <p style={{ fontSize: 12, color: 'rgba(212,175,55,0.85)', lineHeight: 1.6 }}>
            قيمة العملات هنا هي ما يُخصم من رصيد العضو عند الاشتراك معك.
            كلما كانت القيمة معقولة، زاد عدد الأعضاء المنضمين إليك.
          </p>
        </div>

        {/* ══ الباقتان ══════════════════════════════════════ */}
        <div className="space-y-5">
          {([1, 2] as (1 | 2)[]).map(n => {
            const pre    = `tier_${n}` as 'tier_1' | 'tier_2';
            const coins  = form[`${pre}_coins`];
            const label  = form[`${pre}_label`];
            const desc   = form[`${pre}_desc`];
            const perks  = form[`${pre}_perks`];
            const accent = n === 2 ? '#D4AF37' : '#800020';
            const bg     = n === 2 ? 'rgba(212,175,55,0.06)' : 'rgba(128,0,32,0.08)';
            const border = n === 2 ? 'rgba(212,175,55,0.25)' : 'rgba(128,0,32,0.3)';

            return (
              <div key={n} className="rounded-3xl p-5 space-y-4"
                style={{ background: bg, border: `1.5px solid ${border}` }}>

                {/* Badge الباقة */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full font-black text-xs"
                    style={{ background: `${accent}20`, border: `1px solid ${accent}40`, color: accent }}>
                    الباقة {n === 1 ? 'الأولى' : 'الثانية'}
                  </span>
                  {form.popular_tier === n && (
                    <span className="px-2.5 py-1 rounded-full font-bold text-xs"
                      style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37',
                        border: '1px solid rgba(212,175,55,0.3)' }}>
                      الأشهر ★
                    </span>
                  )}
                </div>

                {/* اسم الباقة */}
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700,
                    display: 'block', marginBottom: 6 }}>اسم الباقة</label>
                  <input value={label} onChange={e => update(`${pre}_label`, e.target.value)}
                    placeholder="اسم الباقة..."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 14, outline: 'none',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: 14, fontFamily: 'inherit' }} />
                </div>

                {/* الوصف */}
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700,
                    display: 'block', marginBottom: 6 }}>وصف قصير</label>
                  <textarea value={desc} rows={2}
                    onChange={e => update(`${pre}_desc`, e.target.value)}
                    placeholder="وصف الباقة..."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 14, outline: 'none',
                      resize: 'none', background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6 }} />
                </div>

                {/* عدد العملات */}
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700,
                    display: 'block', marginBottom: 4 }}>قيمة الاشتراك بالعملات</label>
                  <CoinsStepper value={coins} onChange={v => update(`${pre}_coins`, v)} />
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                    من 1,000 إلى 10,000 عملة · خطوة 500
                  </p>
                </div>

                {/* المميزات */}
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700,
                    display: 'block', marginBottom: 8 }}>مميزات الباقة (حتى 5)</label>
                  <PerksList perks={perks} onChange={p => update(`${pre}_perks`, p)} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ الباقة الأشهر ══════════════════════════════ */}
        <div className="mt-5">
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 10 }}>
            أي الباقتين تعتبرها «الأشهر» وتريد إبرازها؟
          </p>
          <div className="flex gap-3">
            {([1, 2] as (1 | 2)[]).map(n => (
              <button key={n} onClick={() => update('popular_tier', n)}
                className="flex-1 py-3 rounded-2xl font-black transition-all"
                style={{
                  fontSize: 13,
                  background: form.popular_tier === n ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                  border: form.popular_tier === n ? '1.5px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  color: form.popular_tier === n ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                }}>
                {n === 1 ? 'الباقة الأولى' : 'الباقة الثانية'} {form.popular_tier === n ? '★' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* ══ زر الحفظ ═══════════════════════════════════ */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={save}
          disabled={saving}
          className="w-full mt-8 py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2"
          style={{
            background: saved
              ? 'linear-gradient(135deg,#16a34a,#22c55e)'
              : 'linear-gradient(135deg,#800020,#c0002a)',
            boxShadow: saved
              ? '0 8px 28px rgba(34,197,94,0.35)'
              : '0 8px 28px rgba(128,0,32,0.45)',
            fontSize: 15,
            opacity: saving ? 0.75 : 1,
            transition: 'background 0.4s, box-shadow 0.4s',
          }}
        >
          <AnimatePresence mode="wait">
            {saving ? (
              <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Spin />
              </motion.span>
            ) : saved ? (
              <motion.span key="saved" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2">
                <Check size={18} color="#fff" strokeWidth={2.5} /> تم الحفظ بنجاح
              </motion.span>
            ) : (
              <motion.span key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2">
                <Save size={16} color="#fff" /> حفظ العروض
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

      </div>
    </div>
  );
}