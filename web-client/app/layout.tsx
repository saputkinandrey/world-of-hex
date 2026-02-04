import "./globals.css";
import type { ReactNode } from "react";
import ThemeRegistry from "./theme-registry";

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
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
