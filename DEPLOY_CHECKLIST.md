# Checklist Netlify — SATU Google Apps Script Terpadu

- [ ] Siapkan satu Spreadsheet kosong dan satu folder Drive privat.
- [ ] Buat **satu** proyek Apps Script dari `apps-script/Code.gs`.
- [ ] Set Script Properties `SHEET_ID`, `DRIVE_FOLDER_ID`.
- [ ] Run `setupSospro()` hingga log menunjukkan setup berhasil.
- [ ] Periksa semua **9 sheet** otomatis muncul dalam Spreadsheet yang sama.
- [ ] Ambil `API_SECRET` dari Script Properties (dibuat otomatis bila kosong).
- [ ] Deploy satu Web App; catat URL `/exec`.
- [ ] Netlify: `GAS_ENDPOINT` dan `GAS_SECRET` diisi dari Web App yang sama.
- [ ] Netlify: `ADMIN_PASSWORD`, `SESSION_SECRET`, `OFFICE_SESSION_SECRET`, dan `OFFICE_USERS_JSON` diisi.
- [ ] Tidak perlu `OFFICE_GAS_ENDPOINT` atau `OFFICE_GAS_SECRET`.
- [ ] Deploy Next.js ke Netlify (bukan static export), periksa konfigurasi env.
- [ ] Uji daftar kegiatan, presensi, doorprize.
- [ ] Uji surat, tanda tangan pemohon, kode pelacakan, PDF final yang sah.
- [ ] Uji stok alat, peminjaman, serah terima/pengembalian.
- [ ] Uji draft/publikasi Bahan Sospro, unduh dokumen.
- [ ] Uji banner, galeri dan pengumuman `/admin/layanan/landing`.
- [ ] Instagram feed otomatis perlu izin Meta dan token terpisah; tanpa token hanya tautan IG.
- [ ] Sebelum rilis publik: rate limit, kontrol dokumen pribadi, backup, dan otorisasi surat resmi.

Lihat langkah lengkap di `SETUP_APPS_SCRIPT_TERPADU.md`.
