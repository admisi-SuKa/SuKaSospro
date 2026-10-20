import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const src=fs.readFileSync(new URL('../apps-script-administrasi/Code.gs',import.meta.url),'utf8');
const rows={PERMOHONAN:[],INVENTARIS:[],RIWAYAT_STATUS:[],BAHAN_SOSPRO:[],LANDING_PAGE:[],LANDING_ASSETS:[]};
const uploads=new Map();
const sandbox={
 Utilities:{getUuid:()=>crypto.randomUUID(),base64Decode:s=>Array.from(Buffer.from(s,'base64')),base64Encode:x=>Buffer.from(x).toString('base64'),newBlob:(bytes,mime,name)=>({bytes,mime,name})},
 DriveApp:{Access:{PRIVATE:'PRIVATE'},Permission:{NONE:'NONE'},getFolderById:()=>({getName:()=> 'Test Folder',createFile:blob=>{const id=crypto.randomUUID();uploads.set(id,blob);return{getId:()=>id,setSharing:()=>{}}}}),getFileById:id=>({getBlob:()=>({getBytes:()=>uploads.get(id).bytes})})},
 PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'test_drive_id'})},
 console
};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
sandbox.oWithLock_=f=>f();
sandbox.oRows_=name=>rows[name].map((x,i)=>({...x,_row:i+2}));
sandbox.oAppend_=(name,obj)=>{rows[name].push({...obj})};
sandbox.oUpdate_=(name,row,obj)=>{rows[name][row-2]={...obj}};
sandbox.oLog_=(code,actor,status,note)=>rows.RIWAYAT_STATUS.push({code,actor,status,note});
const admin={username:'admisi',name:'Admin Admisi',role:'admin'};
const content={announcement:'Halo calon mahasiswa',announcementHref:'/program-studi',instagramTitle:'Kabar Instagram',banners:[{id:'one',eyebrow:'HELLO',title:'UIN SUKA',description:'Bersama kampus',imageUrl:'/campus-illustration.svg',ctaLabel:'Masuk',ctaHref:'/layanan'}],gallery:[{id:'g',title:'Gedung kampus',category:'Galeri',imageUrl:'/campus-illustration.svg'}]};
assert.equal(sandbox.oGetLanding_(),null);
const saved=sandbox.oSaveLanding_(content,admin);
assert.equal(saved.banners[0].title,'UIN SUKA');
assert.equal(sandbox.oGetLanding_().gallery[0].title,'Gedung kampus');
sandbox.oSaveLanding_({...content,announcement:'Pesan baru'},admin);
assert.equal(rows.LANDING_PAGE.length,1);
assert.equal(sandbox.oGetLanding_().announcement,'Pesan baru');
assert.throws(()=>sandbox.oSaveLanding_({...content,announcementHref:'javascript:alert(1)'},admin),/URL/);
assert.throws(()=>sandbox.oSaveLanding_({...content,banners:[]},admin),/banner/);
assert.throws(()=>sandbox.oSaveLanding_({...content,gallery:[{...content.gallery[0],imageUrl:'data:text/html;base64,X'}]},admin),/URL/);
const png=Buffer.from([137,80,78,71,13,10,26,10,10,10]);
const upl=sandbox.oUploadLandingImage_({name:'foto.png',mime:'image/png',data:png.toString('base64')},admin);
assert.match(upl.url,/^\/api\/public\/landing\/image\?id=IMG-[A-F0-9]{12}$/);
const image=sandbox.oGetLandingImage_(upl.id);
assert.equal(image.mime,'image/png');
assert.equal(image.base64,png.toString('base64'));
assert.throws(()=>sandbox.oGetLandingImage_('IMG-AABBCCDDEEFF'),/tersedia/);
assert.throws(()=>sandbox.oUploadLandingImage_({name:'bad.jpg',mime:'image/jpeg',data:png.toString('base64')},admin),/bukan JPG/);
assert.equal(rows.LANDING_ASSETS.length,1);
console.log('PASS: landing get/save/update, URL validation, gallery/banner limits, image upload and public read by approved ID');
