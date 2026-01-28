import type { Metadata } from 'next';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { Space_Grotesk } from 'next/font/google';
import { theme } from './theme';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'cyrillic'],
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
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
