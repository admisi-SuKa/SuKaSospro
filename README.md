# Sospro UIN Sunan Kalijaga — Full Stack + Landing Baru

**Referensi visual:** pola landing penerimaan mahasiswa yang editorial seperti Admisi UMM, **tetap menggunakan warna hijau–emas Sospro/UIN SuKa**. Proyek merupakan pengembangan dari ZIP website Sospro sebelumnya, bukan aplikasi baru.

**Mulai dari:** [`MULAI_DI_SINI.txt`](MULAI_DI_SINI.txt), **[`SETUP_APPS_SCRIPT_TERPADU.md`](SETUP_APPS_SCRIPT_TERPADU.md)**, dan [`SETUP_LANDING_IG.md`](SETUP_LANDING_IG.md).

**Beranda baru:** hero slider, pencarian prodi, jenjang S1/D4/S2/S3/Profesi, program baru, kegiatan Sospro dari API lama, surat, peminjaman alat, bahan Sospro, galeri, Instagram Admisi (Meta API bila diotorisasi), dan footer Admisi resmi.

**Admin landing:** `/admin/layanan/landing` (role `admin`). Google Sheets `LANDING_PAGE` + `LANDING_ASSETS`, Google Drive untuk gambar. Gambar publik maksimal 1,5 MB. Tanpa konfigurasi Google, konten default akan muncul; penyimpanan admin memerlukan deployment Apps Script terbaru.

**Pratinjau tanpa instalasi:** `PREVIEW_LANDING.html` (mock visual, tidak ada backend). **Pengujian cepat:** `npm run test:admin` dan `npm run test:landing`.

---

# Jelajah Studi UIN SUKA — Microsite Sosialisasi & Promosi

Website Next.js untuk Vercel + GitHub dengan fungsi:

- Materi program studi statis di source code.
- S1, D4 Sarjana Terapan, S2, S3, dan Program Profesi.
- Pencarian prodi berdasarkan jenjang, fakultas, nama, dan konsentrasi.
- Jalur masuk S1/D4/S2/S3 serta informasi Program Profesi.
- Tautan ke kanal resmi UIN/Admisi/program studi.
- Disclaimer yang jelas bahwa website **bukan website resmi**.
- **Tidak menampilkan kuota**.
- Kegiatan Sospro dinamis dari Google Sheets.
- Peserta tidak memiliki akun dan hanya mengisi presensi.
- Admin dapat membuat kegiatan serta membuka/menutup presensi.
- Wheel doorprize menggunakan peserta yang sudah presensi.
- Hasil pemenang disimpan di Google Sheets dan tidak diikutkan lagi pada undian berikutnya.

## Struktur teknologi

- Frontend: Next.js App Router + CSS biasa
- Hosting: Vercel
- Repository: GitHub
- Backend ringan: Vercel Route Handlers
- Database kegiatan/presensi: Google Sheets
- API Sheets: Google Apps Script

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Untuk mencoba tanpa Apps Script, gunakan:

```env
NEXT_PUBLIC_DEMO_MODE=1
ADMIN_PASSWORD=admin-demo
SESSION_SECRET=secret-demo-yang-panjang
```

Kemudian buka `http://localhost:3000`.

## Deploy ke GitHub + Vercel

1. Buat repository baru di GitHub.
2. Push seluruh folder project.
3. Import repository tersebut di Vercel.
4. Tambahkan environment variable dari `.env.example`.
5. Deploy.
6. Buat SATU Apps Script baru dari `apps-script/Code.gs` dan ikuti `SETUP_APPS_SCRIPT_TERPADU.md`. Isi `SHEET_ID` & `DRIVE_FOLDER_ID`, lalu jalankan `setupSospro()` sekali untuk membuat 9 sheet; `API_SECRET` otomatis dibuat jika belum ada.

## Data program studi

Master data disusun untuk konteks sosialisasi PMB 2026 dan mencakup:

