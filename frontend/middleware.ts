import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const accessMatrix: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/driver", roles: ["driver", "admin"] },
  { prefix: "/marketplace", roles: ["caseworker", "admin"] },
  { prefix: "/donate", roles: ["donor", "admin"] },
  { prefix: "/collections", roles: ["donor", "admin"] },
];

async function verifyJWT(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "supersecretkey");
  const { payload } = await jwtVerify(token, secret); // throws if invalid/expired
  return payload as { id?: number; role?: string; name?: string; exp?: number };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const rule = accessMatrix.find(r => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (!rule) return NextResponse.next(); // public route

  const token = req.cookies.get("auth")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const payload = await verifyJWT(token);
    const role = payload.role;
    if (!role || !rule.roles.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "expired");
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/driver/:path*",
    "/marketplace/:path*",
    "/donate/:path*",
    "/collections/:path*",
  ],
};
