import {maxOriginalImageBytes} from './image-policy.js';

export const imageAccept = 'image/jpeg,image/png,image/webp,image/avif,image/gif';
const formats = new Set(imageAccept.split(','));
export const formatBytes = size => size >= 1024*1024 ? `${(size/1024/1024).toFixed(1)} MB` : `${Math.max(1,Math.round(size/1024))} KB`;

async function decodeImage(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file,{imageOrientation:'from-image'});
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();image.src=url;await image.decode();return image;
  } finally {URL.revokeObjectURL(url);}
}

const webpBlob = async (canvas,quality) => {
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
  if (!blob || blob.type!=='image/webp') throw new Error('Browser ini belum mendukung konversi WebP. Gunakan Chrome atau Edge.');
  return blob;
};

function createSmallPreview(image,width,height) {
  // Resize in steps so fine lines survive large reductions; work only during upload.
  let source=image,sourceWidth=image.naturalWidth||image.width,sourceHeight=image.naturalHeight||image.height;
  while (sourceWidth>width*2 || sourceHeight>height*2) {
    const step=document.createElement('canvas');
    step.width=Math.max(width,Math.round(sourceWidth/2));step.height=Math.max(height,Math.round(sourceHeight/2));
    const context=step.getContext('2d');
    if (!context) throw new Error('Browser tidak dapat memproses gambar.');
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    context.drawImage(source,0,0,step.width,step.height);
    source=step;sourceWidth=step.width;sourceHeight=step.height;
  }
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');
  if (!context) throw new Error('Browser tidak dapat memproses gambar.');
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  context.drawImage(source,0,0,width,height);
  // A gentle, bounded edge boost at thumbnail size, never a live CSS/SVG filter.
  const pixels=context.getImageData(0,0,width,height),before=new Uint8ClampedArray(pixels.data),stride=width*4;
  for (let y=1;y<height-1;y++) for (let x=1;x<width-1;x++) {
    const index=y*stride+x*4;
    if (before[index+3]!==255) continue;
    for (let channel=0;channel<3;channel++) {
      const offset=index+channel;
      const blur=(before[offset]*4+before[offset-4]+before[offset+4]+before[offset-stride]+before[offset+stride])/8;
      const edge=before[offset]-blur;
      if (Math.abs(edge)>2) pixels.data[offset]=before[offset]+Math.max(-8,Math.min(8,edge*.24));
    }
  }
  context.putImageData(pixels,0,0);
  return canvas;
}

export async function convertImage(file,policy) {
  if (!formats.has(file.type)) throw new Error('Gunakan gambar JPG, PNG, WebP, AVIF, atau GIF.');
  if (!file.size || file.size>maxOriginalImageBytes) throw new Error('Ukuran gambar maksimal 25 MB.');
  let image;
  try {image=await decodeImage(file);} catch {throw new Error('Gambar tidak dapat dibaca. Coba simpan sebagai JPG atau PNG.');}
  try {
    const originalWidth=image.naturalWidth||image.width,originalHeight=image.naturalHeight||image.height;
    if (!originalWidth || !originalHeight || originalWidth*originalHeight>60000000) throw new Error('Resolusi gambar terlalu besar. Gunakan gambar di bawah 60 megapixel.');
    const square=policy.fit==='square';
    const scale=Math.min(policy.width/originalWidth,policy.height/originalHeight,square?Infinity:1);
    const drawnWidth=Math.max(1,Math.round(originalWidth*scale)),drawnHeight=Math.max(1,Math.round(originalHeight*scale));
    const canvas=document.createElement('canvas');canvas.width=square?policy.width:drawnWidth;canvas.height=square?policy.height:drawnHeight;
    const context=canvas.getContext('2d');
    if (!context) throw new Error('Browser tidak dapat memproses gambar.');
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    context.drawImage(image,(canvas.width-drawnWidth)/2,(canvas.height-drawnHeight)/2,drawnWidth,drawnHeight);
    const blob=await webpBlob(canvas,policy.quality);
    let preview;
    if (policy.preview) {
      const scale=Math.min(policy.preview.width/originalWidth,policy.preview.height/originalHeight,1);
      const width=Math.max(1,Math.round(originalWidth*scale)),height=Math.max(1,Math.round(originalHeight*scale));
      preview={blob:await webpBlob(createSmallPreview(image,width,height),policy.preview.quality),width,height};
    }
    return {blob,width:canvas.width,height:canvas.height,preview};
  } finally {image.close?.();}
}

export async function uploadImage(file,{collection,field,itemId,policy}) {
  const converted=await convertImage(file,policy);
  const query=new URLSearchParams({item:itemId||collection});
  const send=async blob=>{
    const response=await fetch(`api/images/${collection}/${field}?${query}`,{method:'POST',headers:{'Content-Type':'image/webp'},body:blob});
    const result=await response.json();
    if (!response.ok) throw new Error(result.error||'Gambar belum dapat disimpan.');
    return result;
  };
  const result=await send(converted.blob);
  if (converted.preview) {
    query.set('previewOf',result.path.split('/').pop());
    result.preview=await send(converted.preview.blob);
  }
  return result;
}

export function previewPath(path) {
  if (!path) return '';
  const root=new URL('../',document.baseURI);
  try {const url=new URL(path,root);return ['http:','https:'].includes(url.protocol)?url.href:'';} catch {return '';}
}
