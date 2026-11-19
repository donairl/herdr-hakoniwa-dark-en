# Terminal as the Default Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a person opens the detail window on the Terminal tab instead of Chat.

**Architecture:** Both code paths that open the detail window (the overlay window in `chat.js` and the right-hand region in `region.js`) reset `detailTab` when the selected person changes. Change that reset to `"terminal"`. `tabFor()` already falls back to the first tab that exists, so an agent with no real terminal still lands on Chat.

**Tech Stack:** JavaScript Herdr mod (no build step, no test runner in this repo).

**Spec:** `docs/superpowers/specs/2026-11-19-hakoniwa-terminal-default-design.md`

## Global Constraints

- Keep the existing tabs and their order — `DETAIL_TABS` is `terminal, chat, team`.
- No change to the Kanban "Open terminal" window or a terminal picked from the left list.
- Keep the file's existing comment style (version tags such as `★106`, English comments).

## Review Focus

- An agent with no real terminal (`address` empty) — must still open on Chat.
- An agent waiting for approval — opens on Terminal (decided), and the Approve/Reject card plus the input must still work when Chat is pressed.
- Pressing a tab and then picking another person — the new person must start on Terminal again.

---

### Task 1: Default the detail window to the Terminal tab

**Files:**
- Modify: `hakoniwa/mods/hakoniwa/chat.js:323`
- Modify: `hakoniwa/mods/hakoniwa/region.js:32`

**Interfaces:**
- Consumes: `tabFor(want, hasTerminal, kids)` from `detail.js` (unchanged).
- Produces: nothing new; `this.detailTab` is now `"terminal"` after a change of person.

- [ ] **Step 1: Change the reset in `syncTerm`**

In `hakoniwa/mods/hakoniwa/chat.js:323`, replace the line

```js
    if (this.detailTabFor !== want.id) { this.detailTabFor = want.id; this.detailTab = "chat"; } // ★84 another person: the first tab again; ★106 V1: the conversation
```

with

```js
    if (this.detailTabFor !== want.id) { this.detailTabFor = want.id; this.detailTab = "terminal"; } // ★84 another person: the first tab again; ★110: the terminal first (Chat when the person has no real terminal)
```

- [ ] **Step 2: Change the reset in `syncRegion`**

In `hakoniwa/mods/hakoniwa/region.js:32`, replace the line

```js
    if (want && this.detailTabFor !== want.id) { this.detailTabFor = want.id; this.detailTab = "chat"; } // ★106 V1 (J7): the conversation first; the terminal only when its tab is pressed
```

with

```js
    if (want && this.detailTabFor !== want.id) { this.detailTabFor = want.id; this.detailTab = "terminal"; } // ★110: the terminal first; Chat only when its tab is pressed (a person with no real terminal falls back to Chat)
```

- [ ] **Step 3: Check both resets and the fallback**

Run: `grep -n 'detailTab = ' hakoniwa/mods/hakoniwa/chat.js hakoniwa/mods/hakoniwa/region.js`

Expected: exactly two matches, both `"terminal"`.

Run: `grep -n 'export const tabFor' -A1 hakoniwa/mods/hakoniwa/detail.js`

Expected: the line still returns `t[0].key` for an unknown tab, and `DETAIL_TABS` puts `terminal` first only when `hasTerminal` is true.

- [ ] **Step 4: Load the mod and try it by hand**

Run: `herdr-app check ~/.config/herdr-app/mods/hakoniwa` (after copying the folder as the README says).

Expected: the mod loads without error. Then in the office, click a working agent: the right window opens on **Terminal**. Click **Chat**: the conversation and input appear. Click another agent: Terminal again. Click an agent with no terminal: Chat.

- [ ] **Step 5: Commit**

```bash
git add hakoniwa/mods/hakoniwa/chat.js hakoniwa/mods/hakoniwa/region.js docs/superpowers/
git commit -m "Hakoniwa: an agent opens on its terminal tab, not the chat"
```
