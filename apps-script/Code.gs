/**
 * API SOSPRO TERPADU — SATU WEB APP, SATU SPREADSHEET, SATU DRIVE FOLDER.
 * Project Settings > Script Properties: SHEET_ID, DRIVE_FOLDER_ID.
 * API_SECRET otomatis dibuat jika belum ada ketika setupSospro() dijalankan.
 * Tidak ada kebutuhan memasang Apps Script lain.
 * Frontend Next.js menggunakan hanya GAS_ENDPOINT + GAS_SECRET.
 */
var SOSPRO_EVENT_ACTIONS = ['listPublicEvents','submitAttendance','listAdminEvents','createEvent','updateEvent','getAttendance','drawWinner'];
var SOSPRO_OFFICE_ACTIONS = ['inventoryPublic','submit','track','dashboard','decision','addItem','handover','returnItem','getFile','listMaterials','adminMaterials','saveMaterial','deleteMaterial','getMaterialFile','getLanding','saveLanding','uploadLandingImage','getLandingImage','authOffice'];

/** HANYA fungsi ini yang perlu dipilih lalu klik RUN pada instalasi pertama. */
function setupSospro() {
  var p = PropertiesService.getScriptProperties();
  var sheetId = String(p.getProperty('SHEET_ID') || '').trim();
  var folderId = String(p.getProperty('DRIVE_FOLDER_ID') || '').trim();
  if (!sheetId || !folderId) throw new Error('Isi SHEET_ID dan DRIVE_FOLDER_ID melalui Project Settings > Script Properties dahulu.');
  var ss = SpreadsheetApp.openById(sheetId);
  var folder = DriveApp.getFolderById(folderId);
  if (!p.getProperty('API_SECRET')) p.setProperty('API_SECRET', createSecret_());
  var events = setupKegiatan_();
  var admin = setupAdministrasi_();
  var initialAccount = setupSosproUsers_();
  var slides = setupSosproSlides_();
  var names = ['Events','Attendance','Winners'].concat(Object.keys(O_HEADERS));
  Logger.log('SETUP BERHASIL: Spreadsheet = ' + ss.getName() + ', Drive = ' + folder.getName());
  Logger.log(names.length + ' sheet tersedia: ' + names.join(', '));
  Logger.log('Akun awal: ' + initialAccount + '; Banner baru: ' + slides);
  Logger.log('Salin API_SECRET dari Project Settings > Script Properties ke GAS_SECRET pada Netlify. Jangan publikasikan nilainya.');
  return {ok:true, sheets:names, events:events.ok, admin:admin, account:initialAccount, slides:slides};
}

function doGet() {
  return oJson_({ok:true,message:'API Sospro Terpadu aktif',version:'2.0',modules:['kegiatan','presensi','doorprize','administrasi','inventaris','bahan','landing']});
}

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = String(b.action || '');
    var data;
    if (SOSPRO_EVENT_ACTIONS.indexOf(action) !== -1) {
      // Kegiatan publik & presensi tidak butuh secret; aksi admin diverifikasi di legacyDispatch_.
      data = legacyDispatch_(b);
    } else if (SOSPRO_OFFICE_ACTIONS.indexOf(action) !== -1) {
      // Semua permintaan administrasi harus datang via API server Netlify, bukan browser langsung.
      var expected = String(PropertiesService.getScriptProperties().getProperty('API_SECRET') || '').trim();
      if (!expected || String(b.secret || '').trim() !== expected) throw new Error('Autentikasi API administrasi gagal');
      data = officeDispatch_(b);
    } else {
      throw new Error('Action tidak dikenali: ' + action.slice(0,80));
    }
    return oJson_({ok:true,data:data});
  } catch (err) {
    return oJson_({ok:false,error:err && err.message ? err.message : String(err)});
  }
}

/**
 * Backend Sospro UIN SUKA — Google Apps Script + Google Sheets
 * Bekerja sebagai proyek Apps Script baru/standalone menggunakan SHEET_ID.
 * Jalankan setupSospro() sekali dari editor Apps Script.
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

function setupKegiatan_() {
  const ss = oSpreadsheet_();
  if (!ss) throw new Error("Spreadsheet tidak dapat dibuka. Periksa SHEET_ID.");

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

  Logger.log(message);
  // Demi keamanan, API_SECRET hanya dilihat melalui Project Settings > Script Properties.

  return {
    ok: true,
    createdSheets: created,
    checkedSheets: repaired,
    apiSecretCreated: secretWasCreated,
    schemaVersion: "1",
  };
}

// Penyiapan database internal (hanya setupSospro yang dijalankan pengguna).
/**
 * Memeriksa bahwa semua sheet dan header yang dibutuhkan aplikasi tersedia.
 */
