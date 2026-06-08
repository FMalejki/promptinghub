import { buildSecurityTxt } from "@/lib/securityTxt";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

export const revalidate = 86400;

// RFC 9116 security.txt for responsible disclosure.
export async function GET() {
  return new Response(buildSecurityTxt(SITE_URL), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
