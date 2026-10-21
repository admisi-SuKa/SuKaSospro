# SuKaSospro — Sistem Informasi & Administrasi SosPro

![SosPro](public/sospro-wordmark.png)

**Versi terbaru (akun USERS di Google Sheets + 2 slide kampus).**

Lihat [PANDUAN_SETUP_USERS_DAN_SLIDE.md](PANDUAN_SETUP_USERS_DAN_SLIDE.md) untuk memasang Google Apps Script dan Netlify.

- Satu proyek Google Apps Script dan satu Google Spreadsheet (10 sheet).
- Akun Admin awal dibuat melalui Script Properties ketika `setupSospro()` dijalankan.
- Login `/login` membaca akun dari sheet `USERS`, bukan `OFFICE_USERS_JSON`.
- Password disimpan sebagai hash, bukan plaintext.
- Banner menyertakan foto kampus dari URL yang diberikan dan JPG unggahan.
- Fitur kegiatan, presensi, doorprize, layanan administrasi, inventaris, bahan, dan landing page dipertahankan.

Pengujian Next.js penuh perlu dijalankan melalui `npm install && npm run build` pada komputer/Netlify.
