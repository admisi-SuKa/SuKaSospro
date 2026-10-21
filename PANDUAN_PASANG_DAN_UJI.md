# PATCH SosPro — TTD Pemohon Tidak Bisa Digambar

**Untuk proyek SuKaSospro dengan Next.js dan satu Google Apps Script.**

## File yang perlu disalin

Salin tiga file berikut dari ZIP ke lokasi yang sama pada repository website:

- `components/office/SignaturePad.tsx` (ganti file lama)
- `components/office/SignaturePad.module.css` (tambahkan file baru)
- `components/office/ApplicationForm.tsx` (ganti file lama)

**Jangan mengganti `app/globals.css`, `Code.gs`, ataupun file login.** Patch memakai CSS module khusus TTD agar tidak mengubah pengaturan visual dan keamanan yang sudah Anda buat.

## Apa yang diperbaiki

- Kontainer area gambar tidak lagi terkena aturan CSS lama `.office-sign > div` yang mengatur `display:flex` dan `padding` untuk seluruh anak.
- Peristiwa menggambar menggunakan Pointer Events (mouse, layar sentuh, stylus) dan mencegah halaman menggulir saat jari berada pada kanvas.
- Ukuran buffer kanvas mengikuti area CSS dan kepadatan piksel, dengan redraw goresan saat ukuran layar berubah.
- TTD baru dianggap siap setelah pointer dilepas, kemudian dikirim dari form sebagai `data:image/png;base64,...`.
- Tombol Hapus TTD, pesan hasil, dan alternatif unggah file PNG maksimal 350 KB.
- Label TTD pada `ApplicationForm.tsx` tidak lagi membungkus area canvas dengan elemen `<label>`.

## Pemasangan

1. Pastikan repository SosPro sudah disalin/cadangkan.
2. Ekstrak ZIP, salin **tiga file kode** dengan struktur direktori seperti di atas.
3. Commit dan push ke GitHub; deploy ulang melalui Netlify.
4. Setelah status deploy `Published`, buka `https://sukasospro.netlify.app/layanan/sospro` pada jendela privat atau lakukan hard refresh.
5. Turun ke bagian **Lampiran dan tanda tangan**. Buat beberapa goresan. Indikator akan menampilkan `✓ Tanda tangan berhasil direkam dan siap dikirim.`
6. Klik **Hapus TTD**, pastikan indikator kembali kosong; gambar lagi; ulangi pada HP bila memungkinkan.
7. Uji unggah PNG jika perangkat tidak dapat menggambar.
8. Baru setelah itu uji pengiriman form dan lihat file **TTD pemohon** dari dashboard Admin. Pastikan informasi pengajuan percobaan tidak memakai data pribadi asli.

## Hasil pengujian teknis di lingkungan pengembangan

- Komponen TSX melalui TypeScript `transpileModule`: **lolos parse**.
- Chromium: pengujian mesin kanvas dengan CSS asli proyek dan CSS perbaikan: **goresan mouse menghasilkan data URL PNG**.
- Chromium emulasi mobile: **sentuhan menghasilkan data URL PNG**.
- Tombol bersih: **menghapus data PNG**.

**Batas pengujian:** pengujian browser menggunakan harness kanvas yang meniru alur pointer dan gambar dari komponen, bukan menjalankan keseluruhan Next.js. Build Next.js dan pengujian end-to-end ke Netlify/Apps Script masih harus dilakukan pada deployment Anda.

## Kalau belum bisa menggambar setelah pemasangan

- Pastikan `SignaturePad.module.css` *benar-benar ditambahkan* dan `SignaturePad.tsx` sudah versi baru.
- Pastikan deploy terbaru berstatus `Published` serta halaman sudah hard refresh.
- Lihat Browser DevTools → Console untuk kesalahan JavaScript.
- Coba area kanvas langsung: jika tidak ada dot/goresan sama sekali, kirim tangkapan layar komponen dan pesan Console (tanpa data pribadi).
- Jika TTD sudah bisa digambar namun gagal saat tombol **Kirim Permohonan**, masalahnya berbeda: periksa error `/api/office/public`, koneksi GAS, serta batas ukuran lampiran.

> TTD ini adalah **tanda tangan sederhana pemohon**, bukan tanda tangan elektronik tersertifikasi pejabat.
