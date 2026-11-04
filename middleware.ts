import { NextResponse, type NextRequest } from "next/server";

export const config = { matcher: ["/dashboard/:path*"] };

export function middleware(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return new NextResponse("DASHBOARD_PASSWORD is not set", { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    if (decoded.slice(decoded.indexOf(":") + 1) === password) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="dashboard"' },
  });
}
