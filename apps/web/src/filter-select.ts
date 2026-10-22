export function setupFilters(container: HTMLElement, onChange: (id: string, value: string) => void) {
  const events = new AbortController();
  const { signal } = events;
  const menus = [...container.querySelectorAll<HTMLElement>('.filter-menu')];
  for (const menu of menus) {
    const trigger = container.querySelector<HTMLButtonElement>(`[aria-controls="${menu.id}"]`)!;
    trigger.popoverTargetElement = menu;
    const options = [...menu.querySelectorAll<HTMLButtonElement>('[role="option"]')];
    let search = '', lastKey = 0;
    const focusOption = (index: number) => options[index]?.focus();
    const selectedIndex = () => options.findIndex(option => option.getAttribute('aria-selected') === 'true');
    const close = (restoreFocus = false) => {
      menu.hidePopover();
      if (restoreFocus) trigger.focus({ preventScroll: true });
    };
    const open = () => {
      menu.showPopover();
      focusOption(Math.max(0, selectedIndex()));
    };
    trigger.addEventListener('click', event => {
      event.preventDefault();
      if (menu.matches(':popover-open')) close(); else open();
    }, { signal });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        open();
      }
    }, { signal });
    menu.addEventListener('beforetoggle', event => {
      const open = (event as ToggleEvent).newState === 'open';
      trigger.setAttribute('aria-expanded', String(open));
      if (!open) return;
      search = '';
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 180), innerWidth - 16);
      const below = innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upward = below < 160 && above > below;
      menu.style.width = `${width}px`;
      menu.style.left = `${Math.max(8, Math.min(rect.right - width, innerWidth - width - 8))}px`;
      menu.style.maxHeight = `${Math.min(280, Math.max(48, upward ? above : below))}px`;
      menu.style.top = upward ? 'auto' : `${rect.bottom + 6}px`;
      menu.style.bottom = upward ? `${innerHeight - rect.top + 6}px` : 'auto';
    }, { signal });
    menu.addEventListener('click', event => {
      const option = (event.target as Element).closest<HTMLButtonElement>('[role="option"]');
      if (!option) return;
      options.forEach(item => item.setAttribute('aria-selected', String(item === option)));
      trigger.querySelector('.filter-value')!.textContent = option.querySelector('.filter-option-label')!.textContent;
      close(true);
      onChange(trigger.id, option.dataset.value!);
    }, { signal });
    menu.addEventListener('keydown', event => {
      const index = options.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); close(true);
      } else if (event.key === 'Tab') {
        close(true);
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        focusOption(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
      } else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        search = performance.now() - lastKey < 600 ? search + event.key : event.key;
        lastKey = performance.now();
        const prefix = search.toLocaleLowerCase();
        const match = options.findIndex(option => option.textContent?.trim().toLocaleLowerCase().startsWith(prefix));
        if (match >= 0) focusOption(match);
      }
    }, { signal });
  }
  const closeMenus = () => menus.forEach(menu => { if (menu.matches(':popover-open')) menu.hidePopover(); });
  window.addEventListener('resize', closeMenus, { signal });
  document.addEventListener('scroll', event => {
    if (!menus.some(menu => menu.contains(event.target as Node))) closeMenus();
  }, { capture: true, signal });
  return () => { closeMenus(); events.abort(); };
}
