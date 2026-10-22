export const downloads = [
  { filename: 'cheatdb.db', name: 'Complete SQLite database', format: 'SQLite', description: 'All platforms, games, codes, identifiers and author credits. Open with a SQLite database browser.', path: 'data/cheatdb.db', mime: 'application/vnd.sqlite3' },
  { filename: 'switch.json', name: 'Nintendo Switch', format: 'JSON', description: 'Game records and cheat codes, including build identifiers.', path: 'exports/JSON/Nintendo/switch.json', mime: 'application/json' },
  { filename: '3ds.json', name: 'Nintendo 3DS', format: 'JSON', description: 'Nintendo 3DS games and their cheat codes.', path: 'exports/JSON/Nintendo/3ds.json', mime: 'application/json' },
  { filename: 'wiiu.json', name: 'Wii U', format: 'JSON', description: 'Wii U titles, region identifiers and cheat codes.', path: 'exports/JSON/Nintendo/wiiu.json', mime: 'application/json' },
  { filename: 'nes.json', name: 'Nintendo Entertainment System', format: 'JSON', description: 'NES game records and cheat codes.', path: 'exports/JSON/Nintendo/nes.json', mime: 'application/json' },
  { filename: 'all.jsonl', name: 'All Nintendo platforms', format: 'JSONL', description: 'One cheat record per line, suitable for streaming imports and data tools.', path: 'exports/JSON/Nintendo/all.jsonl', mime: 'application/x-ndjson' },
  { filename: 'AUMJ88.xml', name: 'Minecraft: Wii U Edition · AUMJ88', format: 'XML', description: 'JGecko U export for this specific game and region.', path: 'exports/JGeckoU/AUMJ88.xml', mime: 'application/xml' },
];
