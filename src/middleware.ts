import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define protected routes and their required roles
const protectedRoutes = {
  "/admin": ["admin"],
  "/cashier": ["admin", "cashier"],
  "/account": ["admin", "accountant"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      // Get the session cookie from better-auth
      const sessionCookie = request.cookies.get("better-auth.session_token");
      
      if (!sessionCookie) {
        // No session, redirect to login
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // For role-based access, we'll check on the client side
      // since we need to decode the session which requires server-side logic
      // The actual role check happens in the layout components
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/cashier/:path*", "/account/:path*"],
};
