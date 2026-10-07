import {githubRepository} from '../assets/js/github-repo-data.js';

const previewError=(status,message)=>Object.assign(new Error(message),{status});
const decodeAttribute=value=>value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi,entity=>{
  const named={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};
  if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
  const number=entity.slice(2,-1),code=number[0].toLowerCase()==='x'?parseInt(number.slice(1),16):Number(number);
  return code>0 && code<=0x10ffff?String.fromCodePoint(code):'';
});

function socialImage(html) {
  for (const tag of html.match(/<meta\b[^>]*>/gi)||[]) {
    const attributes={};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) attributes[match[1].toLowerCase()]=decodeAttribute(match[3]);
    if (attributes.property?.toLowerCase()!=='og:image' || !attributes.content) continue;
    try {
      const url=new URL(attributes.content);
      if (url.protocol==='https:' && !url.username && !url.password && !url.port && ['opengraph.githubassets.com','repository-images.githubusercontent.com'].includes(url.hostname)) return url.href;
    } catch { /* Keep the standard GitHub preview when metadata is unusable. */ }
  }
  return '';
}

export async function fetchGithubPreview(input,{request=fetch}={}) {
  const repo=githubRepository(input);
  if (!repo) throw previewError(400,'Isi URL repo GitHub, misalnya https://github.com/username/project.');
  const signal=AbortSignal.timeout(8000);
  let destination=repo.url;
  try {
    // Follow repository renames only within github.com.
    for (let redirects=0;redirects<=3;redirects++) {
      const response=await request(destination,{redirect:'manual',signal,headers:{Accept:'text/html','User-Agent':'Ridho-Portfolio-Preview'}});
      if ([301,302,307,308].includes(response.status)) {
        const target=githubRepository(new URL(response.headers.get('location')||'',destination).href);
        await response.body?.cancel();
        if (!target || redirects===3) throw previewError(502,'Preview repo belum dapat dimuat. Coba lagi.');
        destination=target.url;continue;
      }
      if (response.status===404) throw previewError(404,'Repo tidak ditemukan atau bersifat private. Gunakan repo publik.');
      if (!response.ok) throw previewError(502,'GitHub belum dapat memuat preview. Coba lagi.');
      let html='',size=0;
      for await (const chunk of response.body) {
        size+=chunk.length;
        if (size>2*1024*1024) break;
        html+=Buffer.from(chunk).toString('utf8');
        if (html.includes('</head>')) break;
      }
      return {url:repo.url,label:repo.name,src:socialImage(html)||repo.thumbnail};
    }
  } catch(error) {
    if (error.status) throw error;
    throw previewError(502,'Preview GitHub belum dapat dimuat. Periksa koneksi lalu coba lagi.');
  }
}
