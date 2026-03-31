import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Non-HTTP-only cookie set on mock login; no real authentication. */
const MOCK_AUTH_COOKIE = "mock-auth";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const authed = request.cookies.get(MOCK_AUTH_COOKIE)?.value === "1";

    if (pathname === "/chat" || pathname.startsWith("/chat/")) {
        if (!authed) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            return NextResponse.redirect(url);
        }
    }

    if (pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = authed ? "/chat" : "/login";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/", "/login", "/chat", "/chat/:path*"],
};
