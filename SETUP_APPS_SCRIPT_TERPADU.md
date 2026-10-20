# PANDUAN APPS SCRIPT TERPADU — SATU KALI SETUP

Versi ini hanya memakai **SATU proyek Google Apps Script BARU** untuk semua modul:
- Kegiatan Sospro, presensi, doorprize
- Permohonan surat & verifikasi/persetujuan
- Inventaris dan peminjaman alat
- Bahan Sospro
- Pengelolaan landing page, banner dan galeri

**Satu Google Spreadsheet, satu folder Google Drive, satu endpoint Web App, satu API_SECRET.**
Tidak perlu memasang atau menjalankan proyek Apps Script lama/terpisah.

## 1. Siapkan dua ID

Buat **satu** Google Spreadsheet kosong dan **satu** folder Drive privat menggunakan akun Google yang akan menjadi pemilik Apps Script.

- `SHEET_ID`: bagian URL Spreadsheet sesudah `/d/` dan sebelum `/edit`
- `DRIVE_FOLDER_ID`: bagian URL folder Google Drive setelah `/folders/`

Sebaiknya gunakan Spreadsheet **kosong** untuk menghindari konflik header sheet.
Jangan membagikan folder Drive surat sebagai akses publik.

## 2. Buat SATU proyek Apps Script baru

1. Buka https://script.google.com/ → **New project**.
2. Beri nama `SOSPRO UIN SuKa - API Terpadu`.
3. Di berkas `Code.gs`, **hapus kode contoh**.
4. Salin **SELURUH ISI SATU FILE** dari ZIP: `apps-script/Code.gs`.
5. Klik **Save**.
6. Buka **Project Settings** (ikon roda gigi) → **Script Properties**.
7. Tambahkan:

| Property | Value |
|---|---|
| `SHEET_ID` | ID Spreadsheet Anda |
| `DRIVE_FOLDER_ID` | ID folder Google Drive Anda |
| `API_SECRET` | Opsional: boleh kosong saat awal; jika belum ada, fungsi setup akan membuat secara otomatis |

Jika Anda sudah mempunyai secret kuat, isi `API_SECRET` dengan acak minimal 32 karakter. Jangan menggunakan password login petugas.

## 3. Klik Run SATU fungsi

Kembali ke editor. Pada dropdown fungsi pilih tepat:

**`setupSospro` → klik `Run` → Allow permissions**

Fungsi ini menyiapkan **9 Sheet** otomatis dalam Spreadsheet yang sama:

| No | Nama Sheet | Kegunaan |
|---:|---|---|
| 1 | `Events` | Kegiatan Sospro |
| 2 | `Attendance` | Presensi kegiatan |
| 3 | `Winners` | Pemenang doorprize |
| 4 | `PERMOHONAN` | Surat & pinjam alat |
| 5 | `INVENTARIS` | Alat dan stok |
| 6 | `RIWAYAT_STATUS` | Audit keputusan |
| 7 | `BAHAN_SOSPRO` | Bahan dan file materi |
| 8 | `LANDING_PAGE` | Konten hero, galeri, pengumuman |
| 9 | `LANDING_ASSETS` | Referensi gambar Google Drive |

Fungsi ini membuat sheet yang belum ada, memeriksa header, dan **tidak menghapus data sheet yang strukturnya sesuai**. Jika header sudah ada tetapi berbeda, setup berhenti dengan error agar data tidak diam-diam tertimpa.

**Periksa:** `Executions` / `Execution log` seharusnya mencatat `SETUP BERHASIL`.
Buka kembali **Project Settings → Script Properties**, salin `API_SECRET` yang dibuat otomatis bila sebelumnya kosong. Simpan rahasia ini hanya di Netlify, jangan di kode frontend/GitHub.

Jika muncul permintaan izin Google terkait Spreadsheet dan Drive, lanjutkan hanya pada proyek milik Anda sendiri setelah memeriksa kode.

## 4. Deploy Web App SATU KALI

