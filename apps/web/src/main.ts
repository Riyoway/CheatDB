import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/commit-mono/latin-400.css';
import './style.css';
import { observeSelections, reveal, syncSelection, toggleDisclosure, updateDisclosure } from './motion';
import { infiniteList } from './infinite-list';

type Platform = { id: string; name: string; games: number; cheats: number };
type Game = { id: number; name: string; platform: string; externalId: string; cheats: number; aliases: string[]; identifiers: { identifier: string; region: string }[] };
type Entry = { id: number; name: string; build_id: string | null; region_id: string | null; version: string | null; type: string | null; aliases: string[]; part: number };
type GameDetail = Game & { entries: Entry[] };
type Code = Entry & { code_text: string; notes: string | null; authors: string[] };
type Catalog = { schemaVersion: number; revision: string; sha256: string; generatedAt: string | null; totalGames: number; totalCheats: number; platforms: Platform[]; games: Game[] };

const base = import.meta.env.BASE_URL;
const app = document.querySelector<HTMLDivElement>('#app')!;
const fmt = (n: number) => n.toLocaleString('en-US');
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const icon = (name: string, size = 18) => {
  const paths: Record<string, string> = {
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    external: '<path d="M14 4h6v6m0-6L10 14M10 4H4v16h16v-6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    game: '<path d="M7 7h10c3 0 6 11 3 12-2 1-4-3-5-3H9c-1 0-3 4-5 3C1 18 4 7 7 7Z"/><path d="M7 10v5m-2-2.5h4m7-1h.01m2 3h.01"/>',
    code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    github: '<path d="M9 19c-4 1-4-2-6-2m12 4v-3c0-1-.2-2-1-2 4-.5 6-2 6-6 0-1-.5-2-1-3 .2-1 .2-2-.2-3-2 0-3 1-3 1-2-.6-4-.6-6 0 0 0-1-1-3-1-.4 1-.4 2-.2 3-.5 1-1 2-1 3 0 4 2 5.5 6 6-.8.5-1 1-1 2v3"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.game}</svg>`;
};
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

async function json<T>(path: string): Promise<T> {
  const response = await fetch(`${base}data/${path}`);
  if (!response.ok) throw new Error(`Data request failed (${response.status}). Reload to get the latest dataset.`);
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Dataset unavailable. Please reload and try again.');
  return response.json() as Promise<T>;
}

let catalog: Catalog;
let platform = '', query = '', selected = 0;
let detail: GameDetail | null = null;
let gameRequest = 0;
let cheatQuery = '', buildFilter = '', regionFilter = '';
let stopGames: (() => void) | undefined, stopCheats: (() => void) | undefined;
const codeCache = new Map<string, Promise<Code[]>>();

function publicPath(id = platform) { return `${base}${id ? `${id}/` : ''}`; }
function updateUrl(replace = false) {
  const url = new URL(publicPath(), location.origin);
  if (query) url.searchParams.set('q', query);
  if (selected) url.searchParams.set('game', String(selected));
  history[replace ? 'replaceState' : 'pushState']({}, '', url);
}

function readUrl() {
  const path = location.pathname;
  if (path === base.slice(0, -1)) history.replaceState({}, '', `${base}${location.search}${location.hash}`);
  const remainder = location.pathname.startsWith(base) ? location.pathname.slice(base.length).replace(/\/$/, '') : '?';
  if (remainder && !catalog.platforms.some(p => p.id === remainder)) return false;
  platform = remainder;
  const params = new URLSearchParams(location.search);
  query = params.get('q') ?? '';
  const requested = Number(params.get('game'));
  selected = catalog.games.some(g => g.id === requested && (!platform || g.platform === platform)) ? requested : 0;
  return true;
}

function shell() {
  app.innerHTML = `
    <aside class="sidebar">
      <a class="workspace-link" href="https://db.riyo.me/" aria-label="Riyo databases portal"><span class="workspace-avatar">R</span><span>Riyo databases</span><span class="workspace-arrow" aria-hidden="true">↗</span></a>
      <nav class="sidebar-home" aria-label="Database navigation"><a href="${base}" data-platform="" class="nav-item database-link">${icon('database', 17)}<span>CheatDB</span></a></nav>
      <div class="sidebar-section"><p class="nav-label">Platforms</p><nav aria-label="Platforms" id="platform-nav"></nav></div>
      <nav class="sidebar-section resources" aria-label="Resources"><a href="https://github.com/Riyoway/CheatDB/tree/main/exports">${icon('code', 17)}<span>Dataset exports</span></a><a href="https://github.com/Riyoway/CheatDB">${icon('github', 17)}<span>Source repository</span></a><a href="https://github.com/Riyoway/CheatDB#readme">${icon('external', 16)}<span>Documentation</span></a></nav>
      <div class="sidebar-footer"><span class="status-dot"></span><span>Read-only dataset</span><a href="https://github.com/Riyoway/CheatDB/issues" aria-label="Report an issue">${icon('external', 14)}</a></div>
    </aside>
    <main id="main" class="workspace" tabindex="-1">
        <header class="page-header"><h1>CheatDB</h1><span class="dataset-total">${fmt(catalog.totalGames)} games <span>·</span> ${fmt(catalog.totalCheats)} codes</span></header>
        <nav id="platform-tabs" class="platform-tabs" aria-label="Filter by platform"></nav>
        <section id="library" class="library panel" aria-labelledby="library-heading">
          <div class="library-controls"><div class="panel-heading"><h2 id="library-heading">Games and cheat codes</h2><span id="result-count" class="muted" role="status"></span></div>
          <div class="toolbar"><label class="searchbox">${icon('search', 16)}<input id="game-search" type="search" placeholder="Search games, title IDs or aliases…" aria-label="Search games, title IDs or aliases" autocomplete="off"/><kbd>/</kbd></label><a class="outline-button" aria-label="View dataset exports" href="https://github.com/Riyoway/CheatDB/tree/main/exports">${icon('external', 14)}<span>View exports</span></a></div></div>
          <div class="browser"><section class="game-pane" aria-label="Games"><div class="pane-label">Game<span>Codes</span></div><div id="game-list" tabindex="0" role="region" aria-label="Game list"></div></section><section id="game-detail" class="detail-pane" aria-label="Selected game"></section></div>
        </section>
        <section class="panel dataset-panel" aria-labelledby="dataset-heading"><div class="panel-heading"><h2 id="dataset-heading">About this dataset</h2><span class="snapshot"><span class="status-dot"></span>Available</span></div><p class="panel-description">Nintendo cheat codes with build identifiers, regions and author credits. Compatibility depends on the exact game version and environment.</p><div class="panel-footer"><span>${catalog.generatedAt ? `Updated ${escape(catalog.generatedAt.slice(0, 10))}` : 'SQLite snapshot'}<span class="footer-separator">·</span>SQLite, JSON and JSONL</span><a href="https://github.com/Riyoway/CheatDB#readme">Dataset documentation ${icon('external', 13)}</a></div></section>
    </main>`;
  $('#game-search').addEventListener('input', event => {
    query = (event.target as HTMLInputElement).value;
    updateUrl(true); renderGames();
  });
  app.addEventListener('click', handleClick);
  app.addEventListener('toggle', event => {
    const target = event.target;
    if (target instanceof HTMLDetailsElement && target.open && target.dataset.cheat) void loadCode(target);
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName)) {
      event.preventDefault(); $('#game-search').focus();
    }
  });
  observeSelections([$('#platform-tabs'), $('#platform-nav')]);
  reveal($('.sidebar'), 0, 200);
  ['.page-header', '.platform-tabs', '.library', '.dataset-panel'].forEach((selector, i) => reveal($(selector), 4, 200, i * 30));
}

