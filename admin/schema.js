import {isDetailLinkUrl,detailContentFields,galleryPhotoLimits} from '../assets/js/detail-data.js';
import {projectCategories,projectStatuses,selectedProjectLimit} from '../assets/js/project-data.js';
import {githubRepository} from '../assets/js/github-repo-data.js';
import {experienceRoles} from '../assets/js/experience-data.js';

const field = (key,label,type='text',help='') => ({key,label,type,help});
export const collections = {
  hero:{label:'Hero',kind:'object',description:'Nama, foto, latar, dan tiga role pada hero.',fields:[
    field('name','Nama'),field('brand','Brand'),field('intro','Kalimat di atas role'),
    field('portrait','Foto profil','image'),field('background','Gambar latar','image'),field('scrollLabel','Petunjuk scroll'),
    field('roles','Role & tech stack','json','Tetap gunakan key software, ai, data. Stack berisi pasangan [icon, label]; ikon: cpp, java, js, python, langchain, gemini, pandas, kafka, hadoop.')
  ]},
  about:{label:'About',kind:'object',description:'Bio singkat dan pendidikan terakhir.',fields:[
    field('intro','Kalimat pembuka'),field('paragraphs','Bio','paragraphs','Pisahkan paragraf dengan satu baris kosong.'),
    field('highlights','Teks yang dicetak tebal','list','Satu frasa per baris.'),field('school','Universitas'),field('major','Jurusan'),
    field('gpa','GPA'),field('gpaScale','Skala GPA'),field('logo','Logo universitas','image')
  ]},
  experience:{label:'Experience',kind:'array',description:'Semua pengalaman tampil di timeline, diurutkan berdasarkan tanggal selesai. Pilih kategori role untuk filter di portfolio.',fields:[
    field('id','ID unik'),field('title','Posisi'),field('company','Perusahaan / organisasi'),field('type','Tipe kerja'),
    {...field('roles','Kategori role','choices','Pilih satu atau beberapa role. Posisi tetap ditulis bebas di kolom Posisi.'),options:experienceRoles},
    field('start','Bulan mulai','month'),field('end','Bulan selesai','endMonth','Kosongkan jika masih berjalan.'),field('location','Lokasi'),
    field('logo','Logo','image'),field('summary','Deskripsi singkat','textarea'),
    field('details','Show details','list','Satu poin per baris.'),{...field('images','Kolase foto & link','photos','Maksimal tiga item. Foto membuka preview, Link memakai thumbnail upload, dan GitHub membuat thumbnail repo otomatis dari URL.'),linkModes:true}
  ],create:()=>({id:'',title:'New experience',company:'',roles:[],type:'Internship',start:new Date().toISOString().slice(0,7),end:null,location:'',logo:'',summary:'',details:[],images:['']})},
  projects:{label:'Projects',kind:'array',description:'Pilih maksimal 6 project untuk Selected, diurutkan dari bulan selesai terbaru. Pilih kategori untuk filter, lalu tulis jenis produknya sendiri.',fields:[
    field('id','ID unik'),field('title','Nama proyek'),
    {...field('categories','Kategori','choices','Pilih satu atau beberapa kategori untuk filter project di web.'),options:projectCategories},
    field('category','Jenis produk','text','Tulis sendiri, misalnya Chatbot, Dashboard analitik, atau Aplikasi mobile. Tampil pada kartu dan detail project.'),
    {...field('status','Status','select'),options:projectStatuses,optionLabels:{Concept:'Concept — masih ide',Research:'Research — proyek penelitian',Experiment:'Experiment — eksplorasi / tes model','In progress':'In progress — sedang dikerjakan',Prototype:'Prototype — demo awal',Alpha:'Alpha — uji internal',Beta:'Beta — versi uji pengguna',Production:'Production — sudah digunakan',Archived:'Archived — tidak aktif'}},
    field('selected','Tampilkan di Selected','boolean'),
    field('start','Bulan mulai','month','Opsional. Isi bulan dan tahun proyek dimulai.'),field('end','Bulan selesai','endMonth','Kosongkan jika masih berjalan; tampil sebagai Present jika bulan mulai diisi.'),
    field('year','Tahun','text','Dipakai jika periode bulan belum diisi.'),field('role','Role kamu'),
    {...field('illustration','Ilustrasi bawaan','select'),options:['vision','agent','recommendation','pipeline','backend','analytics']},
    field('cover','Gambar cover','image'),field('summary','Deskripsi singkat','textarea'),
    ...detailContentFields.projects,
    field('tech','Tech stack','list'),field('images','Gallery','photos','Tambahkan foto sebanyak yang diperlukan melalui + Add photo.'),field('links','Links & attachments','links','Nama bebas: Pitch deck, Live demo, Source code, dan lainnya. URL http/https atau path assets/documents/...')
  ],create:()=>({id:'',title:'New project',category:'',categories:[],status:'Concept',selected:false,start:'',end:null,year:String(new Date().getFullYear()),role:'',illustration:'vision',cover:'',summary:'',challengeApproach:'',contributions:[],result:'',tech:[],images:[''],links:[]})},
  achievements:{label:'Achievements',kind:'array',description:'Maksimal tiga highlighted pertama menjadi kartu besar. Kartu utama dan prestasi lainnya diurutkan dari bulan perolehan terbaru.',fields:[
    field('id','ID unik'),field('title','Nama prestasi'),field('category','Jenis prestasi'),field('issuer','Issuer'),
    field('issuerLogo','Logo issuer','image'),field('date','Bulan & tahun perolehan','month','Ditampilkan pada kartu dan detail; dipakai untuk mengurutkan seluruh prestasi, termasuk Selected.'),field('year','Tahun','text','Dipakai jika bulan perolehan belum diisi.'),field('recognition','Recognition','text','Ditampilkan di panel informasi sebelah kanan pada detail prestasi.'),field('highlighted','Kartu utama','boolean'),
    {...field('illustration','Ilustrasi bawaan','select'),options:['medal','trophy','certificate','community']},
    field('image','Foto / sertifikat','image'),field('imageAlt','Deskripsi gambar'),field('summary','Deskripsi singkat','textarea'),
    ...detailContentFields.achievements,
    field('images','Gallery','photos'),field('links','Links & attachments','links','Nama bebas: Certificate, Attachment, Announcement, dan lainnya. URL http/https atau path assets/documents/...')
  ],create:()=>({id:'',title:'New achievement',category:'',issuer:'',issuerLogo:'',date:'',year:'',recognition:'',highlighted:false,illustration:'certificate',image:'',imageAlt:'',summary:'',problemApproach:'',contributions:[],result:'',images:[''],links:[]})},
  contact:{label:'Contact',kind:'object',description:'Link publik dan CV. Upload PDF, lalu Save changes untuk menampilkan Download CV.',fields:[
    field('email','Email publik','email'),field('linkedin','LinkedIn','url'),field('github','GitHub','url'),
    field('cv','File CV / URL','document'),field('cvFilename','Nama file unduhan','text','Terisi otomatis saat upload CV; bisa diubah sesuai kebutuhan.')
  ]}
};

