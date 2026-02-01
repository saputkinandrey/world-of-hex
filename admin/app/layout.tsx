import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import ThemeRegistry from './theme-registry';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'World of Hex Control',
  description: 'Sea-combat state console',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={spaceGrotesk.className}>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
