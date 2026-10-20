/**
 * Backend Sospro UIN SUKA — Google Apps Script + Google Sheets
 * Gunakan sebagai script yang terikat (bound script) pada Spreadsheet database.
 * Jalankan setupSheets() sekali dari editor Apps Script.
 * Simpan API_SECRET melalui Project Settings > Script Properties.
 */

const SHEETS = {
  EVENTS: "Events",
  ATTENDANCE: "Attendance",
  WINNERS: "Winners",
};

const HEADERS = {
  Events: ["id", "slug", "title", "date", "time", "location", "description", "status", "attendanceOpen", "createdAt", "updatedAt"],
  Attendance: ["id", "eventId", "name", "phone", "institution", "timestamp"],
  Winners: ["id", "eventId", "participantId", "name", "phone", "institution", "prize", "timestamp"],
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Sospro Setup")
    .addItem("Setup / Perbaiki Database", "setupSosproDatabase")
    .addItem("Cek Struktur Database", "checkDatabaseSetup")
    .addSeparator()
    .addItem("Tampilkan API Secret", "showApiSecret")
    .addToUi();
}

/**
 * Jalankan fungsi ini SEKALI setelah Code.gs ditempel ke Apps Script.
 * Aman dijalankan ulang: data yang sudah ada tidak akan dihapus.
 * Fungsi akan:
 * 1) membuat sheet Events, Attendance, Winners jika belum ada;
 * 2) membuat/merapikan header;
 * 3) memberi format dasar, filter, dan freeze header;
 * 4) membuat API_SECRET otomatis jika belum ada;
 * 5) memvalidasi struktur database.
 */
function setupSosproDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Script harus terikat pada Google Spreadsheet.");

  const created = [];
  const repaired = [];

  Object.keys(HEADERS).forEach((name) => {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      created.push(name);
    }

    ensureHeaders_(sh, HEADERS[name]);
    formatDatabaseSheet_(sh, HEADERS[name]);
    repaired.push(name);
  });

  const props = PropertiesService.getScriptProperties();
  let apiSecret = props.getProperty("API_SECRET");
  let secretWasCreated = false;
  if (!apiSecret) {
    apiSecret = createSecret_();
    props.setProperty("API_SECRET", apiSecret);
    secretWasCreated = true;
  }
  props.setProperty("DB_SCHEMA_VERSION", "1");

  const status = validateDatabase_();
  if (!status.ok) {
    throw new Error("Setup belum valid: " + status.problems.join(" | "));
  }

  const message = [
    "Setup database Sospro selesai.",
    created.length ? "Sheet dibuat: " + created.join(", ") : "Semua sheet sudah tersedia.",
    secretWasCreated ? "API_SECRET otomatis dibuat." : "API_SECRET sudah tersedia.",
  ].join(" ");

  ss.toast(message, "Sospro Setup", 8);
  Logger.log(message);
  if (secretWasCreated) Logger.log("API_SECRET: %s", apiSecret);

  return {
    ok: true,
    createdSheets: created,
    checkedSheets: repaired,
    apiSecretCreated: secretWasCreated,
    schemaVersion: "1",
  };
}

// Alias lama agar dokumentasi/versi project sebelumnya tetap bekerja.
function setupSheets() {
  return setupSosproDatabase();
}

/**
 * Memeriksa bahwa semua sheet dan header yang dibutuhkan aplikasi tersedia.
 */
function checkDatabaseSetup() {
  const status = validateDatabase_();
  const ui = SpreadsheetApp.getUi();
  if (status.ok) {
    ui.alert("Database Sospro siap", "Semua sheet dan header sudah benar.", ui.ButtonSet.OK);
  } else {
    ui.alert("Database Sospro belum siap", status.problems.join("\n"), ui.ButtonSet.OK);
  }
  return status;
}

/**
 * Menampilkan API_SECRET yang harus disalin ke GAS_SECRET di Vercel.
 * Hanya pemilik/editor Spreadsheet yang dapat menjalankan fungsi ini dari Apps Script/menu.
 */
function showApiSecret() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty("API_SECRET");
  if (!secret) {
    secret = createSecret_();
    props.setProperty("API_SECRET", secret);
  }
  SpreadsheetApp.getUi().alert(
    "API Secret Sospro",
    "Salin nilai berikut ke environment variable GAS_SECRET di Vercel:\n\n" + secret +
      "\n\nJangan membagikan secret ini kepada peserta.",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return secret;
}

function ensureHeaders_(sheet, expectedHeaders) {
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), expectedHeaders.length);

  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map((v) => String(v || "").trim());
  const hasDataRows = lastRow > 1;
  const nonEmptyCurrent = current.filter(Boolean);

  // Jika baris pertama kosong, isi header tanpa menyentuh data lain.
  if (!nonEmptyCurrent.length) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  const exact = expectedHeaders.every((h, i) => current[i] === h);
  if (exact) return;

  // Jangan menimpa database yang sudah memiliki data dengan struktur berbeda.
  if (hasDataRows) {
    throw new Error(
      "Header sheet '" + sheet.getName() + "' tidak sesuai dan sheet sudah berisi data. " +
      "Gunakan spreadsheet kosong atau sesuaikan header secara manual agar data lama tidak tertimpa."
    );
  }

  sheet.clear();
  sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
}

