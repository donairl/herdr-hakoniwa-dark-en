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
| Windows, Linux or macOS | made on Windows 11. This fork also runs on Linux (tested on Arch-based CachyOS); macOS uses the same code paths as Linux where it can but is not tested |
| `notify-send` (Linux only, optional) | for desktop notifications; it comes with `libnotify`. Without it the office works, just silently |
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

To use the keys below, merge `hakoniwa/keys.json` into `~/.config/herdr-app/keys.json` (it adds one section, `layout:hakoniwa`,
so the keys only act while this layout shows).

**Cursor, Copilot and OpenCode** do not report their state to the App by themselves. To see them work, install the hooks
(they are new files, except Cursor's `hooks.json`, which is backed up first and only gets entries added):

```
python ~/.config/herdr-app/mods/hakoniwa/integrations/install-hooks.py --dry-run    # show what would change
python ~/.config/herdr-app/mods/hakoniwa/integrations/install-hooks.py              # install
python ~/.config/herdr-app/mods/hakoniwa/integrations/install-hooks.py --uninstall  # remove only what it added
```

## Keys

From `hakoniwa/keys.json` (change them there or in your own `keys.json`). They are `alt` chords on purpose: a plain letter would be
taken away from whatever you are typing to an agent.

| Key | What it does |
|---|---|
| `alt-.` / `alt-,` | the next / previous agent |
| `alt-n` | the next agent that needs you (waiting for an answer first, then reports) |
| `alt-a` / `alt-r` | approve / reject what the chosen agent asks. With nobody chosen it only chooses the first one who waits, so nothing is ever answered unseen |
| `alt-shift-a` | "Approve requests": a list of every request that can be answered from the office |
| `alt-t` | the right window: Terminal ↔ Chat |
| `alt-i` | open / close the inbox |
| `alt-x` | close the right window and the popups |

**Approve requests** (also the "Approve all…" button in the inbox when two or more wait) shows who asks what; hover a row for the
whole question. Switch off a kind ("Bash command", "Edit file") or single rows, then press "Approve N". Each agent is approved only
if its screen still shows exactly the question that was listed: one that has moved on to another question is left alone. Agents of
T3 Code and herdr TUI, and screens that cannot be read, are never in the list.

**Notifications**: when an agent starts to wait for you or brings a report while the Herdr window is not in front, the office asks
the system to show a notification (`office.notify` in `config.json`; `"when": "always"` shows them every time, `"enabled": false` never).

## Settings

Nothing is needed. To change something, copy `mods/hakoniwa/config.example.json` to `mods/hakoniwa/config.json` and keep
only the keys you change. The main ones: `office.rooms` (rooms and their names), `office.sources` (which boxes to collect),
`office.weather` (`{"place": "Osaka"}`, `{"lat": 34.69, "lon": 135.50, "label": "OSAKA"}` or `{"enabled": false}`),
`office.colors`, `office.notify` (desktop notifications), and `office.launch` (how agents started from the office begin: by default each CLI as it starts by itself,
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
  - For a desktop notification (see Keys above): `notify-send` on Linux, `osascript` on macOS, `powershell.exe` with
    `mods/hakoniwa/integrations/notify.ps1` on Windows. The agent's own words are passed as plain arguments, never run.
    `"office": {"notify": {"enabled": false}}` turns it off.
  - On macOS, `ps` once per collector run (which process belongs to which agent, and its memory). Linux reads `/proc` and
    Windows asks the system directly; neither starts a program for it.
  - App commands: it focuses, opens, renames and closes spaces, tabs and terminals when you ask for it in the office. **By
    itself** it also keeps rooms with their people: it closes a space 6 s after the last agent it saw there is gone and no
    terminal is left in it, names a new space after its first agent, and moves a leader's workers into one space.
    `"office": {"auto_rooms": false}` turns all three off.
- **Files it reads outside its folder** (read only): `~/.claude.json` (Claude Code usage), `~/.claude/projects` and
  `~/.claude/sessions` (conversations), `~/.codex/sessions`, the OpenCode database (`~/.local/share/opencode/opencode.db`),
  `~/.t3/userdata/statev2.sqlite` (T3 Code), and herdr TUI through its CLI.
- **Files it writes**: `~/.config/herdr-app/hakoniwa-office/` (the pictures and its own logs; a few hundred MB),
  and the state folder (`state.json`): `%LOCALAPPDATA%/hakoniwa/` on Windows, `~/Library/Application Support/hakoniwa/` on
  macOS, `$XDG_STATE_HOME/hakoniwa/` (default `~/.local/state/hakoniwa/`) on Linux. Earlier versions wrote to
  `~/AppData/Local/hakoniwa/` on Linux and macOS too: that folder is moved to the new place the first time. A Claude started from the office gets a small `--settings` file from
  `hakoniwa-office/` that keeps its conversation (`office.launch.claude_settings` in `config.json` turns it off).

## Remove it

Delete `layouts/hakoniwa.json`, `mods/hakoniwa/`, `hakoniwa-office/` (all under `~/.config/herdr-app`) and
the state folder named above, and the `layout:hakoniwa` section of `keys.json` if you added it. Run `install-hooks.py --uninstall`
first if you installed the hooks.

## About Trellis

Hakoniwa is made and shared by [Trellis](https://trellis-grow.com/?utm_source=github.com&utm_medium=referral&utm_campaign=herdr-hakoniwa&utm_content=readme-about) in Fukuoka, Japan. Trellis builds websites and automates work with AI agents.
How Hakoniwa was built is on our [tech notes](https://trellis-grow.com/tech/?utm_source=github.com&utm_medium=referral&utm_campaign=herdr-hakoniwa&utm_content=readme-technotes) (in Japanese).

## License

MIT (see `LICENSE`).

The pixel-art furniture, rooms and people (`mods/hakoniwa/py/sheets/`) were made with an image generation model (OpenAI gpt-image-2) and then cut into parts by the scripts here. They are covered by the same license.
