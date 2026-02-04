"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export type LiveReloadProps = {
  statusUrl?: string;
  pollIntervalMs?: number;
  className?: string;
  style?: CSSProperties;
};

type BuildStatus = {
  status?: "building" | "ready" | "error";
  buildId?: number;
  error?: string;
};

const DEFAULT_STATUS_URL = "/__build-status.json";
const DEFAULT_POLL_INTERVAL = 2000;

export function LiveReload({
  statusUrl = DEFAULT_STATUS_URL,
  pollIntervalMs = DEFAULT_POLL_INTERVAL,
  className,
  style,
}: LiveReloadProps) {
  const lastIdRef = useRef<number | null>(null);
  const [status, setStatus] = useState<BuildStatus["status"]>("ready");
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchStatus = async (): Promise<BuildStatus | null> => {
      try {
        const res = await fetch(`${statusUrl}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          return null;
        }
        const payload = (await res.json()) as BuildStatus;
        return payload;
      } catch {
        return null;
      }
    };

    const check = async () => {
      const nextStatus = await fetchStatus();
      if (!active || !nextStatus) {
        return;
      }
      setHasData(true);
      if (nextStatus.status) {
        setStatus(nextStatus.status);
        if (nextStatus.status === "error") {
          setError(nextStatus.error ?? "Build failed");
        } else {
          setError(null);
        }
      }
      if (typeof nextStatus.buildId !== "number") {
        return;
      }
      if (lastIdRef.current === null) {
        lastIdRef.current = nextStatus.buildId;
        return;
      }
      if (lastIdRef.current !== nextStatus.buildId) {
        window.location.reload();
      }
    };

    void check();
    const interval = window.setInterval(check, pollIntervalMs);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [pollIntervalMs, statusUrl]);

  const label = hasData
    ? status === "building"
      ? "Building..."
      : status === "error"
        ? error ?? "Build failed"
        : "Ready"
    : "Waiting for build status...";

  const background =
    status === "error"
      ? "#c62828"
      : status === "building"
        ? "rgba(0,0,0,0.75)"
        : "rgba(46, 125, 50, 0.9)";

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        right: 16,
        top: 12,
        padding: "6px 10px",
        borderRadius: 8,
        fontSize: 12,
        letterSpacing: 0.2,
        color: "#fff",
        background,
        boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
        zIndex: 2000,
        ...style,
      }}
    >
      {label}
    </div>
  );
}
