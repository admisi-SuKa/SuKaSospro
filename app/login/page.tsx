import Link from "next/link";

export const metadata = {
  title: "Login — SosPro",
  description: "Pilih login administrasi atau kegiatan Sospro UIN Sunan Kalijaga.",
};

export default function LoginPetugasPage() {
  return (
    <main className="petugas-login-page">
      <section className="container petugas-login-container">
        <div className="petugas-login-heading">
          <span className="lp-eyebrow">AKSES KHUSUS PETUGAS</span>
          <h1>Login</h1>
          <p>Pilih panel sesuai tugas Anda. Halaman ini hanya untuk petugas yang memiliki akun atau kata sandi yang telah diberikan.</p>
        </div>
        <div className="petugas-login-grid">
          <Link className="petugas-login-card" href="/admin/login">
            <span className="petugas-login-icon"><i className="bi bi-calendar2-check" aria-hidden="true" /></span>
            <span className="petugas-login-subtitle">PANEL KEGIATAN</span>
            <h2>Admin Kegiatan</h2>
            <p>Kelola agenda Sospro, presensi peserta, dan pengundian doorprize.</p>
            <span className="petugas-login-cta">Masuk ke Admin Kegiatan <i className="bi bi-arrow-up-right" aria-hidden="true" /></span>
          </Link>
          <Link className="petugas-login-card" href="/admin/layanan/login">
            <span className="petugas-login-icon"><i className="bi bi-file-earmark-check" aria-hidden="true" /></span>
            <span className="petugas-login-subtitle">PANEL ADMINISTRASI</span>
            <h2>Admin Admisi &amp; Pejabat</h2>
            <p>Verifikasi surat, persetujuan pejabat, inventaris, peminjaman alat, Bahan Sospro, dan konten landing page.</p>
            <span className="petugas-login-cta">Masuk ke Admin Layanan <i className="bi bi-arrow-up-right" aria-hidden="true" /></span>
          </Link>
        </div>
        <div className="petugas-login-footer"><i className="bi bi-shield-lock" aria-hidden="true" /> Akses dilindungi. Pemohon tidak perlu login untuk mengajukan permohonan atau memeriksa statusnya.</div>
        <Link href="/" className="petugas-back"><i className="bi bi-arrow-left" aria-hidden="true" /> Kembali ke Beranda</Link>
      </section>
    </main>
  );
}
