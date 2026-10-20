# Administrasi Sospro — Apps Script Terpadu

Gunakan **SATU** backend: `apps-script/Code.gs`.

**Buka panduan utama: [`SETUP_APPS_SCRIPT_TERPADU.md`](SETUP_APPS_SCRIPT_TERPADU.md).**

Jangan buat Apps Script kedua untuk administrasi: semua 9 sheet dibuat oleh `setupSospro()` pada satu Spreadsheet dan folder Drive. Admin dan Pejabat menggunakan `OFFICE_USERS_JSON` untuk akses individual; login kegiatan tetap dapat memakai `ADMIN_PASSWORD`, tetapi kedua login berbagi API Apps Script yang sama.

Perlu diketahui: tanda tangan pemohon berupa gambar bukan TTE tersertifikasi. Pejabat mengunggah PDF final yang ditandatangani sesuai kebijakan instansi. Integrasi BSrE belum tersedia.
