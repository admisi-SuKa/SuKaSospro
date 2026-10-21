// End-to-end logic simulation of the unified Apps Script backend (no Google credentials).
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const code=fs.readFileSync(new URL('../apps-script/Code.gs',import.meta.url),'utf8');
for(const name of ['doPost','doGet','setupSospro'])assert.equal((code.match(new RegExp(`function ${name}\\s*\\(`,'g'))||[]).length,1);
const p=new Map([['SHEET_ID','SHEET_TEST'],['DRIVE_FOLDER_ID','FOLDER_TEST'],['ADMIN_USERNAME','adminadmisi'],['ADMIN_PASSWORD','PasswordAwalUji2026'],['ADMIN_NAME','Admin SosPro']]);
const records={USERS:[],LANDING_PAGE:[]};
const authCache=new Map();
const property={getProperty:key=>p.get(key)||'',setProperty:(key,v)=>p.set(key,String(v)),deleteProperty:key=>p.delete(key)};
const sandbox={
 PropertiesService:{getScriptProperties:()=>property},
 SpreadsheetApp:{openById:id=>{assert.equal(id,'SHEET_TEST');return {getName:()=> 'Spreadsheet Sospro'}}},
 DriveApp:{getFolderById:id=>{assert.equal(id,'FOLDER_TEST');return {getName:()=> 'Folder Sospro'}}},
 ContentService:{MimeType:{JSON:'json'},createTextOutput:value=>({setMimeType:()=>({value})})},
 CacheService:{getScriptCache:()=>({get:k=>authCache.get(k)||null,put:(k,v)=>authCache.set(k,v),remove:k=>authCache.delete(k)})},
 Logger:{log:()=>{}},
 Utilities:{getUuid:()=>crypto.randomUUID(),computeHmacSha256Signature:(m,k)=>Array.from(crypto.createHmac('sha256',k).update(m).digest()),base64Encode:bytes=>Buffer.from(bytes).toString('base64'),computeDigest:(_a,s)=>Array.from(crypto.createHash('sha256').update(s).digest()),DigestAlgorithm:{SHA_256:'sha256'}},
 console,
};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
sandbox.setupKegiatan_=()=>({ok:true});
sandbox.setupAdministrasi_=()=> 'ok';
sandbox.oRows_=name=>(records[name]||[]).map((x,i)=>({...x,_row:i+2}));
sandbox.oAppend_=(name,obj)=>{(records[name]??=[]).push({...obj})};
sandbox.oUpdate_=(name,row,obj)=>{records[name][row-2]={...obj}};
sandbox.oWithLock_=fn=>fn();
const result=sandbox.setupSospro();
assert.equal(result.ok,true);
assert.equal(result.sheets.length,10);
assert.equal(records.USERS.length,1);
assert.equal(records.USERS[0].username,'adminadmisi');
assert.equal(records.USERS[0].active,'true');
assert.equal(records.USERS[0].role,'admin');
assert.ok(records.USERS[0].passwordHash.length>20);
assert.ok(!JSON.stringify(records.USERS[0]).includes('PasswordAwalUji2026'));
assert.equal(p.has('ADMIN_PASSWORD'),false);
assert.ok(p.get('USER_PEPPER').length>=32);
assert.ok(p.get('API_SECRET').length>=32);
assert.equal(sandbox.setupSospro().sheets.length,10);
assert.equal(records.USERS.length,1);
records.LANDING_PAGE.push({key:'homepage',valueJson:JSON.stringify({announcement:'Ada pengumuman',announcementHref:'/program-studi',instagramTitle:'Kabar Admisi',gallery:[],banners:[{id:'old',imageUrl:'/campus-illustration.svg'},{id:'old2',imageUrl:'https://example.org/old.jpg'}]}),updatedAt:'',updatedBy:'admin'});
const migrated=sandbox.setupSospro();
assert.equal(migrated.sheets.length,10);
const newSlides=JSON.parse(records.LANDING_PAGE[0].valueJson).banners;
assert.equal(newSlides.length,4);
assert.ok(newSlides.some(b=>b.imageUrl==='https://link.uin-suka.ac.id/theme/web/slide/s-uin2.jpg'));
assert.ok(newSlides.some(b=>b.imageUrl==='/masjid-sunan-kalijaga.jpg'));
assert.equal(records.USERS.length,1);
const dispatch=(body)=>JSON.parse(sandbox.doPost({postData:{contents:JSON.stringify(body)}}).value);
let r=dispatch({action:'authOffice',secret:p.get('API_SECRET'),username:'adminadmisi',password:'PasswordAwalUji2026'});
assert.equal(r.ok,true);assert.equal(r.data.role,'admin');
const actor=r.data;
assert.ok(actor.sessionVersion);
assert.ok(!JSON.stringify(r).includes('passwordHash'));
assert.ok(!JSON.stringify(r).includes('salt'));
assert.ok(!JSON.stringify(r).includes('USER_PEPPER'));
r=dispatch({action:'authOffice',secret:p.get('API_SECRET'),username:'adminadmisi',password:'wrong'});
assert.equal(r.ok,true);assert.equal(r.data,null);
r=dispatch({action:'authOffice',secret:'wrong',username:'adminadmisi',password:'PasswordAwalUji2026'});
assert.equal(r.ok,false);
sandbox.listEvents_=()=>[{id:'EVT-1',status:'draft'}];
r=dispatch({action:'listAdminEvents',secret:p.get('API_SECRET'),actor});
assert.equal(r.ok,true);
r=dispatch({action:'listAdminEvents',secret:p.get('API_SECRET'),actor:{...actor,sessionVersion:'bad'}});
assert.equal(r.ok,false);
p.set('RESET_USERNAME','adminadmisi');p.set('RESET_PASSWORD','PasswordBaruUji2026');
sandbox.resetPasswordSospro();
assert.equal(p.has('RESET_PASSWORD'),false);
assert.notEqual(records.USERS[0].sessionVersion,actor.sessionVersion);
r=dispatch({action:'authOffice',secret:p.get('API_SECRET'),username:'adminadmisi',password:'PasswordAwalUji2026'});
assert.equal(r.data,null);
r=dispatch({action:'authOffice',secret:p.get('API_SECRET'),username:'adminadmisi',password:'PasswordBaruUji2026'});
assert.equal(r.data.role,'admin');
r=dispatch({action:'listAdminEvents',secret:p.get('API_SECRET'),actor});
assert.equal(r.ok,false);
p.set('NEW_USERNAME','kepalaadmisi');p.set('NEW_PASSWORD','PasswordPejabat2026');p.set('NEW_NAME','Pejabat Penandatangan');p.set('NEW_ROLE','pejabat');
sandbox.tambahUserSospro();
assert.equal(records.USERS.length,2);assert.equal(p.has('NEW_PASSWORD'),false);
r=dispatch({action:'authOffice',secret:p.get('API_SECRET'),username:'kepalaadmisi',password:'PasswordPejabat2026'});
assert.equal(r.data.role,'pejabat');
assert.ok(!p.has('ADMIN_PASSWORD'));
assert.equal(JSON.parse(sandbox.doGet().value).ok,true);
console.log('PASS: 10 sheets, init admin, hashed credentials, server login, session revocation, reset password, new official, admin access controls');
