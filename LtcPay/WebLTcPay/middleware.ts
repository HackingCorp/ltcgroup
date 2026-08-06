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
  // This app has no Server Actions and no forms that POST to page routes
  // (all mutations go through the backend API), so any POST reaching a page
  // is a bot probe — Next-Action header or $ACTION_ID_x multipart body.
  if (request.method === "POST") {
    return new NextResponse("Method Not Allowed", { status: 405 });
  }
  return NextResponse.next();
}

export const config = {
  // Run on all page routes but skip static files and API routes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
