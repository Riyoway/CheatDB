export function infiniteList<T>(container: HTMLElement, items: T[], render: (item: T, index: number) => string, empty: string, label: string) {
  container.replaceChildren();
  container.scrollTop = 0;
  if (!items.length) {
    container.innerHTML = empty;
    return () => {};
  }

  const progress = document.createElement('div');
  progress.className = 'list-progress';
  progress.setAttribute('role', 'status');
  container.append(progress);
  let shown = 0, active = true;
  const observer = new IntersectionObserver(entries => {
    if (active && progress.isConnected && entries.some(entry => entry.isIntersecting)) append();
  }, { root: container, rootMargin: '0px 0px 160px 0px' });

  function append() {
    const next = items.slice(shown, shown + 40);
    progress.insertAdjacentHTML('beforebegin', next.map((item, i) => render(item, shown + i)).join(''));
    shown += next.length;
    progress.textContent = shown < items.length
      ? `${shown.toLocaleString('en-US')} of ${items.length.toLocaleString('en-US')} ${label}`
      : `All ${shown.toLocaleString('en-US')} ${label} loaded`;
    if (shown === items.length) observer.disconnect();
  }

  append();
  if (shown < items.length) observer.observe(progress);
  return () => { active = false; observer.disconnect(); };
}
