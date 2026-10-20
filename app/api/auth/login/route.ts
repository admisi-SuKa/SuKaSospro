import { NextResponse } from "next/server";
import { adminCookie, createSessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return NextResponse.json({ ok: false, error: "ADMIN_PASSWORD belum dikonfigurasi di Vercel." }, { status: 503 });
  if (body.password !== configured) return NextResponse.json({ ok: false, error: "Password admin salah." }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookie.name, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: adminCookie.maxAge,
    path: "/",
  });
  return res;
}
