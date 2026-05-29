'use client';

export const Brand = () => (
  <div className="text-center animate-slow-fade" style={{ overflow: 'hidden' }}>
    <h1
      className="flex-row-reverse text-4xl font-black tracking-tighter flex items-center justify-center font-cairo"
      style={{ overflow: 'hidden' }}
    >
      <span className="relative px-0 bg-gold-metallic bg-clip-text text-white text-gold-luxury drop-shadow">
        ZAWAJ
      </span>

      {/* inline-block ضروري لكي يعمل overflow: hidden على span */}
      <span
        className="relative px-2 bg-gold-metallic bg-clip-text text-transparent text-gold-luxury"
        style={{ display: 'inline-block', overflow: 'hidden' }}
      >
        AI
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-slow-shine pointer-events-none" />
      </span>
    </h1>
  </div>
);