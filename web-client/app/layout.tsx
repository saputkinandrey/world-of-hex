import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "World of Hex - Web Client",
  description: "Socket.IO web client for quick prototyping",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
