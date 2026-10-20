# CheatDB

CheatDB is a normalized collection of game cheat codes for Nintendo platforms.

The primary dataset is stored in SQLite. JSON and JSONL exports are included for applications that prefer text-based formats.

## Repository layout

```text
CheatDB/
├─ apps/
│  └─ web/        # Web frontend for db.riyo.me/cheatdb
├─ packages/      # Shared code used by apps and tooling
├─ data/
│  └─ cheatdb.db  # Canonical SQLite database
├─ exports/       # Generated distribution formats
├─ scripts/       # Import, build, export, validation, and web-data tooling
└─ README.md
```

`data/cheatdb.db` is the canonical source of truth. Files under `exports/` are distribution formats derived from the dataset. The web frontend lives in `apps/web/`; shared packages should only be added when code is genuinely shared between multiple consumers.

## Contents

- `data/cheatdb.db` — canonical SQLite database
- `exports/JSON/Nintendo/switch.json` — Nintendo Switch cheats
- `exports/JSON/Nintendo/3ds.json` — Nintendo 3DS cheats
- `exports/JSON/Nintendo/nes.json` — Nintendo Entertainment System cheats
- `exports/JSON/Nintendo/wiiu.json` — Wii U cheats
- `exports/JSON/Nintendo/all.jsonl` — one cheat record per line across all Nintendo platforms
- `exports/JGeckoU/AUMJ88.xml` — JGecko U XML export for Minecraft: Wii U Edition (AUMJ88)

## Dataset size

| Platform | Games / variants | Cheats |
| --- | ---: | ---: |
| Nintendo Switch | 2,491 | 56,476 |
| Nintendo 3DS | 644 | 12,265 |
| Nintendo Entertainment System | 2,180 | 42,172 |
| Wii U | 12 | 6,948 |
| **Total** | **5,327** | **117,861** |

## JSON structure

Each platform JSON file contains an array of game records.

```json
{
  "id": "platform-specific game identifier",
  "name": "Game title",
  "cheat": [
    {
      "name": "Cheat name",
      "code": "code line or an array of code lines"
    }
  ]
}
```

Additional fields are included only when applicable:

- `build_id` — game build identifier
- `region_id` — region or product identifier
- `version` — game or code version
- `type` — code or execution type
- `notes` — compatibility or usage notes
- `aliases` — alternate names
- `authors` — credited code authors when present

Game records may also contain platform-specific identifiers such as `aliases`, `game_ids`, or `region_ids`.

`code` is stored as a string for a single-line code or as an array of strings for a multi-line code.

## SQLite structure

The main tables in `data/cheatdb.db` are:

- `platforms`
- `games`
- `game_aliases`
- `game_identifiers`
- `cheats`
- `cheat_aliases`
- `cheat_authors`

The database also includes `cheat_view` for simple queries and an FTS5 index for text search.

```sql
SELECT game_name, cheat_name, code_text
FROM cheat_view
WHERE platform = 'wiiu'
  AND game_name LIKE '%Minecraft%';
```

Cheat compatibility may depend on the exact game version, build, region, emulator, or hardware environment.
