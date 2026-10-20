# Panduan Instalasi Full-Stack: Surat Sospro, Peminjaman Alat, dan Bahan Sospro

Proyek ini merupakan pengembangan dari website **Jelajah Studi UIN SUKA** (ZIP asli), bukan website pengganti. Kegiatan Sospro/presensi/doorprize yang lama tetap ada.

## Arsitektur

- **Netlify / Next.js**: halaman, otentikasi petugas, API server-side.
- **Apps Script administrasi** (`apps-script-administrasi/Code.gs`): backend formulir, keputusan, inventaris, bahan Sospro.
- **Google Sheets**: database 4 sheet otomatis: `PERMOHONAN`, `INVENTARIS`, `RIWAYAT_STATUS`, `BAHAN_SOSPRO`.
- **Google Drive**: lampiran, gambar tanda tangan pemohon, PDF final resmi, dan file bahan Sospro. File yang diunggah backend disimpan **privat**; unduhan dilakukan lewat server Next.js.
- **Apps Script lama** (`apps-script/Code.gs`): backend kegiatan Sospro lama, tetap dipakai.

## 1. Buat spreadsheet dan folder Drive

1. Buat Google Spreadsheet BARU untuk administrasi, salin Spreadsheet ID dari URL `/spreadsheets/d/<ID>/edit`.
2. Buat folder Google Drive BARU untuk surat dan bahan; salin Folder ID dari URL `/folders/<ID>`.
3. Pastikan akun Google pemilik Apps Script punya hak editor spreadsheet serta folder.
4. Berkas di folder ini **jangan dibagikan publik**. Jangan gunakan folder umum untuk dokumen pemohon.

## 2. Instal backend Google Apps Script administrasi