export function validateCollection(name,data) {
  const schema = collections[name];
  if(!schema) return ['Koleksi tidak dikenal.'];
  const object = value => value && typeof value==='object' && !Array.isArray(value);
  if(schema.kind==='array' ? !Array.isArray(data) : !object(data)) return [`${name}.json harus berisi ${schema.kind==='array'?'array':'object'}.`];
  const errors=[];
  const items=schema.kind==='array'?data:[data];
  if(items.length>500) errors.push('Maksimal 500 item per koleksi.');
  const ids=new Set();
  items.forEach((item,index)=>{
    const prefix=schema.kind==='array'?`Item ${index+1}: `:'';
    if(!object(item)){errors.push(prefix+'harus berupa object.');return;}
    if(schema.kind==='array') {
      if(typeof item.id!=='string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(item.id)) errors.push(prefix+'ID wajib diisi dengan huruf, angka, dash, atau underscore.');
      else if(ids.has(item.id)) errors.push(prefix+'ID harus unik.');
      ids.add(item.id);
      if(typeof item.title!=='string' || !item.title.trim()) errors.push(prefix+'Judul wajib diisi.');
    }
    for(const field of schema.fields) {
      const value=item[field.key];
      if(value===undefined) continue;
      const issue=message=>errors.push(prefix+field.label+': '+message);
      if(field.type==='boolean') {if(typeof value!=='boolean')issue('harus true atau false.');}
      else if(field.type==='choices') {
        if(!Array.isArray(value)||value.some(v=>!field.options.includes(v)))issue('gunakan kategori dari pilihan dropdown.');
        else if(new Set(value).size!==value.length)issue('kategori tidak boleh duplikat.');
      }
      else if(['list','paragraphs'].includes(field.type)) {if(!Array.isArray(value)||value.some(v=>typeof v!=='string'))issue('harus array teks.');}
      else if(field.type==='photos') {
        const maxPhotos=galleryPhotoLimits[name]??3;
        if(!Array.isArray(value)||value.some(v=>typeof v!=='string'&&(!object(v)||typeof v.src!=='string'||(v.alt!==undefined&&typeof v.alt!=='string')))) issue('harus array path atau object {src, alt}.');
        else if(value.length>maxPhotos) issue(`maksimal ${maxPhotos} path atau object {src, alt}.`);
        if(field.linkModes && Array.isArray(value)) value.forEach((photo,photoIndex)=>{
          if(!object(photo))return;
          if(photo.mode!==undefined && !['photo','link','github'].includes(photo.mode))issue(`item ${photoIndex+1}: mode harus photo, link, atau github.`);
          if(photo.mode==='github') {
            if(!githubRepository(photo.url))issue(`item ${photoIndex+1}: isi URL repo GitHub, misalnya https://github.com/username/project.`);
            if(photo.label!==undefined && (typeof photo.label!=='string' || photo.label.length>120))issue(`item ${photoIndex+1}: label repo maksimal 120 karakter.`);
          }
          if(photo.mode==='link') {
            if(!isDetailLinkUrl(photo.url))issue(`item ${photoIndex+1}: isi URL http/https atau path file di assets/.`);
            if(typeof photo.label!=='string' || !photo.label.trim() || photo.label.length>120)issue(`item ${photoIndex+1}: label link wajib diisi, maksimal 120 karakter.`);
          }
        });
      } else if(field.type==='links') {
        if(!Array.isArray(value)||value.length>20) {issue('harus array berisi maksimal 20 link.');continue;}
        value.forEach((link,linkIndex)=>{
          if(!object(link)||typeof link.label!=='string'||typeof link.url!=='string') {issue(`link ${linkIndex+1} harus berupa {label, url}.`);return;}
          if(!link.label.trim()||link.label.length>120)issue(`nama link ${linkIndex+1} wajib diisi, maksimal 120 karakter.`);
          if(link.url&&!isDetailLinkUrl(link.url))issue(`link ${linkIndex+1}: gunakan URL http/https atau path file di assets/.`);
        });
      } else if(field.type==='json') {if(!Array.isArray(value))issue('harus array.');}
      else if(field.type==='endMonth' && value===null) { /* Present */ }
      else if(typeof value!=='string') issue('harus berupa teks.');
      else {
        if(value.length>20000) issue('teks terlalu panjang.');
        if(field.options&&!field.options.includes(value)) issue('pilihan tidak dikenal.');
        if(['month','endMonth'].includes(field.type)&&value&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))issue('gunakan YYYY-MM.');
        if(field.type==='url'&&value) {try{if(!['http:','https:'].includes(new URL(value).protocol))issue('gunakan URL http atau https.');}catch{issue('URL tidak valid.');}}
        if(field.type==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))issue('alamat email tidak valid.');
      }
    }
    if(name==='experience') {
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(item.start||''))errors.push(prefix+'Bulan mulai wajib diisi.');
    }
    if(['experience','projects'].includes(name) && item.end && item.start && item.end<item.start)errors.push(prefix+'Tanggal selesai tidak boleh mendahului tanggal mulai.');
  });
  if(name==='projects' && items.filter(item=>item?.selected===true).length>selectedProjectLimit)errors.push(`Maksimal ${selectedProjectLimit} project di Selected. Hapus centang pada salah satu project terlebih dahulu.`);
  if(name==='hero') {
    if(typeof data.name!=='string'||!data.name.trim())errors.push('Nama wajib diisi.');
    const keys=['software','ai','data'];
    const icons=['cpp','java','js','python','langchain','gemini','pandas','kafka','hadoop'];
    if(!Array.isArray(data.roles)||data.roles.length!==3||keys.some(key=>data.roles.filter(role=>role?.key===key).length!==1))errors.push('Role harus berisi tepat satu software, ai, dan data.');
    else if(data.roles.some(role=>typeof role.title!=='string'||!Array.isArray(role.stack)||role.stack.length<1||role.stack.length>3||role.stack.some(pair=>!Array.isArray(pair)||pair.length!==2||!icons.includes(pair[0])||typeof pair[1]!=='string')))errors.push('Role memerlukan judul dan 1–3 pasangan [icon, label] yang valid.');
  }
  return errors;
}