- 45 program S1
- 1 program D4 Sarjana Terapan Teknologi Produksi Halal
- 30 program S2
- 8 program S3
- 1 Program Profesi Pendidikan Profesi Guru (PPG)

Total master data menjadi **85 program**. Program Profesi PPG berada di Fakultas Ilmu Tarbiyah dan Keguruan dan ditampilkan sebagai kategori tersendiri, bukan S1/S2/S3.

Pascasarjana pada S2 memiliki satu program studi, **Interdisciplinary Islamic Studies**. DIA dan ITMS diperlakukan sebagai konsentrasi, bukan prodi terpisah.

Prodi baru yang ditonjolkan antara lain:
- D4 Teknologi Produksi Halal
- S2 Kajian Sastra dan Budaya
- S2 Perpustakaan dan Sains Informasi
- S2 Ilmu Hadis
- S2 Matematika
- S3 Bahasa dan Sastra Arab
- S1 Kedokteran

## Catatan sumber dan pemeliharaan

Website sengaja tidak menyalin data yang cepat berubah seperti kuota. Untuk jalur, biaya, jadwal, akreditasi, dan pembukaan pendaftaran, tautan final selalu diarahkan ke sumber resmi.

Sumber utama yang digunakan saat penyusunan:
- https://uin-suka.ac.id/
- https://admisi.uin-suka.ac.id/
- https://admisi.uin-suka.ac.id/informasi/18
- https://admisi.uin-suka.ac.id/berita/146
- https://admisi.uin-suka.ac.id/berita/149
- https://ppg.uin-suka.ac.id/
- https://lpm.uin-suka.ac.id/id/page/prodi/1236-Ilmu-Tarbiyah-dan-Keguruan
- Leaflet PMB S1, S2, S3 tahun 2026 yang diberikan pengguna.

## Identitas visual

Desain mengambil inspirasi dari karakter visual UIN Sunan Kalijaga berupa hijau, hijau tua, emas, area putih, struktur institusional, serta tagline/semangat "Empowering Knowledge, Shaping the Future". Microsite dibuat sengaja berbeda dari website resmi agar tidak menimbulkan kesan sebagai kanal resmi.

Ikon `public/sospro-mark.svg` adalah ikon microsite buatan sendiri dan **bukan logo resmi UIN Sunan Kalijaga**.
## Ikon

Antarmuka menggunakan **Bootstrap Icons** yang dimuat dari CDN jsDelivr. Bootstrap Icons bersifat open source dengan lisensi MIT. Tidak menggunakan emoji sebagai ikon antarmuka utama. Jika ikon baru diperlukan, gunakan kelas `bi bi-...` dari Bootstrap Icons agar gaya visual tetap konsisten.

CDN yang digunakan:
`https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css`


---

## Modul baru: Administrasi Surat, Peminjaman Alat, dan Bahan Sospro (Netlify)

ZIP ini sudah mencakup modul Next.js, server-side API, dan **SATU Apps Script terpadu** untuk kegiatan/presensi/doorprize, surat, peminjaman, Bahan Sospro, dan landing page.

Mulai dari **[SETUP_APPS_SCRIPT_TERPADU.md](SETUP_APPS_SCRIPT_TERPADU.md)**. Siapkan Spreadsheet ID dan Folder Drive ID ketika akan mengonfigurasi Apps Script. Menu publik `Bahan Sospro` (`/layanan/bahan`) menampilkan materi yang dipublikasikan admin, sedangkan pengelolaannya tersedia di `/admin/layanan/bahan`. Batas upload bahan saat ini 3 MB per file; file besar dapat memakai tautan HTTPS.

**Penting:** Proses persetujuan saat ini menggunakan unggah PDF akhir yang sudah ditandatangani di luar aplikasi. Belum ada integrasi TTE tersertifikasi atau penerbitan surat dinas otomatis. Pengujian end-to-end membutuhkan deployment Apps Script dengan ID spreadsheet/folder yang valid.
