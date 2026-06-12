import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Reject malformed multipart/form-data POST requests from bots.
 *
 * Next.js 14 throws "Unexpected end of form" when it receives a POST
 * with multipart/form-data Content-Type but an empty or truncated body.
 * This middleware blocks those requests before they reach the page renderer.
 */
export function middleware(request: NextRequest) {
  if (request.method === "POST") {
    const ct = request.headers.get("content-type") || "";
    // If it's a multipart form POST but has no or tiny content-length, reject it
    if (ct.includes("multipart/form-data")) {
      const cl = parseInt(request.headers.get("content-length") || "0", 10);
      if (cl < 10) {
        return new NextResponse("Bad Request", { status: 400 });
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  // Run on all page routes but skip static files and API routes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
