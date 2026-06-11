"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Tiny first-party beacon. Sends a `page_view` on every route change with a
// stable, anonymous, client-generated id (localStorage). No cookies, no PII —
// the server drops query strings and gates paths/props. Best-effort: any failure
// is swallowed so it can never break navigation.

const ANON_KEY = "ph_anon";

export function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id || !/^[A-Za-z0-9]{8,40}$/.test(id)) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Fire-and-forget event send. Exported so CTA handlers can call track(...). */
export function track(type: string, path: string, props?: Record<string, string | number | boolean>) {
  try {
    const anonId = getAnonId();
    if (!anonId) return;
    const payload = JSON.stringify({ type, path, anonId, ...(props ? { props } : {}) });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/events", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    /* never throw from analytics */
  }
}

export function AnalyticsBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) track("page_view", pathname);
  }, [pathname]);
  return null;
}
