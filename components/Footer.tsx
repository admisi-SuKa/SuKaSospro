import Link from "next/link";

const UIN_LOGO = "https://admisi.uin-suka.ac.id/img/logo_uin.png";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <img className="footer-logo" src={UIN_LOGO} alt="Logo UIN Sunan Kalijaga" />
            <h3>Jelajah Studi UIN SUKA</h3>
            <p>Microsite nonresmi untuk membantu kegiatan sosialisasi dan promosi program pendidikan UIN Sunan Kalijaga Yogyakarta.</p>
            <p><strong style={{color: "#ffe8a0"}}>Catatan penting:</strong> jadwal, persyaratan, biaya, status akreditasi, dan pembukaan jalur dapat berubah. Verifikasi kembali melalui situs resmi sebelum mengambil keputusan pendaftaran.</p>
          </div>
          <div>
            <h3>Jelajah</h3>
            <div className="footer-links">
              <Link href="/program-studi">Program Studi</Link>
              <Link href="/jalur-masuk">Jalur Masuk</Link>
              <Link href="/biaya-beasiswa">Biaya & Beasiswa</Link>
              <Link href="/kegiatan">Kegiatan Sospro</Link>
              <Link href="/layanan">Layanan Surat & Alat</Link>
              <Link href="/layanan/bahan">Bahan Sospro</Link>
            </div>
          </div>
          <div>
            <h3>Kanal Resmi</h3>
            <div className="footer-links">
              <a href="https://uin-suka.ac.id/" target="_blank" rel="noreferrer">Website UIN Sunan Kalijaga <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></a>
              <a href="https://admisi.uin-suka.ac.id/" target="_blank" rel="noreferrer">Admisi UIN Sunan Kalijaga <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></a>
              <a href="https://tanya.admisi.uin-suka.ac.id/" target="_blank" rel="noreferrer">FAQ Admisi Resmi <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Materi sosialisasi — bukan kanal resmi universitas.</span>
          <span><Link href="/admin/login">Admin Kegiatan</Link> · <Link href="/admin/layanan/login">Admin Layanan</Link></span>
        </div>
      </div>
    </footer>
  );
}
