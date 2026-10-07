import {collections,validateCollection} from './schema.js';
import {imagePolicies} from './image-policy.js';
import {imageAccept,uploadImage,previewPath,formatBytes} from './images.js';
import {cvAccept,uploadCV} from './documents.js';
import {selectedProjectLimit,projectView} from '../assets/js/project-data.js';
import {editableDetailRecord,galleryPhotoLimits} from '../assets/js/detail-data.js';
import {notifyContentSaved} from '../assets/js/content-sync.js';
import {githubRepository} from '../assets/js/github-repo-data.js';

const $=id=>document.getElementById(id);
const clone=value=>structuredClone(value);
const state={name:'experience',data:null,saved:null,revision:'',selected:0,mode:'form',busy:false,uploading:false,connected:false,rawPending:false};
const pendingGithubPreviews=new Set();
const dirty=()=>state.rawPending||JSON.stringify(state.data)!==JSON.stringify(state.saved);
const currentItem=()=>collections[state.name].kind==='array'?state.data?.[state.selected]:state.data;
function recordEntries() {
  const indexes=new Map(state.data.map((item,index)=>[item,index]));
  const records=state.name==='projects'?projectView(state.data,'All'):state.data;
  return records.map(item=>({item,index:indexes.get(item)}));
}
const editableData=(name,data)=>Array.isArray(data)?data.map(item=>editableDetailRecord(name,item)):data;
const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const recordType=()=>({experience:'experience',projects:'project',achievements:'achievement'})[state.name]||'item';
function trashIcon() {
  const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
  icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('class','trash-icon');icon.setAttribute('aria-hidden','true');icon.setAttribute('focusable','false');
  const path=document.createElementNS(icon.namespaceURI,'path');
  path.setAttribute('d','M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7');icon.append(path);return icon;
}

function showErrors(messages=[]) {
  const box=$('validation-errors');box.replaceChildren();box.hidden=!messages.length;
  if(messages.length){box.append(node('strong','','Periksa data berikut:'));const list=node('ul');messages.slice(0,25).forEach(message=>list.append(node('li','',message)));box.append(list);}
}
function status(text,cls='') {$('save-status').textContent=text;$('save-status').className=`save-status ${cls}`;}
function updateDirty() {
  const changed=dirty();
  $('save-data').disabled=!state.connected||state.busy||!changed;
  if(!state.busy)status(changed?'Unsaved changes · belum ditulis ke file.':`Loaded from data/${state.name}.json`,changed?'dirty':'');
}
function touched(){showErrors();updateDirty();updateRecordLabels();}

function confirmAction(title,copy,label='Continue') {
  const dialog=$('confirm-dialog');$('confirm-title').textContent=title;$('confirm-copy').textContent=copy;$('confirm-ok').textContent=label;
  return new Promise(resolve=>{
    const finish=value=>{dialog.close();cleanup();resolve(value);};
    const yes=()=>finish(true),no=()=>finish(false),cancel=event=>{event.preventDefault();finish(false);};
    const cleanup=()=>{$('confirm-ok').removeEventListener('click',yes);$('confirm-cancel').removeEventListener('click',no);dialog.removeEventListener('cancel',cancel);};
    $('confirm-ok').addEventListener('click',yes);$('confirm-cancel').addEventListener('click',no);dialog.addEventListener('cancel',cancel);dialog.showModal();
  });
}
async function mayDiscard(){return !dirty()||await confirmAction('Discard unsaved changes?','Perubahan belum disimpan ke JSON. Tetap lanjut dan gunakan data dari file?','Discard');}

for(const [name,schema] of Object.entries(collections)) {
  const button=node('button');button.type='button';button.dataset.collection=name;
  button.append(node('span','',schema.label.slice(0,2).toUpperCase()),document.createTextNode(schema.label));
  button.addEventListener('click',async()=>{if(state.busy||name===state.name||!await mayDiscard())return;await loadCollection(name);});
  $('collection-nav').append(button);
}

