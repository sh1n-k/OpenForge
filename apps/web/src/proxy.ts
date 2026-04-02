import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // When OPENFORGE_AUTH_PASSWORD is not set, authentication is disabled
  const authPassword = process.env.OPENFORGE_AUTH_PASSWORD;
  if (!authPassword) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow login page and static assets through without auth
  if (pathname === "/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("of_access_token");
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
