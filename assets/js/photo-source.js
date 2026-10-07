// Small photos use a pre-sized WebP; full-resolution files stay available for zoom.
export function photoThumbnailPath(source) {
  return typeof source === 'string' && /^(?:\.\/)?assets\/(?:experience|achievements)\/[^/?#]+(?<!\.preview)\.webp$/.test(source)
    ? source.replace(/\.webp$/, '.preview.webp') : '';
}

export function setPhotoSource(image, source, {thumbnail = false, onError} = {}) {
  image.dataset.fullSrc = source;
  const preview = thumbnail ? photoThumbnailPath(source) : '';
  let usingPreview = Boolean(preview);
  image.addEventListener('error', () => {
    if (usingPreview) {
      usingPreview = false;
      image.src = source;
    } else onError?.();
  });
  image.src = preview || source;
}
