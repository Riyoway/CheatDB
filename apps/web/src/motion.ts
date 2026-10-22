const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let keyboardInput = false;
document.addEventListener('keydown', () => { keyboardInput = true; }, true);
document.addEventListener('pointerdown', () => { keyboardInput = false; }, true);

const reveals = new Map<HTMLElement, Animation>();
const disclosures = new Map<HTMLDetailsElement, { animation: Animation; expanded: boolean }>();
const easeOut = () => getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim();

export function reveal(element: HTMLElement, distance = 0, duration = 160, delay = 0) {
  const previous = reveals.get(element);
  const opacity = previous ? getComputedStyle(element).opacity : '.65';
  const transform = previous ? getComputedStyle(element).transform : `translateY(${distance}px)`;
  previous?.cancel();
  reveals.delete(element);
  if (keyboardInput) return;
  const animation = element.animate([
    { opacity, transform: reducedMotion.matches ? 'none' : transform },
    { opacity: 1, transform: 'none' },
  ], { duration: reducedMotion.matches ? 100 : duration, delay, easing: easeOut(), fill: 'backwards' });
  reveals.set(element, animation);
  animation.onfinish = () => { if (reveals.get(element) === animation) reveals.delete(element); };
}

export function syncSelection(container: HTMLElement, instant = false) {
  const links = [...container.querySelectorAll<HTMLAnchorElement>(':scope > a')];
  const active = links.find(link => link.classList.contains('active'));
  if (!active || !container.offsetWidth) return;
  let copy = container.querySelector<HTMLElement>('.selection-copy');
  if (!copy) {
    copy = document.createElement('div');
    copy.className = 'selection-copy';
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    for (const link of links) {
      const label = document.createElement('span');
      label.className = link.className.replace('active', '').trim();
      label.innerHTML = link.innerHTML;
      copy.append(label);
    }
    container.append(copy);
    instant = true;
  }
  const width = Math.max(container.clientWidth, ...links.map(link => link.offsetLeft + link.offsetWidth));
  const height = container.clientHeight;
  copy.style.transition = instant || reducedMotion.matches || keyboardInput ? 'none' : '';
  copy.style.width = `${width}px`;
  copy.style.height = `${height}px`;
  copy.style.clipPath = `inset(${active.offsetTop}px ${Math.max(0, width - active.offsetLeft - active.offsetWidth)}px ${Math.max(0, height - active.offsetTop - active.offsetHeight)}px ${active.offsetLeft}px round 8px)`;
  container.classList.add('has-selection');
}

function finishDisclosure(element: HTMLDetailsElement, expanded: boolean) {
  disclosures.get(element)?.animation.cancel();
  disclosures.delete(element);
  element.open = expanded;
  delete element.dataset.animating;
  delete element.dataset.closing;
  element.querySelector('summary')!.removeAttribute('aria-expanded');
  element.querySelector<HTMLElement>('.cheat-body')!.inert = false;
}

function animateDisclosure(element: HTMLDetailsElement, expanded: boolean, from: number) {
  disclosures.get(element)?.animation.cancel();
  element.open = true;
  element.dataset.animating = '';
  element.toggleAttribute('data-closing', !expanded);
  const summary = element.querySelector('summary')!;
  summary.setAttribute('aria-expanded', String(expanded));
  element.querySelector<HTMLElement>('.cheat-body')!.inert = !expanded;
  const border = parseFloat(getComputedStyle(element).borderBottomWidth);
  const to = expanded ? element.getBoundingClientRect().height : summary.getBoundingClientRect().height + border;
  const animation = element.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 200, easing: easeOut() });
  disclosures.set(element, { animation, expanded });
  animation.onfinish = () => { if (disclosures.get(element)?.animation === animation) finishDisclosure(element, expanded); };
}

export function toggleDisclosure(element: HTMLDetailsElement, event: MouseEvent) {
  if (!event.detail || reducedMotion.matches || keyboardInput) {
    const pending = disclosures.get(element);
    // Settle the pointer transition before the native keyboard toggle reverses it.
    if (pending) finishDisclosure(element, pending.expanded);
    return;
  }
  event.preventDefault();
  const from = element.getBoundingClientRect().height;
  const expanded = !(disclosures.get(element)?.expanded ?? element.open);
  animateDisclosure(element, expanded, from);
}

export function updateDisclosure(element: HTMLDetailsElement, update: () => void) {
  const from = element.getBoundingClientRect().height;
  const expanded = disclosures.get(element)?.expanded ?? element.open;
  update();
  if (element.open && !reducedMotion.matches && !keyboardInput) animateDisclosure(element, expanded, from);
  reveal(element.querySelector<HTMLElement>('.cheat-body')!);
}

export function observeSelections(containers: HTMLElement[]) {
  const position = () => containers.forEach(container => syncSelection(container, true));
  const observer = new ResizeObserver(position);
  containers.forEach(container => observer.observe(container));
  void document.fonts.ready.then(position);
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    reveals.forEach(animation => animation.cancel()); reveals.clear();
    disclosures.forEach(({ expanded }, element) => finishDisclosure(element, expanded));
    position();
  });
}
