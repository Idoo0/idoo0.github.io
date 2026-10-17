export function isLocalAdminLocation(location) {
  return ['http:','https:'].includes(location.protocol)
    && ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
}

export function isLocalAdminResponse(payload) {
  return Array.isArray(payload?.data) && typeof payload.revision === 'string'
    && /^[a-f0-9]{64}$/.test(payload.revision);
}

if (typeof document !== 'undefined') {
  const message = document.getElementById('access-message');
  if (isLocalAdminLocation(window.location)) {
    message.querySelector('h1').textContent = 'Checking local access…';
    try {
      const response = await fetch('api/data/experience',{cache:'no-store'});
      if (!response.ok || !isLocalAdminResponse(await response.json())) throw new Error('Unauthorized');
      await import('./app.js');
      message.hidden = true;
      document.getElementById('admin-studio').hidden = false;
    } catch {
      message.querySelector('h1').textContent = 'Access unauthorized';
    }
  }
}
