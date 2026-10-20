import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminPageSession } from "@/lib/auth";
import AdminTop from "@/components/AdminTop";

export default async function AdminPage() {
  if (!(await isAdminPageSession())) redirect("/admin/login");
  return <main className="admin-shell"><AdminTop /><section className="section"><div className="container"><div className="section-head"><div><span className="eyebrow" style={{color: "#0b6b5b"}}>Dashboard</span><h2>Kelola kegiatan Sospro</h2><p>Materi program studi tetap statis di GitHub. Dashboard ini hanya untuk kegiatan, presensi, dan doorprize.</p></div></div><div className="feature-grid"><Link className="feature-card" href="/admin/layanan"><div className="feature-icon"><i className="bi bi-file-earmark-check" /></div><h3>Administrasi Surat & Alat</h3><p>Login khusus petugas untuk pemeriksaan, persetujuan, inventaris, dan pengembalian.</p></Link><Link className="feature-card" href="/admin/kegiatan"><div className="feature-icon"><i className="bi bi-calendar2-plus" aria-hidden="true" /></div><h3>Kegiatan & Presensi</h3><p>Tambah kegiatan, publikasikan, serta buka atau tutup presensi peserta.</p></Link><Link className="feature-card" href="/admin/doorprize"><div className="feature-icon"><i className="bi bi-gift" aria-hidden="true" /></div><h3>Wheel Doorprize</h3><p>Pilih peserta eligible dari data presensi dan simpan pemenang agar tidak terundi ulang.</p></Link><a className="feature-card" href="/kegiatan" target="_blank"><div className="feature-icon"><i className="bi bi-window" aria-hidden="true" /></div><h3>Lihat Website Publik</h3><p>Periksa tampilan daftar kegiatan seperti yang dilihat peserta.</p></a></div></div></section></main>;
}
