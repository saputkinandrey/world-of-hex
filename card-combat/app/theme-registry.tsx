"use client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useState, type ReactNode } from "react";
import { useServerInsertedHTML } from "next/navigation";

const theme = createTheme({
    palette: {
        primary: { main: "#2a6f6a" },
        secondary: { main: "#b35e38" },
        background: { default: "#f6f3ef", paper: "#ffffff" },
        text: { primary: "#1d1b16", secondary: "#6b6258" },
    },
    typography: {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        button: { textTransform: "none", fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
});
interface ThemeRegistryProps {
    children: ReactNode;
}
export default function ThemeRegistry({ children }: ThemeRegistryProps) {
    const [{ cache, flush }] = useState(() => {
        const cache = createCache({ key: "hex-card" });
        cache.compat = true;
        const originalInsert = cache.insert;
        let inserted: string[] = [];
        cache.insert = (...args) => {
            const serialized = args[1];
            if (cache.inserted[serialized.name] === undefined)
                inserted.push(serialized.name);
            return originalInsert(...args);
        };
        return {
            cache,
            flush: () => {
                const names = inserted;
                inserted = [];
                return names;
            },
        };
    });
    useServerInsertedHTML(() => {
        const names = flush();
        if (!names.length) return null;
        const styles = names.map((name) => cache.inserted[name]).join("");
        return (
            <style
                data-emotion={`${cache.key} ${names.join(" ")}`}
                dangerouslySetInnerHTML={{ __html: styles }}
            />
        );
    });
    return (
        <CacheProvider value={cache}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </CacheProvider>
    );
}
