#!/usr/bin/env node
import crypto from "node:crypto";
import readline from "node:readline";
const [username,role,name] = process.argv.slice(2);
if(!username||!['admin','pejabat'].includes(role)||!name){console.error('Penggunaan: node scripts/create-office-user.mjs username admin|pejabat "Nama Lengkap"');process.exit(1)}
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
// Read raw terminal keys so password does not echo on an interactive console.
async function getPassword(){if(!process.stdin.isTTY)return new Promise(resolve=>rl.question('Password: ',resolve));
 rl.close();return new Promise(resolve=>{const stdin=process.stdin;let pw='';process.stdout.write('Password (tidak ditampilkan): ');stdin.setRawMode(true);stdin.resume();stdin.setEncoding('utf8');const onData=(key)=>{if(key==='\r'||key==='\n'){stdin.setRawMode(false);stdin.off('data',onData);process.stdout.write('\n');stdin.pause();resolve(pw)}else if(key==='\u0003'){stdin.setRawMode(false);process.exit(130)}else if(key==='\u007f'){pw=pw.slice(0,-1)}else{pw+=key}};stdin.on('data',onData)})}
const password=await getPassword();
if(password.length<12){console.error('Password wajib minimal 12 karakter');process.exit(1)}
const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex');
console.log('\nSalin OBJEK berikut ke ARRAY OFFICE_USERS_JSON di Netlify (pisahkan dengan koma jika lebih dari satu akun):');
console.log(JSON.stringify({username,name,role,passwordHash:`scrypt:${salt}:${hash}`},null,2));
