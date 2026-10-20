# Checklist Deployment Netlify — Full Stack Sospro

**Mulai dari `SETUP_ADMINISTRASI.md`** untuk pengaturan Google Apps Script, Google Sheets, Drive, akun pejabat, dan layanan Bahan Sospro.

- [ ] Repository di GitHub berisi Next.js dan `netlify.toml`.
- [ ] Apps Script lama tetap deployed dan `GAS_ENDPOINT`, `GAS_SECRET`, `ADMIN_PASSWORD`, `SESSION_SECRET` terisi.
- [ ] Apps Script baru `apps-script-administrasi/Code.gs` sudah di-deploy sebagai Web App.
- [ ] Script Properties baru: `SHEET_ID`, `DRIVE_FOLDER_ID`, `API_SECRET`.
- [ ] Jalankan `setupAdministrasi()`; terbuat 6 sheet (`PERMOHONAN`, `INVENTARIS`, `RIWAYAT_STATUS`, `BAHAN_SOSPRO`, `LANDING_PAGE`, `LANDING_ASSETS`).
- [ ] Netlify env: `OFFICE_GAS_ENDPOINT`, `OFFICE_GAS_SECRET`, `OFFICE_SESSION_SECRET`, `OFFICE_USERS_JSON`, `PUBLIC_SITE_URL`.
- [ ] Role admin dan pejabat menggunakan password berbeda.
- [ ] Deploy Next.js di Netlify; tidak memakai static export.
- [ ] Coba surat, tanda tangan pemohon, PDF, cek status dua kode.
- [ ] Coba admin verifikasi dan pejabat unggah PDF final yang telah ditandatangani.
- [ ] Coba inventaris, peminjaman dan pengembalian alat.
- [ ] Coba Bahan Sospro: upload PDF/PPTX, publikasi/draft, edit, hapus, unduh.
- [ ] Konfirmasi kegiatan, presensi dan doorprize versi lama masih normal.
- [ ] Sebelum rilis resmi: kebijakan institusi untuk dokumen/TTE; aktifkan mitigasi spam/rate limiting.


## Landing page baru
- [ ] Buka beranda dan pastikan semua menu, program studi, kegiatan, bahan, dan layanan tersambung.
- [ ] Buka `/admin/layanan/landing` dari dashboard Admin Admisi.
- [ ] Unggah gambar banner JPG/PNG/WebP maksimal 1,5 MB, simpan pengaturan.
- [ ] Jalankan ulang `setupAdministrasi()` untuk membuat 2 sheet landing baru tanpa menghapus data sebelumnya; deploy versi baru Apps Script.
- [ ] Jika ingin feed Instagram otomatis: otorisasi akun profesional `@admisi.uinsk` pada Meta; isi env `INSTAGRAM_LOGIN_METHOD`, `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN` di Netlify; lakukan redeploy. Jangan tulis token di Git.
- [ ] Periksa gambar kampus default eksternal dan unggah foto institusi yang berizin untuk menghindari hotlink pihak ketiga.
- [ ] Di Netlify: pastikan file server Next.js tidak dijadikan export static.
- [ ] Jalankan `npm run test:landing` untuk pengujian Apps Script landing offline.
