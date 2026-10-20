export default function BiayaBeasiswaPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow" style={{color: "#0b6b5b"}}>Informasi pendukung</span>
          <h1>Biaya & Beasiswa</h1>
          <p>Halaman ini sengaja tidak menyalin nominal biaya yang mudah berubah. Gunakan tautan resmi agar peserta menerima informasi terbaru.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon"><i className="bi bi-cash-coin" aria-hidden="true" /></div>
              <h3>Biaya Pendidikan S1 & D4</h3>
              <p>Program Sarjana menggunakan skema biaya yang ditetapkan UIN Sunan Kalijaga. Lihat kelompok dan ketentuan terbaru di Admisi resmi.</p>
              <p><a className="small-link" href="https://admisi.uin-suka.ac.id/" target="_blank" rel="noreferrer">Cek biaya resmi <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></a></p>
            </article>
            <article className="feature-card">
              <div className="feature-icon"><i className="bi bi-mortarboard" aria-hidden="true" /></div>
              <h3>Biaya Magister</h3>
              <p>Biaya pendaftaran dan pendidikan Magister dapat berbeda menurut jalur. Gunakan informasi PMB resmi pada periode pendaftaran.</p>
              <p><a className="small-link" href="https://admisi.uin-suka.ac.id/" target="_blank" rel="noreferrer">Cek biaya resmi <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></a></p>
            </article>
            <article className="feature-card">
              <div className="feature-icon"><i className="bi bi-journal-richtext" aria-hidden="true" /></div>
              <h3>Biaya Doktor</h3>
              <p>Ketentuan biaya seleksi dan pendidikan Doktor mengikuti jalur dan periode PMB yang sedang dibuka.</p>
              <p><a className="small-link" href="https://admisi.uin-suka.ac.id/" target="_blank" rel="noreferrer">Cek biaya resmi <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></a></p>
            </article>
          </div>
          <div className="section-head" style={{marginTop: 58}}>
            <div>
              <span className="eyebrow" style={{color: "#0b6b5b"}}>Dukungan studi</span>
              <h2>Beasiswa</h2>
              <p>Materi Sospro mencantumkan beragam skema beasiswa. Ketersediaan, persyaratan, dan periode pendaftaran harus dicek kembali karena dapat berubah.</p>
            </div>
          </div>
          <div className="feature-grid">
            <div className="feature-card"><h3>KIP Kuliah & Beasiswa Sarjana</h3><p>Untuk calon mahasiswa Sarjana, cek skema KIP Kuliah dan beasiswa internal/eksternal yang sedang dibuka.</p></div>
            <div className="feature-card"><h3>LPDP & Beasiswa Pascasarjana</h3><p>Materi Sospro menyebut LPDP untuk program Magister dan Doktor. Verifikasi skema, program tujuan, dan syarat pada penyelenggara beasiswa.</p></div>
            <div className="feature-card"><h3>Beasiswa Mitra & Prestasi</h3><p>Terdapat berbagai beasiswa dari lembaga, perbankan, pemerintah daerah, dan mitra. Informasi tahun berjalan dapat berubah.</p></div>
          </div>
          <div className="notice" style={{marginTop: 24}}>
            Website ini tidak menampilkan nominal biaya dan tidak menjanjikan ketersediaan beasiswa. Gunakan microsite untuk orientasi, lalu verifikasi di kanal resmi UIN/Admisi dan penyedia beasiswa.
          </div>
        </div>
      </section>
    </main>
  );
}
