'use client';
/**
 * 📁 hooks/useKonnectPayment.ts — ZAWAJ AI
 * ✅ يرسل JWT للـ Edge Function
 * ✅ مخصص للويب فقط
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase }   from '@/lib/supabase/client';
import { toast }      from 'sonner';
import type { PurchasePayload, SupportedCurrency } from '@/constants/ecomomy';

export type PaymentState = 'idle' | 'initiating' | 'awaiting' | 'success' | 'failed';

const EDGE_FUNC_URL = 'https://lbftmbutvtjtkxgdbndu.supabase.co/functions/v1/konnect-initiate';

export function useKonnectPayment(currency: SupportedCurrency) {
  const [paymentState,    setPaymentState]    = useState<PaymentState>('idle');
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Realtime ──────────────────────────────────────────────
  useEffect(() => {
    if (!activePaymentId || paymentState !== 'awaiting') return;

    channelRef.current = supabase
      .channel(`payment:${activePaymentId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'konnect_payments',
        filter: `payment_id=eq.${activePaymentId}`,
      }, ({ new: row }) => {
        const status = (row as { status: string }).status;
        if (status === 'completed') {
          setPaymentState('success');
          toast.success('🎉 تم الشحن بنجاح! تمت إضافة نقاطك.');
          cleanup();
        } else if (status === 'failed' || status === 'expired') {
          setPaymentState('failed');
          toast.error('فشل الدفع. لم يُخصم شيء من رصيدك.');
          cleanup();
        }
      })
      .subscribe();

    const timeout = setTimeout(() => {
      setPaymentState('failed');
      toast.error('انتهت مهلة التحقق. تواصل مع الدعم إذا تم الخصم.');
      cleanup();
    }, 5 * 60_000);

    return () => { clearTimeout(timeout); cleanup(); };
  }, [activePaymentId, paymentState]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setActivePaymentId(null);
  }, []);

  const startPayment = useCallback(async (payload: PurchasePayload) => {
    setPaymentState('initiating');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('غير مسجّل الدخول');

      const res = await fetch(EDGE_FUNC_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ...payload, currency }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const { payUrl, paymentId } = await res.json();
      setActivePaymentId(paymentId);
      setPaymentState('awaiting');

      window.location.href = payUrl; // توجيه المستخدم لصفحة الدفع في نفس النافذة

    } catch (err: any) {
      console.error('[useKonnectPayment]', err);
      setPaymentState('failed');
      toast.error(`فشل بدء عملية الدفع: ${err.message ?? 'تحقق من اتصالك'}`);
    }
  }, [currency]);

  const resetPayment = useCallback(() => {
    cleanup();
    setPaymentState('idle');
  }, [cleanup]);

  return { paymentState, startPayment, resetPayment };
}