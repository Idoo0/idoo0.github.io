import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPortfolioServer} from './admin/server.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||8765);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid port.');
const server=createPortfolioServer({root});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} sudah digunakan. Tutup server lama atau jalankan dengan PORT lain.`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Portfolio: http://127.0.0.1:${port}/\nAdmin: http://127.0.0.1:${port}/admin/\nSave menulis langsung ke data/*.json.`));