1. Buka [script.google.com](https://script.google.com), buat project Apps Script baru, misal `API Administrasi Sospro`.
2. Salin **seluruh isi** `apps-script-administrasi/Code.gs` ke file `Code.gs` project baru. Jangan menimpa `apps-script/Code.gs` lama.
3. Buka **Project Settings > Script Properties** dan tambahkan:

| Property | Nilai |
|---|---|
| `SHEET_ID` | Spreadsheet ID yang Anda siapkan |
| `DRIVE_FOLDER_ID` | ID folder Drive yang Anda siapkan |
| `API_SECRET` | Rahasia panjang acak minimal 32 karakter, berbeda dengan password pengguna |

4. Pilih fungsi `setupAdministrasi()` lalu klik **Run**. Setujui izin Google untuk Spreadsheet dan Drive. Setelah sukses, 4 sheet otomatis dibuat.
5. Pilih **Deploy > New deployment > Web app**. `Execute as: Me` dan `Who has access: Anyone` (akses API sendiri diproteksi secret server). **Jangan** memanggil endpoint Apps Script langsung dari browser.
6. Salin URL Web app yang berakhir dengan `/exec`. Jika mengubah Code.gs, buat **New version** dari deployment yang sama; jangan lupa agar kode terbaru yang berjalan.

**Catatan keamanan:** Karena web app dapat dijangkau publik, `API_SECRET` harus kuat dan hanya berada di environment Netlify serta Script Properties. Tanpa secret yang cocok, Apps Script menolak seluruh tindakan. Spreadsheet dan Drive sendiri tetap privat.

## 3. Membuat akun petugas yang terpisah

Gunakan terminal dalam folder project:

```bash
node scripts/create-office-user.mjs adminadmisi admin "Admin Admisi"
node scripts/create-office-user.mjs kepalaadmisi pejabat "Pejabat Penandatangan"
```

Masukkan password unik (minimal 12 karakter) saat diminta. Program mengeluarkan objek JSON per akun. Gabungkan menjadi satu array JSON di environment `OFFICE_USERS_JSON`:

```json
[
  {"username":"adminadmisi","name":"Admin Admisi","role":"admin","passwordHash":"scrypt:<salt>:<hash>"},
  {"username":"kepalaadmisi","name":"Pejabat Penandatangan","role":"pejabat","passwordHash":"scrypt:<salt>:<hash>"}
]
```

**Contoh di atas bukan akun siap pakai.** Gunakan keluaran generator yang sebenarnya. Role `admin` mengelola surat masuk, inventaris, peminjaman, bahan Sospro. Role `pejabat` hanya memproses surat Sospro yang sudah diverifikasi admin dan mengunggah PDF final bertanda tangan. Password akun tidak disimpan di Sheets.

## 4. Isi environment untuk Netlify

Gunakan `/.env.example` sebagai contoh. Environment yang wajib untuk layanan baru:

```env
OFFICE_GAS_ENDPOINT=https://script.google.com/macros/s/DEPLOY_ADMINISTRASI/exec
OFFICE_GAS_SECRET=RAHASIA_SAMA_DENGAN_API_SECRET_SCRIPT_PROPERTIES
OFFICE_SESSION_SECRET=RAHASIA_RANDOM_LAIN_MINIMAL_32_KARAKTER
OFFICE_USERS_JSON=[{"username":"...","name":"...","role":"admin","passwordHash":"scrypt:...:..."}]
PUBLIC_SITE_URL=https://alamat-website-anda.netlify.app
```

Environment fitur lama **tetap diperlukan** sesuai konfigurasi aslinya: `GAS_ENDPOINT`, `GAS_SECRET`, `ADMIN_PASSWORD`, `SESSION_SECRET`. Bila menggunakan demo mode lama, set `NEXT_PUBLIC_DEMO_MODE=0` untuk produksi.

Jangan commit `.env.local` atau nilai secret ke GitHub. Konfigurasi seluruh environment di **Netlify > Project configuration > Environment variables**, lalu redeploy setelah mengubahnya.

## 5. Deployment Netlify

1. Upload semua file proyek ke GitHub (root harus memuat `package.json` dan `netlify.toml`).
2. Netlify > Add new project > Import existing project > repo GitHub.
3. Build command `npm run build`; framework Next.js; `netlify.toml` sudah disediakan; Node 22.
4. Tambahkan semua environment di atas dan jalankan deploy.
5. Pastikan endpoint route server Next.js tetap aktif (jangan aktifkan static export).
6. Jika menggunakan domain khusus, ubah `PUBLIC_SITE_URL` ke origin produksi (misalnya `https://sospro.example.ac.id`, tanpa garis miring terakhir).

## 6. Menu website

| Halaman | Siapa | Kegunaan |
|---|---|---|
| `/layanan` | Publik | Pusat administrasi |
| `/layanan/sospro` | Publik | Pengajuan surat + PDF + gambar tanda tangan pemohon |
| `/layanan/peminjaman` | Publik | Peminjaman alat dan tanggal |
| `/layanan/status` | Pemohon dengan 2 kode | Cek progres dan unduh PDF akhir jika tersedia |
| `/layanan/bahan` | Publik | Katalog bahan Sospro, pencarian, download |
| `/admin/layanan/login` | Petugas | Login individual |
| `/admin/layanan` | Admin/Pejabat | Dashboard persetujuan, inventaris, log |
| `/admin/layanan/bahan` | Admin | Tambah, edit, draft/publikasi, hapus bahan Sospro |

### Cara memakai Bahan Sospro

1. Login sebagai admin ke `/admin/layanan/login`.
2. Buka **Kelola Bahan Sospro** dari dashboard, atau kunjungi `/admin/layanan/bahan`.
3. Masukkan judul, kategori, deskripsi, pilih file (PDF/PNG/JPG/PPTX/DOCX/XLSX/ZIP **maksimal 3 MB**) dan/atau tautan HTTPS.
4. Centang **Publikasikan** untuk menayangkan di katalog `/layanan/bahan`. Jika tidak dicentang, hanya admin yang bisa melihat/mengunduh file tersebut.
5. Klik **Edit** untuk memperbarui metadata atau mengganti file; **Hapus** mengarsipkan entri (soft delete) di Sheet dan menyembunyikannya dari katalog.
6. Untuk PowerPoint besar, video, atau materi melebihi 3 MB: masukkan **tautan HTTPS** Drive/YouTube. Anda bertanggung jawab mengatur permission akses pada layanan eksternal tersebut.

## 7. Mekanisme surat dan tanda tangan

- Pemohon menggambar tanda tangan **sederhana** pada form; sistem menyimpan bukti gambarnya dan memberi nomor registrasi + kode rahasia pelacakan satu kali.
- Admin memeriksa permohonan dan dapat menandai `REVIEWED` (verifikasi selesai), meminta revisi, atau menolak.
- Pejabat hanya dapat memberi `APPROVED` pada surat Sospro yang telah `REVIEWED`.
- **PENTING:** Untuk surat resmi, pejabat **mengunggah PDF final yang telah ditandatangani secara sah di luar aplikasi**. Modul ini **belum mengintegrasikan TTE tersertifikasi/BSrE** dan **tidak otomatis membuat nomor surat dinas atau PDF final bertanda tangan tersertifikasi**. Alur yang ada dapat digunakan sebelum integrasi resmi.
- Peminjaman alat memiliki persetujuan dan status serah terima / kembali. Sistem memeriksa total stok pada tanggal yang tumpang tindih ketika persetujuan dibuat.
- `RIWAYAT_STATUS` merekam siapa dan kapan keputusan diambil.

## 8. Checklist pengujian

- [ ] Database 4 sheet berhasil dibuat dengan `setupAdministrasi()`.
- [ ] Admin dan pejabat dapat login melalui akun berbeda.
- [ ] Pengajuan surat PDF dan TTD pemohon sukses; dua kode diterima.
- [ ] Login admin dapat melihat surat dan PDF lampiran.
- [ ] Admin verifikasi, kemudian pejabat memberi persetujuan dengan PDF final.
- [ ] Pemohon bisa cek status dan unduh PDF final memakai dua kode.
- [ ] Admin bisa menambah inventaris; pemohon bisa memilih alat; stok bentrok ditolak ketika approve.
- [ ] Admin bisa menambah, mengedit, menyembunyikan dan menghapus Bahan Sospro.
- [ ] Materi publik bisa diunduh; materi draft tidak boleh dapat diunduh pengunjung.
- [ ] Fitur kegiatan, presensi, dan doorprize lama masih berfungsi.

## Keamanan dan batasan

- Jangan gunakan gambar tanda tangan pemohon sebagai pengganti TTE tersertifikasi untuk surat dinas. Peluncuran resmi membutuhkan izin institusi, kebijakan retensi, privasi, dan alur verifikasi pejabat.
- Apps Script dan Google Sheets memiliki kuota dan batas eksekusi. Lampiran surat maks. 2 MB, bahan upload maks. 3 MB. File lebih besar sebaiknya via tautan Drive eksternal.
- Untuk penggunaan publik intensif, tambahkan CAPTCHA/rate limit di depan endpoint pengajuan/login (Netlify WAF/edge/layanan lain). Konfigurasi saat ini belum menerapkan proteksi otomatis terhadap bot atau percobaan login berulang.
- Ganti `API_SECRET` dan password petugas jika bocor. Jangan publikasikan foto tanda tangan atau surat pribadi.
- Pemohon harus menyimpan **nomor registrasi dan token pelacakan**; token tidak dapat dipulihkan dari frontend jika hilang.
- Karena Apps Script memakai `Execute as: Me`, pastikan izin akun Google dan pengaturan folder Drive sesuai aturan kantor.
