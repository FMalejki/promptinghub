import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { securityHeaders } from "@/lib/securityHeaders";

// Apply the security header policy (see lib/securityHeaders) to every document
// response: baseline hardening everywhere, plus a framing policy where /embed/*
// stays framable cross-origin and everything else is locked to same-origin.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  for (const h of securityHeaders(req.nextUrl.pathname)) res.headers.set(h.name, h.value);
  return res;
}

// Skip static assets and image optimisation — only guard real pages/routes.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
