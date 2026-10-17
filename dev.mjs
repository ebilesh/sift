import {spawn} from 'node:child_process';
const children=[spawn(process.execPath,['server.mjs'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit'})];
for(const c of children){c.on('error',error=>{console.error(error.message);children.forEach(child=>child.kill());process.exitCode=1;});c.on('exit',code=>{if(code){children.filter(child=>child!==c).forEach(child=>child.kill());process.exitCode=code;}});}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{children.forEach(c=>c.kill(signal));process.exit();});
