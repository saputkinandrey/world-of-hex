import type { Metadata } from 'next';
import { LiveReload } from '@wohex/ui';
import ThemeRegistry from './theme-registry';
import './globals.css';

export const metadata: Metadata = {
  title: 'World of Hex Economy Admin',
  description: 'World of Hex economy data administration tool',
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
