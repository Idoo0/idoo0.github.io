import test from 'node:test';
import assert from 'node:assert/strict';
import {photoThumbnailPath,setPhotoSource} from '../assets/js/photo-source.js';

test('Small photos keep the full image for zoom and fall back when an old upload has no preview',()=>{
  const source='assets/experience/pkm-images-demo.webp';
  const image={dataset:{},addEventListener(name,handler){this[name]=handler;}};
  let removed=false;
  setPhotoSource(image,source,{thumbnail:true,onError:()=>{removed=true;}});
  assert.equal(image.src,'assets/experience/pkm-images-demo.preview.webp');
  assert.equal(image.dataset.fullSrc,source);
  image.error();
  assert.equal(image.src,source,'Missing preview uses the full-resolution image.');
  assert.equal(removed,false,'A missing preview must not hide a valid original.');
  image.error();assert.equal(removed,true,'A broken original still invokes the existing placeholder behavior.');
});

test('External images and large cards keep their original source',()=>{
  for (const source of ['https://example.com/image.webp','assets/projects/cover.webp','assets/achievements/photo.png','assets/achievements/photo.preview.webp']) assert.equal(photoThumbnailPath(source),'');
  const image={dataset:{},addEventListener(){}};
  const source='assets/achievements/photo.webp';
  setPhotoSource(image,source);
  assert.equal(image.src,source);
});
