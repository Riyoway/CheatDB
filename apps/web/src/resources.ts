import { downloads } from './downloads';
import { icon } from './icons';

export function resourceContent(page: string, base: string) {
  if (page === 'downloads') return `
    <p class="resource-intro">Download the dataset directly. Choose SQLite for the complete database, or a format for your own tools.</p>
    <section class="panel resource-panel" aria-label="Dataset downloads">${downloads.map(file => `
      <div class="download-row"><div><span class="platform-badge">${file.format}</span><h2>${file.name}</h2><p>${file.description}</p><code>${file.filename}</code></div><a class="outline-button" href="${base}download/${file.filename}" download="${file.filename}" aria-label="Download ${file.filename}">Download ${icon('download', 14)}</a></div>`).join('')}</section>
    <p class="resource-note">Not sure which format to choose? <a href="${base}docs/" data-resource="docs">Read the dataset guide ${icon('arrow', 14)}</a></p>`;
  return `
    <p class="resource-intro">Find a game, check compatibility, and copy the code you need.</p>
    <section class="panel resource-panel guide-section"><h2>Browse and search</h2><ol><li>Choose a platform or search by game name, title ID or alias. Press <kbd>/</kbd> to focus game search.</li><li>Select a game to view its codes. Scroll either list to load more entries.</li><li>Filter codes by name, build or region where available. Open a code to see the full text, notes and author credits.</li><li>Use <strong>Copy</strong> to copy the original code text.</li></ol><a class="outline-button" href="${base}" data-platform="">Browse CheatDB ${icon('arrow', 14)}</a></section>
    <section class="panel resource-panel guide-section"><h2>Check compatibility</h2><p>Match the platform, game version, build identifier and region before using a code. A code for one build may not work with another. Follow any notes included with the entry and keep a backup of your save data.</p><p>CheatDB is a read-only dataset browser. It displays and copies codes; it does not apply them to your game.</p></section>
    <section class="panel resource-panel guide-section"><h2>Choose a download format</h2><dl><dt>SQLite</dt><dd>The complete database. Tables include platforms, games, cheats, identifiers, aliases and author credits. The <code>cheat_view</code> view provides a convenient combined query.</dd><dt>JSON</dt><dd>One file per platform, containing an array of game records and their cheats.</dd><dt>JSONL</dt><dd>One cheat record per line across all Nintendo platforms, useful for streaming imports.</dd><dt>XML</dt><dd>A JGecko U export specifically for Minecraft: Wii U Edition, region AUMJ88.</dd></dl><a class="outline-button" href="${base}downloads/" data-resource="downloads">Download dataset ${icon('arrow', 14)}</a></section>
    <section class="panel resource-panel guide-section"><h2>JSON records</h2><p>Platform JSON files contain game records with <code>id</code>, <code>name</code> and a <code>cheat</code> array. Each cheat has a <code>name</code> and <code>code</code>. Single-line codes are strings; multiline codes are arrays of strings. Build IDs, regions, versions, notes, aliases and authors are included where available.</p><pre tabindex="0" aria-label="Example JSON record"><code>{
  "id": "game identifier",
  "name": "Game title",
  "cheat": [{ "name": "Cheat name", "code": ["code line 1", "code line 2"] }]
}</code></pre></section>
    <p class="resource-note">Development and contributions: <a href="https://github.com/Riyoway/CheatDB" target="_blank" rel="noopener noreferrer">Source code on GitHub ${icon('external', 14)}</a></p>`;
}