function checkDatabaseSetup_() {
  var status = validateDatabase_();
  Logger.log(status.ok ? 'Database kegiatan siap.' : status.problems.join(' | '));
  return status;
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
  const ss = oSpreadsheet_();
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

function legacyDispatch_(body) {
  switch (String(body.action || '')) {
    case 'listPublicEvents': return listPublicEvents_();
    case 'submitAttendance': return submitAttendance_(body);
    case 'listAdminEvents': requireAdmin_(body); return listEvents_();
    case 'createEvent': requireAdmin_(body); return createEvent_(body.event || {});
    case 'updateEvent': requireAdmin_(body); return updateEvent_(body.event || {});
    case 'getAttendance': requireAdmin_(body); return getAttendance_(String(body.eventId || ''));
    case 'drawWinner': requireAdmin_(body); return drawWinner_(String(body.eventId || ''), String(body.prize || 'Doorprize'));
    default: throw new Error('Aksi kegiatan tidak dikenal.');
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
  // yang tidak sengaja ikut tercopy dari Netlify atau dialog Apps Script.
  const expected = String(expectedRaw).trim();
  const received = String(body && body.secret ? body.secret : "").trim();

  if (!received) {
    throw new Error(
      "Akses admin ditolak: GAS_SECRET tidak terkirim dari Netlify. " +
      "Pastikan GAS_SECRET tersedia pada environment deployment yang sedang dibuka, lalu Redeploy."
    );
  }

  if (received !== expected) {
    throw new Error('Akses admin ditolak: GAS_SECRET tidak sama dengan API_SECRET. Periksa Script Properties dan Netlify.');
  }
  // Auth kegiatan juga memverifikasi akun, role, dan versi sesi aktif.
  oCheckActor_(body.actor,'admin');
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
  const sh = oSpreadsheet_().getSheetByName(name);
  if (!sh) throw new Error("Sheet '" + name + "' belum ada. Jalankan setupSospro() terlebih dahulu.");
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


// ==================== ADMINISTRASI / MEDIA ====================
/**
 * SISTEM ADMINISTRASI SOSPRO + PEMINJAMAN ALAT
 * Dipadukan dengan modul kegiatan, presensi, doorprize dalam satu proyek.
 * Project Settings > Script properties: SHEET_ID, DRIVE_FOLDER_ID, API_SECRET.
 * Jalankan setupSospro() sekali sebelum deployment Web App.
 * Deploy Web App: Execute as = Me; Who has access = Anyone.
 * Semua pemanggilan melalui route SERVER Next.js dengan API_SECRET, BUKAN langsung dari browser.
 */
var O_NAMES = { REQUESTS:'PERMOHONAN', INVENTORY:'INVENTARIS', LOG:'RIWAYAT_STATUS', MATERIALS:'BAHAN_SOSPRO', LANDING:'LANDING_PAGE', LANDING_ASSETS:'LANDING_ASSETS', USERS:'USERS' };
var O_HEADERS = {
  PERMOHONAN:['code','tokenHash','kind','name','institution','faculty','school','phone','email','purpose','target','location','dateStart','dateEnd','itemId','quantity','status','note','attachmentId','signatureId','signedPdfId','createdAt','updatedAt'],
  INVENTARIS:['id','name','category','total','active','createdAt'],
  RIWAYAT_STATUS:['code','actor','status','note','time'],
  BAHAN_SOSPRO:['id','title','category','description','fileName','mime','size','fileId','externalUrl','published','deleted','createdAt','updatedAt'],
  LANDING_PAGE:['key','valueJson','updatedAt','updatedBy'],
  LANDING_ASSETS:['id','fileId','mime','name','createdAt','actor'],
  USERS:['username','displayName','role','salt','passwordHash','active','sessionVersion','createdAt','updatedAt','lastLoginAt']
};
function setupAdministrasi_(){
  var p=PropertiesService.getScriptProperties();
  if(!p.getProperty('SHEET_ID') || !p.getProperty('DRIVE_FOLDER_ID') || !p.getProperty('API_SECRET')) throw new Error('Isi SHEET_ID, DRIVE_FOLDER_ID, API_SECRET di Script Properties.');
  var ss=SpreadsheetApp.openById(p.getProperty('SHEET_ID'));
  Object.keys(O_HEADERS).forEach(function(name){
    var sh=ss.getSheetByName(name)||ss.insertSheet(name);
    var heads=O_HEADERS[name];
    if(sh.getLastRow()>0){
      var old=sh.getRange(1,1,1,Math.max(heads.length,sh.getLastColumn())).getValues()[0];
      if(old.some(function(value,i){return i<heads.length && value && String(value)!==heads[i]})) throw new Error('Header '+name+' tidak cocok. Gunakan sheet kosong atau perbaiki sebelum menjalankan setup.');
    }
    sh.getRange(1,1,1,heads.length).setValues([heads]);
    sh.setFrozenRows(1);sh.getRange(1,1,1,heads.length).setFontWeight('bold').setBackground('#e2f2ed');
    sh.getRange(1,1,sh.getMaxRows(),heads.length).setNumberFormat('@');
  });
  DriveApp.getFolderById(p.getProperty('DRIVE_FOLDER_ID')).getName();
  Logger.log('SIAP: spreadsheet='+ss.getName()+'; sheet='+Object.keys(O_HEADERS).join(', '));
  return 'Setup administrasi berhasil';
}
function officeDispatch_(b) {
  // Autentikasi dilakukan sekali pada doPost terpadu.
  var data;
  switch(String(b.action||'')){
    case 'authOffice':data=oAuthenticateOffice_(b);break;
    case 'inventoryPublic': data=oInventory_().filter(function(i){return i.active==='true'}).map(function(i){i.active=true;return i});break;
    case 'submit':data=oSubmit_(b);break;
    case 'track':data=oTrack_(b.code,b.token);break;
    case 'dashboard':oCheckActor_(b.actor);data=oDashboard_();break;
    case 'decision':oCheckActor_(b.actor);data=oDecision_(b.payload,b.actor);break;
    case 'addItem':oCheckActor_(b.actor,'admin');data=oAddItem_(b.payload,b.actor);break;
    case 'handover':oCheckActor_(b.actor,'admin');data=oChangeLoan_(b.payload,'OUT',b.actor);break;
    case 'returnItem':oCheckActor_(b.actor,'admin');data=oChangeLoan_(b.payload,'RETURNED',b.actor);break;
    case 'getFile':data=oGetFile_(b);break;
    case 'listMaterials':data=oListMaterials_(false);break;
    case 'adminMaterials':oCheckActor_(b.actor,'admin');data=oListMaterials_(true);break;
    case 'saveMaterial':oCheckActor_(b.actor,'admin');data=oSaveMaterial_(b.payload,b.actor);break;
    case 'deleteMaterial':oCheckActor_(b.actor,'admin');data=oDeleteMaterial_(b.payload,b.actor);break;
    case 'getMaterialFile':data=oGetMaterialFile_(b);break;
    case 'getLanding':data=oGetLanding_();break;
    case 'saveLanding':oCheckActor_(b.actor,'admin');data=oSaveLanding_(b.payload,b.actor);break;
    case 'uploadLandingImage':oCheckActor_(b.actor,'admin');data=oUploadLandingImage_(b.file,b.actor);break;
    case 'getLandingImage':data=oGetLandingImage_(b.id);break;
    default:throw new Error('Aksi administrasi tidak dikenal');
  }
  return data;
}
function oJson_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function oSpreadsheet_(){var id=PropertiesService.getScriptProperties().getProperty('SHEET_ID');if(!id)throw new Error('SHEET_ID belum diset');return SpreadsheetApp.openById(id);}
function oSheet_(name){var sh=oSpreadsheet_().getSheetByName(name);if(!sh)throw new Error('Sheet '+name+' belum ada, jalankan setupSospro');return sh;}
function oRows_(name){
  var sh=oSheet_(name);var h=O_HEADERS[name];if(sh.getLastRow()<2)return [];
  return sh.getRange(2,1,sh.getLastRow()-1,h.length).getDisplayValues().map(function(vals,index){var obj={_row:index+2};h.forEach(function(k,j){obj[k]=String(vals[j]||'')});return obj}).filter(function(r){return r[h[0]]});
}
function oClean_(s,max){var out=String(s===undefined||s===null?'':s).trim();if(out.length>(max||200))throw new Error('Nilai terlalu panjang');return out;}
function oCell_(v){var x=String(v===undefined||v===null?'':v);return /^[=+\-@]/.test(x)?"'"+x:x;}
function oAppend_(name,obj){var sh=oSheet_(name);sh.appendRow(O_HEADERS[name].map(function(k){return oCell_(obj[k])}));}
function oUpdate_(name,row,obj){var h=O_HEADERS[name];oSheet_(name).getRange(row,1,1,h.length).setValues([h.map(function(k){return oCell_(obj[k])})]);}
function oWithLock_(fn){var lock=LockService.getScriptLock();if(!lock.tryLock(25000))throw new Error('Sistem sedang sibuk, silakan ulangi');try{return fn()}finally{lock.releaseLock()}}
function oTime_(){return new Date().toISOString()}
function oHash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s).map(function(b){return ('0'+(b<0?b+256:b).toString(16)).slice(-2)}).join('')}
function oCheckActor_(actor,role){
  if(!actor || !actor.username || !actor.name || ['admin','pejabat'].indexOf(actor.role)===-1 || !actor.sessionVersion)throw new Error('Identitas petugas tidak sah');
  if(role && actor.role!==role)throw new Error('Role tidak diizinkan');
  var u=oRows_(O_NAMES.USERS).find(function(x){return x.username.toLowerCase()===String(actor.username).toLowerCase()});
  if(!u || !sosproUserActive_(u.active) || u.role!==actor.role || u.sessionVersion!==actor.sessionVersion)throw new Error('Akun nonaktif atau sesi tidak berlaku lagi; silakan login ulang.');
}
function oLog_(code,actor,status,note){oAppend_(O_NAMES.LOG,{code:code,actor:actor,status:status,note:note,time:oTime_()})}
function oUpload_(value,filename,mime,maxBytes){
  if(!value || typeof value.data!=='string' || typeof value.name!=='string' || value.data.length>Math.ceil(maxBytes*4/3)+20)throw new Error('Berkas tidak valid atau terlalu besar');
  var bytes=Utilities.base64Decode(value.data);
  if(bytes.length>maxBytes || bytes.length===0)throw new Error('Ukuran berkas tidak valid');
  if(mime==='application/pdf' && !(bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70))throw new Error('Isi berkas bukan PDF');
  if(mime==='image/png' && !(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71))throw new Error('Tanda tangan harus berupa PNG');
  var folder=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID'));
  var f=folder.createFile(Utilities.newBlob(bytes,mime,filename));f.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);return f.getId();
}
function oId_(prefix){
  var props=PropertiesService.getScriptProperties(),year=Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy');
  var key='SEQ_'+prefix+'_'+year, next=Number(props.getProperty(key)||0)+1;
  var ids=oRows_(O_NAMES.REQUESTS).filter(function(x){return x.code.indexOf(prefix+'-'+year+'-')===0});
  var maxExisting=ids.reduce(function(m,x){return Math.max(m,Number(x.code.split('-').pop())||0)},0);
  next=Math.max(next,maxExisting+1);props.setProperty(key,String(next));
  return prefix+'-'+year+'-'+('00000'+next).slice(-5);
}
function oSubmit_(body){return oWithLock_(function(){
  var kind=body.kind;
  if(['SOSPRO','ALAT'].indexOf(kind)===-1)throw new Error('Layanan tidak dikenal');
  var f=body.form||{};
  ['name','institution','phone','purpose','dateStart','dateEnd'].forEach(function(k){if(!oClean_(f[k],k==='purpose'?1500:200))throw new Error('Wajib diisi: '+k)});
  if(!/^\d{4}-\d{2}-\d{2}$/.test(f.dateStart)||!/^\d{4}-\d{2}-\d{2}$/.test(f.dateEnd)||f.dateStart>f.dateEnd)throw new Error('Tanggal tidak benar');
  if(kind==='SOSPRO' && (!oClean_(f.school,200)||!(Number(f.target)>0)))throw new Error('Data sekolah/target tidak lengkap');
  if(kind==='ALAT'){
    var item=oInventory_().find(function(it){return it.id===f.itemId&&it.active==='true'});
    if(!item)throw new Error('Alat tidak tersedia');
    var qty=Number(f.quantity);if(!Number.isInteger(qty)||qty<1||qty>Number(item.total))throw new Error('Jumlah alat tidak valid');
  }
  if(body.consent!==true)throw new Error('Persetujuan pemrosesan data wajib diberikan');
  if(!/^data:image\/png;base64,/.test(body.signature||''))throw new Error('Tanda tangan belum ada');
  var prefix=kind==='SOSPRO'?'SOS':'ALT',code=oId_(prefix),token=Utilities.getUuid()+'-'+Utilities.getUuid();
  var attachmentId='';
  if(kind==='SOSPRO'&&!body.attachment)throw new Error('Surat permohonan PDF wajib dilampirkan');
  if(body.attachment)attachmentId=oUpload_(body.attachment,code+'-surat.pdf','application/pdf',2000000);
  var signatureId=oUpload_({name:'ttd.png',data:body.signature.slice('data:image/png;base64,'.length)},code+'-ttd-pemohon.png','image/png',500000);
  var now=oTime_();
  var obj={code:code,tokenHash:oHash_(token),kind:kind,name:oClean_(f.name,200),institution:oClean_(f.institution,200),faculty:oClean_(f.faculty,200),school:oClean_(f.school,200),phone:oClean_(f.phone,100),email:oClean_(f.email,200),purpose:oClean_(f.purpose,1500),target:oClean_(f.target,20),location:oClean_(f.location,200),dateStart:f.dateStart,dateEnd:f.dateEnd,itemId:oClean_(f.itemId,80),quantity:oClean_(f.quantity,10),status:'PENDING',note:'',attachmentId:attachmentId,signatureId:signatureId,signedPdfId:'',createdAt:now,updatedAt:now};
  oAppend_(O_NAMES.REQUESTS,obj);oLog_(code,'Pemohon','PENDING','Pengajuan masuk');
  return {code:code,token:token};
})}
function oFind_(code){return oRows_(O_NAMES.REQUESTS).find(function(r){return r.code===code})}
function oTrack_(code,token){var r=oFind_(oClean_(code,60));if(!r || !token || oHash_(String(token))!==r.tokenHash)throw new Error('Nomor atau kode rahasia tidak cocok');return {code:r.code,kind:r.kind,name:r.name,purpose:r.purpose,status:r.status,note:r.note,updatedAt:r.updatedAt,hasFinalPdf:!!r.signedPdfId}}
function oInventory_(){return oRows_(O_NAMES.INVENTORY).map(function(it){return {id:it.id,name:it.name,category:it.category,total:Number(it.total),active:it.active==='true'?'true':'false'}})}
function oDashboard_(){
  return {requests:oRows_(O_NAMES.REQUESTS).reverse().map(function(r){return {code:r.code,kind:r.kind,name:r.name,institution:r.institution,faculty:r.faculty,school:r.school,phone:r.phone,email:r.email,purpose:r.purpose,target:r.target,location:r.location,dateStart:r.dateStart,dateEnd:r.dateEnd,itemId:r.itemId,quantity:r.quantity,status:r.status,note:r.note,createdAt:r.createdAt,updatedAt:r.updatedAt,hasAttachment:!!r.attachmentId,hasFinalPdf:!!r.signedPdfId}}),items:oInventory_().map(function(it){it.active=it.active==='true';return it}),logs:oRows_(O_NAMES.LOG).reverse().slice(0,200).map(function(l){return {code:l.code,actor:l.actor,status:l.status,note:l.note,time:l.time}})};
}
function oAvailable_(r){
  var item=oInventory_().find(function(it){return it.id===r.itemId});if(!item)throw new Error('Alat tidak terdaftar');
  var used=oRows_(O_NAMES.REQUESTS).filter(function(t){return t.kind==='ALAT'&&t.code!==r.code&&t.itemId===r.itemId&&['APPROVED','OUT'].indexOf(t.status)!==-1&&t.dateStart<=r.dateEnd&&t.dateEnd>=r.dateStart}).reduce(function(n,t){return n+Number(t.quantity||0)},0);
  if(used+Number(r.quantity)>item.total)throw new Error('Stok tidak cukup pada tanggal ini. Terpesan '+used+' dari '+item.total+' unit.');
}
function oDecision_(d,actor){return oWithLock_(function(){
  var r=oFind_(oClean_(d.code,80));if(!r)throw new Error('Permohonan tidak ditemukan');
  var next=oClean_(d.status,30),note=oClean_(d.note,2000);
  if(['REJECTED','APPROVED','OUT','RETURNED'].indexOf(r.status)!==-1)throw new Error('Permohonan sudah diproses final');
  if(['REVIEWED','REVISION','REJECTED','APPROVED'].indexOf(next)===-1)throw new Error('Status tidak didukung');
  if(r.kind==='SOSPRO'){
    if(actor.role==='admin' && ['REVIEWED','REVISION','REJECTED'].indexOf(next)===-1)throw new Error('Admin tidak berwenang menyetujui surat');
    if(actor.role==='pejabat' && (r.status!=='REVIEWED'||['APPROVED','REJECTED'].indexOf(next)===-1))throw new Error('Surat harus diverifikasi admin terlebih dahulu');
    if(next==='APPROVED'){
      if(!d.signedPdf)throw new Error('PDF yang sudah ditandatangani wajib dilampirkan');
      r.signedPdfId=oUpload_(d.signedPdf,r.code+'-tanggapan-final.pdf','application/pdf',2000000);
    }
  } else {
    if(actor.role!=='admin'||next==='REVIEWED')throw new Error('Aksi peminjaman tidak diizinkan');
    if(next==='APPROVED')oAvailable_(r);
  }
  if(next==='REVISION' && !note)throw new Error('Catatan revisi wajib diisi');
  r.status=next;r.note=note;r.updatedAt=oTime_();oUpdate_(O_NAMES.REQUESTS,r._row,r);oLog_(r.code,actor.name+' ('+actor.username+')',next,note);
  return {code:r.code,status:next};
})}
function oAddItem_(d,actor){return oWithLock_(function(){
  var name=oClean_(d.name,120),category=oClean_(d.category,100),total=Number(d.total);
  if(!name||!category||!Number.isInteger(total)||total<1||total>100000)throw new Error('Data alat tidak valid');
  var id='INV-'+Utilities.getUuid().slice(0,8).toUpperCase();
  oAppend_(O_NAMES.INVENTORY,{id:id,name:name,category:category,total:total,active:'true',createdAt:oTime_()});
  oLog_(id,actor.name,'ITEM_ADDED',name+' ('+total+' unit)');return {id:id};
})}
function oChangeLoan_(d,next,actor){return oWithLock_(function(){
  var r=oFind_(oClean_(d.code,80));if(!r||r.kind!=='ALAT')throw new Error('Peminjaman tidak ditemukan');
  if(next==='OUT' && r.status!=='APPROVED')throw new Error('Hanya peminjaman disetujui dapat diserahkan');
  if(next==='RETURNED' && r.status!=='OUT')throw new Error('Hanya alat yang dipinjam dapat dikembalikan');
  if(next==='OUT')oAvailable_(r);
  r.status=next;r.note=oClean_(d.note,2000);r.updatedAt=oTime_();oUpdate_(O_NAMES.REQUESTS,r._row,r);oLog_(r.code,actor.name,next,r.note);return {code:r.code,status:next};
})}
function oGetFile_(b){
  var r=oFind_(oClean_(b.code,80));if(!r)throw new Error('Berkas tidak ditemukan');
  var type=b.type;
  if(['attachment','signature','signedPdf'].indexOf(type)===-1)throw new Error('Jenis berkas tidak dikenal');
  if(b.actor){oCheckActor_(b.actor)}else{
    if(type!=='signedPdf'||r.status!=='APPROVED'||!b.token||oHash_(String(b.token))!==r.tokenHash)throw new Error('Tidak berhak membuka berkas');
  }
  var id=type==='attachment'?r.attachmentId:type==='signature'?r.signatureId:r.signedPdfId;
  if(!id)throw new Error('Berkas belum tersedia');
  var file=DriveApp.getFileById(id),bytes=file.getBlob().getBytes();
  if(bytes.length>2500000)throw new Error('Berkas melebihi batas unduhan');
  return {name:file.getName(),mime:file.getMimeType(),base64:Utilities.base64Encode(bytes)};
}


