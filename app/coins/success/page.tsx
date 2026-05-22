'use client';

import { useEffect, useState } from "react";

export default function CoinsSuccessPage({
  searchParams,
}: {
  searchParams: { pid?: string };
}) {
  const pid = searchParams?.pid;

  const [done, setDone] = useState(false);
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    if (!pid) return;

    // 🔁 هنا تحط logic متاعك (مثلاً fetch)
    console.log("Payment ID:", pid);

    // مثال مؤقت
    setCoins(100);
    setDone(true);
  }, [pid]);

  return (
    <main style={{ padding: 40 }}>
      <h1>Payment Success</h1>

      {!done ? (
        <p>Processing your payment...</p>
      ) : (
        <div>
          <p>Payment completed successfully ✅</p>

          {coins && (
            <p>You received: {coins} coins</p>
          )}
        </div>
      )}
    </main>
  );
}