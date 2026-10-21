# PATCH SosPro — login ditolak walaupun reset password berhasil

Patch hanya mengubah **apps-script/Code.gs**. Tidak ada perubahan frontend, Netlify, Spreadsheet, atau Drive.

## Penyebab yang diperbaiki
Pada versi sebelumnya, pemeriksaan akun mengharuskan `active` **persis** `true` (huruf kecil). Google Sheets bisa menampilkan boolean `TRUE` (huruf besar). Akibatnya akun aktif dianggap nonaktif dan login membalas `Nama pengguna atau password salah`. Masalah ini juga dapat membuat `setupSospro()` menganggap Admin belum ada.

Kode baru menerima `true`, `TRUE`, atau nilai dengan spasi di pinggir, tetapi tetap menolak `FALSE`/`false`, blank, dan nilai lain. Berlaku untuk login, validasi sesi, dan pengecekan Admin saat setup.

## Pemasangan
1. Buka Apps Script yang **sama** dengan Spreadsheet SosPro yang Anda gunakan.
2. Ganti **semua isi** `Code.gs` dengan `apps-script/Code.gs` dari ZIP ini. Klik Save.
3. **Tidak perlu** menjalankan `setupSospro()` atau `resetPasswordSospro()` ulang.
4. Buka **Deploy → Manage deployments** → deployment Web app yang sedang digunakan → **Edit (pensil)** → Version: **New version** → **Deploy**.
5. Pastikan Netlify masih menunjuk URL `/exec` **deployment yang sama**, dan `GAS_SECRET` sama dengan Script Property `API_SECRET`. Tidak perlu deploy ulang Netlify untuk patch Apps Script ini.
6. Buka `https://sukasospro.netlify.app/login`, gunakan **username yang tercatat pada sheet USERS** dan password hasil reset terakhir.

## Jika tetap tidak bisa, cara memisahkan masalah
- Di Apps Script, pilih fungsi `diagnosaAkunSospro` dan klik **Run**. Lihat Execution log: `aktif=true`, `hashTersedia=true`, `saltTersedia=true`, dan `kunci hash tersedia=true` harus terlihat untuk akun yang dimaksud. Jangan bagikan password, hash, token, atau secret.
- Untuk menguji password langsung tanpa Netlify: di **Project Settings → Script Properties** isi sementara `TEST_USERNAME` (username persis dari sheet USERS) dan `TEST_PASSWORD` (password setelah reset). Pilih `ujiLoginSospro`, klik Run. Keduanya otomatis dihapus setelah uji. Log menampilkan `BERHASIL` atau `DITOLAK`, tanpa mencetak password.
- Jika tes Apps Script **BERHASIL** tetapi website masih menyatakan kredensial salah: paling mungkin Netlify terhubung ke Web app `/exec` lain, atau deployment Web app yang aktif masih menggunakan versi kode lama. Periksa `GAS_ENDPOINT` dan deployment ID.
- Jika tes Apps Script **DITOLAK**: periksa username di sheet USERS, properti `USER_PEPPER` (jangan diubah), dan status aktif. Jangan edit passwordHash atau salt secara manual.

Keamanan: Jangan memasukkan password ke chat, GitHub, atau file teks proyek. Script Properties hanya digunakan sebentar untuk pengujian dan variabel TEST_* dihapus setelah selesai.

## Pemeriksaan lokal
- Sintaks Code.gs dan uji login/reset/penolakan akun nonaktif dijalankan menggunakan mock Apps Script tanpa mengakses data Google.
- Login langsung di Netlify atau Spreadsheet Google milik Anda belum dapat diuji dari sini.
