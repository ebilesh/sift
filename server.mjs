import http from 'node:http';
import {readdir,lstat,open,realpath} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const defaultRoot=process.env.DOWNLOADS_DIR||path.join(os.homedir(),'Downloads');
function decode(id){if(!id)return '';const rel=Buffer.from(id,'base64url').toString();if(path.isAbsolute(rel)||rel.split(/[\\/]/).includes('..')||rel.includes('\0'))throw Error('Invalid path');return rel;}
async function safePath(root,rel){const base=await realpath(root);const target=await realpath(path.resolve(base,rel));if(target!==base&&!target.startsWith(base+path.sep))throw Error('Outside Downloads');return target;}
export async function listFiles(root,relative=''){
 const dir=await safePath(root,relative);const names=await readdir(dir,{withFileTypes:true});
 return (await Promise.all(names.filter(x=>!x.name.startsWith('.')&&!(relative===''&&x.name==='downloads-os')&&!x.isSymbolicLink()).map(async x=>{try{const rel=path.join(relative,x.name);const s=await lstat(path.join(dir,x.name));if(s.isSymbolicLink())return null;return {id:Buffer.from(rel).toString('base64url'),name:x.name,size:s.size,modified:s.mtime.toISOString(),created:s.birthtime.toISOString(),folder:s.isDirectory(),ext:path.extname(x.name).slice(1).toLowerCase()};}catch{return null;}}))).filter(Boolean).sort((a,b)=>b.modified.localeCompare(a.modified));
}
export function createHandler(root=defaultRoot){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try{
 if(req.headers?.host&&!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host)){res.writeHead(403);return res.end('Local requests only');}
 const u=new URL(req.url,'http://localhost');
 if(req.method!=='GET'){res.writeHead(405);return res.end('Read-only API');}
 if(u.pathname==='/api/files'){const rel=decode(u.searchParams.get('dir'));res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({files:await listFiles(root,rel),source:'local',path:rel||'Downloads'}));}
 if(u.pathname==='/api/duplicates'){
 const relative=decode(u.searchParams.get('dir'));const files=(await listFiles(root,relative)).filter(f=>!f.folder);const buckets=new Map();for(const f of files){const a=buckets.get(f.size)||[];a.push(f);buckets.set(f.size,a);}
 const groups=[];for(const bucket of buckets.values()){if(bucket.length<2)continue;const hashes=new Map();for(const f of bucket){const hash=crypto.createHash('sha256');const file=await safePath(root,decode(f.id));for await(const chunk of createReadStream(file))hash.update(chunk);const key=hash.digest('hex');const a=hashes.get(key)||[];a.push(f.id);hashes.set(key,a);}for(const ids of hashes.values())if(ids.length>1)groups.push(ids);}
 res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({groups}));
 }
 if(u.pathname==='/api/preview'){
 const relative=decode(u.searchParams.get('id'));if(!relative){res.writeHead(404);return res.end('File unavailable');}
 const filename=await safePath(root,relative);const s=await lstat(filename);if(!s.isFile()){res.writeHead(404);return res.end('File unavailable');}
 const ext=path.extname(filename).slice(1).toLowerCase();const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',pdf:'application/pdf',txt:'text/plain',csv:'text/plain',py:'text/plain',md:'text/plain',json:'text/plain'};
 if(!types[ext]){res.writeHead(415);return res.end('Preview unavailable for this format');}
 res.setHeader('Content-Type',types[ext]);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");
 if(types[ext]==='text/plain'){const handle=await open(filename,'r');try{const buf=Buffer.alloc(64000);const {bytesRead}=await handle.read(buf,0,64000,0);return res.end(buf.subarray(0,bytesRead));}finally{await handle.close();}}
 await pipeline(createReadStream(filename),res);return;
 }
 res.writeHead(404);res.end('Not found');
 }catch{if(!res.headersSent){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Could not read Downloads. Check directory access and retry.'}));}else if(!res.destroyed){res.destroy();}}
};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=http.createServer(createHandler());
 server.on('error',e=>{console.error(`Cannot start read-only API: ${e.message}`);process.exitCode=1;});
 server.listen(4318,'127.0.0.1',()=>console.log('Read-only Downloads API: http://127.0.0.1:4318'));
}
