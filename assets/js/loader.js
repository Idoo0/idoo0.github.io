try {
  const placeholders = [...document.querySelectorAll('template[data-section]')];
  const fragments = await Promise.all(placeholders.map(async placeholder => {
    const response = await fetch(`sections/${placeholder.dataset.section}.html`, {cache:'no-store'});
    if (!response.ok) throw new Error(`Could not load ${placeholder.dataset.section}.`);
    const template = document.createElement('template');
    template.innerHTML = await response.text();
    return template.content;
  }));
  placeholders.forEach((placeholder,index) => placeholder.replaceWith(fragments[index]));
  const portfolio = await import('./portfolio.js');
  await portfolio.ready;
  document.getElementById('site-loading').remove();
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({behavior:'instant'});
} catch (error) {
  console.error('Could not initialize portfolio:',error);
  document.getElementById('site-loading').textContent = 'The portfolio could not load. Please refresh the page.';
}