/** AKUN PENGGUNA: sandi tersimpan sebagai hash HMAC berulang dengan salt acak dan pepper privat. */
function sosproUserPasswordHash_(password,salt){
  var pepper=PropertiesService.getScriptProperties().getProperty('USER_PEPPER');
  if(!pepper)throw new Error('USER_PEPPER belum tersedia. Jalankan setupSospro().');
  var str=String(password)+':'+salt;
  for(var k=0;k<1500;k++){
    var bytes=Utilities.computeHmacSha256Signature(str,pepper);
    str=Utilities.base64Encode(bytes);
  }
  return str;
}
/** Google Sheets getDisplayValues() can return TRUE/FALSE in uppercase for booleans. */
function sosproUserActive_(value){return String(value===undefined||value===null?'':value).trim().toLowerCase()==='true';}
function sosproValidUsername_(name){return /^[a-z][a-z0-9._-]{3,39}$/.test(String(name||''));}
function sosproValidPassword_(value){return typeof value==='string' && value.length>=12 && value.length<=128 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);}
function sosproCreateUser_(username,password,displayName,role){
  username=String(username||'').trim().toLowerCase();
  if(!sosproValidUsername_(username))throw new Error('Username 4–40 karakter, huruf kecil/angka/titik/_/- dan diawali huruf.');
  if(!sosproValidPassword_(password))throw new Error('Password minimal 12 karakter, memuat huruf dan angka, maksimal 128.');
  if(['admin','pejabat'].indexOf(role)===-1)throw new Error('Role tidak valid.');
  if(oRows_(O_NAMES.USERS).some(function(u){return u.username.toLowerCase()===username}))throw new Error('Username sudah terdaftar.');
  var now=oTime_(),salt=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  oAppend_(O_NAMES.USERS,{username:username,displayName:oClean_(displayName||username,100),role:role,salt:salt,passwordHash:sosproUserPasswordHash_(password,salt),active:'true',sessionVersion:Utilities.getUuid(),createdAt:now,updatedAt:now,lastLoginAt:''});
  return username;
}
/** Dipanggil otomatis oleh setupSospro. ADMIN_PASSWORD akan DIHAPUS dari Script Properties jika berhasil. */
function setupSosproUsers_(){
  var p=PropertiesService.getScriptProperties();
  if(!p.getProperty('USER_PEPPER'))p.setProperty('USER_PEPPER',createSecret_());
  var admins=oRows_(O_NAMES.USERS).filter(function(u){return u.role==='admin' && sosproUserActive_(u.active)});
  if(admins.length)return 'Admin sudah tersedia; tidak ditimpa';
  var username=p.getProperty('ADMIN_USERNAME'),password=p.getProperty('ADMIN_PASSWORD');
  if(!username||!password)throw new Error('Sebelum setup pertama, isi ADMIN_USERNAME dan ADMIN_PASSWORD pada Script Properties (selain SHEET_ID dan DRIVE_FOLDER_ID).');
  var created=sosproCreateUser_(username,password,p.getProperty('ADMIN_NAME')||'Admin SosPro','admin');
  p.deleteProperty('ADMIN_PASSWORD');
  return 'Akun admin dibuat: '+created+' (password awal dihapus dari Script Properties)';
}
/** Jika perlu menambahkan petugas (admin/pejabat), set NEW_USERNAME, NEW_PASSWORD,
 * NEW_ROLE (admin/pejabat), NEW_NAME di Script Properties, lalu pilih fungsi ini dan Run.
 */
