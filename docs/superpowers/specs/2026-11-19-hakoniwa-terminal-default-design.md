# Hakoniwa: Terminal as the default tab when an agent is clicked

## Intent

Clicking a person in the office opens the right window on the **Chat** tab. The
owner wants the agent's real terminal shown first, and Chat only when its tab is
pressed.

## Goals

- Picking a different person opens the detail window on the **Terminal** tab.
- Chat, the approval card and the composer stay one press away, unchanged.
- Agents without a real terminal (no `address`) still fall back to Chat.

## Non-goals

- Reordering the tabs or removing Chat.
- Changing the Kanban "Open terminal" window or a terminal picked from the left
  list.
- Making the choice sticky across agents.

## Decision (asked and answered)

For an agent that is waiting for approval, the window still opens on
**Terminal** ("Terminal selalu"). The Approve / Reject card and the input box
stay on the Chat tab.

## Approach

Only the per-person reset changes. Both paths that open the detail window set
`detailTab` on a change of person:

- `hakoniwa/mods/hakoniwa/chat.js` — `syncTerm` (the overlay window)
- `hakoniwa/mods/hakoniwa/region.js` — `syncRegion` (the right-hand region)

Both currently set it to `"chat"` (★106 V1). Set it to `"terminal"` instead.
`tabFor()` already falls back to the first existing tab, which is `"chat"` when
there is no terminal, so nothing else needs a guard.

## Left to the builder

- Update the two comments so they no longer say "the conversation first".
- No test suite exists in the repo; verify by reloading the layout.
