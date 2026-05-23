'use client';
import { XCircle } from 'lucide-react';
import Link from 'next/link';

export default function CoinsFailPage() {
  return (
    <main style={{ minHeight:'80vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
        <XCircle size={40} style={{ color:'var(--danger)' }} />
      </div>
      <h2 style={{ fontSize:26, fontWeight:800, color:'var(--text-1)', marginBottom:10 }}>Payment Failed</h2>
      <p style={{ fontSize:14, color:'var(--text-3)', marginBottom:28, lineHeight:1.7 }}>
        No amount was charged.<br />Please try again.
      </p>
      <Link href="/store/coins"><button className="btn-chrome" style={{ padding:'12px 32px' }}>Try Again</button></Link>
    </main>
  );
}