export function createPhotoViewer() {
  const dialog = document.getElementById('photo-dialog');
  const preview = document.getElementById('photo-dialog-image');
  const caption = document.getElementById('photo-dialog-caption');
  const status = document.getElementById('photo-dialog-status');
  let lastTrigger = null;

  function open(image, trigger, label) {
    if (!image.complete || !image.naturalWidth) return;
    lastTrigger = trigger;
    preview.hidden = true;
    caption.textContent = label;
    preview.alt = image.alt || label;
    status.textContent = 'Loading photo…';
    status.hidden = false;
    preview.src = image.dataset.fullSrc || image.currentSrc || image.src;
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('project-modal-open');
    dialog.scrollTop = 0;
  }

  preview.addEventListener('load', () => {
    if (!dialog.open) return;
    preview.hidden = false;
    status.hidden = true;
  });
  preview.addEventListener('error', () => {
    if (!dialog.open) return;
    preview.hidden = true;
    status.textContent = 'This photo could not be loaded. Please close the preview and try again.';
    status.hidden = false;
  });
  document.getElementById('photo-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    preview.removeAttribute('src');
    preview.hidden = true;
    status.hidden = true;
    if (!document.querySelector('.project-dialog[open]')) document.documentElement.classList.remove('project-modal-open');
    if (lastTrigger?.isConnected) lastTrigger.focus({preventScroll:true});
    lastTrigger = null;
  });

  return {
    attach(container, image, label = image.alt || 'Photo') {
      let trigger = null;
      const enable = () => {
        if (trigger || !image.naturalWidth) return;
        trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'photo-preview-trigger';
        trigger.setAttribute('aria-label', `View full photo: ${label}`);
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-controls', 'photo-dialog');
        trigger.innerHTML = '<span class="photo-preview-hint" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.4"/><path d="m12 12 5 5M5.5 8h5M8 5.5v5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>';
        trigger.addEventListener('click', event => {
          event.stopPropagation();
          open(image, trigger, label);
        });
        if (container.getAttribute('role') === 'img') container.setAttribute('role', 'group');
        container.appendChild(trigger);
      };
      image.addEventListener('load', enable, {once:true});
      image.addEventListener('error', () => trigger?.remove(), {once:true});
      if (image.complete && image.naturalWidth) enable();
    }
  };
}
