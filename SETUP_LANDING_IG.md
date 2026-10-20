# Pembaruan Landing Page Sospro (Gaya Editorial UMM, Warna UIN SuKa)

## Ringkasan
- Beranda baru: hero slider (hingga 4 banner), search program studi, 5 jenjang, kartu layanan, 3 acara terbaru dari backend kegiatan lama, 3 bahan terbaru dari backend administrasi, galeri hingga 8 foto, seksi Instagram, CTA Admisi resmi.
- Warna UIN SuKa tetap: `#073f38`, `#0b6b5b`, `#13806b`, `#d7a928`, putih lembut.
- Konten admin dikendalikan melalui `/admin/layanan/landing`, **hanya role admin**.
- Konten dinamis disimpan ke **Google Sheets** (`LANDING_PAGE`), gambar unggahan publik di Google Drive folder yang Anda tentukan, beserta indeksnya di `LANDING_ASSETS`.
- Modul lama (kegiatan, presensi, doorprize, permohonan surat, inventaris, bahan) tetap ada.

## Pembaruan backend (wajib untuk menyimpan landing page)
1. Buat salinan cadangan Apps Script administrasi dan spreadsheet sebelum memperbarui.
2. Buka proyek Apps Script administrasi **yang terpisah** dari Apps Script kegiatan lama.
3. Tempel versi TERBARU `apps-script-administrasi/Code.gs` ke proyek Apps Script administrasi.
4. Properties tetap: `SHEET_ID`, `DRIVE_FOLDER_ID`, `API_SECRET`.
5. Jalankan `setupAdministrasi()` ulang. Fungsi ini menambah `LANDING_PAGE` & `LANDING_ASSETS`, dan tidak menghapus baris yang sudah ada.
6. Perbarui deployment Web App yang lama menjadi **versi baru** (Manage deployments → Edit → Version New version). Jangan hanya menyimpan file tanpa redeploy.
7. Pastikan `OFFICE_GAS_ENDPOINT` dan `OFFICE_GAS_SECRET` di Netlify tetap mengarah ke proyek Apps Script administrasi tersebut.
8. Masuk `/admin/layanan/login`, login sebagai **admin**, lalu masuk `/admin/layanan/landing`. Atur banner, teks pengumuman, dan galeri; klik **Simpan Perubahan**.
9. `LANDING_PAGE` akan terisi satu baris dengan key `homepage`. Foto baru masuk ke Drive dalam mode privat dan ditampilkan kepada publik melalui endpoint terkontrol `/api/public/landing/image?id=IMG-...`. Hanya ID yang terdaftar di `LANDING_ASSETS` dapat ditampilkan.

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
