import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const tier = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const path = request.nextUrl.pathname;

  if ((path.startsWith("/pnms") || path.startsWith("/brothers")) && tier !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?tier=admin&next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/rate") && tier !== "brother" && tier !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?tier=brother&next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pnms/:path*", "/brothers/:path*", "/rate/:path*"]
};
