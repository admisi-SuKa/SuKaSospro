/**
 * SISTEM ADMINISTRASI SOSPRO + PEMINJAMAN ALAT
 * Deploy SEBAGAI PROYEK APPS SCRIPT TERPISAH dari apps-script/Code.gs lama.
 * Project Settings > Script properties: SHEET_ID, DRIVE_FOLDER_ID, API_SECRET.
 * Jalankan setupAdministrasi() sekali sebelum deployment Web App.
 * Deploy Web App: Execute as = Me; Who has access = Anyone.
 * Semua pemanggilan melalui route SERVER Next.js dengan API_SECRET, BUKAN langsung dari browser.
 */
var O_NAMES = { REQUESTS:'PERMOHONAN', INVENTORY:'INVENTARIS', LOG:'RIWAYAT_STATUS', MATERIALS:'BAHAN_SOSPRO', LANDING:'LANDING_PAGE', LANDING_ASSETS:'LANDING_ASSETS' };
var O_HEADERS = {
  PERMOHONAN:['code','tokenHash','kind','name','institution','faculty','school','phone','email','purpose','target','location','dateStart','dateEnd','itemId','quantity','status','note','attachmentId','signatureId','signedPdfId','createdAt','updatedAt'],
  INVENTARIS:['id','name','category','total','active','createdAt'],
  RIWAYAT_STATUS:['code','actor','status','note','time'],
  BAHAN_SOSPRO:['id','title','category','description','fileName','mime','size','fileId','externalUrl','published','deleted','createdAt','updatedAt'],
  LANDING_PAGE:['key','valueJson','updatedAt','updatedBy'],
  LANDING_ASSETS:['id','fileId','mime','name','createdAt','actor']
};
function setupAdministrasi(){
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
function doGet(){return oJson_({ok:true,message:'Admin Sospro API aktif',version:'1.0'});}
function doPost(e){
  try{
    var b=JSON.parse((e && e.postData && e.postData.contents)||'{}');
    var props=PropertiesService.getScriptProperties();
    if(!props.getProperty('API_SECRET') || String(b.secret||'')!==props.getProperty('API_SECRET')) throw new Error('Autentikasi API gagal');
    var data;
    switch(String(b.action||'')){
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
      default:throw new Error('Aksi tidak dikenali');
    }
    return oJson_({ok:true,data:data});
  } catch(err){return oJson_({ok:false,error:err&&err.message?err.message:String(err)});}
}
function oJson_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function oSpreadsheet_(){var id=PropertiesService.getScriptProperties().getProperty('SHEET_ID');if(!id)throw new Error('SHEET_ID belum diset');return SpreadsheetApp.openById(id);}
function oSheet_(name){var sh=oSpreadsheet_().getSheetByName(name);if(!sh)throw new Error('Sheet '+name+' belum ada, jalankan setupAdministrasi');return sh;}
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
function oCheckActor_(actor,role){if(!actor || !actor.username || !actor.name || ['admin','pejabat'].indexOf(actor.role)===-1)throw new Error('Identitas petugas tidak sah');if(role && actor.role!==role)throw new Error('Role tidak diizinkan')}
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
  if(isImage && (v==='/campus-illustration.svg'||/^\/api\/public\/landing\/image\?id=IMG-[A-F0-9]{12}$/.test(v)))return v;
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
