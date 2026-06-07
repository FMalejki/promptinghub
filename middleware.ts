import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { frameHeaders } from "@/lib/securityHeaders";

// Apply the clickjacking framing policy (see lib/securityHeaders) to every
// document response. /embed/* stays framable cross-origin; everything else is
// locked to same-origin.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  for (const h of frameHeaders(req.nextUrl.pathname)) res.headers.set(h.name, h.value);
  return res;
}

// Skip static assets and image optimisation — only guard real pages/routes.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
