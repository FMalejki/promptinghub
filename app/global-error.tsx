"use client";
import { useEffect } from "react";

// Root error boundary — catches errors thrown in the root layout itself (where the
// regular error.tsx can't run). Must render its own <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#0b1120", color: "#e5e7eb" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", textAlign: "center" }}>
          <div style={{ maxWidth: "28rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Something went wrong</h1>
            <p style={{ color: "#9ca3af", marginBottom: "2rem" }}>An unexpected error occurred. Please try again.</p>
            <button
              onClick={reset}
              style={{ padding: "0.625rem 1.25rem", borderRadius: "0.5rem", fontWeight: 500, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
