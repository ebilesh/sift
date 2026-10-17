import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,symlink,rm,readFile} from 'node:fs/promises';
import {Writable} from 'node:stream';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHandler,listFiles} from '../server.mjs';
class Response extends Writable{headers={};status=200;parts=[];setHeader(k,v){this.headers[k]=v;}writeHead(status,headers={}){this.status=status;Object.assign(this.headers,headers);} _write(c,e,cb){this.parts.push(c);cb();}get body(){return Buffer.concat(this.parts).toString();}}
async function request(handler,url,method='GET',host='127.0.0.1:4318'){const response=new Response();await handler({url,method,headers:{host}},response);if(!response.writableFinished)await new Promise(resolve=>response.on('finish',resolve));return response;}
test('read-only browsing, exact duplicates, safe previews and confinement',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'dos-test-'));try{
 await mkdir(path.join(root,'nested'));await mkdir(path.join(root,'downloads-os'));await writeFile(path.join(root,'a.txt'),'same');await writeFile(path.join(root,'b.txt'),'same');await writeFile(path.join(root,'c.txt'),'diff');await writeFile(path.join(root,'.hidden'),'private');await writeFile(path.join(root,'nested','notes.md'),'nested content');await symlink('/etc/passwd',path.join(root,'outside.txt'));
 const handler=createHandler(root);const files=await listFiles(root);assert.equal(files.length,4);assert.ok(!files.some(f=>f.name.startsWith('.')||f.name==='outside.txt'||f.name==='downloads-os'));
 const a=files.find(f=>f.name==='a.txt');const before=await readFile(path.join(root,'a.txt'),'utf8');
 const response=await request(handler,'/api/duplicates');assert.deepEqual(JSON.parse(response.body).groups[0].sort(),[a.id,files.find(f=>f.name==='b.txt').id].sort());
 const preview=await request(handler,`/api/preview?id=${a.id}`);assert.equal(preview.body,'same');assert.equal(preview.headers['Content-Type'],'text/plain');
 const nested=files.find(f=>f.name==='nested');const listing=await request(handler,`/api/files?dir=${nested.id}`);assert.equal(JSON.parse(listing.body).files[0].name,'notes.md');
 assert.equal((await request(handler,'/api/files','POST')).status,405);assert.equal((await request(handler,'/api/files','GET','evil.example')).status,403);
 const escape=Buffer.from('../outside').toString('base64url');assert.equal((await request(handler,`/api/preview?id=${escape}`)).status,500);
 const link=Buffer.from('outside.txt').toString('base64url');assert.equal((await request(handler,`/api/preview?id=${link}`)).status,500);assert.equal(await readFile(path.join(root,'a.txt'),'utf8'),before);
 }finally{await rm(root,{recursive:true,force:true});}
});