function tambahUserSospro(){
  return oWithLock_(function(){
    var p=PropertiesService.getScriptProperties();
    var username=sosproCreateUser_(p.getProperty('NEW_USERNAME'),p.getProperty('NEW_PASSWORD'),p.getProperty('NEW_NAME')||p.getProperty('NEW_USERNAME'),p.getProperty('NEW_ROLE')||'pejabat');
    ['NEW_PASSWORD','NEW_USERNAME','NEW_NAME','NEW_ROLE'].forEach(function(k){p.deleteProperty(k)});
    Logger.log('Akun dibuat: '+username+'; password dihapus dari Script Properties.');
    return username;
  });
}
/** Reset password aman melalui Script Properties: RESET_USERNAME, RESET_PASSWORD, lalu Run.
 * Ini juga membatalkan sesi sebelumnya karena sessionVersion berubah.
 */
function resetPasswordSospro(){
  return oWithLock_(function(){
    var p=PropertiesService.getScriptProperties(),name=String(p.getProperty('RESET_USERNAME')||'').trim().toLowerCase(),password=p.getProperty('RESET_PASSWORD');
    if(!sosproValidPassword_(password))throw new Error('Isi RESET_PASSWORD minimal 12 karakter memuat huruf dan angka.');
    var u=oRows_(O_NAMES.USERS).find(function(x){return x.username.toLowerCase()===name});
    if(!u)throw new Error('Akun tidak ditemukan.');
    u.salt=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
    u.passwordHash=sosproUserPasswordHash_(password,u.salt);
    u.sessionVersion=Utilities.getUuid();u.updatedAt=oTime_();
    oUpdate_(O_NAMES.USERS,u._row,u);
    p.deleteProperty('RESET_PASSWORD');p.deleteProperty('RESET_USERNAME');
    Logger.log('Password akun '+name+' diperbarui; sesi lama dibatalkan.');
    return true;
  });
}
function oAuthenticateOffice_(b){
  var username=String(b.username||'').trim().toLowerCase(),password=String(b.password||'');
  if(!sosproValidUsername_(username)||password.length>128||!password)return null;
  var cache=CacheService.getScriptCache(),key='auth-'+oHash_(username).slice(0,28);
  var tries=Number(cache.get(key)||'0');
  if(tries>=6)throw new Error('Terlalu banyak percobaan login. Coba lagi dalam 15 menit.');
  var u=oRows_(O_NAMES.USERS).find(function(x){return x.username.toLowerCase()===username});
  if(!u||!sosproUserActive_(u.active)||!u.salt||!u.passwordHash||sosproUserPasswordHash_(password,u.salt)!==u.passwordHash){
    cache.put(key,String(tries+1),900);
    return null;
  }
  cache.remove(key);
  // Perbarui hanya satu sel login terakhir agar tidak menimpa reset password paralel.
  try{oSheet_(O_NAMES.USERS).getRange(u._row,O_HEADERS.USERS.indexOf('lastLoginAt')+1).setValue(oTime_())}catch(ignore){}
  // Login tidak mengirim hash, salt, atau data rahasia ke frontend.
  return {username:u.username,name:u.displayName,role:u.role,sessionVersion:u.sessionVersion};
}
/** Jalankan dari editor Apps Script jika login tetap gagal.
 * Hanya metadata akun non-rahasia; tidak mencetak password, hash, salt, token, atau pepper.
 */
