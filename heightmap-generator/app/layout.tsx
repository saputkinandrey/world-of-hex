import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'World of Hex Heightmap Admin',
  description: 'Heightmap generator controls and preview for World of Hex.',
  icons: {
    icon: '/icon.svg',
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
