import {projectDetails,achievementDetails,detailContentFields,detailCopyBlocks} from './detail-data.js';
import {createRevealController} from './reveal.js';
import {projectCategories,projectFilterCategories,projectView,projectPeriod} from './project-data.js';
import {achievementDate,achievementGroups} from './achievement-data.js';
import {createPhotoViewer} from './photo-viewer.js';
import {setPhotoSource} from './photo-source.js';
import {experiencePhotos} from './experience-photo-data.js';
import {onContentSaved} from './content-sync.js';
import {experienceRoles,experienceRoleCategories,experienceView} from './experience-data.js';

export const ready = (async () => {
      'use strict';
      const pendingData = [];
      const photoViewer = createPhotoViewer();
      const loadSettings = async name => {
        try {
          const response = await fetch(`./data/${name}.json`,{cache:'no-store'});
          if (!response.ok) throw new Error(`${name} could not load.`);
          return await response.json();
        } catch (error) { console.warn(error); return {}; }
      };
      const [heroSettings,aboutSettings] = await Promise.all([loadSettings('hero'),loadSettings('about')]);
      const world = document.getElementById('world');
      const board = document.getElementById('billboard');
      const lever = document.getElementById('lever');
      const arm = lever.querySelector('.lever-arm');
      const soundButton = document.getElementById('sound-toggle');
      const techStack = document.getElementById('tech-stack');
      const treeButton = document.getElementById('tree-button');
      const treeArea = treeButton.closest('.tree-area');
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const reveals = createRevealController(reducedMotion);
      const roles = [
        { key:'software', title:'Software', stack:[['cpp','C++'],['java','Java'],['js','JavaScript']], notes:[392,493.88,587.33] },
        { key:'ai', title:'AI', stack:[['python','Python'],['langchain','LangChain'],['gemini','Gemini']], notes:[440,554.37,659.25] },
        { key:'data', title:'Data', stack:[['pandas','pandas'],['kafka','Kafka'],['hadoop','Hadoop']], notes:[349.23,440,523.25] }
      ];
      if (heroSettings.name) {
        const name = document.getElementById('name');
        const period = name.querySelector('.period');
        name.replaceChildren(document.createTextNode(heroSettings.name),period);
      }
      if (heroSettings.brand) document.querySelector('.brand-label').textContent = heroSettings.brand;
      if (heroSettings.portrait) treeButton.querySelector('image').setAttribute('href',heroSettings.portrait);
      if (heroSettings.background) document.querySelector('.landscape img').src = heroSettings.background;
      if (heroSettings.intro) document.querySelector('.role-intro').textContent = heroSettings.intro;
      if (heroSettings.scrollLabel) document.querySelector('.scroll-cue span').textContent = heroSettings.scrollLabel;
      if (Array.isArray(heroSettings.roles)) heroSettings.roles.forEach(setting => {
        const role = roles.find(role => role.key === setting.key);
        if (!role) return;
        if (typeof setting.title === 'string') role.title = setting.title;
        if (Array.isArray(setting.stack) && setting.stack.length) role.stack = setting.stack;
      });
      document.getElementById('role-specialty').textContent = roles[0].title;
      renderStack(roles[0]);
      lever.setAttribute('aria-label',`Pull the lever: switch to ${roles[1].title} Engineer`);
      let index = 0, busy = false, moving = !reducedMotion.matches;
      let audio = null, master = null, ambience = null, soundOn = true;
      let dragging = false, pointerId = null, startY = 0, dragDistance = 0, suppressClick = false;
      let frame = 0, heroVisible = true;
      let gustTimer = 0;
      const gustLeaves = document.querySelector('.gust-leaves');

      function tone(frequency, start, duration, volume = .09, type = 'sine') {
        if (!audio || !master || !soundOn || audio.state !== 'running') return;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + .018);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(gain); gain.connect(master);
        oscillator.start(start); oscillator.stop(start + duration + .02);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }

      function playLeverSound(role) {
        if (!soundOn || !audio) return;
        const now = audio.currentTime;
        tone(130, now, .09, .11, 'triangle');
        role.notes.forEach((frequency, i) => tone(frequency, now + .12 + i * .08, .42, .065));
      }

      function syncSoundUI() {
        soundButton.setAttribute('aria-pressed', String(soundOn));
        const description = soundOn ? 'Turn off nature and lever sounds' : 'Turn on nature and lever sounds';
        soundButton.setAttribute('aria-label', description);
        soundButton.title = description;
        document.getElementById('sound-label').textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';
        soundButton.dataset.audioState = audio ? audio.state : 'pending';
      }

      function createAudio() {
        if (audio) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) throw new Error('Web Audio unavailable');
        audio = new AudioContext();
        master = audio.createGain(); master.gain.value = 0; master.connect(audio.destination);
        const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
        const channel = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < channel.length; i++) { last = (last + (Math.random() * 2 - 1) * .025) / 1.025; channel[i] = last * 2.8; }
        ambience = audio.createBufferSource(); ambience.buffer = buffer; ambience.loop = true;
        const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 620;
        const windGain = audio.createGain(); windGain.gain.value = .14;
        ambience.connect(filter); filter.connect(windGain); windGain.connect(master); ambience.start();
        audio.addEventListener('statechange', () => { soundButton.dataset.audioState = audio.state; });
        syncSoundUI();
      }

      async function startSound() {
        if (!soundOn || document.hidden) return;
        try {
          createAudio();
          await audio.resume();
          if (soundOn && !document.hidden) {
            master.gain.cancelScheduledValues(audio.currentTime);
            master.gain.setTargetAtTime(.55, audio.currentTime, .25);
          }
        } catch (_) {
          soundButton.dataset.audioState = 'unavailable';
        }
      }

      function toggleSound() {
        soundOn = !soundOn;
        syncSoundUI();
        if (soundOn) { void startSound(); }
        else if (master) {
          master.gain.cancelScheduledValues(audio.currentTime);
          master.gain.setTargetAtTime(0, audio.currentTime, .12);
        }
      }

      // Autoplay is attempted normally; the first gesture unlocks browsers that require it.
      function unlockSound(event) {
        if (event.target instanceof Element && event.target.closest('#sound-toggle')) return;
        if (soundOn && (!audio || audio.state !== 'running')) void startSound();
      }
      document.addEventListener('pointerdown', unlockSound, {capture:true, passive:true});
      document.addEventListener('keydown', unlockSound, {capture:true});
      document.addEventListener('click', unlockSound, {capture:true, passive:true});

      function renderStack(role) {
        techStack.setAttribute('aria-label', `Tech stack ${role.title} Engineer`);
        techStack.replaceChildren(...role.stack.map(([icon, label]) => {
          const badge = document.createElement('li'); badge.className = 'tech-badge';
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('aria-hidden', 'true');
          const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
          use.setAttribute('href', `#tech-${icon}`); svg.append(use);
          const text = document.createElement('span'); text.textContent = label;
          badge.append(svg, text); return badge;
        }));
      }

      function setRole(next) {
        if (busy || next === index) return;
        busy = true; index = next;
        const role = roles[index];
        board.dataset.role = role.key;
        document.getElementById('role-specialty').textContent = role.title;
        renderStack(role);
        document.getElementById('role-announcement').textContent = `${role.title} Engineer. ${role.stack.map(item => item[1]).join(', ')}.`;
        lever.setAttribute('aria-label', `Pull the lever: switch to ${roles[(index + 1) % roles.length].title} Engineer`);
        board.classList.add('changing');
        playLeverSound(role);
        if (moving && !reducedMotion.matches) {
          clearTimeout(gustTimer);
          world.classList.remove('gusting');
          void gustLeaves.offsetWidth;
          world.classList.add('gusting');
          gustTimer = window.setTimeout(() => world.classList.remove('gusting'), 1650);
        }
        window.setTimeout(() => { board.classList.remove('changing'); busy = false; }, reducedMotion.matches ? 40 : 670);
      }

      function pullLever() {
        if (busy) return;
        arm.style.setProperty('--pull', '137deg');
        setRole((index + 1) % roles.length);
        window.setTimeout(() => arm.style.removeProperty('--pull'), 290);
      }

      lever.addEventListener('pointerdown', (event) => {
        if (busy || (event.pointerType === 'mouse' && event.button !== 0)) return;
        dragging = true; pointerId = event.pointerId; startY = event.clientY; dragDistance = 0; suppressClick = false;
        lever.setPointerCapture(event.pointerId);
        arm.style.transition = 'none';
      });
      lever.addEventListener('pointermove', (event) => {
        if (!dragging || event.pointerId !== pointerId) return;
        dragDistance = Math.max(0, event.clientY - startY);
        arm.style.setProperty('--pull', `${27 + Math.min(dragDistance / 75, 1) * 110}deg`);
      });
      function endDrag(event, cancelled = false) {
        if (!dragging || event.pointerId !== pointerId) return;
        dragging = false; arm.style.transition = '';
        if (lever.hasPointerCapture(event.pointerId)) lever.releasePointerCapture(event.pointerId);
        if (!cancelled && dragDistance > 20) { suppressClick = true; pullLever(); } else { arm.style.removeProperty('--pull'); }
        pointerId = null;
      }
      lever.addEventListener('pointerup', event => endDrag(event));
      lever.addEventListener('pointercancel', event => endDrag(event, true));
      lever.addEventListener('lostpointercapture', event => endDrag(event, true));
      lever.addEventListener('click', event => {
        if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
        suppressClick = false; pullLever();
      });

      let treeReleaseTimer = 0, treePressedAt = 0, treePointer = null, treeFrame = 0, treeCursorX = 0, treeCursorY = 0;
      function pressTree() {
        clearTimeout(treeReleaseTimer);
        treePressedAt = performance.now();
        treeButton.classList.add('is-pressed');
      }
      function releaseTree(immediate = false) {
        clearTimeout(treeReleaseTimer);
        const delay = immediate || reducedMotion.matches ? 0 : Math.max(0, 260 - (performance.now() - treePressedAt));
        treeReleaseTimer = window.setTimeout(() => {
          treeButton.classList.remove('is-pressed');
        }, delay);
      }
      function resetTreeTilt() {
        cancelAnimationFrame(treeFrame); treeFrame = 0;
        treeButton.style.setProperty('--tree-rx', '0deg');
        treeButton.style.setProperty('--tree-ry', '0deg');
      }
      function tiltCanopy(event) {
        if (!moving || !heroVisible || document.hidden || reducedMotion.matches || (event.pointerType !== 'mouse' && event.pointerId !== treePointer)) return;
        treeCursorX = event.clientX; treeCursorY = event.clientY;
        if (treeFrame) return;
        treeFrame = requestAnimationFrame(() => {
          const rect = treeArea.getBoundingClientRect();
          const x = Math.max(-.5, Math.min(.5, (treeCursorX - rect.left) / rect.width - .5));
          const y = Math.max(-.5, Math.min(.5, (treeCursorY - rect.top) / (rect.height * .74) - .5));
          treeButton.style.setProperty('--tree-rx', `${-y * 7}deg`);
          treeButton.style.setProperty('--tree-ry', `${x * 12}deg`);
          treeFrame = 0;
        });
      }
      treeButton.addEventListener('pointermove', tiltCanopy);
      treeButton.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        treePointer = event.pointerId; treeButton.setPointerCapture(treePointer); tiltCanopy(event); pressTree();
      });
      function endTreePointer(event) {
        if (event.pointerId !== treePointer) return;
        const id = treePointer; treePointer = null;
        if (treeButton.hasPointerCapture(id)) treeButton.releasePointerCapture(id);
        releaseTree(); resetTreeTilt();
      }
      treeButton.addEventListener('pointerup', endTreePointer);
      treeButton.addEventListener('pointercancel', endTreePointer);
      treeButton.addEventListener('lostpointercapture', endTreePointer);
      treeButton.addEventListener('pointerleave', () => { if (treePointer === null) resetTreeTilt(); });
      treeButton.addEventListener('keydown', event => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); pressTree(); }
      });
      treeButton.addEventListener('keyup', event => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); releaseTree(); }
      });
      treeButton.addEventListener('click', event => { if (event.detail === 0) { pressTree(); releaseTree(); } });
      treeButton.addEventListener('blur', () => { releaseTree(true); resetTreeTilt(); });
      window.addEventListener('blur', () => { treePointer = null; releaseTree(true); resetTreeTilt(); });

      function updateMotion() {
        world.classList.toggle('still', !moving);
        if (!moving) { world.style.setProperty('--px', '0px'); world.style.setProperty('--py', '0px'); }
        if (!moving) resetTreeTilt();
      }
      reducedMotion.addEventListener('change', () => { moving = !reducedMotion.matches; updateMotion(); });
      // Scenery only needs to animate while it can actually be seen.
      const motionScenes = new Map([...document.querySelectorAll('#world,.contact-scene')].map(scene => [scene,true]));
      function syncSceneMotion(scene,visible) {
        scene.classList.toggle('motion-idle',!visible || document.hidden);
        if (scene === world) {
          heroVisible = visible;
          if (!visible || document.hidden) { cancelAnimationFrame(frame); frame = 0; cancelAnimationFrame(treeFrame); treeFrame = 0; }
        }
      }
      const sceneObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
        entries.forEach(entry => { motionScenes.set(entry.target,entry.isIntersecting); syncSceneMotion(entry.target,entry.isIntersecting); });
      },{threshold:0}) : null;
      motionScenes.forEach((visible,scene) => { syncSceneMotion(scene,visible); sceneObserver?.observe(scene); });
      world.addEventListener('pointermove', event => {
        if (!moving || !heroVisible || document.hidden || reducedMotion.matches || event.pointerType !== 'mouse' || innerWidth <= 760 || frame) return;
        frame = requestAnimationFrame(() => {
          world.style.setProperty('--px', `${(event.clientX / innerWidth - .5) * 18}px`);
          world.style.setProperty('--py', `${(event.clientY / innerHeight - .5) * 12}px`);
          frame = 0;
        });
      });
      world.addEventListener('pointerleave', () => { world.style.setProperty('--px', '0px'); world.style.setProperty('--py', '0px'); });
      soundButton.addEventListener('click', toggleSound);
      document.addEventListener('visibilitychange', () => {
        motionScenes.forEach((visible,scene) => syncSceneMotion(scene,visible));
        if (document.hidden) { if (audio) audio.suspend().catch(() => {}); }
        else if (soundOn) void startSound();
      });
      updateMotion();
      syncSoundUI();
      void startSound();

      // Edit experience.json to update roles, logo paths, and 1–3 collage images.
      const experienceList = document.getElementById('experience-list');
      const experienceFilters = document.getElementById('experience-filters');
      const experienceStatus = document.getElementById('experience-status');
      const experiencePagination = document.getElementById('experience-pagination');
      const experienceMoreButton = document.getElementById('experience-load-more');
      const experiencesPerPage = 5;
      let experienceJourney = [];
      let activeExperienceRole = '';
      let visibleExperienceCount = 0;
      const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
      const logoPlaceholder = '<span class="experience-logo-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="9" r="1.5" stroke="currentColor" stroke-width="1.3"/><path d="m4 18 5-5 4 3 3-4 4 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>LOGO</span></span>';
      const workTypeIcon = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5.5 5V3h5v2M2.5 5.5h11v8h-11zM2.5 9h11M6.5 8h3v2h-3z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>';
      const durationIcon = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.1"/><path d="M8 4.5V8l2.5 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>';
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const collageSpacing = new WeakMap();
      const stackedExperience = window.matchMedia('(max-width:900px)');
      function syncCollageSpacing(details,measuredHeight) {
        if (!details?.isConnected) return;
        const collage = details.closest('.experience-content')?.querySelector('.experience-collage');
        if (!collage || Number(collage.dataset.count) < 2) return;
        const extra = details.open && !stackedExperience.matches ? Math.round(measuredHeight ?? details.querySelector('ul').offsetHeight) : 0;
        const previous = collageSpacing.get(collage) || {extra:0,timer:0};
        if (previous.extra === extra) return;
        clearTimeout(previous.timer);
        const next = {extra,timer:0};collageSpacing.set(collage,next);
        collage.style.setProperty('--collage-extra',`${extra}px`);
        if (extra || reducedMotion.matches) collage.style.setProperty('--collage-space',`${extra}px`);
        else {
          // Reserve space until the photos settle; never tween the layout height.
          next.timer = window.setTimeout(() => collage.style.setProperty('--collage-space','0px'),180);
        }
      }
      const collageObserver = 'ResizeObserver' in window ? new ResizeObserver(entries => {
        entries.forEach(entry => {
          const details = entry.target.closest('details');
          if (details?.open) syncCollageSpacing(details,entry.borderBoxSize?.[0]?.blockSize ?? entry.target.offsetHeight);
        });
      }) : null;
      stackedExperience.addEventListener('change',() => {
        experienceList.querySelectorAll('.experience-details').forEach(details => syncCollageSpacing(details));
      });
      const monthIndex = date => Number(date.slice(0,4)) * 12 + Number(date.slice(5,7)) - 1;
      const formatExperienceDate = date => date ? `${monthNames[Number(date.slice(5,7)) - 1]} ${date.slice(0,4)}` : 'Present';
      const experienceDuration = item => {
        const today = new Date();
        const finalMonth = item.end ? monthIndex(item.end) : today.getFullYear() * 12 + today.getMonth();
        // Month-only dates use inclusive counting, matching the displayed date range.
        const months = Math.max(1, finalMonth - monthIndex(item.start) + 1);
        return `${months} ${months === 1 ? 'month' : 'months'}`;
      };

      function createExperienceCollage(item) {
        const collage = document.createElement('div');
        collage.className = 'experience-collage';
        collage.dataset.count = item.images.length;
        collage.dataset.layout = item.sourceIndex % 3;
        collage.setAttribute('role', 'group');
        collage.setAttribute('aria-label', `Photos and links from ${item.title} at ${item.company}`);
        item.images.forEach((photo, index) => {
          const frame = document.createElement('figure');
          frame.className = 'experience-photo';
          frame.innerHTML = `<div class="experience-photo-window"><span class="experience-photo-placeholder" role="img" aria-label="Photo placeholder ${index + 1} for ${escapeHTML(item.title)}"><svg viewBox="0 0 40 32" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="29" rx="3" stroke="currentColor" stroke-width="1.2"/><circle cx="28" cy="9" r="3" stroke="currentColor" stroke-width="1.2"/><path d="m3 27 10-13 10 10 5-6 9 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>PHOTO ${String(index + 1).padStart(2, '0')}</span></span></div>`;
          if (photo.src) {
            const image = document.createElement('img');
            image.alt = photo.alt || `${item.title} at ${item.company}, photo ${index + 1}`;
            image.loading = 'lazy';
            image.decoding = 'async';
            image.addEventListener('load', () => frame.classList.add('has-image'), {once:true});
            setPhotoSource(image,photo.src,{thumbnail:true,onError:() => image.remove()});
            frame.querySelector('.experience-photo-window').appendChild(image);
            if (photo.mode==='photo') photoViewer.attach(frame.querySelector('.experience-photo-window'),image);
          }
          if (['link','github'].includes(photo.mode) && photo.url) {
            frame.classList.add('is-link');
            if (photo.mode==='github') {
              frame.classList.add('is-github');
              frame.querySelector('.experience-photo-placeholder').setAttribute('aria-label',`GitHub repository ${photo.label}`);
            }
            frame.querySelector('.experience-photo-placeholder span').textContent=photo.mode==='github'?photo.label:`LINK ${String(index+1).padStart(2,'0')}`;
            const link=document.createElement('a');
            link.className='experience-photo-link';
            link.href=photo.url;link.target='_blank';link.rel='noopener noreferrer';
            link.setAttribute('aria-label',`${photo.label} (opens in a new tab)`);
            link.innerHTML='<span class="experience-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M14 4h6v6M20 4l-9 9M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
            const label=document.createElement('span');label.className='experience-link-label';label.textContent=photo.label;label.setAttribute('aria-hidden','true');
            link.appendChild(label);frame.appendChild(link);
          }
          collage.appendChild(frame);
        });
        return collage;
      }

      function renderExperienceFilters() {
        const roles = experienceRoles.filter(role => experienceJourney.some(item => experienceRoleCategories(item).includes(role)));
        if (!roles.includes(activeExperienceRole)) activeExperienceRole = '';
        experienceFilters.replaceChildren(...['',...roles].map(role => {
          const button = document.createElement('button');
          button.type = 'button';button.className = 'project-filter experience-filter';button.dataset.role = role;
          button.textContent = role || 'All roles';
          button.setAttribute('aria-controls','experience-list');
          button.addEventListener('click',() => {
            if (activeExperienceRole === role) return;
            activeExperienceRole = role;renderExperiences();
          });
          return button;
        }));
      }

      function renderExperiences(append = false) {
        const experiences = experienceView(experienceJourney,activeExperienceRole);
        if (append && visibleExperienceCount >= experiences.length) return;
        if (!append) {
          reveals.forget(experienceList);
          experienceList.querySelectorAll('.experience-details ul').forEach(list => collageObserver?.unobserve(list));
          experienceList.querySelectorAll('.experience-collage').forEach(collage => clearTimeout(collageSpacing.get(collage)?.timer));
          experienceList.replaceChildren();
          visibleExperienceCount = 0;
        }
        const start = visibleExperienceCount;
        const visible = experiences.slice(start,start + experiencesPerPage);
        visibleExperienceCount += visible.length;
        const fragment = document.createDocumentFragment();
        visible.forEach((item, index) => {
          const position = start + index;
          const entry = document.createElement('li');
          entry.className = 'experience-entry';
          entry.dataset.experienceId = item.id;
          const details = item.details.length
            ? `<details class="experience-details"><summary aria-label="Show details: ${escapeHTML(item.title)} at ${escapeHTML(item.company)}">Show details</summary><ul>${item.details.map(detail => `<li>${escapeHTML(detail)}</li>`).join('')}</ul></details>`
            : '';
          const endDate = item.end
            ? `<time datetime="${item.end}">${formatExperienceDate(item.end)}</time>`
            : '<span>Present</span>';
          entry.innerHTML = `<div class="experience-date">
              <time class="experience-date-start" datetime="${item.start}">${formatExperienceDate(item.start)}</time>
              <span class="experience-date-end"><span aria-hidden="true">–</span>${endDate}</span>
            </div>
            <div class="experience-track" aria-hidden="true"><span class="experience-dot"></span></div>
            <article class="experience-content${item.images.length ? ' has-collage' : ''}" aria-labelledby="experience-role-${position}">
              <div class="experience-copy">
              <div class="experience-identity">
                <span class="experience-logo" role="img" aria-label="${escapeHTML(item.company)} logo placeholder">${logoPlaceholder}</span>
                <div class="experience-identity-text">
                  <div class="experience-role-line"><h3 class="experience-role" id="experience-role-${position}">${escapeHTML(item.title)}</h3></div>
                  <p class="experience-company">${escapeHTML(item.company)}</p>
                </div>
              </div>
              <div class="experience-badges">
                <span class="experience-badge experience-type" aria-label="Work type: ${escapeHTML(item.type)}">${workTypeIcon}${escapeHTML(item.type)}</span>
                <span class="experience-badge experience-duration" aria-label="Duration: ${experienceDuration(item)}">${durationIcon}${experienceDuration(item)}</span>
              </div>
              ${item.summary ? `<p class="experience-summary">${escapeHTML(item.summary)}</p>` : ''}
              ${!item.summary && item.location ? `<p class="experience-location">${escapeHTML(item.location)}</p>` : ''}${details}
              </div>
            </article>`;
          if (item.images.length) {
            entry.querySelector('.experience-content').appendChild(createExperienceCollage(item));
            const details = entry.querySelector('.experience-details');
            if (details && item.images.length > 1) {
              details.addEventListener('toggle',() => syncCollageSpacing(details));
              collageObserver?.observe(details.querySelector('ul'));
            }
          }
          if (item.logo) {
            const logoSlot = entry.querySelector('.experience-logo');
            const logo = document.createElement('img');
            logo.src = item.logo;
            logo.alt = '';
            logo.loading = 'lazy';
            logo.decoding = 'async';
            logo.addEventListener('load', () => {
              logoSlot.classList.add('has-logo');
              logoSlot.setAttribute('aria-label', `${item.company} logo`);
            }, {once:true});
            logo.addEventListener('error', () => logo.remove(), {once:true});
            logoSlot.appendChild(logo);
          }
          fragment.appendChild(entry);
        });
        if (!visible.length) {
          const message = document.createElement('li');
          message.className = 'experience-load-message';
          message.textContent = 'No experiences to show yet.';
          fragment.appendChild(message);
        }
        const addedEntries = [...fragment.children];
        experienceList.appendChild(fragment);
        reveals.observe(addedEntries.flatMap(entry => [...entry.querySelectorAll('.experience-date,.experience-track,.experience-copy,.experience-collage')]),45);
        experienceList.setAttribute('aria-label', activeExperienceRole || 'All experiences');
        experienceFilters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.role === activeExperienceRole)));
        const restoreFocus = append && document.activeElement === experienceMoreButton;
        experiencePagination.hidden = visibleExperienceCount >= experiences.length;
        if (!experiencePagination.hidden) reveals.observe([experiencePagination]);
        experienceStatus.textContent = `Showing ${visibleExperienceCount} of ${experiences.length} experiences.`;
        // Preserve keyboard focus when the last batch removes Show more.
        if (restoreFocus && experiencePagination.hidden) {
          const heading = addedEntries[0]?.querySelector('.experience-role');
          if (heading) {heading.tabIndex = -1;heading.focus({preventScroll:true});}
        }
      }
      experienceMoreButton.addEventListener('click',() => renderExperiences(true));

      async function loadExperiences() {
        experienceList.setAttribute('aria-busy', 'true');
        try {
          const response = await fetch('./data/experience.json', {cache:'no-store'});
          if (!response.ok) throw new Error(`Experience request failed: ${response.status}`);
          const data = await response.json();
          if (!Array.isArray(data)) throw new Error('experience.json must contain an array.');
          const validMonth = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
          experienceJourney = data.map((item, sourceIndex) => {
            if (!item || typeof item.title !== 'string' || typeof item.company !== 'string' || !validMonth(item.start)
              || (item.end != null && !validMonth(item.end)) || (item.end && item.end < item.start)) {
              throw new Error(`Invalid experience at index ${sourceIndex}. Use YYYY-MM dates and null for an ongoing end date.`);
            }
            return {
              ...item,
              id: String(item.id || `experience-${sourceIndex}`),
              type: typeof item.type === 'string' && item.type.trim() ? item.type : 'Not specified',
              end: item.end ?? null,
              roles: experienceRoleCategories(item),
              logo: typeof item.logo === 'string' ? item.logo : '',
              images:experiencePhotos(item.images),
              summary: typeof item.summary === 'string' ? item.summary : '',
              location: typeof item.location === 'string' ? item.location : '',
              details: Array.isArray(item.details) ? item.details.filter(detail => typeof detail === 'string') : [],
              sourceIndex
            };
          }).sort((a, b) => (b.end ?? '9999-12').localeCompare(a.end ?? '9999-12') || b.start.localeCompare(a.start) || a.sourceIndex - b.sourceIndex);
          renderExperienceFilters();
          renderExperiences();
        } catch (error) {
          console.error('Could not load experience.json:', error);
          experiencePagination.hidden = true;
          experienceList.innerHTML = '<li class="experience-load-message">Experiences could not be loaded. Please refresh the page.</li>';
          experienceStatus.textContent = 'Experiences could not be loaded.';
        } finally {
          experienceList.setAttribute('aria-busy', 'false');
        }
      }
      pendingData.push(loadExperiences());

      const projectsGrid = document.getElementById('projects-grid');
      const projectFilters = document.getElementById('project-filters');
      const projectsPagination = document.getElementById('projects-pagination');
      const projectsMoreButton = document.getElementById('projects-show-more');
      const projectsPerPage = 6;
      let projectCollection = [];
      let activeProjectCategory = 'Selected';
      let visibleProjectCount = 0;
      const projectsStatus = document.getElementById('projects-status');
      const projectDialog = document.getElementById('project-dialog');
      const projectDialogContent = document.getElementById('project-dialog-content');
      const projectDialogClose = document.getElementById('project-dialog-close');
      let lastProjectTrigger = null;
      const projectDrawings = {
        vision: `<g transform="rotate(-4 160 96)"><rect x="100" y="37" width="124" height="108" rx="7" fill="#f4f1df"/><path d="M114 55h16m-16 0v16m96-16h-16m16 0v16m-96 57h16m-16 0v-16m96 16h-16m16 0v-16" stroke="#91a777"/><path d="M151 113c-30-12-29-43 20-48 12 25 8 50-20 48Z" fill="#a4bc7e"/><path d="m148 118 27-43m-17 28-13-3m20-8 9-2"/><path d="M123 132h35m5 0h27" stroke="#a89d65"/></g><path d="M59 139v-35m0 12c-17-1-22-11-21-21 14 0 21 8 21 21m0-10c2-17 11-23 22-22-1 14-10 21-22 22" fill="#b1c693"/><path d="M45 136h29l-5 19H50z" fill="#bba078"/><path d="m246 57 5-4m-4 14 8 1" stroke="#9b9d6b"/>`,
        agent: `<g transform="rotate(-6 100 83)"><path d="M71 39h44l13 13v64H71z" fill="#f3f0df"/><path d="M115 39v14h13M82 66h30m-30 10h24m-24 10h30m-30 10h18" stroke="#8b9e83"/></g><rect x="132" y="62" width="111" height="78" rx="7" fill="#edf0e5"/><path d="M143 75h59v20h-13l-8 7v-7h-38z" fill="#c3d3b7"/><path d="M169 107h61v20h-12l-8 6v-6h-41z" fill="#d4decf"/><path d="M152 84h38m-13 33h42" stroke="#83957c"/><path d="M65 140h58v12H65zm5-12h51v12H70z" fill="#bba778"/><path d="M82 128v12m12 0v12M111 113l16 9" stroke="#8b8d63" stroke-dasharray="3 4"/><path d="m252 44 3-7m5 15 6-1" stroke="#b0a16b"/>`,
        recommendation: `<g transform="rotate(-7 109 96)"><rect x="70" y="52" width="74" height="99" rx="6" fill="#f2efdf"/><path d="M85 70h42v45H85z" fill="#ccd7b7"/><path d="m93 83 8-5 7 3 7-3 7 5-5 10-5-3v16h-15V90l-5 3z" fill="#a3b482"/><path d="M86 128h26m-26 9h38" stroke="#a6aa87"/></g><g transform="rotate(8 211 98)"><rect x="176" y="57" width="73" height="95" rx="6" fill="#eeebd9"/><path d="M190 73h44v42h-44z" fill="#d0d9c0"/><path d="M204 105c-18-5-13-24 11-23 5 13-2 26-11 23Z" fill="#93ac76"/><path d="M192 129h35m-35 9h22" stroke="#a6aa87"/></g><rect x="122" y="36" width="81" height="113" rx="7" fill="#f7f3df" stroke="#829a64" stroke-width="2"/><path d="M136 55h53v54h-53z" fill="#bbcda1"/><path d="m148 86 11 7 16-20" stroke="#648255" stroke-width="3"/><path d="M138 123h31m-31 10h48" stroke="#8c9d72"/><circle cx="204" cy="45" r="11" fill="#c6b474"/><path d="m199 45 4 3 6-7"/>`,
        pipeline: `<path d="M77 95h62m38 0h61" stroke="#91a292" stroke-width="7"/><path d="m124 91 7 4-7 4m101-8 7 4-7 4" stroke="#f1f1df"/><g fill="#eef0e0"><path d="M47 71v51c0 13 53 13 53 0V71z"/><ellipse cx="73.5" cy="71" rx="26.5" ry="9"/><path d="M58 104h30m-30 11h24" stroke="#a1b193"/></g><g fill="#c1d1b5"><path d="M135 64v59c0 13 53 13 53 0V64z"/><ellipse cx="161.5" cy="64" rx="26.5" ry="9"/><path d="M147 94h30m-30 11h23m-23 11h30" stroke="#859c78"/></g><g fill="#e9eddc"><path d="M224 77v44c0 13 53 13 53 0V77z"/><ellipse cx="250.5" cy="77" rx="26.5" ry="9"/><path d="M236 101h28m-28 11h18" stroke="#a1b193"/></g><path d="M110 151h104m-72-8 0 16m31-16v16" stroke="#9cad8d"/><circle cx="120" cy="43" r="3" fill="#bba56e"/><circle cx="206" cy="143" r="4" fill="#a0b080"/>`,
        backend: `<g transform="rotate(-3 125 99)"><rect x="76" y="39" width="107" height="114" rx="7" fill="#e9ecd9"/><path d="M85 49h89v26H85zm0 34h89v26H85zm0 34h89v26H85z" fill="#c4d0b1"/><circle cx="98" cy="62" r="3" fill="#7f9a63"/><circle cx="98" cy="96" r="3" fill="#7f9a63"/><circle cx="98" cy="130" r="3" fill="#7f9a63"/><path d="M112 62h45m-45 34h45m-45 34h45" stroke="#8fa27a"/></g><g transform="rotate(7 213 110)"><path d="M159 77h77l13 13v67h-90z" fill="#f4efdb"/><path d="M236 77v14h13m-61 12-10 9 10 9m27-18 10 9-10 9m-13-24-7 32" stroke="#87976f" stroke-width="2"/></g><path d="M58 151h199m-191-8v15m17-9v9" stroke="#a4976d"/><path d="m220 47 6-6m4 17 7-1" stroke="#b0a16b"/>`,
        analytics: `<g transform="rotate(-3 172 91)"><rect x="81" y="37" width="165" height="108" rx="7" fill="#f5f2df"/><path d="M95 55h136M102 122h129M104 66v56" stroke="#b4b99a"/><path d="M117 95h15v27h-15zm28-17h15v44h-15zm28 8h15v36h-15zm28-22h15v58h-15z" fill="#a3b985" stroke="#889e74"/><path d="m115 85 35-18 28 5 38-21" stroke="#708d7d" stroke-width="2"/><circle cx="150" cy="67" r="3" fill="#c9b67f"/><circle cx="178" cy="72" r="3" fill="#c9b67f"/></g><circle cx="69" cy="127" r="17" fill="#dae2cb"/><path d="m81 140 15 17m-31-29 5-7 7 3" stroke-width="2"/><path d="M217 148h47v12h-47z" fill="#b8a475"/><path d="M228 148v12m25-12v12" stroke="#8e936a"/>`
      };
      const projectPhotoIcon = '<svg viewBox="0 0 40 32" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="29" rx="3" stroke="currentColor" stroke-width="1.2"/><circle cx="28" cy="9" r="3" stroke="currentColor" stroke-width="1.2"/><path d="m3 27 10-13 10 10 5-6 9 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      const projectArrow = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      function createProjectCover(project, modal = false) {
        const cover = document.createElement('div');
        cover.className = `project-cover${modal ? ' project-modal-cover' : ''}`;
        cover.dataset.theme = project.illustration;
        cover.setAttribute('role', 'img');
        cover.setAttribute('aria-label', `${project.title} ${project.status.toLowerCase()} project preview`);
        cover.innerHTML = `<svg class="project-art" viewBox="0 0 320 190" fill="none" aria-hidden="true"><ellipse cx="160" cy="160" rx="109" ry="9" fill="#7c9565" opacity=".12"/><path d="M41 46h29m188 96h19M46 151l-4-7m4 7 1-10" stroke="#9aab84" stroke-width="1.3" stroke-linecap="round"/><g stroke="#647c58" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${projectDrawings[project.illustration] || projectDrawings.vision}</g></svg>${project.status ? `<span class="project-status">${escapeHTML(project.status)}</span>` : ''}`;
        if (project.cover) {
          const image = document.createElement('img');
          image.alt = '';
          image.loading = modal ? 'eager' : 'lazy';
          image.decoding = 'async';
          image.addEventListener('load', () => cover.classList.add('has-cover'), {once:true});
          image.addEventListener('error', () => image.remove(), {once:true});
          image.src = project.cover;
          cover.appendChild(image);
          photoViewer.attach(cover,image,`${project.title} — cover`);
        }
        return cover;
      }

      function createProjectLink(url, label) {
        let destination;
        try {
          if (url) {
            const candidate = new URL(url, document.baseURI);
            if (['http:', 'https:'].includes(candidate.protocol)) destination = candidate.href;
          }
        } catch {}
        const link = document.createElement(destination ? 'a' : 'span');
        link.className = `project-link${destination ? '' : ' is-placeholder'}`;
        link.innerHTML = `${escapeHTML(label)}${projectArrow}`;
        if (destination) {
          link.href = destination;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        } else {
          link.setAttribute('aria-disabled', 'true');
          link.title = `${label} is not available yet`;
        }
        return link;
      }

      function detailBlock(title, copy = '', items = []) {
        if (!copy && !items.length) return '';
        const paragraphs = detailCopyBlocks(copy).map(block => block.type === 'list'
          ? `<ul class="project-feature-list">${block.items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`
          : `<p>${escapeHTML(block.text).replace(/\n/g,'<br>')}</p>`).join('');
        const list = items.length ? `<ul class="project-feature-list">${items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>` : '';
        return `<section class="project-copy-section"><h3>${title}</h3>${paragraphs}${list}</section>`;
      }

      function detailContent(collection,item) {
        return detailContentFields[collection].map(field => detailBlock(
          field.label,
          field.type === 'list' ? '' : item[field.key],
          field.type === 'list' ? item[field.key] : []
        )).join('');
      }

      function appendDetailGallery(body, item) {
        if (!item.images.length) return;
        const gallery = document.createElement('section');
        gallery.className = 'project-gallery';
        gallery.setAttribute('aria-label', `${item.title} gallery`);
        gallery.innerHTML = '<h3 class="project-gallery-heading">Gallery</h3><div class="project-gallery-grid"></div>';
        item.images.forEach((photo,index) => {
          const frame = document.createElement('figure');
          frame.className = 'project-image';
          frame.innerHTML = `<div class="project-image-window"><span class="project-image-placeholder" role="img" aria-label="Photo placeholder ${index + 1}">${projectPhotoIcon}<span>PHOTO ${String(index + 1).padStart(2,'0')}</span></span></div>`;
          if (photo.src) {
            const image = document.createElement('img');
            image.alt = photo.alt || `${item.title}, photo ${index + 1}`;
            image.loading = 'lazy';
            image.decoding = 'async';
            image.addEventListener('load', () => frame.classList.add('has-image'), {once:true});
            image.addEventListener('error', () => image.remove(), {once:true});
            image.src = photo.src;
            frame.querySelector('.project-image-window').appendChild(image);
            photoViewer.attach(frame.querySelector('.project-image-window'),image);
          }
          gallery.querySelector('.project-gallery-grid').appendChild(frame);
        });
        body.appendChild(gallery);
      }

      function openProject(project, trigger) {
        reveals.forget(projectDialogContent);
        lastProjectTrigger = trigger;
        projectDialog.dataset.projectId = project.id;
        const cover = createProjectCover(project, true);
        const body = document.createElement('div');
        body.className = 'project-modal-body';
        const facts = [['Role',project.role],['Period',projectPeriod(project)],['Status',project.status]]
          .filter(([,value]) => value).map(([label,value]) => `<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join('');
        body.innerHTML = `<p class="project-modal-category" aria-label="Product type: ${escapeHTML(project.category)}">${escapeHTML(project.category)}</p>
          <h2 class="project-modal-title" id="project-dialog-title">${escapeHTML(project.title)}</h2>
          <p class="project-modal-summary" id="project-dialog-summary">${escapeHTML(project.summary)}</p>
          <div class="project-modal-columns">
            <div class="project-modal-copy">${detailContent('projects',project)}</div>
            <aside class="project-modal-aside" aria-label="Project information">
              ${facts ? `<dl class="project-facts">${facts}</dl>` : ''}
              ${project.tech.length ? `<h3>Tech stack</h3><div class="project-tech">${project.tech.map(tech => `<span>${escapeHTML(tech)}</span>`).join('')}</div>` : ''}
              <div class="project-links"></div>
            </aside>
          </div>`;
        const links = body.querySelector('.project-links');
        project.links.forEach(link => links.appendChild(createProjectLink(link.url,link.label)));
        appendDetailGallery(body,project);
        projectDialogContent.replaceChildren(cover,body);
        if (!projectDialog.open) projectDialog.showModal();
        document.documentElement.classList.add('project-modal-open');
        projectDialog.scrollTop = 0;
        reveals.observe(projectDialogContent.querySelectorAll('.project-modal-category,.project-modal-title,.project-modal-summary,.project-copy-section,.project-modal-aside,.project-gallery-heading,.project-image'),45);
      }

      function renderProjects(append = false) {
        const projects = projectView(projectCollection,activeProjectCategory);
        if (append && visibleProjectCount >= projects.length) return;
        const start = append ? visibleProjectCount : 0;
        if (!append) {
          reveals.forget(projectsGrid);
          projectsGrid.replaceChildren();
        }
        visibleProjectCount = Math.min(start + projectsPerPage,projects.length);
        const fragment = document.createDocumentFragment();
        projects.slice(start,visibleProjectCount).forEach(project => {
          const card = document.createElement('li');
          card.className = 'project-card';
          card.dataset.projectId = project.id;
          const cover = createProjectCover(project);
          const body = document.createElement('div');
          body.className = 'project-card-body';
          body.innerHTML = `<p class="project-category" aria-label="Product type: ${escapeHTML(project.category)}">${escapeHTML(project.category)}</p><h3>${escapeHTML(project.title)}</h3>
            ${projectPeriod(project) ? `<p class="project-period" aria-label="Project period">${escapeHTML(projectPeriod(project))}</p>` : ''}
            <p class="project-summary">${escapeHTML(project.summary)}</p>
            <div class="project-tech">${project.tech.slice(0,3).map(tech => `<span>${escapeHTML(tech)}</span>`).join('')}</div>
            <div class="project-card-footer"><span>View project</span>${projectArrow}</div>`;
          const trigger = document.createElement('button');
          trigger.type = 'button';
          trigger.className = 'project-open';
          trigger.setAttribute('aria-label', `View ${project.title} project details`);
          trigger.setAttribute('aria-haspopup', 'dialog');
          trigger.setAttribute('aria-controls', 'project-dialog');
          trigger.addEventListener('click', () => openProject(project,trigger));
          card.append(cover,body,trigger);
          fragment.appendChild(card);
        });
        if (!projects.length) {
          const message = document.createElement('li');
          message.className = 'projects-load-message';
          message.textContent = activeProjectCategory === 'Selected' ? 'Selected projects are coming soon.' : activeProjectCategory === 'All' ? 'Projects are coming soon.' : `No ${activeProjectCategory} projects here yet. More to come.`;
          fragment.appendChild(message);
        }
        const addedCards = [...fragment.children];
        projectsGrid.appendChild(fragment);
        reveals.observe(addedCards);
        projectsPagination.hidden = visibleProjectCount >= projects.length;
        if (!projectsPagination.hidden) reveals.observe([projectsPagination]);
        projectsStatus.textContent = `Showing ${visibleProjectCount} of ${projects.length} ${activeProjectCategory === 'All' ? '' : activeProjectCategory + ' '}projects.`;
        // Keep keyboard focus in the grid when the final batch removes its button.
        if (append && projectsPagination.hidden) addedCards[0]?.querySelector('.project-open')?.focus({preventScroll:true});
      }
      projectsMoreButton.addEventListener('click', () => renderProjects(true));

      function renderProjectFilters() {
        const categories = ['Selected','All',...projectCategories];
        const fragment = document.createDocumentFragment();
        categories.forEach(category => {
          const button = document.createElement('button');
          button.type = 'button';
          const primaryView = category === 'Selected' || category === 'All';
          button.className = `project-filter${primaryView ? ' project-filter-view' : ''}${category === 'Selected' ? ' project-filter-selected' : category === 'All' ? ' project-filter-all' : ''}`;
          if(category === 'Selected')button.innerHTML = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m10 2 2.3 4.8 5.3.8-3.8 3.7.9 5.2-4.7-2.4-4.7 2.4.9-5.2L2.4 7.6l5.3-.8L10 2Z" fill="currentColor" fill-opacity=".25" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
          if(category === 'All')button.innerHTML = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 3h5v5H3zm9 0h5v5h-5zM3 12h5v5H3zm9 0h5v5h-5z" fill="currentColor" fill-opacity=".15" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
          button.append(document.createTextNode(category));
          button.setAttribute('aria-pressed', String(category === activeProjectCategory));
          button.setAttribute('aria-controls','projects-grid');
          button.addEventListener('click', () => {
            activeProjectCategory = category;
            projectFilters.querySelectorAll('button').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
            renderProjects();
          });
          fragment.appendChild(button);
        });
        projectFilters.replaceChildren(fragment);
      }

      async function loadProjects() {
        try {
          const response = await fetch('./data/projects.json', {cache:'no-store'});
          if (!response.ok) throw new Error(`Project request failed: ${response.status}`);
          const data = await response.json();
          if (!Array.isArray(data)) throw new Error('projects.json must contain an array.');
          const projects = data.map((item,index) => {
            if (!item || typeof item.title !== 'string') throw new Error(`Missing project title at index ${index}.`);
            const text = key => typeof item[key] === 'string' ? item[key] : '';
            const strings = key => Array.isArray(item[key]) ? item[key].filter(value => typeof value === 'string') : [];
            return {
              id:text('id') || `project-${index}`, title:text('title'), category:text('category'), status:text('status'),
              categories:projectFilterCategories(item), selected:item.selected === true,
              year:text('year'), start:text('start'), end:item.end === null ? null : text('end'), role:text('role'), illustration:text('illustration') || 'vision', cover:text('cover'),
              summary:text('summary'), tech:strings('tech'), ...projectDetails(item)
            };
          });
          projectCollection = projects;
          renderProjectFilters();
          renderProjects();
          return true;
        } catch (error) {
          console.error('Could not load projects.json:', error);
          projectsPagination.hidden = true;
          projectsGrid.innerHTML = '<li class="projects-load-message">Projects could not be loaded. Please refresh the page.</li>';
          projectsStatus.textContent = 'Projects could not be loaded.';
          return false;
        } finally {
          projectsGrid.setAttribute('aria-busy','false');
        }
      }
      function bindPortfolioDialog(dialog, closeButton, getTrigger) {
        closeButton.addEventListener('click', () => dialog.close());
        dialog.addEventListener('keydown', event => {
          if (event.key !== 'Tab') return;
          const controls = [...dialog.querySelectorAll('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')]
            .filter(control => control.getClientRects().length);
          const first = controls[0], last = controls[controls.length - 1];
          if (!first) return;
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        });
        dialog.addEventListener('click', event => {
          if (event.target !== dialog) return;
          const bounds = dialog.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
        });
        dialog.addEventListener('close', () => {
          if (!document.querySelector('.project-dialog[open]')) document.documentElement.classList.remove('project-modal-open');
          const trigger = getTrigger();
          if (trigger?.isConnected) trigger.focus({preventScroll:true});
        });
      }
      bindPortfolioDialog(projectDialog, projectDialogClose, () => lastProjectTrigger);
      pendingData.push(loadProjects());

      const achievementHighlights = document.getElementById('achievement-highlights');
      const achievementRows = document.getElementById('achievement-rows');
      const achievementMoreLabel = document.getElementById('achievement-more-label');
      const achievementsStatus = document.getElementById('achievements-status');
      const achievementDialog = document.getElementById('achievement-dialog');
      const achievementDialogContent = document.getElementById('achievement-dialog-content');
      let achievementCollection = [];
      let lastAchievementTrigger = null;
      const achievementDrawings = {
        medal:'<ellipse cx="160" cy="158" rx="66" ry="7" fill="#8a8252" opacity=".12"/><path d="m117 25 24 60h38l24-60-31 2-12 34-12-34Z" fill="#798c6e" stroke="#596c51" stroke-width="2" stroke-linejoin="round"/><path d="m132 27 18 47m38-47-18 47" stroke="#a9b693" stroke-width="5"/><circle cx="160" cy="112" r="39" fill="#c49a69" stroke="#8b6b48" stroke-width="2"/><circle cx="160" cy="112" r="30" fill="#dab688" stroke="#a48359" stroke-width="1.5"/><path d="m160 90 6 14 15 1-11 10 3 15-13-8-13 8 3-15-11-10 15-1Z" fill="#af8254" stroke="#8b6b48" stroke-width="1.5" stroke-linejoin="round"/><path d="m99 73-9-4m131 4 9-4m-10 64 8 5m-130-5-8 5" stroke="#9c966c" stroke-width="2" stroke-linecap="round"/>',
        trophy:'<ellipse cx="160" cy="163" rx="66" ry="6" fill="#627b68" opacity=".12"/><path d="M129 48h-22v18c0 21 15 29 30 27m54-45h22v18c0 21-15 29-30 27" stroke="#8b9572" stroke-width="8" stroke-linejoin="round"/><path d="M124 33h72v40c0 30-13 45-36 45s-36-15-36-45Z" fill="#d4bc83" stroke="#7c835c" stroke-width="2" stroke-linejoin="round"/><path d="M145 119v24h30v-24M134 143h52v16h-52Z" fill="#a4b596" stroke="#637b65" stroke-width="2"/><path d="m149 64-9 8 9 8m22-16 9 8-9 8m-9-23-5 28" stroke="#7c835c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="m101 31-5-7m126 20 8-4m-13 76 7 4" stroke="#879b88" stroke-width="2" stroke-linecap="round"/>',
        certificate:'<ellipse cx="160" cy="158" rx="78" ry="7" fill="#718457" opacity=".12"/><g transform="rotate(-5 160 90)"><path d="M91 29h139v117H91Z" fill="#f6f0da" stroke="#83916a" stroke-width="2" stroke-linejoin="round"/><path d="M99 37h123v101H99Z" stroke="#bdc3a3" stroke-width="1.2"/><path d="M123 57h74m-85 18h96m-89 13h82m-79 13h58" stroke="#99a47c" stroke-width="3" stroke-linecap="round"/><path d="m185 125-5 36 15-9 13 12 3-38" fill="#8a9d76" stroke="#657c57" stroke-width="1.5"/><circle cx="198" cy="120" r="19" fill="#d7bb7e" stroke="#9e8e5d" stroke-width="1.6"/><path d="m188 120 7 6 12-13" stroke="#8e8155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g><path d="m81 62-10-3m164-20 6-8m-8 114 9 4" stroke="#9ca883" stroke-width="2" stroke-linecap="round"/>',
        community:'<ellipse cx="160" cy="161" rx="72" ry="6" fill="#70875b" opacity=".12"/><path d="M102 91 160 45l58 46v62H102Z" fill="#f0ecd6" stroke="#6d805f" stroke-width="2" stroke-linejoin="round"/><path d="m91 95 69-55 69 55" stroke="#81946d" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M146 113h28v40h-28Z" fill="#adc39a" stroke="#6d805f" stroke-width="2"/><path d="M116 102h19v21h-19Zm69 0h19v21h-19Z" fill="#c4d5c8" stroke="#6d805f" stroke-width="1.5"/><path d="M86 152v-25m-1 11c-11 0-16-6-15-14 11 0 16 5 15 14Zm1-10c0-10 7-16 15-15 0 10-6 15-15 15Z" fill="#a8be8f" stroke="#6d805f" stroke-width="1.5" stroke-linecap="round"/><path d="m223 54 4-8m-127 0-6-7" stroke="#a0ad84" stroke-width="2" stroke-linecap="round"/>'
      };

      function createAchievementPhoto(achievement, modal = false, thumbnail = false) {
        const photo = document.createElement('div');
        photo.className = `achievement-photo${modal ? ' achievement-modal-cover' : ''}`;
        photo.dataset.theme = achievement.illustration;
        photo.innerHTML = `<svg class="achievement-art" viewBox="0 0 320 180" fill="none" aria-hidden="true">${achievementDrawings[achievement.illustration] || achievementDrawings.certificate}</svg>`;
        if (achievement.image) {
          const image = document.createElement('img');
          image.alt = achievement.imageAlt || achievement.title;
          image.loading = modal ? 'eager' : 'lazy';
          image.decoding = 'async';
          image.addEventListener('load', () => photo.classList.add('has-photo'), {once:true});
          setPhotoSource(image,achievement.image,{thumbnail,onError:() => image.remove()});
          photo.appendChild(image);
          photoViewer.attach(photo,image,achievement.imageAlt || `${achievement.title} — photo`);
        }
        return photo;
      }

      function createAchievementIssuer(achievement, modal = false, showLabel = false) {
        const issuer = document.createElement(modal ? 'div' : 'p');
        issuer.className = modal ? 'achievement-modal-issuer' : 'achievement-issuer';
        if (showLabel) {
          const label = document.createElement('span');
          label.className = 'achievement-issuer-label';
          label.textContent = 'ISSUER';
          issuer.appendChild(label);
        }
        const main = document.createElement('span');
        main.className = 'achievement-issuer-main';
        if (achievement.issuerLogo) {
          const logo = document.createElement('img');
          logo.className = 'achievement-issuer-logo';
          logo.alt = `${achievement.issuer} logo`;
          logo.loading = 'lazy';
          logo.decoding = 'async';
          logo.addEventListener('error', () => logo.remove(), {once:true});
          logo.src = achievement.issuerLogo;
          main.appendChild(logo);
        }
        const name = document.createElement('span');
        name.textContent = achievement.issuer;
        main.appendChild(name);
        issuer.appendChild(main);
        return issuer;
      }

      function openAchievement(achievement, trigger) {
        reveals.forget(achievementDialogContent);
        lastAchievementTrigger = trigger;
        achievementDialog.dataset.achievementId = achievement.id;
        const body = document.createElement('div');
        body.className = 'project-modal-body';
        const facts = [['Issuer',achievement.issuer],['Awarded',achievementDate(achievement)],['Recognition',achievement.recognition]]
          .filter(([,value]) => value).map(([label,value]) => `<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join('');
        body.innerHTML = `<p class="project-modal-category">${escapeHTML(achievement.category)}</p>
          <h2 class="project-modal-title" id="achievement-dialog-title">${escapeHTML(achievement.title)}</h2>
          <p class="project-modal-summary" id="achievement-dialog-summary">${escapeHTML(achievement.summary)}</p>
          <div class="project-modal-columns">
            <div class="project-modal-copy">${detailContent('achievements',achievement)}</div>
            <aside class="project-modal-aside" aria-label="Achievement information">
              ${facts ? `<dl class="project-facts">${facts}</dl>` : ''}
              <div class="project-links"></div>
            </aside>
          </div>`;
        body.querySelector('.project-modal-aside').prepend(createAchievementIssuer(achievement,true));
        achievement.links.forEach(link => body.querySelector('.project-links').appendChild(createProjectLink(link.url,link.label)));
        appendDetailGallery(body,achievement);
        achievementDialogContent.replaceChildren(createAchievementPhoto(achievement,true),body);
        if (!achievementDialog.open) achievementDialog.showModal();
        document.documentElement.classList.add('project-modal-open');
        achievementDialog.scrollTop = 0;
        reveals.observe(achievementDialogContent.querySelectorAll('.project-modal-category,.project-modal-title,.project-modal-summary,.project-copy-section,.project-modal-aside,.project-gallery-heading,.project-image'),45);
      }

      function renderAchievements(achievements) {
        reveals.forget(achievementHighlights);
        reveals.forget(achievementRows);
        const {featured,remaining} = achievementGroups(achievements);
        const makeItem = (achievement, large) => {
          const item = document.createElement('li');
          item.className = large ? 'achievement-card' : 'achievement-row';
          item.dataset.achievementId = achievement.id;
          const body = document.createElement('div');
          body.className = large ? 'achievement-card-body' : 'achievement-row-body';
          body.innerHTML = `<p class="achievement-kind">${escapeHTML(achievement.category)}</p><h3 class="achievement-title">${escapeHTML(achievement.title)}</h3>${achievementDate(achievement) ? `<p class="achievement-date" aria-label="Date received">${escapeHTML(achievementDate(achievement))}</p>` : ''}`;
          if (large) {
            body.appendChild(createAchievementIssuer(achievement));
            const summary = document.createElement('p');
            summary.className = 'achievement-summary';
            summary.textContent = achievement.summary;
            body.appendChild(summary);
          }
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'achievement-open';
          button.innerHTML = `View details${projectArrow}`;
          button.setAttribute('aria-label', `View ${achievement.title} achievement details`);
          button.setAttribute('aria-haspopup','dialog');
          button.setAttribute('aria-controls','achievement-dialog');
          button.addEventListener('click', () => openAchievement(achievement,button));
          item.append(createAchievementPhoto(achievement,false,!large),body);
          if (large) body.appendChild(button);
          else {
            item.append(createAchievementIssuer(achievement,false,true),button);
          }
          return item;
        };
        achievementHighlights.replaceChildren(...featured.map(achievement => makeItem(achievement,true)));
        achievementRows.replaceChildren(...remaining.map(achievement => makeItem(achievement,false)));
        achievementMoreLabel.hidden = !featured.length || !remaining.length;
        reveals.observe(document.querySelectorAll('.achievement-card,.achievement-row,.achievement-more-label'));
        if (!achievements.length) achievementHighlights.innerHTML = '<li class="achievement-load-message">More milestones to come.</li>';
        achievementsStatus.textContent = `Showing ${featured.length} featured achievements and ${remaining.length} more milestones.`;
      }

      async function loadAchievements() {
        try {
          const response = await fetch('./data/achievements.json', {cache:'no-store'});
          if (!response.ok) throw new Error(`Achievement request failed: ${response.status}`);
          const data = await response.json();
          if (!Array.isArray(data)) throw new Error('achievements.json must contain an array.');
          const achievements = data.map((item,index) => {
            if (!item || typeof item.title !== 'string') throw new Error(`Missing achievement title at index ${index}.`);
            const text = key => typeof item[key] === 'string' ? item[key] : '';
            return {
              id:text('id') || `achievement-${index}`, title:text('title'), category:text('category'), issuer:text('issuer'),
              issuerLogo:text('issuerLogo'), date:text('date'), year:text('year'), recognition:text('recognition'), highlighted:item.highlighted === true,
              image:text('image'), imageAlt:text('imageAlt'), illustration:text('illustration') || 'certificate',
              summary:text('summary'), ...achievementDetails(item)
            };
          });
          achievementCollection = achievements;
          renderAchievements(achievements);
          return true;
        } catch (error) {
          console.error('Could not load achievements.json:', error);
          achievementHighlights.innerHTML = '<li class="achievement-load-message">Achievements could not be loaded. Please refresh the page.</li>';
          achievementsStatus.textContent = 'Achievements could not be loaded.';
          return false;
        } finally {
          achievementHighlights.setAttribute('aria-busy','false');
        }
      }
      bindPortfolioDialog(achievementDialog, document.getElementById('achievement-dialog-close'), () => lastAchievementTrigger);
      pendingData.push(loadAchievements());

      onContentSaved(async collection => {
        if (collection === 'projects') {
          if (!await loadProjects() || !projectDialog.open) return;
          const project = projectCollection.find(item => item.id === projectDialog.dataset.projectId);
          if (!project) { projectDialog.close(); return; }
          const trigger = [...projectsGrid.querySelectorAll('.project-card')].find(card => card.dataset.projectId === project.id)?.querySelector('.project-open');
          openProject(project,trigger);
        } else {
          if (!await loadAchievements() || !achievementDialog.open) return;
          const achievement = achievementCollection.find(item => item.id === achievementDialog.dataset.achievementId);
          if (!achievement) { achievementDialog.close(); return; }
          const trigger = [...document.querySelectorAll('[data-achievement-id]')].find(card => card.dataset.achievementId === achievement.id)?.querySelector('.achievement-open');
          openAchievement(achievement,trigger);
        }
      });

      const mailboxButton = document.getElementById('contact-mailbox');
      mailboxButton.addEventListener('click', () => {
        const isOpen = mailboxButton.getAttribute('aria-pressed') !== 'true';
        mailboxButton.setAttribute('aria-pressed', String(isOpen));
        mailboxButton.setAttribute('aria-label', isOpen ? 'Close mailbox' : 'Open mailbox');
      });
      document.getElementById('footer-year').textContent = String(new Date().getFullYear());

      function setContactLink(id, destination, external = false, title = '') {
        if (!destination) return;
        const previous = document.getElementById(id);
        const link = document.createElement('a');
        link.id = previous.id;
        link.className = previous.className;
        link.innerHTML = previous.innerHTML;
        link.href = destination;
        if (title) link.title = title;
        if (external) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
        previous.replaceWith(link);
      }

      async function loadContact() {
        try {
          const response = await fetch('./data/contact.json', {cache:'no-store'});
          if (!response.ok) throw new Error(`Contact request failed: ${response.status}`);
          const contact = await response.json();
          if (!contact || Array.isArray(contact) || typeof contact !== 'object') throw new Error('contact.json must contain an object.');
          const email = typeof contact.email === 'string' ? contact.email.trim() : '';
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            const address = encodeURIComponent(email).replace('%40','@');
            setContactLink('contact-email', `mailto:${address}?subject=${encodeURIComponent('Let’s build something useful')}`, false, email);
          }
          const webURL = value => {
            if (typeof value !== 'string' || !value.trim()) return '';
            try {
              const url = new URL(value, document.baseURI);
              return ['http:','https:'].includes(url.protocol) ? url.href : '';
            } catch { return ''; }
          };
          setContactLink('contact-linkedin', webURL(contact.linkedin), true);
          setContactLink('contact-github', webURL(contact.github), true);
          const cvURL = webURL(contact.cv);
          if (cvURL) {
            const cv = document.getElementById('contact-cv');
            cv.href = cvURL;
            if (new URL(cvURL).origin === location.origin) cv.download = typeof contact.cvFilename === 'string' && contact.cvFilename ? contact.cvFilename : 'Ridho-Aditya-CV.pdf';
            else { cv.target = '_blank'; cv.rel = 'noopener noreferrer'; }
            cv.hidden = false;
          }
        } catch (error) {
          console.warn('Could not load contact.json:', error);
        }
      }
      pendingData.push(loadContact());

      const aboutSection = document.getElementById('about');
      if (Array.isArray(aboutSettings.paragraphs)) {
        const bio = document.getElementById('about-bio');
        const terms = (aboutSettings.highlights || []).filter(term => typeof term === 'string' && term);
        const paragraphs = aboutSettings.paragraphs.map((text,index) => {
          const paragraph = document.createElement('p');
          if (index === 0 && aboutSettings.intro) {
            const intro = document.createElement('strong'); intro.textContent = aboutSettings.intro;
            paragraph.append(intro,document.createTextNode(' '));
          }
          let remaining = String(text);
          while (remaining) {
            const matches = terms.map(term => ({term,index:remaining.indexOf(term)})).filter(match => match.index >= 0).sort((a,b)=>a.index-b.index);
            if (!matches.length) { paragraph.append(document.createTextNode(remaining)); break; }
            const match = matches[0];
            paragraph.append(document.createTextNode(remaining.slice(0,match.index)));
            const strong = document.createElement('strong'); strong.textContent = match.term; paragraph.append(strong);
            remaining = remaining.slice(match.index+match.term.length);
          }
          return paragraph;
        });
        bio.replaceChildren(...paragraphs);
      }
      for (const [key,id] of [['school','education-school'],['major','education-major']]) {
        if (typeof aboutSettings[key] === 'string') document.getElementById(id).textContent = aboutSettings[key];
      }
      if (aboutSettings.gpa) document.getElementById('education-gpa').innerHTML = `${escapeHTML(aboutSettings.gpa)} <span>/ ${escapeHTML(aboutSettings.gpaScale || '4.00')}</span>`;
      if (aboutSettings.logo) document.querySelector('.education-logo').src = aboutSettings.logo;
      await Promise.all(pendingData);
      const componentGroups = [
        '.brand,.header-right,.tree-area,#name,.intro-copy,.billboard,.scroll-cue',
        '.about-kicker,.about-title,.about-copy p,.education-note',
        '.experience-kicker,.experience-title,.experience-intro,.experience-signpost,.experience-filters,.experience-profile',
        '.projects-kicker,.projects-title,.projects-intro,.projects-doodle,.achievements-doodle',
        '.project-filter',
        '.contact-kicker,.contact-title,.contact-copy,.contact-link,.contact-cv,.contact-scene',
        '.footer-credit,.back-to-top'
      ];
      componentGroups.forEach(selector => reveals.observe(document.querySelectorAll(selector)));
    })();
