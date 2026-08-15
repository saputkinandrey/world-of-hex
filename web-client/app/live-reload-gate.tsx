"use client";

import { useEffect, useState } from "react";
import { LiveReload } from "@wohex/ui";

export function LiveReloadGate() {
  const [isCaptureMode, setIsCaptureMode] = useState<boolean | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setIsCaptureMode(searchParams.get("capture") === "1");
  }, []);

  if (isCaptureMode !== false) {
    return null;
  }

  return <LiveReload />;
}