1. Klik **Deploy → New deployment** → jenis **Web app**.
2. **Execute as: Me** (akun pemilik Spreadsheet dan folder Drive).
3. **Who has access: Anyone** agar Next.js server dapat menghubungi backend.
4. Klik **Deploy**, simpan URL yang berakhir `/exec`.
5. Jika kode diperbarui, **Manage deployments → Edit → New version → Deploy** agar versi terbaru benar-benar aktif.

Pembukaan endpoint di internet tidak otomatis membuka Google Sheets/Drive. API untuk operasi privat memakai secret server; jangan expose secret ke browser. Operasi presensi dan daftar kegiatan publik memang terbuka seperti versi awal; gunakan proteksi anti-spam sebelum operasional ramai.

## 5. Set Netlify Environment Variables

**HANYA SATU endpoint dan secret untuk kedua modul:**

```env
GAS_ENDPOINT=https://script.google.com/macros/s/xxxxxxxx/exec
GAS_SECRET=nilai_API_SECRET_dari_Script_Properties
ADMIN_PASSWORD=password_login_admin_kegiatan
SESSION_SECRET=acak_minimal_32_karakter
OFFICE_SESSION_SECRET=acak_lain_minimal_32_karakter
OFFICE_USERS_JSON=[{"username":"adminadmisi","name":"Admin Admisi","role":"admin","passwordHash":"scrypt:<salt>:<hash>"}]
PUBLIC_SITE_URL=https://nama-website.netlify.app
NEXT_PUBLIC_DEMO_MODE=0
```

**Tidak lagi memakai `OFFICE_GAS_ENDPOINT` atau `OFFICE_GAS_SECRET`.** Hapus konfigurasi tersebut bila sebelumnya pernah ditambahkan agar tidak membingungkan. `OFFICE_SESSION_SECRET` masih dibutuhkan untuk autentikasi akun petugas, bukan untuk membuat endpoint baru.

Untuk menyiapkan akun individual melalui terminal di folder proyek:

```bash
node scripts/create-office-user.mjs adminadmisi admin "Admin Admisi"
node scripts/create-office-user.mjs kepalaadmisi pejabat "Pejabat Penandatangan"
```

Masukkan password unik saat diminta, salin keluaran kedua akun, lalu gabungkan sebagai array JSON di `OFFICE_USERS_JSON`. Jangan memasukkan password plaintext ke variabel itu. Login kegiatan dan login admin/pejabat layanan masih dua alur UI, **tetapi backend GAS-nya hanya satu**.

## 6. Jalankan pengujian setelah deploy

1. Kunjungi URL Apps Script `/exec` di browser: seharusnya menampilkan JSON `API Sospro Terpadu aktif`.
2. Buka website Netlify, pastikan halaman kegiatan memuat data.
3. Buat satu kegiatan dari admin dan coba presensi dummy yang diperbolehkan, periksa sheet `Events` dan `Attendance`.
4. Buka `/layanan/sospro`, ajukan surat uji, dan periksa sheet `PERMOHONAN` serta berkas di Drive.
5. Login `/admin/layanan/login`, cek permohonan, inventaris, bahan Sospro, dan `/admin/layanan/landing`.
6. Publikasikan bahan uji serta unggah banner uji, periksa halaman publik.
7. Uji peminjaman dengan tanggal bertumpang tindih untuk memastikan stok tidak terlampaui.
8. Untuk surat dinas, persetujuan akhir menggunakan **PDF yang sudah ditandatangani sah di luar aplikasi**; integrasi TTE tersertifikasi **belum** tersedia.

Jika gagal: lihat **Executions** di Apps Script, cek `SHEET_ID` / `DRIVE_FOLDER_ID`, dan pastikan nilai `GAS_ENDPOINT` serta `GAS_SECRET` di Netlify sesuai deployment yang benar. Jalankan ulang `setupSospro` bila Anda menambahkan fitur setelah pembaruan. Fungsi setup dapat diulang tanpa menghapus data dengan struktur yang sesuai.

## Instagram

Tautan Instagram `@admisi.uinsk` tetap tampil tanpa pengaturan tambahan. Feed postingan otomatis memerlukan otorisasi Meta dan token Instagram profesional di Netlify; bukan di Apps Script atau Sheets. Lihat `SETUP_LANDING_IG.md`.