async function loadCollection(name) {
  state.busy=true;state.connected=false;$('save-data').disabled=true;showErrors();status('Loading local data…');
  $('form-workspace').inert=true;$('json-workspace').inert=true;
  $('form-mode').disabled=true;$('json-mode').disabled=true;
  try {
    const response=await fetch(`api/data/${name}`,{cache:'no-store'});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.error||'Could not load local data.');
    state.name=name;state.data=editableData(name,clone(payload.data));state.saved=clone(state.data);state.revision=payload.revision;state.selected=0;state.connected=true;state.rawPending=false;
    if(name==='projects')state.selected=recordEntries()[0]?.index??0;
    $('connection-message').hidden=true;render();window.scrollTo(0,0);
  } catch(error) {
    const box=$('connection-message');box.hidden=false;
    box.replaceChildren(node('strong','','Local server diperlukan. '),document.createTextNode('Jalankan npm start dari folder porto, lalu buka http://127.0.0.1:8765/admin/. '),node('span','',error.message));
    status('Local data could not be loaded.');
  } finally {state.busy=false;$('form-workspace').inert=!state.connected;$('json-workspace').inert=!state.connected;$('form-mode').disabled=!state.connected;$('json-mode').disabled=!state.connected;if(state.connected)updateDirty();}
}

function updateRecordLabels() {
  if(!state.data)return;
  const item=currentItem();
  $('item-title').textContent=item?.title||collections[state.name].label;
  if(collections[state.name].kind==='array') {
    [...$('records-list').children].forEach(button=>{
      const index=Number(button.dataset.recordIndex);
      const record=state.data[index];if(!record)return;
      button.setAttribute('aria-label',`Edit ${record.title||record.id}`);
      const title=button.querySelector('strong');title.textContent=record.title||'Untitled';
      const detail=button.querySelector('small');detail.replaceChildren();
      if(record.highlighted || record.selected)detail.append(node('i','record-mark'));
      detail.append(document.createTextNode(record.company||record.issuer||record.category||record.id||''));
    });
    if(state.name==='projects') {
      const buttons=new Map([...$('records-list').children].map(button=>[Number(button.dataset.recordIndex),button]));
      const ordered=recordEntries().map(({index})=>buttons.get(index));
      if(ordered.some((button,index)=>button!==$('records-list').children[index]))$('records-list').append(...ordered);
      const count=state.data.filter(record=>record.selected===true).length;
      const input=$('field-selected'),help=$('project-selection-count');
      if(input)input.disabled=!item?.selected && count>=selectedProjectLimit;
      if(help)help.textContent=`${count} / ${selectedProjectLimit} project dipilih.${count>=selectedProjectLimit?' Hapus satu centang untuk memilih project lain.':''} Urutan otomatis mengikuti tanggal selesai terbaru, sama seperti di web.`;
    }
  }
}

function renderRecords() {
  const array=collections[state.name].kind==='array';$('records-panel').hidden=!array;$('item-actions').hidden=!array;
  $('form-workspace').classList.toggle('is-single',!array);
  if(!array)return;
  $('record-count').textContent=`${state.data.length} ITEMS`;
  $('delete-record').replaceChildren(trashIcon(),document.createTextNode(`Hapus ${recordType()}`));
  $('records-list').replaceChildren(...recordEntries().map(({item,index})=>{
    const button=node('button','record');button.type='button';button.setAttribute('aria-current',String(index===state.selected));
    button.dataset.recordIndex=String(index);
    button.setAttribute('aria-label',`Edit ${item.title||item.id}`);button.append(node('strong','',''),node('small','',''));
    button.addEventListener('click',()=>{state.selected=index;showErrors();renderRecords();renderForm();updateRecordLabels();});
    return button;
  }));
  $('move-up').hidden=state.name==='projects';$('move-down').hidden=state.name==='projects';
  $('move-up').disabled=state.name==='projects'||state.selected<=0||!state.data.length;
  $('move-down').disabled=state.name==='projects'||state.selected>=state.data.length-1||!state.data.length;
  $('delete-record').disabled=!state.data.length;
}

function setUploadBusy(value,label='Processing and saving image…') {
  state.busy=value;state.uploading=value;
  $('form-workspace').inert=value;$('json-workspace').inert=value;
  $('form-mode').disabled=value;$('json-mode').disabled=value;$('reload-data').disabled=value;
  $('save-data').disabled=value||!dirty();
  if (value) status(label);else updateDirty();
}

