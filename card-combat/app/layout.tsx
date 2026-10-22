import type { ReactNode } from "react";
import ThemeRegistry from "./theme-registry";
import "./globals.css";

export const metadata = {
    title: "Hex — Карточная дуэль",
    description: "Боевой стенд World of Hex",
};
interface RootLayoutProps {
    children: ReactNode;
}
export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="ru">
            <body>
                <ThemeRegistry>{children}</ThemeRegistry>
            </body>
        </html>
    );
}
