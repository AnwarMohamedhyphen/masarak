import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'مسارك | اكتشف مسارك المهني',
  description: 'منصة ذكية لاكتشاف مساراتك المهنية المثالية مع خطة عمل مفصّلة',
  manifest: '/manifest.json',
  icons: { apple: '/icon-192.png' },
  openGraph: {
    title: 'مسارك | اكتشف مسارك المهني',
    description: 'محقق مهني ذكي يحلّل شخصيتك ويرسم مساراتك المهنية',
    locale: 'ar_SA',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