function documentControl(field,item) {
  const control=node('div','document-control');
  const label=node('label','',field.label);label.htmlFor=`field-${field.key}`;
  const pathInput=node('input');pathInput.type='text';pathInput.id=label.htmlFor;pathInput.value=item[field.key]||'';pathInput.placeholder='Upload PDF atau isi URL / assets/documents/...';
  const actions=node('div','image-actions');
  const input=node('input');input.type='file';input.accept=cvAccept;input.hidden=true;input.setAttribute('aria-label','Pilih file CV PDF');
  const choose=node('button','button small','Upload CV');choose.type='button';choose.addEventListener('click',()=>input.click());
  const open=node('a','button small subtle','Open CV');open.target='_blank';open.rel='noopener noreferrer';
  const clear=node('button','button small subtle','Clear CV');clear.type='button';
  const message=node('p','image-message');message.setAttribute('aria-live','polite');
  const paint=()=>{
    pathInput.value=item[field.key]||'';
    choose.textContent=pathInput.value?'Replace CV':'Upload CV';clear.hidden=!pathInput.value;
    const url=previewPath(pathInput.value);open.hidden=!url;if(url)open.href=url;else open.removeAttribute('href');
  };
  pathInput.addEventListener('input',()=>{item[field.key]=pathInput.value;message.textContent='';delete message.dataset.uploaded;paint();touched();});
  clear.addEventListener('click',()=>{item[field.key]='';message.textContent='';delete message.dataset.uploaded;paint();touched();});
  input.addEventListener('change',async()=>{
    const file=input.files[0];if(!file||state.busy)return;
    setUploadBusy(true,'Uploading CV…');control.setAttribute('aria-busy','true');message.classList.remove('is-error');delete message.dataset.uploaded;message.textContent='Uploading PDF…';
    try {
      const uploaded=await uploadCV(file);
      item[field.key]=uploaded.path;item.cvFilename=uploaded.filename;
      $('field-cvFilename').value=item.cvFilename;
      paint();touched();message.dataset.uploaded='true';message.textContent=`Uploaded · ${formatBytes(uploaded.bytes)}. Klik Save changes untuk memperbarui kontak.`;
    } catch(error) {message.classList.add('is-error');message.textContent=error.message;}
    finally {input.value='';control.removeAttribute('aria-busy');setUploadBusy(false);}
  });
  actions.append(choose,open,clear,input);
  control.append(label,pathInput,actions,node('p','help','PDF · maksimal 25 MB. Upload mengisi nama file unduhan otomatis.'),message);paint();return control;
}

