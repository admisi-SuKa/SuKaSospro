# PATCH SOSPRO — SATU LOGIN & SATU DASHBOARD

Patch ini hanya mengandung FILE YANG BERUBAH terhadap versi **Satu Apps Script — Tanpa Beasiswa — Login Jelas**, setelah patch logo teks **SosPro** dan patch HTTP 405 dipasang. Gunakan patch ini TANPA menghapus fitur lain.

## Perubahan

- `/login` adalah **satu-satunya halaman login** (username + password akun `OFFICE_USERS_JSON`).
- `/admin` menjadi **satu dashboard terpadu**: kegiatan, presensi, doorprize, surat permohonan, peminjaman alat, inventaris, Bahan Sospro, dan Landing Page Manager.
- Admin kegiatan lama (`ADMIN_PASSWORD`) dinonaktifkan; tidak ada login kedua atau password bersama.
- Akun `role: admin` dapat mengelola SEMUA modul operasional, termasuk kegiatan dan presensi.
- Akun `role: pejabat` menggunakan halaman login sama tetapi **hanya** mendapat fitur surat/persetujuan sesuai kewenangannya. Persetujuan resmi tetap butuh PDF yang sudah ditandatangani.
- Tautan login lama `/admin/login` dan `/admin/layanan/login` diarahkan ke `/login`; `/admin/layanan` diarahkan ke bagian administrasi di dashboard utama.
- Tombol Login pada header tetap bertuliskan **Login** dan logo teks SosPro tetap dipertahankan.
- API kegiatan dilindungi oleh sesi akun admin yang sama; endpoint login lama diblokir (HTTP 410).
- **Tidak ada perubahan Code.gs atau struktur Google Sheets.**

## Cara pasang

1. Ekstrak ZIP patch ini.
2. Salin seluruh isi folder `app`, `components`, dan `.env.example` ke **root proyek SosPro** di GitHub/local, dan ganti file yang namanya sama. Jangan sampai membuat folder patch bersarang di dalam proyek.
3. Push perubahan ke GitHub dan deploy ulang di Netlify (Clear cache/deploy project without cache bila perlu).
4. Pastikan Netlify memiliki `OFFICE_USERS_JSON` berisi minimal satu akun `role: "admin"` dan `OFFICE_SESSION_SECRET` (minimal 32 karakter), juga `GAS_ENDPOINT`, `GAS_SECRET`, `PUBLIC_SITE_URL`. Nilai `ADMIN_PASSWORD` dan `SESSION_SECRET` lama tidak digunakan lagi; boleh dihapus dari Netlify setelah verifikasi login baru.
5. Masuk melalui `https://sukasospro.netlify.app/login`, lalu lihat dashboard di `/admin`.

## Membuat akun admin jika belum ada

Dari root proyek, jalankan:

    node scripts/create-office-user.mjs adminadmisi admin "Admin SosPro"

Ketik password minimal 12 karakter. Salin objek JSON yang dihasilkan sebagai satu elemen array di `OFFICE_USERS_JSON` Netlify, contoh bentuk `[ { ... } ]` (bukan menyalin password plaintext). Bila pejabat juga perlu masuk, buat objek `role: pejabat` dan tambahkan ke array yang sama.

CATATAN: Mengganti env vars menyebabkan aplikasi perlu di-deploy ulang. JANGAN menaruh password, hash, API_SECRET, atau OFFICE_SESSION_SECRET di GitHub. Tidak perlu men-deploy ulang Apps Script, karena tidak ada perubahan backend Google.

## Pemeriksaan mandiri

- `/login`: hanya satu form Username dan Password.
- Setelah login akun `admin`, `/admin` menampilkan tautan Kegiatan, Doorprize, Bahan Sospro, Landing Page, serta panel Surat & Alat di bawahnya.
- `/admin/login` dan `/admin/layanan/login` beralih ke `/login`.
- Pejabat tidak dapat mengakses kegiatan dan pengelolaan materi.
- Logout mengakhiri sesi portal dan kembali ke `/login`.

Pengujian yang dilakukan: parsing sintaks 65 file TS/TSX (lulus), test-terpadu, test-administrasi, test-landing (lulus); **belum ada build Next.js penuh atau pengujian langsung Netlify** karena node_modules tidak tersedia pada lingkungan ini.