function formatDatabaseSheet_(sheet, headers) {
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setFontWeight("bold")
    .setBackground("#075F67")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);
  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), headers.length).setWrap(true);

  // Filter hanya dibuat sekali agar admin mudah mencari data langsung di Sheet.
  const existingFilter = sheet.getFilter();
  if (!existingFilter) {
    const filterRows = Math.max(sheet.getLastRow(), 2);
    sheet.getRange(1, 1, filterRows, headers.length).createFilter();
  }

  const widths = {
    id: 150,
    slug: 180,
    title: 260,
    date: 110,
    time: 100,
    location: 220,
    description: 360,
    status: 110,
    attendanceOpen: 130,
    createdAt: 180,
    updatedAt: 180,
    eventId: 150,
    name: 220,
    phone: 150,
    institution: 240,
    timestamp: 190,
    participantId: 150,
    prize: 180,
  };

  headers.forEach((header, index) => {
    sheet.setColumnWidth(index + 1, widths[header] || 150);
  });
}

function validateDatabase_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const problems = [];

  Object.keys(HEADERS).forEach((name) => {
    const sh = ss.getSheetByName(name);
    if (!sh) {
      problems.push("Sheet '" + name + "' belum ada.");
      return;
    }
    const expected = HEADERS[name];
    const current = sh.getRange(1, 1, 1, expected.length).getValues()[0].map((v) => String(v || "").trim());
    expected.forEach((header, index) => {
      if (current[index] !== header) {
        problems.push("Sheet '" + name + "': kolom " + (index + 1) + " harus bernama '" + header + "'.");
      }
    });
  });

  if (!PropertiesService.getScriptProperties().getProperty("API_SECRET")) {
    problems.push("API_SECRET belum tersedia di Script Properties.");
  }

  return { ok: problems.length === 0, problems: problems };
}

function createSecret_() {
  return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
}

function doGet() {
  return json_({ ok: true, message: "Sospro API aktif", version: "auth-v4" });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = String(body.action || "");

    let data;
    switch (action) {
      case "listPublicEvents":
        data = listPublicEvents_();
        break;
      case "submitAttendance":
        data = submitAttendance_(body);
        break;
      case "listAdminEvents":
        requireAdmin_(body);
        data = listEvents_();
        break;
      case "createEvent":
        requireAdmin_(body);
        data = createEvent_(body.event || {});
        break;
      case "updateEvent":
        requireAdmin_(body);
        data = updateEvent_(body.event || {});
        break;
      case "getAttendance":
        requireAdmin_(body);
        data = getAttendance_(String(body.eventId || ""));
        break;
      case "drawWinner":
        requireAdmin_(body);
        data = drawWinner_(String(body.eventId || ""), String(body.prize || "Doorprize"));
        break;
      default:
        throw new Error("Action tidak dikenali.");
    }

    return json_({ ok: true, data: data });
  } catch (err) {
    return json_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function listPublicEvents_() {
  return listEvents_().filter((e) => e.status === "published");
}

function listEvents_() {
  const rows = rowsAsObjects_(SHEETS.EVENTS);
  return rows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

function createEvent_(event) {
  validateEvent_(event, false);
  const sh = sheet_(SHEETS.EVENTS);
  const now = new Date().toISOString();
  const id = "EVT-" + Utilities.getUuid().slice(0, 8).toUpperCase();
  const record = {
    id: id,
    slug: clean_(event.slug) || slugify_(event.title),
    title: clean_(event.title),
    date: clean_(event.date),
    time: clean_(event.time),
    location: clean_(event.location),
    description: clean_(event.description),
    status: event.status === "draft" ? "draft" : "published",
    attendanceOpen: Boolean(event.attendanceOpen),
    createdAt: now,
    updatedAt: now,
  };
  appendObject_(sh, HEADERS.Events, record);
  return record;
}

function updateEvent_(event) {
  validateEvent_(event, true);
  const sh = sheet_(SHEETS.EVENTS);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf("id");
  const rowIndex = data.findIndex((row, i) => i > 0 && String(row[idIndex]) === String(event.id));
  if (rowIndex < 1) throw new Error("Kegiatan tidak ditemukan.");

  const current = objectFromRow_(headers, data[rowIndex]);
  const record = {
    ...current,
    ...event,
    id: current.id,
    attendanceOpen: Boolean(event.attendanceOpen),
    status: event.status === "draft" ? "draft" : event.status === "finished" ? "finished" : "published",
    updatedAt: new Date().toISOString(),
  };
  const values = headers.map((h) => record[h] === undefined ? "" : record[h]);
  sh.getRange(rowIndex + 1, 1, 1, headers.length).setValues([values]);
  return record;
}

function submitAttendance_(body) {
  const eventId = clean_(body.eventId);
  const name = clean_(body.name);
  const phone = normalizePhone_(body.phone);
  const institution = clean_(body.institution);
  if (!eventId || !name || !phone || !institution) throw new Error("Lengkapi seluruh data presensi.");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const event = listEvents_().find((e) => String(e.id) === eventId);
    if (!event || event.status !== "published") throw new Error("Kegiatan tidak ditemukan atau belum dipublikasikan.");
    if (!toBoolean_(event.attendanceOpen)) throw new Error("Presensi untuk kegiatan ini sedang ditutup.");

    const attendance = rowsAsObjects_(SHEETS.ATTENDANCE);
    const duplicate = attendance.find((a) => String(a.eventId) === eventId && normalizePhone_(a.phone) === phone);
    if (duplicate) throw new Error("Nomor HP ini sudah tercatat pada kegiatan yang sama.");

    const record = {
      id: "ATT-" + Utilities.getUuid().slice(0, 10).toUpperCase(),
      eventId: eventId,
      name: name,
      phone: phone,
      institution: institution,
      timestamp: new Date().toISOString(),
    };
    appendObject_(sheet_(SHEETS.ATTENDANCE), HEADERS.Attendance, record);
    return { attendanceId: record.id };
  } finally {
    lock.releaseLock();
  }
}

function getAttendance_(eventId) {
  if (!eventId) throw new Error("eventId wajib diisi.");
  const winners = rowsAsObjects_(SHEETS.WINNERS).filter((w) => String(w.eventId) === eventId);
  const wonIds = new Set(winners.map((w) => String(w.participantId)));
  return rowsAsObjects_(SHEETS.ATTENDANCE)
    .filter((a) => String(a.eventId) === eventId)
    .map((a) => ({ ...a, won: wonIds.has(String(a.id)) }));
}

function drawWinner_(eventId, prize) {
  if (!eventId) throw new Error("Pilih kegiatan terlebih dahulu.");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const participants = getAttendance_(eventId).filter((p) => !p.won);
    if (!participants.length) throw new Error("Tidak ada peserta eligible yang tersisa.");

    const winner = participants[Math.floor(Math.random() * participants.length)];
    const record = {
      id: "WIN-" + Utilities.getUuid().slice(0, 10).toUpperCase(),
      eventId: eventId,
      participantId: winner.id,
      name: winner.name,
      phone: winner.phone,
      institution: winner.institution,
      prize: clean_(prize) || "Doorprize",
      timestamp: new Date().toISOString(),
    };
    appendObject_(sheet_(SHEETS.WINNERS), HEADERS.Winners, record);
    return record;
  } finally {
    lock.releaseLock();
  }
}

