// hakoniwa: what the left list's search box matches (pure: node can run it). Every word typed must be found somewhere in the row:
// its name, its room, its folder, its CLI and model, or its state ("blocked", "waiting", "done", "report", "working", "idle"), so
// "claude blocked" or "api idle" narrow the list the way they read.
export const STATE_WORDS = { blocked: "blocked waiting approval", done: "done report finished", working: "working busy running", idle: "idle" };

export const searchTokens = (q) => String(q ?? "").toLowerCase().split(/\s+/).filter(Boolean);

// `r`: a row of panel.js panelRows ({ label, status, app, model, shell, tui }); `ag`: the agent of the same terminal when there is one
// ({ cwd, space, app, model, name }); `room`: the heading the row stands under.
export function rowHay(r, ag = null, room = "") {
  const st = String(r?.status ?? ag?.status ?? "");
  return [r?.label, ag?.name, room, ag?.space, ag?.cwd, r?.app ?? ag?.app, r?.model ?? ag?.model, st, STATE_WORDS[st], r?.shell ? "shell terminal" : "", r?.tui ? "tui" : ""]
    .filter(Boolean).join("\n").toLowerCase();
}
export const hayMatches = (tokens, hay) => (tokens ?? []).every((t) => String(hay ?? "").includes(t));
