import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { callGas } from "@/lib/gas";

// Allow enough time for Google Apps Script cold-start on the first request.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ ok: false, error: "eventId wajib diisi." }, { status: 400 });
  if (!process.env.GAS_ENDPOINT && process.env.NEXT_PUBLIC_DEMO_MODE === "1") {
    const demo = Array.from({ length: 24 }, (_, i) => ({ id: `P${i+1}`, eventId, name: `Peserta Demo ${i+1}`, institution: `Instansi ${1 + (i%5)}`, phone: `08xxxx${String(i+1).padStart(3,"0")}`, won: false }));
    return NextResponse.json({ ok: true, data: demo, demo: true });
  }
  try {
    const data = await callGas("getAttendance", { eventId }, true);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gagal memuat peserta." }, { status: 500 });
  }
}