function validateEvent_(event, requireId) {
  if (requireId && !clean_(event.id)) throw new Error("ID kegiatan wajib diisi.");
  if (!clean_(event.title) || !clean_(event.date) || !clean_(event.time) || !clean_(event.location) || !clean_(event.description)) {
    throw new Error("Nama, tanggal, waktu, lokasi, dan deskripsi kegiatan wajib diisi.");
  }
}

function requireAdmin_(body) {
  const expectedRaw = PropertiesService.getScriptProperties().getProperty("API_SECRET");
  if (!expectedRaw) throw new Error("API_SECRET belum dibuat di Script Properties.");

  // Normalisasi untuk mencegah gagal autentikasi karena spasi/newline
  // yang tidak sengaja ikut tercopy dari Vercel atau dialog Apps Script.
  const expected = String(expectedRaw).trim();
  const received = String(body && body.secret ? body.secret : "").trim();

  if (!received) {
    throw new Error(
      "Akses admin ditolak: GAS_SECRET tidak terkirim dari Vercel. " +
      "Pastikan GAS_SECRET tersedia pada environment deployment yang sedang dibuka, lalu Redeploy."
    );
  }

  if (received !== expected) {
    throw new Error(
      "Akses admin ditolak: GAS_SECRET tidak sama dengan API_SECRET. " +
      "Panjang secret Vercel=" + received.length + ", Apps Script=" + expected.length + ". " +
      "Salin ulang API_SECRET tanpa tanda kutip, simpan di Vercel, lalu Redeploy."
    );
  }
}

function rowsAsObjects_(sheetName) {
  const sh = sheet_(sheetName);
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter((r) => r.some((v) => v !== "")).map((r) => objectFromRow_(headers, r));
}

function objectFromRow_(headers, row) {
  const obj = {};
  headers.forEach((h, i) => obj[h] = normalizeCell_(row[i]));
  return obj;
}

function normalizeCell_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
  return value;
}

function appendObject_(sheet, headers, record) {
  sheet.appendRow(headers.map((h) => record[h] === undefined ? "" : record[h]));
}

function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error("Sheet '" + name + "' belum ada. Jalankan setupSheets() terlebih dahulu.");
  return sh;
}

function clean_(value) {
  return String(value === undefined || value === null ? "" : value).trim().replace(/[<>]/g, "");
}

function normalizePhone_(value) {
  return String(value || "").replace(/[^0-9+]/g, "").trim();
}

function slugify_(value) {
  return clean_(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toBoolean_(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
