# Pembaruan Landing Page Sospro (Gaya Editorial UMM, Warna UIN SuKa)

## Ringkasan
- Beranda baru: hero slider (hingga 4 banner), search program studi, 5 jenjang, kartu layanan, 3 acara terbaru dan 3 bahan terbaru dari backend Apps Script terpadu, galeri hingga 8 foto, seksi Instagram, CTA Admisi resmi.
- Warna UIN SuKa tetap: `#073f38`, `#0b6b5b`, `#13806b`, `#d7a928`, putih lembut.
- Konten admin dikendalikan melalui `/admin/layanan/landing`, **hanya role admin**.
- Konten dinamis disimpan ke **Google Sheets** (`LANDING_PAGE`), gambar unggahan publik di Google Drive folder yang Anda tentukan, beserta indeksnya di `LANDING_ASSETS`.
- Modul lama (kegiatan, presensi, doorprize, permohonan surat, inventaris, bahan) tetap ada.

## Backend landing page: sudah ada dalam satu Apps Script terpadu

Tidak ada proyek Apps Script kedua. Jalankan `setupSospro()` dari satu file `apps-script/Code.gs`.
Fungsi ini sekaligus membuat sheet `LANDING_PAGE` dan `LANDING_ASSETS` bersama sheet kegiatan, permohonan, inventaris, dan bahan.

Buka **`SETUP_APPS_SCRIPT_TERPADU.md`** untuk panduan setup. Setelah deploy, masuk `/admin/layanan/login` menggunakan akun role `admin`, lalu kelola banner dan galeri melalui `/admin/layanan/landing`.
Semua data menggunakan `GAS_ENDPOINT` dan `GAS_SECRET` yang sama dengan fitur kegiatan. Foto masuk Drive privat dan diakses publik lewat route terkontrol.

## Foto & sumber gambar awal
Contoh hero awal mengambil URL foto area UIN dari situs Admisi UIN; galeri awal dari situs Perpustakaan UIN. Foto dapat dimuat bergantung pada ketersediaan domain asal. Jika gambar tidak tersedia, website memakai `public/campus-illustration.svg` agar tidak terlihat rusak.

Sebelum website resmi tayang, **unggah foto institusi milik sendiri atau berizin**, kemudian ganti gambar contoh di menu admin. Tidak disarankan mengandalkan hotlink gambar eksternal dalam penggunaan jangka panjang.

## Instagram `@admisi.uinsk` — tanpa impor manual
Feed hanya **benar-benar otomatis** jika Meta mengizinkan pemilik akun profesional untuk mengakses Instagram API.

1. Pastikan Anda memiliki hak kelola atas akun Instagram profesional `@admisi.uinsk`.
2. Siapkan aplikasi Meta Developer, otorisasi akun sesuai skema Instagram Login (atau Facebook Login), serta permission membaca media yang disyaratkan Meta. Pengaturan App Review dan akses live mungkin dibutuhkan.
3. Catat ID akun profesional dan access token yang sesuai. Simpan di **Netlify Environment Variables**, bukan frontend atau Google Sheets:
   - `INSTAGRAM_LOGIN_METHOD=instagram` (untuk Instagram Login) atau `facebook` (untuk Facebook Login)
   - `INSTAGRAM_USER_ID=...`
   - `INSTAGRAM_ACCESS_TOKEN=...`
4. Deploy ulang Netlify. Endpoint server `/api/public/instagram` mencoba mengambil 6 media paling baru via Graph API dan melakukan cache 30 menit. Token dikirim pada header Authorization dari server, **tidak pernah ke browser**.
5. Pastikan token tetap aktif/ditangani rotasinya sesuai mekanisme yang diizinkan Meta. Jika token kedaluwarsa atau permission gagal, landing page tetap menampilkan tautan Instagram, bukan postingan palsu.

**Catatan:** konten Instagram **bukan** file di Drive dan **tidak** otomatis tersalin ke Sheets. Tautan postingan asli tetap menuju Instagram. API, permission, dan kebijakan Meta dapat berubah; periksa dokumentasi Meta saat integrasi akun.

## Menjalankan lokal dan deploy ke Netlify
```
npm install
cp .env.example .env.local
# isi variabel pada .env.local
npm run test:admin
npm run test:landing
npm run dev
```
Buka `http://localhost:3000/`. Build final `npm run build` membutuhkan dependensi `next/react` dari npm. Gunakan Netlify dengan Node 22 dan konfigurasi `netlify.toml` yang tersedia. **Jangan** gunakan export static karena Next.js API diperlukan untuk Google Apps Script dan Instagram.

### Batasan
- Kartu acara dan materi muncul setelah API masing-masing terhubung serta datanya dipublikasikan.
- Gambar kampus awal berupa referensi dan harus diganti/diizinkan sebelum produksi.
- Tanpa ID Spreadsheet/Drive dan deployment Google, admin landing page belum dapat menyimpan konten. Beranda tetap tampil berkat fallback.
- Integrasi TTE tersertifikasi BSrE tidak ditambahkan dalam revisi landing ini.
