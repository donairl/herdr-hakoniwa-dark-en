# Hakoniwa — a pixel-art office for your coding agents

A layout for [Herdr App](https://herdr.dev). Every coding agent on your PC (Claude Code, Codex, OpenCode, Cursor, Copilot,
Antigravity, in Herdr App, herdr TUI or T3 Code) works at a desk in a little isometric office. They walk in at the
entrance, type while they work, raise a hand when they wait for your approval, bring a paper when they have a report,
and leave when they are done. Click a person to read the conversation, approve, or type to them.

Made by [Trellis](https://trellis-grow.com/?utm_source=github.com&utm_medium=referral&utm_campaign=herdr-hakoniwa&utm_content=readme-top) in Fukuoka, Japan. Trellis builds websites and automates work with AI.

![Hakoniwa](hakoniwa/preview.png)

## What you see

- **Top band**: the Hakoniwa logo, the number of agents in each state (click one to pick the first of them), Claude Code
  usage, and the button that starts a new agent.
- **The office floor** (the whole window): one room per Herdr space (or per box: T3 Code, Herdr App, herdr TUI). Each agent
  is a person at a desk. Working: typing at the PC, a blue dot. Waiting for approval: standing, hand up, an orange `!`.
  Report ready: standing with a paper, a green `✓`. Idle: sitting with a red mug. A gold ring marks a leader (an agent with
  workers). The window outside follows the time of day and the weather; a board on the wall shows the weather and the counts.
- **Right panel** (opens when you click a person): the agent's head (name, state, what it is doing), its conversation or
  its terminal, approve / reject buttons while it waits, and a box to type to it.
- **Footer**: the number of people and spaces, the last update, and the legend.

The screen text is in **English**.

## What you need

| | |
|---|---|
| Herdr App with herdr-core (`hc` on PATH) | the agents' states come from the App and `hc` |
| Python 3.10 or later on PATH | Windows: `pythonw`, `python` or `py`; elsewhere `python3` or `python` (or set `python` in `config.json`) |
| `numpy` and `Pillow` for that Python | `python -m pip install numpy pillow` (the office picture is made with them) |
| Windows | made and tested on Windows 11. macOS / Linux are not tested |
| Node.js | only for the Cursor / Copilot hooks (below) |

T3 Code and herdr TUI are optional: what is not on the PC is not shown.

## Add it

Ask your agent in Herdr App:

```
Read ~/.config/herdr-app/AGENTS.md, then add this layout: https://github.com/trellis-grow-org/herdr-hakoniwa/tree/main/hakoniwa
```

For this fork (with dark theme support):

```
Read ~/.config/herdr-app/AGENTS.md, then add this layout: https://github.com/donairl/herdr-hakoniwa-dark-en/tree/main
```

It copies `hakoniwa/layouts/hakoniwa.json` to `~/.config/herdr-app/layouts/` and `hakoniwa/mods/hakoniwa/` to
`~/.config/herdr-app/mods/`. Then:

```
python -m pip install numpy pillow
herdr-app check ~/.config/herdr-app/mods/hakoniwa
herdr-app do layout.switch --name hakoniwa
```

The first start cuts the art out of the sheets and builds the people: the floor says "Preparing the office…" for a minute or two
while a background run finishes, then it appears. `ctrl-shift-l` switches back to your own layout.

**Cursor, Copilot and OpenCode** do not report their state to the App by themselves. To see them work, install the hooks
(they are new files, except Cursor's `hooks.json`, which is backed up first and only gets entries added):

```
python ~/.config/herdr-app/mods/hakoniwa/integrations/install-hooks.py --dry-run    # show what would change
python ~/.config/herdr-app/mods/hakoniwa/integrations/install-hooks.py              # install
python ~/.config/herdr-app/mods/hakoniwa/integrations/install-hooks.py --uninstall  # remove only what it added
```

## Settings

Nothing is needed. To change something, copy `mods/hakoniwa/config.example.json` to `mods/hakoniwa/config.json` and keep
only the keys you change. The main ones: `office.rooms` (rooms and their names), `office.sources` (which boxes to collect),
`office.weather` (`{"place": "Osaka"}`, `{"lat": 34.69, "lon": 135.50, "label": "OSAKA"}` or `{"enabled": false}`),
`office.colors`, and `office.launch` (how agents started from the office begin: by default each CLI as it starts by itself,
with no permission widened; e.g. `"codex": {"argv": ["codex", "-s", "workspace-write"]}`).

`herdr-app do hakoniwa.demo` switches a made-up cast on and off (for screenshots).

## What it does on your PC

Herdr asks you to know this before adding a mod. Hakoniwa does all three:

- **Network**: the collector asks Open-Meteo (`api.open-meteo.com`, and `geocoding-api.open-meteo.com` once if you give a
  place name) for the weather, at most every 30 minutes. No key, nothing about you is sent but the place. Turn it off with
  `"weather": {"enabled": false}`. The mod itself makes no network calls.
- **Programs it runs**:
  - `python` with its own scripts in `mods/hakoniwa/py/` (every few seconds: the collector; when the floor changes: the office
    picture) and `mods/hakoniwa/opencode-usage.py`.
  - `hc` (herdr-core): `ls`, `get`, `read` to show agents and their screens; `send` and `keys` only when you type to an agent
    or press approve / reject; `label` when you rename one.
  - `herdr` (the TUI) when herdr TUI agents are collected; the agent CLIs (`claude`, `codex`, `opencode`, `cursor-agent`,
    `agy`) when you start an agent, and their `--help` / `models` lists once a day for the new-agent window.
  - App commands: it focuses, opens, renames and closes spaces, tabs and terminals when you ask for it in the office. **By
    itself** it also keeps rooms with their people: it closes a space 6 s after the last agent it saw there is gone and no
    terminal is left in it, names a new space after its first agent, and moves a leader's workers into one space.
    `"office": {"auto_rooms": false}` turns all three off.
- **Files it reads outside its folder** (read only): `~/.claude.json` (Claude Code usage), `~/.claude/projects` and
  `~/.claude/sessions` (conversations), `~/.codex/sessions`, the OpenCode database (`~/.local/share/opencode/opencode.db`),
  `~/.t3/userdata/statev2.sqlite` (T3 Code), and herdr TUI through its CLI.
- **Files it writes**: `~/.config/herdr-app/hakoniwa-office/` (the pictures and its own logs; a few hundred MB),
  `%LOCALAPPDATA%/hakoniwa/` (`state.json`). A Claude started from the office gets a small `--settings` file from
  `hakoniwa-office/` that keeps its conversation (`office.launch.claude_settings` in `config.json` turns it off).

## Remove it

Delete `layouts/hakoniwa.json`, `mods/hakoniwa/`, `hakoniwa-office/` (all under `~/.config/herdr-app`) and
`%LOCALAPPDATA%/hakoniwa/`. Run `install-hooks.py --uninstall` first if you installed the hooks.

## About Trellis

Hakoniwa is made and shared by [Trellis](https://trellis-grow.com/?utm_source=github.com&utm_medium=referral&utm_campaign=herdr-hakoniwa&utm_content=readme-about) in Fukuoka, Japan. Trellis builds websites and automates work with AI agents.
How Hakoniwa was built is on our [tech notes](https://trellis-grow.com/tech/?utm_source=github.com&utm_medium=referral&utm_campaign=herdr-hakoniwa&utm_content=readme-technotes) (in Japanese).

## License

MIT (see `LICENSE`).

The pixel-art furniture, rooms and people (`mods/hakoniwa/py/sheets/`) were made with an image generation model (OpenAI gpt-image-2) and then cut into parts by the scripts here. They are covered by the same license.
