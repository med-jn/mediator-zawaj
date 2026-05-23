/**
 * 📁 lib/currency.ts — OrcaVibe
 * ✅ كل دولة عربية بعملتها + خيار EUR/USD
 * ✅ أوروبا EUR افتراضي + خيار USD
 * ✅ باقي العالم USD + خيار EUR
 * ✅ يقرأ country من cookie (تُعيّنها middleware.ts عبر Vercel Geo)
 */

// ── قواعد العملة لكل دولة ────────────────────────────────────
export const COUNTRY_RULES: Record<string, { default: string; options: string[] }> = {
  // ── الدول العربية ───────────────────────────────────────────
  TN: { default: 'TND', options: ['EUR', 'USD'] },
  SA: { default: 'SAR', options: ['EUR', 'USD'] },
  AE: { default: 'AED', options: ['EUR', 'USD'] },
  EG: { default: 'EGP', options: ['EUR', 'USD'] },
  MA: { default: 'MAD', options: ['EUR', 'USD'] },
  DZ: { default: 'DZD', options: ['EUR', 'USD'] },
  LY: { default: 'LYD', options: ['EUR', 'USD'] },
  JO: { default: 'JOD', options: ['EUR', 'USD'] },
  KW: { default: 'KWD', options: ['EUR', 'USD'] },
  QA: { default: 'QAR', options: ['EUR', 'USD'] },
  BH: { default: 'BHD', options: ['EUR', 'USD'] },
  OM: { default: 'OMR', options: ['EUR', 'USD'] },
  IQ: { default: 'IQD', options: ['EUR', 'USD'] },
  SY: { default: 'USD', options: ['EUR'] },
  LB: { default: 'USD', options: ['EUR'] },
  YE: { default: 'USD', options: ['EUR'] },
  SD: { default: 'USD', options: ['EUR'] },
  MR: { default: 'USD', options: ['EUR'] },

  // ── أوروبا (منطقة اليورو وخارجها) ──────────────────────────
  FR: { default: 'EUR', options: ['USD'] },
  DE: { default: 'EUR', options: ['USD'] },
  IT: { default: 'EUR', options: ['USD'] },
  ES: { default: 'EUR', options: ['USD'] },
  PT: { default: 'EUR', options: ['USD'] },
  NL: { default: 'EUR', options: ['USD'] },
  BE: { default: 'EUR', options: ['USD'] },
  AT: { default: 'EUR', options: ['USD'] },
  GR: { default: 'EUR', options: ['USD'] },
  FI: { default: 'EUR', options: ['USD'] },
  IE: { default: 'EUR', options: ['USD'] },
  LU: { default: 'EUR', options: ['USD'] },
  SK: { default: 'EUR', options: ['USD'] },
  SI: { default: 'EUR', options: ['USD'] },
  EE: { default: 'EUR', options: ['USD'] },
  LV: { default: 'EUR', options: ['USD'] },
  LT: { default: 'EUR', options: ['USD'] },
  CY: { default: 'EUR', options: ['USD'] },
  MT: { default: 'EUR', options: ['USD'] },
  // أوروبا خارج منطقة اليورو → EUR أيضاً
  GB: { default: 'EUR', options: ['USD'] },
  CH: { default: 'EUR', options: ['USD'] },
  SE: { default: 'EUR', options: ['USD'] },
  NO: { default: 'EUR', options: ['USD'] },
  DK: { default: 'EUR', options: ['USD'] },
  PL: { default: 'EUR', options: ['USD'] },
  CZ: { default: 'EUR', options: ['USD'] },
  HU: { default: 'EUR', options: ['USD'] },
  RO: { default: 'EUR', options: ['USD'] },
  BG: { default: 'EUR', options: ['USD'] },
  HR: { default: 'EUR', options: ['USD'] },
  RS: { default: 'EUR', options: ['USD'] },
  TR: { default: 'EUR', options: ['USD'] },
};

// Fallback — باقي العالم
export const FALLBACK_RULE = { default: 'USD', options: ['EUR'] };

// ── معلومات العملات ───────────────────────────────────────────
export const CURRENCY_INFO: Record<string, {
  symbol: string; name: string; nameAr: string; decimals: number
}> = {
  TND: { symbol: 'د.ت', name: 'Tunisian Dinar',    nameAr: 'دينار تونسي',   decimals: 3 },
  SAR: { symbol: 'ر.س', name: 'Saudi Riyal',        nameAr: 'ريال سعودي',    decimals: 2 },
  AED: { symbol: 'د.إ', name: 'UAE Dirham',         nameAr: 'درهم إماراتي',  decimals: 2 },
  EGP: { symbol: 'ج.م', name: 'Egyptian Pound',     nameAr: 'جنيه مصري',    decimals: 0 },
  MAD: { symbol: 'د.م', name: 'Moroccan Dirham',    nameAr: 'درهم مغربي',   decimals: 2 },
  DZD: { symbol: 'د.ج', name: 'Algerian Dinar',     nameAr: 'دينار جزائري', decimals: 0 },
  LYD: { symbol: 'ل.د', name: 'Libyan Dinar',       nameAr: 'دينار ليبي',   decimals: 3 },
  JOD: { symbol: 'د.أ', name: 'Jordanian Dinar',    nameAr: 'دينار أردني',  decimals: 3 },
  KWD: { symbol: 'د.ك', name: 'Kuwaiti Dinar',      nameAr: 'دينار كويتي',  decimals: 3 },
  QAR: { symbol: 'ر.ق', name: 'Qatari Riyal',       nameAr: 'ريال قطري',    decimals: 2 },
  BHD: { symbol: 'د.ب', name: 'Bahraini Dinar',     nameAr: 'دينار بحريني', decimals: 3 },
  OMR: { symbol: 'ر.ع', name: 'Omani Rial',         nameAr: 'ريال عُماني',  decimals: 3 },
  IQD: { symbol: 'د.ع', name: 'Iraqi Dinar',        nameAr: 'دينار عراقي',  decimals: 0 },
  USD: { symbol: '$',   name: 'US Dollar',          nameAr: 'دولار أمريكي', decimals: 2 },
  EUR: { symbol: '€',   name: 'Euro',               nameAr: 'يورو',          decimals: 2 },
};

// ── دوال مساعدة ───────────────────────────────────────────────

/** العملة الافتراضية لدولة */
export function getDefaultCurrency(countryCode: string): string {
  return (COUNTRY_RULES[countryCode] ?? FALLBACK_RULE).default;
}

/** الخيارات المتاحة للتبديل */
export function getCurrencyOptions(countryCode: string, current: string): string[] {
  const rule    = COUNTRY_RULES[countryCode] ?? FALLBACK_RULE;
  const options = [rule.default, ...rule.options];
  return [...new Set(options)]; // فريدة بدون تكرار
}

/** تنسيق السعر حسب عدد المنازل العشرية */
export function formatPrice(amount: number, currency: string): string {
  const dec = CURRENCY_INFO[currency]?.decimals ?? 2;
  return amount.toFixed(dec);
}