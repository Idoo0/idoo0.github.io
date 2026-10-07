const text = value => typeof value === 'string' ? value : '';
const strings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
export const galleryPhotoLimits = {projects:Infinity,achievements:3};

// The editor and public modal share the same fields, labels, and order.
export const detailContentFields = {
  projects:[
    {key:'challengeApproach',label:'Challenge and approach',type:'textarea',help:'Gabungkan masalah dan pendekatannya di sini. Pisahkan paragraf dengan satu baris kosong.'},
    {key:'contributions',label:'What I worked on',type:'list',help:'Satu kontribusi per baris.'},
    {key:'result',label:'The result & feature',type:'textarea',rows:8,help:'Gabungkan hasil dan fitur di sini. Pisahkan paragraf dengan satu baris kosong. Awali setiap baris fitur dengan - untuk membuat daftar.'}
  ],
  achievements:[
    {key:'problemApproach',label:'The problem and approach',type:'textarea',help:'Gabungkan masalah dan pendekatannya di sini. Pisahkan paragraf dengan satu baris kosong.'},
    {key:'contributions',label:'What I worked on',type:'list',help:'Satu kontribusi per baris.'},
    {key:'result',label:'The result',type:'textarea',help:''}
  ]
};

// Links can point to a public website or a file shipped with the portfolio.
export function isDetailLinkUrl(value) {
  if (typeof value !== 'string' || !value || value.length > 2048 || /[\s\\\u0000-\u001f]/.test(value)) return false;
  if (/^https?:\/\//i.test(value)) {
    try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
  }
  if (!/^(?:\.\/)?assets\//.test(value)) return false;
  try {
    const pathname = decodeURIComponent(value.split(/[?#]/)[0]).replace(/^\.\//, '');
    return !/[\\\u0000-\u001f]/.test(pathname) && pathname.split('/').every(part => part && !part.startsWith('.'));
  } catch { return false; }
}

export function detailLinks(item, legacy = []) {
  const links = Array.isArray(item.links) ? item.links : legacy;
  return links.filter(link => link && typeof link.label === 'string' && link.label.trim() && typeof link.url === 'string')
    .map(link => ({label:link.label.trim(), url:link.url.trim()}))
    .filter(link => !link.url || isDetailLinkUrl(link.url));
}

export function detailPhotos(images,maxPhotos = 3) {
  return (Array.isArray(images) ? images : []).slice(0,maxPhotos).map(photo => typeof photo === 'string' ? {src:photo,alt:''} : {
    src:text(photo?.src), alt:text(photo?.alt)
  });
}

export function detailCopyBlocks(value) {
  return text(value).split(/\n\s*\n/).filter(chunk => chunk.trim()).map(chunk => {
    const lines = chunk.split('\n').map(line => line.trim()).filter(Boolean);
    return lines.every(line => /^[-*•]\s+/.test(line))
      ? {type:'list',items:lines.map(line => line.replace(/^[-*•]\s+/,''))}
      : {type:'paragraph',text:chunk};
  });
}

export function projectDetails(item) {
  const features = strings(item.features).map(feature => `- ${feature}`).join('\n');
  return {
    challengeApproach:text(item.challengeApproach ?? [text(item.challenge),text(item.approach ?? item.solution)].filter(Boolean).join('\n\n')),
    contributions:strings(item.contributions),
    result:[text(item.result ?? item.overview),features].filter(Boolean).join('\n\n'),
    images:detailPhotos(item.images,galleryPhotoLimits.projects),
    links:detailLinks(item,[{label:'Live demo',url:text(item.demoUrl)},{label:'Source code',url:text(item.sourceUrl)}])
  };
}

export function achievementDetails(item) {
  return {
    problemApproach:text(item.problemApproach ?? ([text(item.problem ?? item.challenge),text(item.approach ?? item.solution)].filter(Boolean).join('\n\n') || item.overview)),
    contributions:strings(item.contributions ?? item.details),
    result:text(item.result),
    images:detailPhotos(item.images,galleryPhotoLimits.achievements),
    links:detailLinks(item,item.credentialUrl ? [{label:'View credential',url:text(item.credentialUrl)}] : [])
  };
}

// Expose legacy content in the form using the same rules as the public site.
// Keep unknown fields and preserve explicitly cleared canonical fields.
export function editableDetailRecord(collection,item) {
  if (!detailContentFields[collection] || !item || typeof item !== 'object' || Array.isArray(item)) return item;
  const content = collection === 'projects' ? projectDetails(item) : achievementDetails(item);
  const record = {...item};
  for (const {key} of detailContentFields[collection]) if (record[key] == null) record[key] = content[key];
  if (collection === 'projects') { record.result = content.result; delete record.features; }
  return record;
}
