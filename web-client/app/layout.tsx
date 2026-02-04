import "./globals.css";
import type { ReactNode } from "react";
import ThemeRegistry from "./theme-registry";
import { LiveReload } from "@wohex/ui";

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
        <ThemeRegistry>
          <LiveReload />
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
