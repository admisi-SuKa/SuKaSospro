import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const code=fs.readFileSync(new URL('../apps-script/Code.gs',import.meta.url),'utf8');
assert.equal((code.match(/function doPost\s*\(/g)||[]).length,1);
assert.equal((code.match(/function doGet\s*\(/g)||[]).length,1);
assert.equal((code.match(/function setupSospro\s*\(/g)||[]).length,1);
const p=new Map([['SHEET_ID','SHEET_TEST'],['DRIVE_FOLDER_ID','FOLDER_TEST']]);
const property={getProperty:(key)=>p.get(key)||'',setProperty:(key,value)=>p.set(key,String(value))};
const sandbox={
  PropertiesService:{getScriptProperties:()=>property},
  SpreadsheetApp:{openById:(id)=>{assert.equal(id,'SHEET_TEST');return {getName:()=> 'Spreadsheet Sospro'}}},
  DriveApp:{getFolderById:(id)=>{assert.equal(id,'FOLDER_TEST');return {getName:()=> 'Folder Sospro'}}},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:(value)=>({setMimeType:()=>({value})})},
  Logger:{log:()=>{}},
  Utilities:{getUuid:()=>crypto.randomUUID()},
  console,
};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
sandbox.setupKegiatan_=()=>({ok:true});
sandbox.setupAdministrasi_=()=> 'ok';
const result=sandbox.setupSospro();
assert.equal(result.ok,true);
assert.equal(result.sheets.length,9);
assert.ok(p.get('API_SECRET').length>=32);
const dispatch=(body)=>JSON.parse(sandbox.doPost({postData:{contents:JSON.stringify(body)}}).value);
sandbox.listPublicEvents_=()=>[{id:'EVT-1',status:'published'}];
let r=dispatch({action:'listPublicEvents'});
assert.equal(r.ok,true);assert.equal(r.data[0].id,'EVT-1');
r=dispatch({action:'listAdminEvents'});
assert.equal(r.ok,false); assert.match(r.error,/GAS_SECRET/);
sandbox.listEvents_=()=>[{id:'EVT-1',status:'draft'}];
r=dispatch({action:'listAdminEvents',secret:p.get('API_SECRET')});
assert.equal(r.ok,true);assert.equal(r.data[0].status,'draft');
sandbox.oGetLanding_=()=>({announcement:'Sospro baru'});
r=dispatch({action:'getLanding'});assert.equal(r.ok,false);assert.match(r.error,/Autentikasi API/);
r=dispatch({action:'getLanding',secret:'incorrect'});assert.equal(r.ok,false);
r=dispatch({action:'getLanding',secret:p.get('API_SECRET')});assert.equal(r.ok,true);assert.equal(r.data.announcement,'Sospro baru');
r=dispatch({action:'unknown',secret:p.get('API_SECRET')});assert.equal(r.ok,false);
const get=JSON.parse(sandbox.doGet().value);assert.equal(get.ok,true);
console.log('PASS: setupSospro, 9 sheets, automatic API secret, one doPost/doGet, dispatch & authorization.');
