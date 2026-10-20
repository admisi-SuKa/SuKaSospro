# Setup Google Sheets + Apps Script

Anda **tidak perlu membuat sheet dan judul kolom satu per satu**. Cukup buat satu Spreadsheet kosong lalu jalankan fungsi setup otomatis.

## 1. Buat satu Spreadsheet kosong
Buat Google Spreadsheet baru, misalnya **Database Sospro UIN SUKA**.

Tidak perlu membuat tab `Events`, `Attendance`, atau `Winners` secara manual.

## 2. Tempel Apps Script
Dari Spreadsheet pilih **Extensions → Apps Script**.

1. Hapus kode contoh bawaan.
2. Tempel seluruh isi file `Code.gs` dari project ini.
3. Klik **Save**.
4. Pada pilihan fungsi di toolbar Apps Script, pilih `setupSosproDatabase`.
5. Klik **Run**.
6. Berikan izin Google saat diminta.

Setup otomatis akan:
- membuat sheet `Events`;
- membuat sheet `Attendance`;
- membuat sheet `Winners`;
- membuat seluruh header kolom yang dibutuhkan;
- memformat header dan lebar kolom;
- membekukan baris header;
- membuat filter;
- membuat `API_SECRET` secara otomatis jika belum tersedia;
- memeriksa struktur database.

Fungsi ini aman dijalankan kembali. Data yang sudah ada tidak dihapus. Jika sebuah sheet sudah memiliki data tetapi headernya tidak cocok dengan skema aplikasi, setup berhenti agar data lama tidak tertimpa.

## 3. Menu Sospro Setup
Setelah Spreadsheet direfresh, akan muncul menu baru:

**Sospro Setup**
- **Setup / Perbaiki Database**
- **Cek Struktur Database**
- **Tampilkan API Secret**

Jika menu belum muncul, refresh/reload tab Spreadsheet satu kali.

## 4. Ambil API Secret
Pilih:

**Sospro Setup → Tampilkan API Secret**

Salin nilai yang muncul. Nilai tersebut nanti dipakai sebagai:

```env
GAS_SECRET=nilai_yang_ditampilkan
```

Jangan menaruh nilai secret di halaman publik dan jangan membagikannya kepada peserta.

## 5. Deploy sebagai Web App
Di Apps Script pilih **Deploy → New deployment → Web app**.

- **Execute as:** Me
- **Who has access:** Anyone

Endpoint perlu dapat menerima request publik karena peserta mengisi presensi tanpa login. Aksi admin tetap dilindungi `API_SECRET`, sedangkan website mengakses Apps Script melalui API route Vercel.

Salin URL deployment yang berakhiran `/exec`.

## 6. Environment Variables Vercel
Tambahkan:

```env
GAS_ENDPOINT=https://script.google.com/macros/s/...../exec
GAS_SECRET=secret_dari_menu_sospro_setup
ADMIN_PASSWORD=password_admin_anda
SESSION_SECRET=string_acak_panjang
NEXT_PUBLIC_DEMO_MODE=0
```

Setelah disimpan, redeploy project Vercel.

## 7. Uji alur
1. Buka `/admin/login`.
2. Login dengan `ADMIN_PASSWORD`.
3. Buat kegiatan.
4. Set kegiatan menjadi published dan buka presensi.
5. Buka halaman kegiatan sebagai peserta.
6. Isi presensi.
7. Pastikan data masuk ke `Attendance`.
8. Buka Admin → Doorprize.
9. Pilih kegiatan dan putar wheel.
10. Pastikan pemenang tercatat di `Winners`.

## Struktur yang dibuat otomatis

### Events
`id | slug | title | date | time | location | description | status | attendanceOpen | createdAt | updatedAt`

### Attendance
`id | eventId | name | phone | institution | timestamp`

### Winners
`id | eventId | participantId | name | phone | institution | prize | timestamp`

## Keamanan dasar
- Password admin hanya berada di server/Vercel, bukan JavaScript publik.
- Session admin menggunakan cookie `HttpOnly` bertanda tangan HMAC.
- Aksi admin ke Apps Script memerlukan secret tambahan.
- `API_SECRET` disimpan di Script Properties, bukan di Google Sheet.
- Nomor HP yang sama tidak bisa presensi dua kali pada event yang sama.
- `LockService` digunakan untuk presensi dan pengundian.
- Pemenang sebelumnya dikeluarkan dari undian berikutnya untuk event yang sama.
