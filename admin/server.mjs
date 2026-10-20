import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {collections,validateCollection} from './schema.js';
import {imagePolicies,maxWebpBytes} from './image-policy.js';
import {webpDimensions} from './webp.mjs';
import {fetchGithubPreview} from './github-preview.mjs';
import {maxCvBytes} from './documents.js';

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf','.ico':'image/x-icon','.woff2':'font/woff2'};
const revision = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail=(status,message,details=[])=>Object.assign(new Error(message),{status,details});
const json=(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));};

export function createPortfolioServer({root,githubPreview=fetchGithubPreview}) {
  const base=path.resolve(root);
  const locks=new Map();
  const save=async(name,payload)=>{
    const previous=locks.get(name)||Promise.resolve();
    const task=previous.catch(()=>{}).then(async()=>{
      const filename=path.join(base,'data',name+'.json');
      const current=await fs.readFile(filename);
      if(payload.revision!==revision(current))throw fail(409,'File berubah sejak dibuka. Muat ulang data sebelum menyimpan.');
      const errors=validateCollection(name,payload.data);
      if(errors.length)throw fail(400,'Data belum valid.',errors);
      const content=JSON.stringify(payload.data,null,2)+'\n';
      const backup=path.join(base,'admin','.backups');
      await fs.mkdir(backup,{recursive:true});
      await fs.writeFile(path.join(backup,name+'.json'),current);
      const temporary=path.join(base,'data',`.${name}.${crypto.randomUUID()}.tmp`);
      try {await fs.writeFile(temporary,content,{flag:'wx'});await fs.rename(temporary,filename);}
      finally {await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
      return {data:payload.data,revision:revision(content),savedAt:new Date().toISOString()};
    });
    locks.set(name,task);
    try{return await task;}finally{if(locks.get(name)===task)locks.delete(name);}
  };
  return http.createServer(async(req,res)=>{
    let pageRequest=false;
    try {
      const address=new URL(`http://${req.headers.host||'invalid'}`);
      if(!['127.0.0.1','localhost','[::1]'].includes(address.hostname))throw fail(403,'Server ini hanya untuk localhost.');
      if(req.headers.origin&&req.headers.origin!==address.origin)throw fail(403,'Origin tidak diizinkan.');
      if(req.headers['sec-fetch-site']==='cross-site')throw fail(403,'Request lintas situs tidak diizinkan.');
      const url=new URL(req.url,address);
      if(url.pathname.startsWith('/admin/api/')) {
        if (url.pathname==='/admin/api/documents/contact/cv') {
          if (req.method!=='POST') throw fail(405,'Metode tidak didukung.');
          if (req.headers['content-type']?.split(';')[0]!=='application/pdf') throw fail(415,'Gunakan file CV berformat PDF.');
          const originalName=url.searchParams.get('filename')||'CV.pdf';
          if (originalName.length>180 || /[\\/\x00-\x1f\x7f]/.test(originalName) || !/\.pdf$/i.test(originalName)) throw fail(400,'Nama file CV harus berakhiran .pdf tanpa path folder.');
          const chunks=[];let size=0;
          for await (const chunk of req) {size+=chunk.length;if (size>maxCvBytes) throw fail(413,'Ukuran CV maksimal 25 MB.');chunks.push(chunk);}
          const bytes=Buffer.concat(chunks);
          if (!/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(bytes.subarray(0,10).toString('ascii')) || !/%%EOF[ \t\r\n]*$/.test(bytes.subarray(-1024).toString('ascii'))) throw fail(400,'File tidak dapat dikenali sebagai PDF.');
          const directory=path.join(base,'assets','documents');
          await fs.mkdir(directory,{recursive:true});
          const filename=`cv-${crypto.randomUUID()}.pdf`;
          await fs.writeFile(path.join(directory,filename),bytes,{flag:'wx'});
          return json(res,201,{path:`assets/documents/${filename}`,filename:originalName,bytes:bytes.length});
        }
        if (url.pathname==='/admin/api/github-preview') {
          if (req.method!=='GET') throw fail(405,'Metode tidak didukung.');
          return json(res,200,await githubPreview(url.searchParams.get('url')));
        }
        const imageMatch=url.pathname.match(/^\/admin\/api\/images\/([a-z]+)\/([a-zA-Z]+)$/);
        if (imageMatch) {
          const [,name,field]=imageMatch,policy=Object.hasOwn(imagePolicies,name)&&Object.hasOwn(imagePolicies[name],field)?imagePolicies[name][field]:null;
          if (!policy) throw fail(404,'Kolom gambar tidak ditemukan.');
          if (req.method!=='POST') throw fail(405,'Metode tidak didukung.');
          if (req.headers['content-type']?.split(';')[0]!=='image/webp') throw fail(415,'Upload harus diproses menjadi WebP terlebih dahulu.');
          const item=url.searchParams.get('item')||name;
          if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(item)) throw fail(400,'ID item tidak valid. Gunakan huruf, angka, dash, atau underscore.');
          const previewOf=url.searchParams.get('previewOf');
          const prefix=`${item}-${field}-`;
          if (previewOf && (!policy.preview || !previewOf.startsWith(prefix) || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.webp$/.test(previewOf.slice(prefix.length)))) throw fail(400,'Sumber thumbnail tidak valid.');
          const chunks=[];let size=0;
          for await (const chunk of req) {size+=chunk.length;if (size>maxWebpBytes) throw fail(413,'Gambar hasil pemrosesan maksimal 12 MB.');chunks.push(chunk);}
          const bytes=Buffer.concat(chunks);let dimensions;
          try {dimensions=webpDimensions(bytes);} catch(error) {throw fail(400,error.message);}
          const limits=previewOf?policy.preview:policy;
          if (dimensions.width>limits.width || dimensions.height>limits.height || policy.fit==='square'&&(dimensions.width!==policy.width || dimensions.height!==policy.height)) throw fail(400,'Dimensi gambar belum sesuai dengan kolom ini.');
          const directory=path.join(base,'assets',policy.directory);
          await fs.mkdir(directory,{recursive:true});
          if (previewOf) await fs.access(path.join(directory,previewOf));
          const filename=previewOf?previewOf.replace(/\.webp$/,'.preview.webp'):`${item}-${field}-${crypto.randomUUID()}.webp`;
          await fs.writeFile(path.join(directory,filename),bytes,{flag:'wx'});
          return json(res,201,{path:`assets/${policy.directory}/${filename}`,...dimensions,bytes:bytes.length});
        }
        const match=url.pathname.match(/^\/admin\/api\/data\/([a-z]+)$/);
        if(!match||!Object.hasOwn(collections,match[1]))throw fail(404,'Koleksi tidak ditemukan.');
        const name=match[1];
        if(req.method==='GET') {
          const content=await fs.readFile(path.join(base,'data',name+'.json'));
          return json(res,200,{data:JSON.parse(content),revision:revision(content)});
        }
        if(req.method!=='PUT')throw fail(405,'Metode tidak didukung.');
        if(!req.headers['content-type']?.startsWith('application/json'))throw fail(415,'Gunakan application/json.');
        const chunks=[];let size=0;
        for await(const chunk of req) {size+=chunk.length;if(size>2*1024*1024)throw fail(413,'Data maksimal 2 MB.');chunks.push(chunk);}
        let payload;try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail(400,'JSON tidak valid.');}
        if(!payload||typeof payload!=='object'||typeof payload.revision!=='string')throw fail(400,'Revision wajib diisi.');
        return json(res,200,await save(name,payload));
      }
      if(!['GET','HEAD'].includes(req.method))throw fail(405,'Metode tidak didukung.');
      pageRequest=Boolean(req.headers.accept?.includes('text/html'));
      if(url.pathname==='/admin') {res.writeHead(308,{Location:'/admin/'+url.search});res.end();return;}
      if(url.pathname==='/linktree') {res.writeHead(308,{Location:'/linktree/'+url.search});res.end();return;}
      let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{throw fail(400,'Path tidak valid.');}
      if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(segment=>segment.startsWith('.')))throw fail(404,'File tidak ditemukan.');
      if(pathname==='/')pathname='/index.html';
      if(pathname==='/admin'||pathname==='/admin/')pathname='/admin/index.html';
      if(pathname==='/linktree/')pathname='/linktree/index.html';
      const publicPath=pathname==='/index.html'||pathname==='/linktree/index.html'||/^\/(?:sections|assets|data)\//.test(pathname)||/^\/admin\/(?:index\.html|app\.js|access\.js|photo-order\.js|styles\.css|schema\.js|images\.js|image-policy\.js|documents\.js)$/.test(pathname);
      if(!publicPath&&pathname!=='/404.html')throw fail(404,'File tidak ditemukan.');
      const filename=path.resolve(base,'.'+pathname);
      if(!filename.startsWith(base+path.sep))throw fail(404,'File tidak ditemukan.');
      const contents=await fs.readFile(filename);
      res.writeHead(200,{'Content-Type':mime[path.extname(filename).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(req.method==='HEAD'?undefined:contents);
    } catch(error) {
      if(!res.headersSent&&pageRequest&&(error.status===404||error.code==='ENOENT'||error.code==='EISDIR')) {
        const page=await fs.readFile(path.join(base,'404.html')).catch(()=>null);
        if(page) {
          res.writeHead(404,{'Content-Type':mime['.html'],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
          res.end(req.method==='HEAD'?undefined:page);
          return;
        }
      }
      if(!res.headersSent)json(res,error.status||(error.code==='ENOENT'||error.code==='EISDIR'?404:500),{error:error.status?error.message:error.code==='ENOENT'||error.code==='EISDIR'?'File tidak ditemukan.':'Server tidak dapat memproses request.',details:error.details||[]});
      else res.end();
    }
  });
}
