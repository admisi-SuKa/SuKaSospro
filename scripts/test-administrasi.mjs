// Tests the materials backend's role/publication, editing and archive logic without a live Google account.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const source=fs.readFileSync(new URL('../apps-script-administrasi/Code.gs',import.meta.url),'utf8');
const records={BAHAN_SOSPRO:[],RIWAYAT_STATUS:[]}, files=new Map();
const mock={
 Utilities:{getUuid:()=>crypto.randomUUID(),base64Decode:s=>Array.from(Buffer.from(s,'base64')),base64Encode:a=>Buffer.from(a).toString('base64'),newBlob:(bytes,mime,name)=>({bytes,mime,name})},
 DriveApp:{Access:{PRIVATE:'private'},Permission:{NONE:'none'},getFolderById:()=>({createFile:blob=>{const id=crypto.randomUUID();files.set(id,blob);return{getId:()=>id,setSharing:()=>{}}}}),getFileById:id=>({getBlob:()=>({getBytes:()=>files.get(id).bytes})})},
 console
};
vm.createContext(mock);vm.runInContext(source,mock);
mock.oWithLock_=fn=>fn();
mock.oRows_=name=>records[name].map((r,i)=>({...r,_row:i+2}));
mock.oAppend_=(name,obj)=>{records[name].push({...obj})};
mock.oUpdate_=(name,row,obj)=>{records[name][row-2]={...obj}};
mock.oLog_=(id,actor,status,note)=>records.RIWAYAT_STATUS.push({id,actor,status,note});
mock.PropertiesService={getScriptProperties:()=>({getProperty:()=> 'mock-drive'})};
const admin={username:'admin',name:'Admisi',role:'admin'};
const png=Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');
const m=mock.oSaveMaterial_({title:'Brosur Penerimaan',category:'Brosur',description:'Uji katalog',externalUrl:'',published:false,file:{name:'brosur.png',mime:'image/png',data:png}},admin);
assert.equal(m.published,false);
assert.equal(mock.oListMaterials_(false).length,0);
assert.equal(mock.oListMaterials_(true).length,1);
assert.throws(()=>mock.oGetMaterialFile_({id:m.id}),/Identitas petugas tidak sah/);
const pub=mock.oSaveMaterial_({id:m.id,title:'Brosur Penerimaan 2026',category:'Brosur',description:'Revisi',externalUrl:'',published:true},admin);
assert.equal(pub.published,true);
assert.equal(mock.oListMaterials_(false)[0].title,'Brosur Penerimaan 2026');
const dl=mock.oGetMaterialFile_({id:m.id});assert.equal(dl.mime,'image/png');assert.equal(dl.base64,png);
mock.oDeleteMaterial_({id:m.id},admin);
assert.equal(mock.oListMaterials_(false).length,0);assert.equal(mock.oListMaterials_(true).length,0);
assert.throws(()=>mock.oGetMaterialFile_({id:m.id}),/tidak ditemukan/);
console.log('OK: draft/private, publish, edit, download, soft delete and role checks');
