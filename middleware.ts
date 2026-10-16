import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

// Middleware is the first gate; every page and server action still calls
// requireAdmin()/requireBrother() itself, because server actions can be
// invoked directly by POSTing to any page.
export async function middleware(request: NextRequest) {
  const tier = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const path = request.nextUrl.pathname;

  if ((path.startsWith("/pnms") || path.startsWith("/brothers")) && tier !== "admin") {
    return redirectToLogin(request, "admin", path);
  }

  if (path.startsWith("/rate") && tier !== "brother" && tier !== "admin") {
    return redirectToLogin(request, "brother", path);
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest, tier: "admin" | "brother", path: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?tier=${tier}&next=${encodeURIComponent(path + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/pnms/:path*", "/brothers/:path*", "/rate/:path*"]
};
