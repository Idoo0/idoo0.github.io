// An event after a local admin save; no polling or background network traffic.
const channel = typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function'
  ? new window.BroadcastChannel('ridho-porto-content') : null;
const collections = ['projects','achievements'];

export function notifyContentSaved(collection) {
  if (collections.includes(collection)) channel?.postMessage({type:'content-saved',collection});
}

export function onContentSaved(listener) {
  const handler = ({data}) => {
    if (data?.type === 'content-saved' && collections.includes(data.collection)) listener(data.collection);
  };
  channel?.addEventListener('message',handler);
  return () => channel?.removeEventListener('message',handler);
}
