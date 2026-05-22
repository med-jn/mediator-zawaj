/**
 * 📁 supabase/functions/konnect-webhook/index.ts
 * 
 * ✅ النسخة النهائية — Production Ready
 * 
 * الوظائف:
 * - التحقق من الدفع من Konnect
 * - منع التكرار (idempotency)
 * - إضافة النقاط للمستخدم (balance فقط = مدفوعة)
 * - تسجيل transaction
 * - تحديث حالة الدفع
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface KonnectWebhookPayload {
  payment_ref: string;
  order_id: string;
}

interface KonnectPaymentStatus {
  payment: {
    _id: string;
    ref: string;
    status: 'pending' | 'completed' | 'cancelled' | 'failed';
    amount: number;
    type: string;
  };
}

Deno.serve(async (req: Request) => {

  // ─────────────────────────────
  // 1. Method check
  // ─────────────────────────────
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ─────────────────────────────
  // 2. Parse body
  // ─────────────────────────────
  let payload: KonnectWebhookPayload;

  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { payment_ref, order_id } = payload;

  if (!payment_ref || !order_id) {
    return new Response('Missing data', { status: 400 });
  }

  // ─────────────────────────────
  // 3. Verify with Konnect API
  // ─────────────────────────────
  const konnectKey = Deno.env.get('KONNECT_API_KEY');

  if (!konnectKey) {
    console.error('Missing KONNECT_API_KEY');
    return new Response('Server error', { status: 500 });
  }

  let statusData: KonnectPaymentStatus;

  try {
    const verify = await fetch(
      `https://api.konnect.network/api/v2/payments/${payment_ref}`,
      {
        headers: { 'x-api-key': konnectKey }
      }
    );

    if (!verify.ok) {
      return new Response('Verify failed', { status: 502 });
    }

    statusData = await verify.json();

  } catch (e) {
    console.error('Network error:', e);
    return new Response('Network error', { status: 502 });
  }

  // ─────────────────────────────
  // 4. Check payment status
  // ─────────────────────────────
  if (statusData.payment?.status !== 'completed') {
    return new Response('Not completed', { status: 200 });
  }

  // ─────────────────────────────
  // 5. Supabase client
  // ─────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // ─────────────────────────────
  // 6. Get payment record
  // ─────────────────────────────
  const { data: kp, error: kpErr } = await supabase
    .from('konnect_payments')
    .select('*')
    .eq('payment_id', order_id)
    .single();

  if (kpErr || !kp) {
    return new Response('Payment not found', { status: 404 });
  }

  // ─────────────────────────────
  // 7. Prevent duplicate
  // ─────────────────────────────
  if (kp.status === 'completed') {
    return new Response('Already processed', { status: 200 });
  }

  // ─────────────────────────────
  // 8. Get wallet
  // ─────────────────────────────
  const { data: wallet, error: walletErr } = await supabase
    .from('wallets')
    .select('*')
    .eq('id', kp.user_id)
    .single();

  if (walletErr || !wallet) {
    return new Response('Wallet not found', { status: 404 });
  }

  // ─────────────────────────────
  // 9. Update balance (مدفوعة فقط)
  // ─────────────────────────────
  const newBalance = wallet.balance + kp.coins_amount;

  // ─────────────────────────────
  // 10. Execute all DB ops
  // ─────────────────────────────
  const [w, tx, upd] = await Promise.all([

    // update wallet
    supabase
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', kp.user_id),

    // transaction log
    supabase
      .from('point_transactions')
      .insert({
        user_id: kp.user_id,
        amount: kp.coins_amount,
        balance_after: newBalance + (wallet.balance_free || 0),
        source: 'konnect',
        payment_id: kp.payment_id,
        notes: `شراء ${kp.coins_amount} نقطة`
      }),

    // update payment
    supabase
      .from('konnect_payments')
      .update({
        status: 'completed',
        konnect_ref: payment_ref,
        webhook_payload: payload,
        completed_at: new Date().toISOString()
      })
      .eq('payment_id', order_id)
  ]);

  const errors = [w.error, tx.error, upd.error].filter(Boolean);

  if (errors.length) {
    console.error(errors);
    return new Response('DB error', { status: 500 });
  }

  console.log(`SUCCESS: +${kp.coins_amount} → ${kp.user_id}`);

  return new Response('OK', { status: 200 });
});