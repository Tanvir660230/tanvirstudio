export const makeFallbackPackages = (currency: string) => [
  {
    name: 'Starter', price: `${currency}2,999`, originalPrice: `${currency}4,500`,
    line: 'Simple, clean production for first releases.',
    delivery: '3 Days',
    features: ['Basic Mixing & Mastering', 'Vocal Cleaning & Tuning', 'Basic Background Arrangement', '1 Revision', 'MP3 + WAV Delivery'],
  },
  {
    name: 'Signature', price: `${currency}4,999`, originalPrice: `${currency}7,000`,
    line: 'Professional detail for YouTube-ready releases.',
    delivery: '5 Days',
    features: ['Advanced Mixing & Mastering', 'Professional Vocal Processing', 'Custom Background Arrangement', '3 Revisions', 'Priority Support'],
    highlight: true,
  },
  {
    name: 'Elite', price: `${currency}7,999`, originalPrice: `${currency}10,000`,
    line: 'Premium cinematic production for official releases.',
    delivery: '7 Days',
    features: ['Full Premium Audio Production', 'Cinematic Mixing & Mastering', 'Unlimited Priority Revisions', 'WAV + MP3 Final Delivery'],
    bonus: 'Complimentary Promotional Video',
  },
];
