export function movePhoto(photos, from, to) {
  if (!Array.isArray(photos) || !Number.isInteger(from) || !Number.isInteger(to)
    || from < 0 || to < 0 || from >= photos.length || to >= photos.length || from === to) return photos;
  const next = photos.slice();
  next.splice(to,0,next.splice(from,1)[0]);
  return next;
}

export function enablePhotoOrdering(list, {canMove, onMove}) {
  const entries = () => [...list.children];
  list.addEventListener('keydown', event => {
    const handle = event.target.closest('.photo-drag-handle');
    const offset = {ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[event.key];
    if (!handle || !offset || !canMove()) return;
    event.preventDefault();
    const from = entries().indexOf(handle.closest('.gallery-photo')), to = from + offset;
    if (to >= 0 && to < list.children.length) {
      onMove(from,to);
      list.children[to]?.querySelector('.photo-drag-handle').focus();
    }
  });
  list.addEventListener('pointerdown', event => {
    const grip = event.target.closest('.photo-drag-handle,.image-preview');
    if (!grip || event.button !== 0 || !canMove() || list.children.length < 2) return;
    // Touch scrolling is available over previews; the dedicated grip handles touch dragging.
    if (event.pointerType === 'touch' && !grip.matches('.photo-drag-handle')) return;
    const card = grip.closest('.gallery-photo'), from = entries().indexOf(card);
    const pointer = event.pointerId, startX = event.clientX, startY = event.clientY;
    let dragging = false, target = from, ghost;
    grip.setPointerCapture(pointer);
    const move = e => {
      if (e.pointerId !== pointer) return;
      if (!dragging && Math.hypot(e.clientX-startX,e.clientY-startY) < 6) return;
      if (!dragging) {
        dragging = true;card.classList.add('is-dragging');
        ghost = document.createElement('div');ghost.className = 'photo-drag-ghost';
        ghost.setAttribute('aria-hidden','true');
        const preview = card.querySelector('.image-preview');
        if (preview) ghost.append(preview.cloneNode(true));
        ghost.append(document.createTextNode(card.querySelector('legend').textContent));
        document.body.append(ghost);
      }
      e.preventDefault();
      ghost.style.left = `${e.clientX+16}px`;ghost.style.top = `${e.clientY+16}px`;
      const hit = document.elementFromPoint(e.clientX,e.clientY)?.closest('.gallery-photo');
      target = hit?.parentElement === list ? entries().indexOf(hit) : -1;
      entries().forEach((entry,index) => entry.classList.toggle('is-drop-target',index === target && index !== from));
      if (e.clientY < 70) window.scrollBy(0,-15);
      else if (e.clientY > window.innerHeight-70) window.scrollBy(0,15);
    };
    const finish = e => {
      if (e.pointerId !== pointer) return;
      grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',finish);
      grip.removeEventListener('pointercancel',finish);grip.removeEventListener('lostpointercapture',finish);
      if (grip.hasPointerCapture(pointer)) grip.releasePointerCapture(pointer);
      ghost?.remove();entries().forEach(entry => entry.classList.remove('is-dragging','is-drop-target'));
      if (dragging && e.type === 'pointerup' && target >= 0 && target !== from && canMove()) {
        onMove(from,target);
        list.children[target]?.querySelector('.photo-drag-handle').focus();
      }
    };
    grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',finish);
    grip.addEventListener('pointercancel',finish);grip.addEventListener('lostpointercapture',finish);
  });
  list.addEventListener('dragstart',event => event.preventDefault());
}
