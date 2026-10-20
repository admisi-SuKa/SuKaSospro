import crypto from "node:crypto";
import { callGas } from "./gas";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export type OfficeRole = "admin" | "pejabat";
export type OfficeUser = { username: string; name: string; role: OfficeRole };
type StoredUser = OfficeUser & { passwordHash: string };
const COOKIE = "sospro_office";
const LIFETIME = 60 * 60 * 8;

function signingKey() {
  const key = process.env.OFFICE_SESSION_SECRET;
  if (!key || key.length < 32) throw new Error("OFFICE_SESSION_SECRET harus diisi minimal 32 karakter.");
  return key;
}
function users(): StoredUser[] {
  try {
    const list = JSON.parse(process.env.OFFICE_USERS_JSON || "[]");
    if (!Array.isArray(list)) return [];
    return list.filter((u): u is StoredUser => u && typeof u.username === "string" && typeof u.name === "string" && ["admin", "pejabat"].includes(u.role) && typeof u.passwordHash === "string");
  } catch { return []; }
}
export function authenticateOffice(username: string, password: string): OfficeUser | null {
  const entry = users().find(x => x.username.toLowerCase() === username.trim().toLowerCase());
  if (!entry || !/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/.test(entry.passwordHash)) return null;
  const [, salt, expected] = entry.passwordHash.split(":");
  const digest = crypto.scryptSync(password, Buffer.from(salt, "hex"), 64);
  if (!crypto.timingSafeEqual(digest, Buffer.from(expected, "hex"))) return null;
  return { username: entry.username, name: entry.name, role: entry.role };
}
function sign(value: string) { return crypto.createHmac("sha256", signingKey()).update(value).digest("base64url"); }
export function officeToken(user: OfficeUser): string {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(Date.now()/1000)+LIFETIME }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function parseOfficeToken(token?: string): OfficeUser | null {
  try {
    if (!token) return null;
    const [payload, mac, extra] = token.split(".");
    if (!payload || !mac || extra || mac.length !== sign(payload).length || !crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(sign(payload)))) return null;
    const data = JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
    if (!data || data.exp < Date.now()/1000 || !["admin","pejabat"].includes(data.role)) return null;
    const entry = users().find(u => u.username === data.username && u.role === data.role);
    return entry ? { username: entry.username, name: entry.name, role: entry.role } : null;
  } catch { return null; }
}
export function getOfficeRequest(req: NextRequest) { return parseOfficeToken(req.cookies.get(COOKIE)?.value); }
export async function getOfficePage() { return parseOfficeToken((await cookies()).get(COOKIE)?.value); }
export const officeCookie = { name: COOKIE, maxAge: LIFETIME };
export function validOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    const url = new URL(req.url);
    const approved = [url.origin, process.env.PUBLIC_SITE_URL || ""].filter(Boolean);
    return approved.includes(origin);
  } catch { return false; }
}

// Modul layanan dan kegiatan menggunakan Web App yang sama dan satu secret.
export async function callOffice<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  return callGas<T>(action, payload, true);
}
export const isSafeString = (v: unknown, max = 180) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
export function safeUpload(v: unknown, maxBytes = 2_000_000): v is {name:string; mime:string; data:string} {
  if (!v || typeof v !== "object") return false;
  const f = v as Record<string,unknown>;
  if (!isSafeString(f.name,160) || f.mime !== "application/pdf" || typeof f.data !== "string") return false;
  if (!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(f.data) || !f.data.length) return false;
  return (f.data.length/4*3 - ((f.data.endsWith("==") ? 2 : f.data.endsWith("=") ? 1 : 0))) <= maxBytes;
}
