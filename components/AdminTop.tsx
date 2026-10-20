"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminTop() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login"); router.refresh();
  }
  return <div className="admin-top"><div className="container"><div><strong>Sospro Admin</strong><div style={{fontSize: 11, opacity: .68}}>Kegiatan · Presensi · Doorprize · Administrasi</div></div><div className="admin-nav"><Link href="/admin">Dashboard</Link><Link href="/admin/kegiatan">Kegiatan</Link><Link href="/admin/doorprize">Doorprize</Link><Link href="/admin/layanan">Surat & Alat</Link><button className="mini-btn" onClick={logout}>Keluar</button></div></div></div>;
}