function renderPlatforms() {
  const nav = [{ id: '', name: 'All platforms', games: catalog.totalGames }, ...catalog.platforms];
  if (!$('#platform-nav').children.length) {
    $('#platform-nav').innerHTML = nav.map(p => `<a href="${publicPath(p.id)}" data-platform="${p.id}" class="nav-item">${icon(p.id ? 'game' : 'grid', 16)}<span>${escape(p.id === 'nes' ? 'NES' : p.name)}</span><small>${fmt(p.games)}</small></a>`).join('');
    $('#platform-tabs').innerHTML = nav.map(p => `<a href="${publicPath(p.id)}" data-platform="${p.id}">${escape(p.id === 'nes' ? 'NES' : p.id ? p.name.replace('Nintendo ', '') : 'All platforms')}</a>`).join('');
  }
  for (const container of [$('#platform-nav'), $('#platform-tabs')]) {
    container.querySelectorAll<HTMLElement>(':scope > a').forEach(link => {
      const active = link.dataset.platform === platform;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    syncSelection(container);
  }
  const title = platform ? catalog.platforms.find(p => p.id === platform)!.name : 'Nintendo cheat code database';
  document.title = `CheatDB · ${title}`;
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href = `https://db.riyo.me${publicPath()}`;
}

function renderGames() {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const games = catalog.games.filter(game => {
    if (platform && game.platform !== platform) return false;
    const text = [game.name, game.externalId, ...game.aliases, ...game.identifiers.map(i => `${i.identifier} ${i.region}`)].join(' ').toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  });
  $('#result-count').textContent = `${fmt(games.length)} ${games.length === 1 ? 'game' : 'games'}`;
  stopGames?.();
  stopGames = infiniteList($('#game-list'), games, game => `
    <a href="${publicPath(game.platform)}?game=${game.id}" data-game="${game.id}" class="game-row ${selected === game.id ? 'selected' : ''}" ${selected === game.id ? 'aria-current="true"' : ''}>
      <span class="game-icon">${icon('game', 18)}</span><span class="game-title"><strong>${escape(game.name)}</strong><small>${escape(game.platform.toUpperCase())}<span>·</span>${escape(game.externalId)}</small></span><span class="game-count">${fmt(game.cheats)}</span></a>`, '<div class="empty-list"><strong>No games found</strong><p>Try a shorter title or another platform.</p></div>', 'games');
  reveal($('#game-list'));
  reveal($('#result-count'), 0, 120);
}

async function renderGame() {
  const request = ++gameRequest;
  stopCheats?.(); stopCheats = undefined;
  detail = null; codeCache.clear();
  cheatQuery = ''; buildFilter = ''; regionFilter = '';
  $('#game-detail').removeAttribute('aria-busy');
  if (!selected) {
    $('#game-detail').innerHTML = `<div class="welcome">${icon('code', 28)}<h2>Select a game</h2><p>Choose a title to view its cheat codes,<br>builds, regions and author credits.</p><span class="welcome-shortcut"><kbd>/</kbd> to search games</span></div>`;
    reveal($('#game-detail'), 4, 200);
    return;
  }
  const gameId = selected;
  $('#game-detail').setAttribute('aria-busy', 'true');
  $('#game-detail').innerHTML = `<div class="game-loading" role="status"><span class="sr-only">Loading game…</span><div class="skeleton skeleton-title" aria-hidden="true"></div><div class="skeleton skeleton-meta" aria-hidden="true"></div>${Array.from({ length: 6 }, () => '<div class="skeleton skeleton-row" aria-hidden="true"></div>').join('')}</div>`;
  try {
    const game = await json<GameDetail>(`${catalog.revision}/games/${gameId}.json`);
    if (request !== gameRequest) return;
    detail = game;
    const builds = [...new Set(game.entries.map(c => c.build_id).filter((v): v is string => !!v))];
    const regions = [...new Set(game.entries.map(c => c.region_id).filter((v): v is string => !!v))];
    const options = (values: string[]) => values.map(v => `<option value="${escape(v)}">${escape(v)}</option>`).join('');
    $('#game-detail').innerHTML = `<div class="detail-header"><div class="detail-title"><h2>${escape(game.name)}</h2><span class="platform-badge">${escape(catalog.platforms.find(p => p.id === game.platform)?.name)}</span></div><div class="game-id"><span>Title ID</span><code>${escape(game.externalId)}</code></div>${game.identifiers.length ? `<div class="identifiers">${game.identifiers.map(i => `<span>${escape(i.identifier)}${i.region ? ` · ${escape(i.region)}` : ''}</span>`).join('')}</div>` : ''}<p class="compatibility">Match the game version, build and region before using a code.</p></div>
      <div class="code-toolbar"><label class="searchbox compact">${icon('search', 16)}<input id="cheat-search" type="search" placeholder="Search cheat names…" aria-label="Search cheat names"/></label><div class="select-filters">${builds.length ? `<label>Build<select id="build-filter"><option value="">All builds</option>${options(builds)}</select></label>` : ''}${regions.length ? `<label>Region<select id="region-filter"><option value="">All regions</option>${options(regions)}</select></label>` : ''}</div></div>
      <div class="codes-heading"><h3>Cheat codes</h3><span id="cheat-count" role="status"></span></div><div id="cheat-list" tabindex="0" role="region" aria-label="Cheat code list"></div>`;
    $('#cheat-search').addEventListener('input', event => { cheatQuery = (event.target as HTMLInputElement).value; renderCheats(); });
    document.querySelector('#build-filter')?.addEventListener('change', event => { buildFilter = (event.target as HTMLSelectElement).value; renderCheats(); });
    document.querySelector('#region-filter')?.addEventListener('change', event => { regionFilter = (event.target as HTMLSelectElement).value; renderCheats(); });
    $('#game-detail').removeAttribute('aria-busy');
    renderCheats(false);
    reveal($('#game-detail'), 4, 200);
  } catch (error) {
    if (request === gameRequest) {
      $('#game-detail').removeAttribute('aria-busy');
      $('#game-detail').innerHTML = `<div class="panel-message" role="alert">${escape((error as Error).message)}<button class="outline-button" data-retry-game>Try again</button></div>`;
      reveal($('#game-detail'));
    }
  }
}

function renderCheats(animate = true) {
  if (!detail) return;
  const terms = cheatQuery.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const entries = detail.entries.filter(c => (!buildFilter || c.build_id === buildFilter) && (!regionFilter || c.region_id === regionFilter) && terms.every(t => [c.name, ...c.aliases].join(' ').toLocaleLowerCase().includes(t)));
  $('#cheat-count').textContent = `${fmt(entries.length)} available`;
  stopCheats?.();
  stopCheats = infiniteList($('#cheat-list'), entries, (c, i) => `<details class="cheat" data-cheat="${c.id}" data-part="${c.part}"><summary><span class="cheat-number">${String(i + 1).padStart(2, '0')}</span><span class="cheat-name">${escape(c.name)}<small>${escape([c.version && `v${c.version}`, c.region_id, c.type].filter(Boolean).join(' · '))}</small></span><span class="chevron" aria-hidden="true">⌄</span></summary><div class="cheat-body" aria-busy="true"><p class="loading-label" role="status"><span class="loading-indicator" aria-hidden="true"></span>Loading code…</p></div></details>`, '<div class="empty-list">No codes match these filters.</div>', 'codes');
  if (animate) { reveal($('#cheat-list')); reveal($('#cheat-count'), 0, 120); }
}

async function loadCode(element: HTMLDetailsElement) {
  if (element.dataset.loaded || element.dataset.loading || !detail) return;
  element.dataset.loading = 'true';
  const gameId = detail.id, part = element.dataset.part!, key = `${gameId}-${part}`;
  const body = element.querySelector<HTMLElement>('.cheat-body')!;
  try {
    if (!codeCache.has(key)) codeCache.set(key, json<Code[]>(`${catalog.revision}/codes/${key}.json`));
    const codes = await codeCache.get(key)!;
    if (!element.isConnected || detail?.id !== gameId) return;
    const code = codes.find(c => String(c.id) === element.dataset.cheat);
    if (!code) throw new Error('Code missing from this dataset. Please reload.');
    element.dataset.loaded = 'true';
    updateDisclosure(element, () => {
      body.removeAttribute('aria-busy');
      body.innerHTML = `<div class="code-meta">${code.build_id ? `<span>Build <code>${escape(code.build_id)}</code></span>` : '<span>Code</span>'}<button class="copy-button" data-copy>${icon('copy', 14)}<span class="copy-label">Copy</span></button></div><pre tabindex="0" aria-label="Cheat code"><code>${escape(code.code_text)}</code></pre>${code.notes ? `<p class="code-notes">${escape(code.notes)}</p>` : ''}${code.authors.length ? `<p class="code-authors">By ${code.authors.map(escape).join(', ')}</p>` : ''}${code.aliases.length ? `<p class="code-authors">Also known as: ${code.aliases.map(escape).join(', ')}</p>` : ''}`;
    });
    let resetCopy: ReturnType<typeof setTimeout>;
    body.querySelector<HTMLButtonElement>('[data-copy]')!.addEventListener('click', async event => {
      const button = event.currentTarget as HTMLButtonElement;
      try {
        await navigator.clipboard.writeText(code.code_text);
        clearTimeout(resetCopy);
        button.dataset.copied = '';
        button.innerHTML = `${icon('check', 14)}<span class="copy-label" role="status">Copied</span>`;
        reveal(button.querySelector<HTMLElement>('.copy-label')!, 2, 150);
        resetCopy = setTimeout(() => {
          if (!button.isConnected) return;
          delete button.dataset.copied;
          button.innerHTML = `${icon('copy', 14)}<span class="copy-label">Copy</span>`;
          reveal(button.querySelector<HTMLElement>('.copy-label')!);
        }, 1800);
      } catch {
        button.textContent = 'Select code to copy';
        const range = document.createRange(); range.selectNodeContents(body.querySelector('pre')!);
        const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
      }
    });
  } catch (error) {
    codeCache.delete(key);
    if (element.isConnected) updateDisclosure(element, () => {
      body.removeAttribute('aria-busy');
      body.innerHTML = `<p role="alert">${escape((error as Error).message)}</p><button class="outline-button" data-retry-code>Try again</button>`;
    });
  } finally {
    delete element.dataset.loading;
  }
}

function handleClick(event: MouseEvent) {
  const summary = (event.target as Element).closest('summary');
  if (summary?.parentElement instanceof HTMLDetailsElement) {
    toggleDisclosure(summary.parentElement, event);
    return;
  }
  const target = (event.target as Element).closest<HTMLElement>('[data-platform], [data-game], [data-retry-game], [data-retry-code]');
  if (!target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  if (target.hasAttribute('data-platform')) {
    event.preventDefault();
    platform = target.dataset.platform!; selected = 0;
    updateUrl(); renderPlatforms(); renderGames(); void renderGame();
  } else if (target.dataset.game) {
    event.preventDefault(); selected = Number(target.dataset.game);
    updateUrl();
    document.querySelectorAll<HTMLElement>('[data-game]').forEach(row => {
      const active = Number(row.dataset.game) === selected;
      row.classList.toggle('selected', active);
      if (active) row.setAttribute('aria-current', 'true'); else row.removeAttribute('aria-current');
    });
    void renderGame();
    if (matchMedia('(max-width: 700px)').matches) $('#game-detail').scrollIntoView({ block: 'start', behavior: event.detail && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
  } else if (target.hasAttribute('data-retry-game')) void renderGame();
  else if (target.hasAttribute('data-retry-code')) void loadCode(target.closest('details')!);
}

function showRoute() {
  if (!readUrl()) {
    ++gameRequest;
    stopGames?.(); stopCheats?.();
    detail = null;
    $('#game-detail').removeAttribute('aria-busy');
    $('#game-detail').innerHTML = `<div class="panel-message"><h2>Platform not found</h2><a href="${base}">Browse all platforms</a></div>`;
    $('#game-list').replaceChildren();
    return;
  }
  $('#game-search').setAttribute('value', query);
  ($<HTMLInputElement>('#game-search')).value = query;
  renderPlatforms(); renderGames(); void renderGame();
}

async function boot() {
  try {
    catalog = await json<Catalog>('catalog.json');
    if (catalog.schemaVersion !== 1) throw new Error('Unsupported dataset version. Please reload.');
    shell(); showRoute();
    window.addEventListener('popstate', showRoute);
  } catch (error) {
    app.innerHTML = `<main class="boot-error"><h1>CheatDB</h1><p role="alert">${escape((error as Error).message)}</p><button class="outline-button" id="reload">Reload dataset</button><a href="https://github.com/Riyoway/CheatDB">Browse on GitHub ${icon('external', 15)}</a></main>`;
    $('#reload').addEventListener('click', () => location.reload());
    reveal($('.boot-error'), 4, 200);
  }
}

void boot();
