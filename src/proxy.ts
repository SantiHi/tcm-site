import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isDemoMode, isLocalHost } from "@/lib/env";
import { DEMO_COOKIE, verifyDemoSession } from "@/lib/auth/demo-cookie";

/**
 * Route protection. Runs before every page request (see `config.matcher`).
 *
 *  - Demo mode (no Clerk keys): serves localhost only, checks the signed
 *    demo cookie.
 *  - Clerk mode: delegates to clerkMiddleware and checks the Clerk session.
 *
 * Pages still call `requireMember()` for the authoritative check; this
 * layer just gives fast redirects.
 */

const PUBLIC_PATHS = new Set(["/login", "/not-registered"]);

function isProtected(pathname: string) {
  if (pathname.startsWith("/api/cron/")) return false; // guarded by CRON_SECRET in the route
  return !PUBLIC_PATHS.has(pathname);
}

async function demoProxy(req: NextRequest) {
  if (!isLocalHost(req.headers.get("host"))) {
    return new NextResponse(
      "Demo login mode only runs on localhost. Add Clerk keys before deploying.",
      { status: 403 },
    );
  }
  const { pathname } = req.nextUrl;
  const email = await verifyDemoSession(req.cookies.get(DEMO_COOKIE)?.value);

  if (isProtected(pathname) && !email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname === "/login" && email) {
    return NextResponse.redirect(new URL("/directory", req.url));
  }
  return NextResponse.next();
}

async function clerkProxy(req: NextRequest, evt: NextFetchEvent) {
  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  return clerkMiddleware(async (auth, request) => {
    const { pathname } = request.nextUrl;
    const { userId } = await auth();
    if (isProtected(pathname) && !userId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname === "/login" && userId) {
      return NextResponse.redirect(new URL("/directory", request.url));
    }
    return NextResponse.next();
  })(req, evt);
}

export default async function proxy(req: NextRequest, evt: NextFetchEvent) {
  return isDemoMode() ? demoProxy(req) : clerkProxy(req, evt);
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml)$).*)",
  ],
};
