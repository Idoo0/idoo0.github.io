// Reveal each component once without taking over its transform or hover effects.
export function createRevealController(motionQuery) {
  const seen = new WeakSet();
  const pending = new Set();
  const running = new Map();
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.target.isConnected) show(entry.target,true);
      else if (entry.isIntersecting) show(entry.target,motionQuery.matches);
    });
  }, {threshold:0,rootMargin:'0px 0px -24px 0px'}) : null;

  function show(element,immediate = false) {
    observer?.unobserve(element);
    pending.delete(element);
    running.get(element)?.();
    element.classList.remove('reveal-pending');
    if (immediate) { element.classList.remove('reveal-in'); return; }
    element.classList.add('reveal-in');
    const finish = () => {
      element.classList.remove('reveal-in');
      element.removeEventListener('animationend',ended);
      element.removeEventListener('animationcancel',ended);
      running.delete(element);
    };
    const ended = event => { if (event.target === element && event.animationName === 'component-appear') finish(); };
    running.set(element,finish);
    element.addEventListener('animationend',ended);
    element.addEventListener('animationcancel',ended);
  }

  motionQuery.addEventListener('change',event => {
    if (!event.matches) return;
    [...pending,...running.keys()].forEach(element => show(element,true));
    observer?.disconnect();
  });
  document.addEventListener('focusin',event => {
    // Keyboard navigation must never land on an invisible component.
    for (let element=event.target; element instanceof Element; element=element.parentElement) {
      if (pending.has(element) || running.has(element)) show(element,true);
    }
  });

  return {
    observe(elements,stagger = 35) {
      if (!observer || motionQuery.matches) return;
      [...elements].forEach((element,index) => {
        if (seen.has(element)) return;
        seen.add(element);
        element.style.setProperty('--reveal-delay',`${(index % 3) * stagger}ms`);
        element.classList.add('reveal-pending');
        pending.add(element);
        observer.observe(element);
      });
    },
    forget(root) {
      [...pending,...running.keys()].forEach(element => {
        if (root === element || root.contains(element)) show(element,true);
      });
    }
  };
}
