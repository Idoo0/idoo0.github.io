// Shared by the editor, validator, and static portfolio.
export function githubRepository(value) {
  if (typeof value !== 'string') return null;
  const input=value.trim();
  if (!input || input.length>2048 || /[\s\\\u0000-\u001f]/.test(input)) return null;
  try {
    const url=new URL(input);
    if (!['http:','https:'].includes(url.protocol) || !['github.com','www.github.com'].includes(url.hostname) || url.username || url.password || url.port) return null;
    const parts=url.pathname.match(/^\/([a-zA-Z0-9][a-zA-Z0-9-]{0,38})\/([a-zA-Z0-9_.-]{1,100})\/?$/);
    if (!parts) return null;
    const owner=parts[1],repo=parts[2].replace(/\.git$/i,'');
    if (!repo || repo==='.' || repo==='..') return null;
    const name=`${owner}/${repo}`;
    return {name,url:`https://github.com/${name}`,thumbnail:`https://opengraph.githubassets.com/1/${name}`};
  } catch { return null; }
}
