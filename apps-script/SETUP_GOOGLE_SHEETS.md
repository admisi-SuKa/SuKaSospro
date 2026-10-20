# Satu Google Apps Script untuk semua fitur

Jangan mengikuti panduan lama yang memakai script terikat pada spreadsheet. Buat **satu** proyek Apps Script baru dari file `apps-script/Code.gs` dalam ZIP.

Panduan langkah demi langkah: **[`../SETUP_APPS_SCRIPT_TERPADU.md`](../SETUP_APPS_SCRIPT_TERPADU.md)**.

Di Apps Script: Project Settings → Script Properties → isi `SHEET_ID`, `DRIVE_FOLDER_ID`; pilih `setupSospro` → Run. `API_SECRET` otomatis dibuat jika belum ada. Setelah setup, Deploy sebagai Web app dan masukkan satu URL `/exec` beserta secret ke Netlify sebagai `GAS_ENDPOINT`, `GAS_SECRET`.
