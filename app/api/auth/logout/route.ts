import { NextResponse } from "next/server";
import { adminCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookie.name, "", { maxAge: 0, path: "/" });
  return res;
}
