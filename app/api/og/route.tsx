import { ImageResponse } from "next/og";
import { ogTextParams } from "@/lib/og";

export const runtime = "edge";

// Dynamic 1200×630 OpenGraph image for prompts (and any page that links here).
export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const { title, subtitle } = ogTextParams(searchParams.get("title") || "PromptingHub", searchParams.get("subtitle") || "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: "72px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 34, fontWeight: 700, color: "#93c5fd" }}>
          ⚡ PromptingHub
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, maxWidth: "1000px" }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 24, fontSize: 34, color: "#cbd5e1", maxWidth: "1000px" }}>{subtitle}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#64748b" }}>Discover & share AI prompts</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
