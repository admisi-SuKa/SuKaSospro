"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Login gagal.");
      router.push("/admin"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Login gagal."); }
    finally { setLoading(false); }
  }

  return <form className="form-card" onSubmit={submit} style={{maxWidth: 480}}>
    <span className="badge">Admin</span>
    <h2 style={{fontSize: 30, marginBottom: 8}}>Masuk Dashboard</h2>
    <p style={{color: "var(--muted)", marginTop: 0}}>Login hanya untuk pengelola kegiatan Sospro. Peserta tidak membutuhkan akun.</p>
    {error && <div className="error-box" style={{marginBottom: 14}}>{error}</div>}
    <div className="form-field"><label className="label">Password admin</label><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
    <button className="btn btn-green" disabled={loading} type="submit">{loading ? "Memeriksa..." : "Masuk"}</button>
  </form>;
}
