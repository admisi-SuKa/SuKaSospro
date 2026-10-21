# SuKaSospro — satu Apps Script + akun USERS + 2 slide baru

## Apa yang berubah
- Slide: `https://link.uin-suka.ac.id/theme/web/slide/s-uin2.jpg` dan foto unggahan `public/masjid-sunan-kalijaga.jpg`.
- Sheet `USERS` dibuat otomatis: `username`, `displayName`, `role`, `salt`, `passwordHash`, `active`, `sessionVersion`, `createdAt`, `updatedAt`, `lastLoginAt`.
- Login situs `/login` mengirim kredensial melalui API Next.js server ke Apps Script. Tidak lagi membaca `OFFICE_USERS_JSON`.
- Password **tidak** disimpan sebagai teks biasa di Sheets. Hash HMAC-SHA256 berulang menggunakan salt unik dan pepper pada Script Properties.
- Akun awal tidak dibuat ulang saat setup diulang. Reset password mengubah versi sesi.

## Langkah 1: isi Script Properties di Google Apps Script
Buka Apps Script → Project Settings → Script Properties, lalu tambahkan:

| Property | Nilai |
|---|---|
| `SHEET_ID` | ID Spreadsheet Google Anda (Spreadsheet yang sama seperti sebelumnya) |
| `DRIVE_FOLDER_ID` | ID folder Drive Anda |
| `ADMIN_USERNAME` | misalnya `adminadmisi` |
| `ADMIN_PASSWORD` | password kuat pribadi, 12–128 karakter mengandung huruf dan angka |
| `ADMIN_NAME` | misalnya `Admin SosPro` (opsional) |

**JANGAN** mengirim username/password rahasia dalam chat atau memasukkannya ke kode GitHub.

## Langkah 2: update Code.gs dan jalankan setup
1. Ganti isi Apps Script dengan `apps-script/Code.gs` pada paket ini.
2. Simpan, pilih **`setupSospro`**, klik **Run**, lalu izinkan otorisasi.
3. Spreadsheet akan memiliki **10 sheet**: `Events`, `Attendance`, `Winners`, `PERMOHONAN`, `INVENTARIS`, `RIWAYAT_STATUS`, `BAHAN_SOSPRO`, `LANDING_PAGE`, `LANDING_ASSETS`, `USERS`.
4. Pastikan akun awal muncul pada sheet `USERS`, dengan hash (bukan password plaintext). `ADMIN_PASSWORD` di Script Properties akan otomatis dihapus setelah dibuat.
5. `setupSospro` aman dijalankan ulang: tidak menghapus data atau mereset admin.
6. Bila LANDING_PAGE sudah memiliki data, setup hanya menambah foto slide apabila masih ada slot (maksimal empat). Jika penuh, buka Landing Page Manager dan ganti/tambah URL gambar secara manual. Konten yang sebelumnya diatur admin tidak dihapus.

**Penting**: Jalankan setup terlebih dahulu setelah mengganti `Code.gs`. Jika sebelumnya sudah ada 9 sheet, hanya `USERS` yang ditambahkan.

## Langkah 3: Deploy versi Apps Script terbaru
Apps Script → Deploy → Manage deployments → pilih Web App → Edit → Version **New version** → Deploy.
Execute as = **Me**, Who has access = **Anyone**. Jangan gunakan URL `/dev`.

## Langkah 4: Netlify
Netlify → Project configuration → Environment variables:

| Key | Nilai |
|---|---|
| `GAS_ENDPOINT` | URL Web App `/exec` |
| `GAS_SECRET` | sama persis dengan `API_SECRET` pada Script Properties |
| `OFFICE_SESSION_SECRET` | random 32+ karakter, untuk tanda tangan sesi login |
| `PUBLIC_SITE_URL` | `https://sukasospro.netlify.app` |
| `NEXT_PUBLIC_DEMO_MODE` | `0` |

`OFFICE_USERS_JSON` **tidak dipakai lagi**. `ADMIN_PASSWORD` dan `SESSION_SECRET` lama di Netlify juga tidak diperlukan untuk login terpadu. Hapus variabel lawas setelah verifikasi login baru.

Lakukan deploy ulang dari GitHub setelah memperbarui website.

## Login akun pertama
Buka `https://sukasospro.netlify.app/login`. Gunakan username dan password sesuai Script Properties yang Anda isi sebelum menjalankan setup. **Password tidak otomatis ditampilkan atau dikirim kembali.**

## Tambah user berikutnya (termasuk pejabat)
Di Apps Script → Script Properties tambahkan:
- `NEW_USERNAME`: `kepalaadmisi` (contoh)
- `NEW_PASSWORD`: password kuat minimal 12 karakter dengan huruf dan angka
- `NEW_NAME`: `Pejabat Penandatangan`
- `NEW_ROLE`: `pejabat` atau `admin`

Pilih **`tambahUserSospro`** lalu Run. Properti sementara dihapus setelah berhasil.

## Reset password
Tambahkan sementara `RESET_USERNAME` dan `RESET_PASSWORD` di Script Properties, pilih **`resetPasswordSospro`** → Run. Sesi lama otomatis tidak berlaku untuk operasi Apps Script.

## Catatan keamanan
Akses Google Spreadsheet harus dibatasi kepada pengelola yang memang berwenang. `API_SECRET`, `USER_PEPPER`, dan `OFFICE_SESSION_SECRET` adalah rahasia server; jangan ditempel di dokumen publik. Apps Script memiliki pembatasan kuota dan kecepatan, sehingga volume besar memerlukan backend autentikasi/database khusus. Untuk situs institusional berskala lebih besar disarankan migrasi ke penyedia autentikasi terkelola.