function diagnosaAkunSospro(){
  var users=oRows_(O_NAMES.USERS);
  var hasPepper=!!PropertiesService.getScriptProperties().getProperty('USER_PEPPER');
  Logger.log('Sheet USERS: '+users.length+' akun; kunci hash tersedia: '+hasPepper);
  users.forEach(function(u){
    Logger.log('username='+u.username+'; role='+u.role+'; aktif='+sosproUserActive_(u.active)+
      '; rawActive='+JSON.stringify(u.active)+'; hashTersedia='+!!u.passwordHash+
      '; saltTersedia='+!!u.salt+'; sesiTersedia='+!!u.sessionVersion);
  });
  return {jumlahAkun:users.length,pepperAda:hasPepper};
}
/** Uji kredensial langsung di Apps Script, bila website tetap gagal.
 * Isi TEST_USERNAME dan TEST_PASSWORD sementara di Script Properties, lalu jalankan.
 * Password percobaan dihapus di akhir. Log tidak pernah mencetak password/hash.
 */
function ujiLoginSospro(){
  var props=PropertiesService.getScriptProperties();
  var username=String(props.getProperty('TEST_USERNAME')||'').trim().toLowerCase();
  var password=props.getProperty('TEST_PASSWORD');
  try{
    if(!username||!password)throw new Error('Isi TEST_USERNAME dan TEST_PASSWORD di Script Properties sebelum menjalankan ujiLoginSospro.');
    var found=oAuthenticateOffice_({username:username,password:password});
    Logger.log('Tes login backend: '+(found?'BERHASIL':'DITOLAK')+' untuk username '+username+'.');
    return {berhasil:!!found};
  }finally{
    props.deleteProperty('TEST_USERNAME');
    props.deleteProperty('TEST_PASSWORD');
  }
}
/** Penambahan banner baru hanya jika slot tersedia; banner existing tidak dihapus. */
function setupSosproSlides_(){
  var row=oRows_(O_NAMES.LANDING).find(function(r){return r.key==='homepage'});
  if(!row)return 'Konten default website menampilkan dua foto baru. Belum ada kustomisasi Sheet.';
  var cfg;try{cfg=JSON.parse(row.valueJson)}catch(e){return 'Data landing tidak valid, perbaiki melalui Dashboard';}
  if(!Array.isArray(cfg.banners))return 'Konfigurasi banner belum tersedia';
  var incoming=[
   {id:'uin-slide-2',eyebrow:'JELAJAH UIN SUNAN KALIJAGA',title:'Temukan Masa Depanmu di UIN Suka.',description:'Kenali kampus, pilihan studi, dan peluang pendidikan melalui SosPro UIN Sunan Kalijaga.',imageUrl:'https://link.uin-suka.ac.id/theme/web/slide/s-uin2.jpg',ctaLabel:'Jelajahi Program Studi',ctaHref:'/program-studi'},
   {id:'masjid-sunan-kalijaga',eyebrow:'KAMPUS YOGYAKARTA',title:'Bertumbuh dalam Ilmu, Berkarya untuk Sesama.',description:'Kenali lingkungan akademik UIN Sunan Kalijaga dan kegiatan Sosialisasi & Promosi.',imageUrl:'/masjid-sunan-kalijaga.jpg',ctaLabel:'Lihat Kegiatan Sospro',ctaHref:'/kegiatan'}
  ];
  var added=0;
  incoming.forEach(function(b){
    if(cfg.banners.some(function(x){return x.imageUrl===b.imageUrl}))return;
    if(cfg.banners.length<4){cfg.banners.push(b);added++}
  });
  if(added){row.valueJson=JSON.stringify(cfg);row.updatedAt=oTime_();row.updatedBy='setupSospro';oUpdate_(O_NAMES.LANDING,row._row,row)}
  return added+' banner ditambahkan; jika sudah 4 banner, tambahkan manual melalui Landing Page Manager.';
}

