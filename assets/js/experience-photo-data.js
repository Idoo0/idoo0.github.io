import {isDetailLinkUrl} from './detail-data.js';
import {githubRepository} from './github-repo-data.js';

export function experiencePhotos(images) {
  return (Array.isArray(images) ? images : []).slice(0,3).map(photo => {
    const value=typeof photo==='string'?{src:photo}:photo||{};
    const text=key=>typeof value[key]==='string'?value[key]:'';
    const url=text('url').trim();
    if (value.mode==='github') {
      const repo=githubRepository(url);
      return {
        src:repo?(text('src').trim()||repo.thumbnail):'',alt:text('alt')||(repo?`GitHub repository ${repo.name}`:''),mode:'github',
        url:repo?.url||'',label:text('label').trim()||repo?.name||'GitHub repository'
      };
    }
    return {
      src:text('src').trim(),alt:text('alt'),mode:value.mode==='link'?'link':'photo',
      url:isDetailLinkUrl(url)?url:'',label:text('label').trim()||'Open link'
    };
  }).filter(photo=>photo.mode==='photo'?Boolean(photo.src):Boolean(photo.url));
}