function imageControl(field,item,label,getValue,setValue) {
  const policy=imagePolicies[state.name][field.key],collection=state.name;
  const control=node('div',`image-control${policy.fit==='square'?' is-logo':''}`);
  const preview=node('div','image-preview');const image=node('img');image.alt=`Preview ${label}`;image.decoding='async';image.hidden=true;
  const placeholder=node('span','image-placeholder','No image yet');preview.append(image,placeholder);
  const content=node('div','image-content'),actions=node('div','image-actions');
  const input=node('input');input.type='file';input.accept=imageAccept;input.hidden=true;input.setAttribute('aria-label',`Upload ${label}`);
  const choose=node('button','button small image-upload-button','Upload image');choose.type='button';choose.setAttribute('aria-label',`Upload ${label}`);choose.addEventListener('click',()=>input.click());
  const clear=node('button','button small subtle',policy.fallback?'Use default':'Clear image');clear.type='button';clear.setAttribute('aria-label',`Clear ${label}`);
  const info=node('p','image-info'),path=node('code','image-path'),message=node('p','image-message');message.setAttribute('aria-live','polite');
  const help=node('p','help',policy.fit==='square'?'WebP · 256 × 256 · logo utuh, padding transparan.':`WebP · maksimal ${policy.width} × ${policy.height} · rasio foto tetap.`);
  let uploaded=null;
  const paint=()=>{
    const value=getValue()||'',source=value||policy.fallback||'';
    choose.textContent=value?'Replace image':'Upload image';clear.hidden=!value;
    path.textContent=value|| (source?'Default image':'');path.title=value||source;
    info.textContent='';image.hidden=true;placeholder.hidden=false;placeholder.textContent='No image yet';
    if (source) {image.src=previewPath(source);placeholder.textContent='Loading preview…';}else image.removeAttribute('src');
  };
  image.addEventListener('load',()=>{
    image.hidden=false;placeholder.hidden=true;
    const ext=(getValue()||policy.fallback||'').split(/[?#]/)[0].match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toUpperCase()||'IMAGE';
    info.textContent=uploaded?`WebP · ${uploaded.width} × ${uploaded.height} · ${formatBytes(uploaded.bytes)}`:`${ext} · ${image.naturalWidth} × ${image.naturalHeight}`;
  });
  image.addEventListener('error',()=>{image.hidden=true;placeholder.hidden=false;placeholder.textContent='Preview unavailable';});
  clear.addEventListener('click',()=>{uploaded=null;setValue('');message.textContent='';delete message.dataset.uploaded;paint();touched();});
  input.addEventListener('change',async()=>{
    const file=input.files[0];if(!file||state.busy)return;
    const temporary=URL.createObjectURL(file);
    setUploadBusy(true);control.classList.add('is-uploading');delete message.dataset.uploaded;message.classList.remove('is-error');message.textContent='Converting to WebP…';
    image.src=temporary;image.hidden=false;placeholder.hidden=true;
    try {
      uploaded=await uploadImage(file,{collection,field:field.key,itemId:item.id||collection,policy});
      setValue(uploaded.path);paint();touched();message.dataset.uploaded='true';message.textContent='Uploaded. Save changes untuk memperbarui JSON.';
    } catch(error) {
      uploaded=null;paint();message.classList.add('is-error');message.textContent=error.message;
    } finally {
      URL.revokeObjectURL(temporary);input.value='';control.classList.remove('is-uploading');setUploadBusy(false);
    }
  });
  actions.append(choose,clear,input);content.append(actions,info,path,help,message);control.append(preview,content);
  control.refreshPreview=()=>{uploaded=null;paint();};paint();return control;
}

function githubPreviewControl(getPhoto,updatePhoto,isActive) {
  const control=node('div','github-preview-control');
  const preview=node('div','image-preview'),image=node('img'),placeholder=node('span','image-placeholder','Tempel URL repo GitHub untuk melihat thumbnail.');
  image.hidden=true;image.decoding='async';preview.append(image,placeholder);
  const help=node('p','help','Thumbnail otomatis dari GitHub. Klik kartu di portfolio untuk membuka repo.');
  const message=node('p','image-message');message.setAttribute('aria-live','polite');
  const retry=node('button','button small subtle','Refresh thumbnail');retry.type='button';
  let controller=null,timer=0;
  const cancel=()=>{clearTimeout(timer);controller?.abort();controller=null;control.removeAttribute('aria-busy');};
  image.addEventListener('load',()=>{image.hidden=false;placeholder.hidden=true;});
  image.addEventListener('error',()=>{image.hidden=true;placeholder.hidden=false;placeholder.textContent='Thumbnail belum tersedia. Link repo tetap dapat dibuka.';});
  const refresh=(load=false)=>{
    cancel();
    const photo=getPhoto(),repo=githubRepository(photo?.url);
    image.hidden=true;placeholder.hidden=false;message.classList.remove('is-error');message.textContent='';delete message.dataset.uploaded;retry.disabled=!repo;
    if (!repo) {
      image.removeAttribute('src');placeholder.textContent=photo?.url?'Gunakan URL https://github.com/username/project.':'Tempel URL repo GitHub untuk melihat thumbnail.';
      return;
    }
    placeholder.textContent='Loading thumbnail…';image.alt=`GitHub repository ${repo.name}`;image.src=previewPath(photo.src||repo.thumbnail);
    if (!load) return;
    controller=new AbortController();const requestController=controller;
    const request=async()=>{
      control.setAttribute('aria-busy','true');message.textContent='Mengambil thumbnail repo…';
      try {
        const response=await fetch(`api/github-preview?${new URLSearchParams({url:repo.url})}`,{signal:requestController.signal});
        const result=await response.json();
        if (!response.ok) throw new Error(result.error||'Preview belum dapat dimuat.');
        if (controller!==requestController || !isActive() || githubRepository(getPhoto()?.url)?.url!==repo.url) return;
        updatePhoto({src:result.src});image.src=previewPath(result.src);message.dataset.uploaded='true';message.textContent='Thumbnail siap. Save changes untuk menyimpan.';
      } catch(error) {
        if (requestController.signal.aborted || !isActive()) return;
        message.classList.add('is-error');message.textContent=`${error.message} Thumbnail standar tetap dipakai; klik Refresh thumbnail untuk mencoba lagi.`;
      } finally {
        if (controller===requestController) control.removeAttribute('aria-busy');
      }
    };
    // Track the debounce too, so Save always waits for the selected thumbnail.
    const pending=new Promise(resolve=>{
      requestController.signal.addEventListener('abort',resolve,{once:true});
      timer=window.setTimeout(()=>void request().finally(resolve),350);
    });
    pendingGithubPreviews.add(pending);void pending.finally(()=>pendingGithubPreviews.delete(pending));
  };
  retry.addEventListener('click',()=>refresh(true));control.append(preview,help,message,retry);
  return {control,refresh,cancel};
}

function photoFields(field,item,container) {
  const maxPhotos=galleryPhotoLimits[state.name]??3;
  const list=node('div','photo-list');const add=node('button','button small photos-add',field.linkModes?'+ Add item':'+ Add photo');add.type='button';
  const paint=()=>{
    const photos=Array.isArray(item[field.key])?item[field.key]:[];
    list.replaceChildren(...photos.map((photo,index)=>{
      const entry=node('fieldset','gallery-photo');entry.append(node('legend','',`${field.linkModes?'Item':'Photo'} ${String(index+1).padStart(2,'0')}`));
      const getPhoto=()=>item[field.key][index];
      const getSource=()=>typeof getPhoto()==='string'?getPhoto():getPhoto()?.src||'';
      const setSource=src=>{const previous=getPhoto();item[field.key][index]=typeof previous==='object'?{...previous,src}:src;};
      const upload=imageControl(field,item,`${field.label} ${index+1}`,getSource,setSource);
      if(field.linkModes) {
        const updatePhoto=values=>{
          const previous=getPhoto();item[field.key][index]={...(typeof previous==='object'?previous:{}),src:getSource(),...values};touched();
        };
        const changeValue=(key,value)=>updatePhoto({[key]:value});
        const modeBox=node('div','photo-mode-field'),modeLabel=node('label','','Mode');
        const mode=node('select');mode.id=`photo-${field.key}-${index}-mode`;modeLabel.htmlFor=mode.id;mode.setAttribute('aria-label',`${field.label} ${index+1} mode`);
        for(const [value,label] of [['photo','Foto — preview'],['link','Link — redirect'],['github','GitHub — repo']]){const option=node('option','',label);option.value=value;mode.append(option);}
        mode.value=['link','github'].includes(photo?.mode)?photo.mode:'photo';modeBox.append(modeLabel,mode);
        const linkBox=node('div','photo-link-fields');
        const destinationLabel=node('label','','URL tujuan'),url=node('input');url.id=`photo-${field.key}-${index}-url`;destinationLabel.htmlFor=url.id;url.type='text';url.value=photo?.url||'';url.placeholder='https://github.com/...';url.setAttribute('aria-label',`${field.label} ${index+1} URL`);
        const captionLabel=node('label','','Label saat hover'),caption=node('input');caption.id=`photo-${field.key}-${index}-label`;captionLabel.htmlFor=caption.id;caption.type='text';caption.value=photo?.label||'';caption.maxLength=120;caption.placeholder='Project repo';caption.setAttribute('aria-label',`${field.label} ${index+1} label`);
        const github=githubPreviewControl(getPhoto,updatePhoto,()=>entry.isConnected && currentItem()===item && state.mode==='form' && getPhoto()?.mode==='github');
        const syncMode=()=>{
          const isGithub=mode.value==='github';linkBox.hidden=mode.value==='photo';upload.hidden=isGithub;github.control.hidden=!isGithub;
          destinationLabel.textContent=isGithub?'URL repo GitHub':'URL tujuan';url.placeholder=isGithub?'https://github.com/username/project':'https://…';
          caption.placeholder=isGithub?'Otomatis: username/project':'Project repo';
          if (isGithub) github.refresh();else {github.cancel();upload.refreshPreview();}
        };
        const syncGithubUrl=()=>{
          const oldRepo=githubRepository(getPhoto()?.url),repo=githubRepository(url.value);
          const values={url:url.value.trim()};if (repo) values.src=repo.thumbnail;
          if (!caption.value.trim() || caption.value===oldRepo?.name) {values.label=repo?.name||'';caption.value=values.label;}
          updatePhoto(values);github.refresh(true);
        };
        mode.addEventListener('change',()=>{changeValue('mode',mode.value);syncMode();if(mode.value==='github')syncGithubUrl();});
        url.addEventListener('input',()=>mode.value==='github'?syncGithubUrl():changeValue('url',url.value.trim()));caption.addEventListener('input',()=>changeValue('label',caption.value));
        linkBox.append(destinationLabel,url,captionLabel,caption);entry.append(modeBox,linkBox,github.control);syncMode();
      }
      const altLabel=node('label','',field.linkModes?'Deskripsi foto / thumbnail':'Deskripsi foto');const alt=node('input','photo-alt');alt.id=`photo-${field.key}-${index}-alt`;altLabel.htmlFor=alt.id;alt.type='text';alt.placeholder='Deskripsi gambar (opsional)';alt.value=typeof photo==='string'?'':photo.alt||'';alt.setAttribute('aria-label',`${field.label} ${index+1} description`);
      alt.addEventListener('input',()=>{const previous=getPhoto();item[field.key][index]={...(typeof previous==='object'?previous:{}),src:getSource(),alt:alt.value};touched();});
      const remove=node('button','button small subtle photo-remove',field.linkModes?'Remove item':'Remove photo');remove.type='button';remove.setAttribute('aria-label',`Remove ${field.label} ${index+1}`);remove.addEventListener('click',()=>{item[field.key].splice(index,1);paint();touched();});
      entry.append(upload,altLabel,alt,remove);return entry;
    }));
    add.disabled=photos.length>=maxPhotos;
  };
  add.addEventListener('click',()=>{if(!Array.isArray(item[field.key]))item[field.key]=[];if(item[field.key].length<maxPhotos)item[field.key].push('');paint();touched();});paint();container.append(list,add);
}

function linkFields(field,item,container) {
  const list=node('div','link-list');const add=node('button','button small links-add','+ Add link');add.type='button';
  const paint=()=>{
    const links=Array.isArray(item[field.key])?item[field.key]:[];
    list.replaceChildren(...links.map((link,index)=>{
      const entry=node('fieldset','link-entry');entry.append(node('legend','',`Link ${index+1}`));
      const labelId=`${field.key}-${index}-label`,urlId=`${field.key}-${index}-url`;
      const label=node('label','','Button label');label.htmlFor=labelId;
      const name=node('input');name.id=labelId;name.type='text';name.value=link.label||'';name.placeholder='Pitch deck';name.setAttribute('aria-label',`${field.label} ${index+1} label`);
      const destination=node('label','','URL / local file');destination.htmlFor=urlId;
      const url=node('input');url.id=urlId;url.type='text';url.value=link.url||'';url.placeholder='https://... or assets/documents/file.pdf';url.setAttribute('aria-label',`${field.label} ${index+1} URL`);
      const change=()=>{item[field.key][index]={...item[field.key][index],label:name.value,url:url.value.trim()};touched();};name.addEventListener('input',change);url.addEventListener('input',change);
      const remove=node('button','icon-button','×');remove.type='button';remove.setAttribute('aria-label',`Remove ${field.label} ${index+1}`);remove.addEventListener('click',()=>{item[field.key].splice(index,1);paint();touched();});
      const nameBox=node('div'),urlBox=node('div');nameBox.append(label,name);urlBox.append(destination,url);entry.append(nameBox,urlBox,remove);return entry;
    }));
    add.disabled=links.length>=20;
  };
  add.addEventListener('click',()=>{if(!Array.isArray(item[field.key]))item[field.key]=[];if(item[field.key].length<20)item[field.key].push({label:'New link',url:''});paint();touched();});paint();container.append(list,add);
}

function roleFields(item,container) {
  const grid=node('div','roles-grid');const icons=['cpp','java','js','python','langchain','gemini','pandas','kafka','hadoop'];
  (Array.isArray(item.roles)?item.roles:[]).forEach(role=>{
    const group=node('fieldset','role-editor');group.append(node('legend','',role.key));
    const title=node('input');title.value=role.title;title.setAttribute('aria-label',`${role.key} role title`);title.addEventListener('input',()=>{role.title=title.value;touched();});group.append(title);
    const stacks=node('div','role-stack');role.stack.forEach((pair,index)=>{
      const select=node('select');select.setAttribute('aria-label',`${role.key} tech ${index+1} icon`);icons.forEach(icon=>{const option=node('option','',icon);option.value=icon;select.append(option);});select.value=pair[0];select.addEventListener('change',()=>{pair[0]=select.value;touched();});
      const label=node('input');label.value=pair[1];label.setAttribute('aria-label',`${role.key} tech ${index+1} name`);label.addEventListener('input',()=>{pair[1]=label.value;touched();});stacks.append(select,label);
    });group.append(stacks);grid.append(group);
  });container.append(grid);
}

function choiceFields(field,item,box) {
  const label=node('label','',field.label),select=node('select'),list=node('div','choice-tags');
  select.id=`field-${field.key}`;label.htmlFor=select.id;
  const paint=()=>{
    const values=Array.isArray(item[field.key])?item[field.key]:[];
    list.replaceChildren(...values.map(value=>{
      const tag=node('span','choice-tag');tag.append(node('span','',value));
      const remove=node('button','','×');remove.type='button';remove.setAttribute('aria-label',`Remove ${value} category`);
      remove.addEventListener('click',()=>{item[field.key]=values.filter(option=>option!==value);paint();touched();});tag.append(remove);return tag;
    }));
    const placeholder=node('option','','Pilih kategori…');placeholder.value='';placeholder.disabled=true;
    select.replaceChildren(placeholder,...field.options.map(value=>{const option=node('option','',value);option.value=value;option.disabled=values.includes(value);return option;}));
    select.value='';select.disabled=field.options.every(value=>values.includes(value));list.hidden=!values.length;
  };
  select.addEventListener('change',()=>{
    if(!field.options.includes(select.value))return;
    item[field.key]=[...new Set([...(Array.isArray(item[field.key])?item[field.key]:[]),select.value])];paint();touched();
  });
  box.append(label,list,select);paint();
}

function renderForm() {
  const item=currentItem(),form=$('editor-fields');form.replaceChildren();$('empty-message').hidden=!!item;
  $('item-eyebrow').textContent=collections[state.name].kind==='array'?'EDIT ITEM':'EDIT SECTION';
  if(!item){$('item-title').textContent='Your next chapter';return;}
  collections[state.name].fields.forEach(field=>{
    const wide=['textarea','list','paragraphs','photos','links','json','asset','image','choices','document'].includes(field.type);
    const box=node('div',`field${wide?' wide':''}`);const id=`field-${field.key}`;
    if(field.type==='document')box.append(documentControl(field,item));
    else if(field.type==='choices')choiceFields(field,item,box);
    else if(field.type==='image'||field.type==='photos'||field.type==='links'||field.key==='roles') {
      box.append(node('p','field-title',field.label));
      if(field.type==='image')box.append(imageControl(field,item,field.label,()=>item[field.key]||'',value=>{item[field.key]=value;}));else if(field.type==='photos')photoFields(field,item,box);else if(field.type==='links')linkFields(field,item,box);else roleFields(item,box);
    } else if(field.type==='boolean') {
      const label=node('label','check-label');const input=node('input');input.type='checkbox';input.id=id;input.checked=!!item[field.key];input.addEventListener('change',()=>{item[field.key]=input.checked;touched();});label.append(input,document.createTextNode(field.label));box.append(label);
      if(state.name==='projects' && field.key==='selected'){const help=node('p','help');help.id='project-selection-count';box.append(help);}
    } else {
      const label=node('label','',field.label);label.htmlFor=id;
      const multiline=['textarea','list','paragraphs','json'].includes(field.type);
      const input=node(field.type==='select'?'select':multiline?'textarea':'input');input.id=id;
      if(input.tagName==='TEXTAREA' && field.rows)input.rows=field.rows;
      if(field.type==='select')field.options.forEach(value=>{const option=node('option','',field.optionLabels?.[value]||value);option.value=value;input.append(option);});
      if(input.tagName==='INPUT')input.type=field.type==='month'||field.type==='endMonth'?'month':field.type==='email'?'email':field.type==='url'?'url':'text';
      if(['list','paragraphs'].includes(field.type))input.value=(item[field.key]||[]).join(field.type==='paragraphs'?'\n\n':'\n');
      else if(field.type==='json'){input.value=JSON.stringify(item[field.key]??[],null,2);input.className='mono';}
      else input.value=item[field.key]??'';
      if(field.type==='asset')input.placeholder='assets/...';
      input.addEventListener('input',()=>{
        let value=input.value;
        if(field.type==='list')value=value.split('\n').map(v=>v.trim()).filter(Boolean);
        else if(field.type==='paragraphs')value=value.split(/\n\s*\n/).map(v=>v.trim()).filter(Boolean);
        else if(field.type==='endMonth')value=value||null;
        else if(field.type==='json') {try{value=JSON.parse(value);input.setCustomValidity('');}catch{input.setCustomValidity('JSON belum valid.');input.reportValidity();return;}}
        item[field.key]=value;touched();
      });box.append(label,input);
    }
    if(field.help)box.append(node('p','help',field.help));
    if(field.type==='asset')box.append(node('p','help','Path dihitung dari root portfolio. Taruh file di assets/, lalu isi path-nya di sini.'));
    form.append(box);
  });
  form.addEventListener('submit',event=>event.preventDefault(),{once:true});
  updateRecordLabels();
}

function render() {
  const schema=collections[state.name];
  $('collection-title').textContent=schema.label;$('collection-description').textContent=schema.description;$('file-path').textContent=`data/${state.name}.json`;
  document.querySelectorAll('[data-collection]').forEach(button=>{if(button.dataset.collection===state.name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  renderRecords();renderForm();$('json-editor').value=JSON.stringify(state.data,null,2);setModeView();
}
function setModeView() {
  $('form-mode').setAttribute('aria-pressed',String(state.mode==='form'));$('json-mode').setAttribute('aria-pressed',String(state.mode==='json'));
  $('form-workspace').hidden=state.mode!=='form';$('json-workspace').hidden=state.mode!=='json';
}
function applyRaw() {
  try {
    const data=JSON.parse($('json-editor').value);const errors=validateCollection(state.name,data);
    if(errors.length){showErrors(errors);return false;}
    state.data=editableData(state.name,data);state.selected=Math.min(state.selected,Math.max(0,(Array.isArray(data)?data.length:1)-1));state.rawPending=false;showErrors();return true;
  }catch(error){showErrors(['JSON tidak valid: '+error.message]);return false;}
}
$('json-mode').addEventListener('click',()=>{if(state.mode==='json')return;state.mode='json';$('json-editor').value=JSON.stringify(state.data,null,2);state.rawPending=false;setModeView();});
$('form-mode').addEventListener('click',()=>{if(state.mode==='json'&&!applyRaw())return;state.mode='form';render();updateDirty();});
$('json-editor').addEventListener('input',()=>{state.rawPending=true;showErrors();updateDirty();});
$('apply-json').addEventListener('click',()=>{if(applyRaw()){state.mode='form';render();updateDirty();}});
$('add-record').addEventListener('click',()=>{
  if(!state.connected)return;const item=collections[state.name].create();item.id=`${state.name.slice(0,-1)}-${crypto.randomUUID().slice(0,8)}`;state.data.push(item);state.selected=state.data.length-1;render();touched();
});
async function deleteRecord(index) {
  if(state.busy||!state.connected||collections[state.name].kind!=='array')return;
  const item=state.data[index];if(!item)return;
  if(!await confirmAction(`Hapus ${recordType()}?`,`“${item.title||item.id}” akan dihapus dari draft. Klik Save changes untuk menyimpan penghapusan ke JSON.`,'Hapus'))return;
  state.data.splice(index,1);
  if(index<state.selected)state.selected--;
  state.selected=Math.max(0,Math.min(state.selected,state.data.length-1));
  render();touched();
  if(!state.data.length)$('add-record').focus();
}
$('delete-record').addEventListener('click',()=>void deleteRecord(state.selected));
function moveRecord(offset) {
  const target=state.selected+offset;if(target<0||target>=state.data.length)return;
  [state.data[state.selected],state.data[target]]=[state.data[target],state.data[state.selected]];state.selected=target;render();touched();
}
$('move-up').addEventListener('click',()=>moveRecord(-1));$('move-down').addEventListener('click',()=>moveRecord(1));
$('reload-data').addEventListener('click',async()=>{if(!state.busy&&await mayDiscard())await loadCollection(state.name);});

async function saveData() {
  if(state.busy||!state.connected||!dirty())return;
  if(state.mode==='json'&&!applyRaw())return;
  const errors=validateCollection(state.name,state.data);if(errors.length){showErrors(errors);return;}
  state.busy=true;$('save-data').disabled=true;$('save-data').textContent='Saving…';status('Writing JSON to disk…');
  $('form-workspace').inert=true;$('json-workspace').inert=true;
  try {
    if (pendingGithubPreviews.size) {status('Loading GitHub thumbnail before saving…');await Promise.allSettled([...pendingGithubPreviews]);}
    const sent=clone(state.data);
    const response=await fetch(`api/data/${state.name}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:sent,revision:state.revision})});
    const result=await response.json();if(!response.ok){showErrors(result.details?.length?result.details:[result.error]);status(response.status===409?'Conflict · file changed. Reload before saving.':'Data was not saved.','dirty');return;}
    state.saved=clone(result.data);state.revision=result.revision;state.rawPending=false;showErrors();
    document.querySelectorAll('.image-message[data-uploaded="true"]').forEach(message=>{message.textContent='Saved to JSON.';delete message.dataset.uploaded;});
    const time=new Date(result.savedAt).toLocaleTimeString('id-ID');status(`Saved to data/${state.name}.json · ${time}`, 'saved');
    $('json-editor').value=JSON.stringify(state.data,null,2);
    notifyContentSaved(state.name);
  } catch(error){showErrors(['Tidak dapat menyimpan. Pastikan server lokal masih berjalan.']);status('Data was not saved.','dirty');}
  finally{state.busy=false;$('form-workspace').inert=false;$('json-workspace').inert=false;$('save-data').textContent='Save changes';$('save-data').disabled=!dirty();}
}
$('save-data').addEventListener('click',saveData);
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();void saveData();}});
window.addEventListener('beforeunload',event=>{if(dirty()||state.uploading){event.preventDefault();event.returnValue='';}});
await loadCollection(state.name);