/** MENU BAHAN SOSPRO. Disimpan di BAHAN_SOSPRO dan file privat di Drive. */
function oMaterialView_(r){return {id:r.id,title:r.title,category:r.category,description:r.description,fileName:r.fileName,mime:r.mime,size:Number(r.size||0),hasFile:!!r.fileId,externalUrl:r.externalUrl,published:r.published==='true',createdAt:r.createdAt,updatedAt:r.updatedAt};}
function oListMaterials_(admin){return oRows_(O_NAMES.MATERIALS).filter(function(r){return r.deleted!=='true' && (admin || r.published==='true')}).reverse().map(oMaterialView_);}
function oSaveMaterial_(data,actor){return oWithLock_(function(){
  data=data||{};
  var title=oClean_(data.title,160),category=oClean_(data.category,80),description=oClean_(data.description,1200);
  if(!title||!category)throw new Error('Judul dan kategori wajib diisi');
  var externalUrl=oClean_(data.externalUrl,1000);
  if(externalUrl && !/^https:\/\/[^\s<>"]+$/i.test(externalUrl))throw new Error('Tautan harus dimulai dengan https://');
  var id=oClean_(data.id||'',80);
  var previous=id?oRows_(O_NAMES.MATERIALS).find(function(r){return r.id===id && r.deleted!=='true'}):null;
  if(id&&!previous)throw new Error('Materi tidak ditemukan');
  if(!id)id='MAT-'+Utilities.getUuid().slice(0,12).toUpperCase();
  var obj=previous||{id:id,createdAt:oTime_(),fileId:'',fileName:'',mime:'',size:'',deleted:'false'};
  var file=data.file;
  if(file){
    var allowed=['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/zip'];
    if(allowed.indexOf(String(file.mime))===-1)throw new Error('Format berkas tidak didukung');
    var filename=oClean_(file.name,160);
    if(!filename)throw new Error('Nama file kosong');
    var bytes=Utilities.base64Decode(String(file.data||''));
    if(!bytes.length||bytes.length>3000000)throw new Error('Ukuran file maksimal 3 MB');
    if(file.mime==='application/pdf' && !(bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70))throw new Error('Berkas bukan PDF valid');
    if(file.mime==='image/png' && !(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71))throw new Error('Berkas bukan PNG valid');
    if(file.mime==='image/jpeg' && !(bytes[0]===255&&bytes[1]===216))throw new Error('Berkas bukan JPG valid');
    if(['application/zip','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].indexOf(file.mime)!==-1 && !(bytes[0]===80&&bytes[1]===75))throw new Error('Berkas ZIP/Office tidak valid');
    var folder=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID'));
    var saved=folder.createFile(Utilities.newBlob(bytes,file.mime,id+'-'+filename));
    saved.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
    obj.fileId=saved.getId();obj.fileName=filename;obj.mime=String(file.mime);obj.size=String(bytes.length);
  }
  if(!obj.fileId && !externalUrl)throw new Error('Unggah berkas atau masukkan tautan HTTPS');
  obj.title=title;obj.category=category;obj.description=description;obj.externalUrl=externalUrl;obj.published=data.published===true?'true':'false';obj.updatedAt=oTime_();obj.deleted='false';
  if(previous)oUpdate_(O_NAMES.MATERIALS,previous._row,obj);else oAppend_(O_NAMES.MATERIALS,obj);
  oLog_(id,actor.name+' ('+actor.username+')',previous?'MATERIAL_UPDATED':'MATERIAL_ADDED',title);
  return oMaterialView_(obj);
})}
function oDeleteMaterial_(data,actor){return oWithLock_(function(){
  var id=oClean_(data && data.id,80);
  var r=oRows_(O_NAMES.MATERIALS).find(function(m){return m.id===id && m.deleted!=='true'});
  if(!r)throw new Error('Materi tidak ditemukan');
  r.deleted='true';r.published='false';r.updatedAt=oTime_();oUpdate_(O_NAMES.MATERIALS,r._row,r);
  oLog_(id,actor.name+' ('+actor.username+')','MATERIAL_REMOVED',r.title);
  return {id:id,deleted:true};
})}
function oGetMaterialFile_(b){
  var id=oClean_(b.id,80);
  var r=oRows_(O_NAMES.MATERIALS).find(function(x){return x.id===id&&x.deleted!=='true'});
  if(!r||!r.fileId)throw new Error('File bahan tidak ditemukan');
  if(r.published!=='true')oCheckActor_(b.actor,'admin');
  var f=DriveApp.getFileById(r.fileId),bytes=f.getBlob().getBytes();
  if(bytes.length>3200000)throw new Error('File melebihi batas unduh');
  return {name:r.fileName,mime:r.mime,base64:Utilities.base64Encode(bytes)};
}


/** LANDING PAGE MANAGER: administrasi konten + gambar publik dalam folder privat. */
function oGetLanding_(){
  var row=oRows_(O_NAMES.LANDING).find(function(r){return r.key==='homepage'});
  if(!row)return null;
  try{return JSON.parse(row.valueJson)}catch(e){throw new Error('Konfigurasi LANDING_PAGE bukan JSON valid')}
}
function oLandingUrl_(v,isImage){
  if(typeof v!=='string'||v.length>1000)throw new Error('URL tidak valid');
  if(isImage && ((v==='/campus-illustration.svg'||v==='/masjid-sunan-kalijaga.jpg')||/^\/api\/public\/landing\/image\?id=IMG-[A-F0-9]{12}$/.test(v)))return v;
  if(!isImage && v.charAt(0)==='/' && v.charAt(1)!=='/' && !/[\\<>"']/.test(v))return v;
  if(/^https:\/\/[^\s<>"']+$/i.test(v))return v;
  throw new Error('Gunakan URL HTTPS atau jalur internal yang valid');
}
function oLandingString_(v,max){if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw new Error('Teks harus 1–'+max+' karakter');return v.trim()}
function oSaveLanding_(d,actor){return oWithLock_(function(){
  if(!d||!Array.isArray(d.banners)||d.banners.length<1||d.banners.length>4||!Array.isArray(d.gallery)||d.gallery.length<1||d.gallery.length>8)throw new Error('Masukkan 1–4 banner dan 1–8 foto galeri');
  var out={announcement:oLandingString_(d.announcement,230),announcementHref:oLandingUrl_(d.announcementHref,false),instagramTitle:oLandingString_(d.instagramTitle,90)};
  out.banners=d.banners.map(function(b,i){return {id:'banner-'+i,eyebrow:oLandingString_(b.eyebrow,90),title:oLandingString_(b.title,100),description:oLandingString_(b.description,260),imageUrl:oLandingUrl_(b.imageUrl,true),ctaLabel:oLandingString_(b.ctaLabel,50),ctaHref:oLandingUrl_(b.ctaHref,false)}});
  out.gallery=d.gallery.map(function(g,i){return {id:'gallery-'+i,title:oLandingString_(g.title,100),category:oLandingString_(g.category,40),imageUrl:oLandingUrl_(g.imageUrl,true)}});
  var raw=JSON.stringify(out);if(raw.length>12000)throw new Error('Konfigurasi landing page terlalu panjang');
  var row=oRows_(O_NAMES.LANDING).find(function(r){return r.key==='homepage'});
  var obj={key:'homepage',valueJson:raw,updatedAt:oTime_(),updatedBy:actor.username};
  if(row)oUpdate_(O_NAMES.LANDING,row._row,obj);else oAppend_(O_NAMES.LANDING,obj);
  oLog_('LANDING',actor.name+' ('+actor.username+')','LANDING_UPDATED','Konten landing page diperbarui');return out;
})}
function oUploadLandingImage_(f,actor){return oWithLock_(function(){
  if(!f||typeof f.name!=='string'||!f.name.trim()||f.name.length>160||['image/png','image/jpeg','image/webp'].indexOf(f.mime)===-1)throw new Error('Gambar harus PNG, JPG, atau WebP');
  var bytes=Utilities.base64Decode(String(f.data||''));
  if(bytes.length<10||bytes.length>1500000)throw new Error('Gambar maksimal 1,5 MB');
  if(f.mime==='image/png' && !(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71))throw new Error('Berkas bukan PNG');
  if(f.mime==='image/jpeg' && !(bytes[0]===255&&bytes[1]===216))throw new Error('Berkas bukan JPG');
  if(f.mime==='image/webp' && !(bytes[0]===82&&bytes[1]===73&&bytes[2]===70&&bytes[3]===70&&bytes[8]===87&&bytes[9]===69))throw new Error('Berkas bukan WebP');
  var id='IMG-'+Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();
  var folder=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID'));
  var file=folder.createFile(Utilities.newBlob(bytes,f.mime,id+'-'+oClean_(f.name,160)));
  file.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
  oAppend_(O_NAMES.LANDING_ASSETS,{id:id,fileId:file.getId(),mime:f.mime,name:oClean_(f.name,160),createdAt:oTime_(),actor:actor.username});
  return {id:id,url:'/api/public/landing/image?id='+id};
})}
function oGetLandingImage_(id){
  id=oClean_(id,24);
  if(!/^IMG-[A-F0-9]{12}$/.test(id))throw new Error('ID tidak valid');
  var asset=oRows_(O_NAMES.LANDING_ASSETS).find(function(r){return r.id===id});
  if(!asset)throw new Error('Gambar tidak tersedia');
  var f=DriveApp.getFileById(asset.fileId),bytes=f.getBlob().getBytes();
  if(bytes.length>1600000)throw new Error('Gambar terlalu besar');
  return {mime:asset.mime,base64:Utilities.base64Encode(bytes)};
}
