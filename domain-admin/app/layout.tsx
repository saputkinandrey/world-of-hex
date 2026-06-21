import type { Metadata } from 'next';
import { LiveReload } from '@wohex/ui';
import ThemeRegistry from './theme-registry';
import './globals.css';

export const metadata: Metadata = {
  title: 'World of Hex Domain Admin',
  description: 'World of Hex domain data administration tool',
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
      <body>
        <ThemeRegistry>
          <LiveReload />
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
