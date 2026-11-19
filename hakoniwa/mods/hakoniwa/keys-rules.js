// hakoniwa: the keyboard commands (keys.json -> "hakoniwa.<command>", read by the band's copy in main.js) and answering several
// waiting people at once. The small pure rules (no gpui, no App API, so node can run them); keys.js does what they decide.
import { approvalPlan, answerApproval, stripApprovalDialog, inboxWhat, reportName, reportWhere } from "./approve.js";
import { approvalDetailLines } from "./approve-view.js";

// What a key can ask for. `inbox` and `close` were there already (room.js / main.js); the rest is keys.js.
export const KEY_COMMANDS = ["next", "prev", "attention", "approve", "reject", "approve-all", "tab"];

// The person after (dir 1) / before (dir -1) the chosen one, in the list's own order, going round. Nobody chosen: the first / the last.
export function navStep(list, selId, dir = 1) {
  const l = Array.isArray(list) ? list.filter((a) => a?.id) : []; if (!l.length) return null;
  const i = l.findIndex((a) => a.id === selId), step = dir < 0 ? -1 : 1;
  return i < 0 ? (step > 0 ? l[0] : l[l.length - 1]) : l[(i + step + l.length) % l.length];
}

// The next person who needs an answer or has a report (`queue`: waiting first, see main.js queue()). After the chosen one, going round;
// when the chosen one is not in the queue, its head.
export function attentionStep(queue, selId) {
  const q = Array.isArray(queue) ? queue.filter((a) => a?.id) : []; if (!q.length) return null;
  const i = q.findIndex((a) => a.id === selId);
  return q[(i + 1) % q.length];
}

// What the approve / reject key does for the chosen person: "answer" (it waits and can be answered from here), "select" (nobody is chosen:
// the first waiting person is chosen and nothing is pressed, so an answer is never given to somebody who is not on the screen),
// "none" (nobody waits), "not-waiting", "terminal" (a waiting person of T3 Code / herdr TUI: only its own screen can answer).
export function answerKeyPlan(list, selId, queue) {
  const l = Array.isArray(list) ? list : [], sel = selId == null ? null : l.find((a) => a.id === selId) ?? null;
  if (!sel) { const first = (Array.isArray(queue) ? queue : []).find((a) => a.status === "blocked") ?? null; return first ? { act: "select", agent: first } : { act: "none", agent: null }; }
  if (sel.status !== "blocked") return { act: "not-waiting", agent: sel };
  if (sel.source !== "app" || !sel.address) return { act: "terminal", agent: sel };
  return { act: "answer", agent: sel };
}

// ---- answering several people at once

// The kind of a request, from the dialog's own first line ("Bash command · npm test" -> "Bash command"); a line in no known shape is "Other".
export const askKind = (what) => { const m = /^\s*([^·]{1,40}?)\s*(?:·|$)/.exec(String(what ?? "")); return m && m[1] ? m[1] : "Other"; };

// The whole permission dialog as it stands on the screen (from where the conversation ends to the end), without the frame's lines and the
// option cursor. `askPrint` is its text with no whitespace: what "the same question as the one that was shown" is compared by (the card's
// own "what" line is cut to 70 letters, so two long commands could look the same there). `askFull` is the readable copy (the row's tooltip).
const FRAME = /[│┃║╭╮╰╯┌┐└┘╔╗╚╝─━═╌┄┈]/g;
export const askFull = (screen) => {
  const text = String(screen ?? ""), cut = stripApprovalDialog(text);
  return (cut.cut ? text.split(/\r?\n/).slice(cut.text === "" ? 0 : cut.text.split(/\r?\n/).length) : text.split(/\r?\n/).slice(-30))
    .map((l) => l.replace(FRAME, " ").replace(/^\s*[❯>›»▶▸→]\s*(?=\d{1,2}[.)])/, " ").replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
};
export const askPrint = (screen) => askFull(screen).replace(/\s+/g, "");

// Who can be answered together: App agents that wait, whose screen was read (`screens`: id -> the screen's text) and shows both what is asked
// and a "yes" to press. Everybody else stays out and is counted in `skipped` (they are answered one by one, as before). Oldest first.
export function bulkTargets(list, screens) {
  const targets = [], skipped = [];
  for (const a of (Array.isArray(list) ? list : []).filter((x) => x?.status === "blocked").sort((x, y) => (x.since ?? 0) - (y.since ?? 0))) {
    const scr = a.source === "app" && a.address ? screens?.[a.id] : null, plan = scr == null ? null : approvalPlan(scr);
    const what = plan ? inboxWhat({ detail: approvalDetailLines(scr) }) : "";
    if (plan?.readable && plan.yes != null && what) targets.push({ id: a.id, address: a.address, name: reportName(a), where: reportWhere(a), what, kind: askKind(what), full: askFull(scr), print: askPrint(scr) });
    else skipped.push({ id: a.id, name: reportName(a) });
  }
  return { targets, skipped };
}

// The kinds among the targets, most frequent first: [{ kind, n }].
export function bulkKinds(targets) {
  const m = new Map(); for (const t of targets ?? []) m.set(t.kind, (m.get(t.kind) ?? 0) + 1);
  return [...m].map(([kind, n]) => ({ kind, n })).sort((a, b) => b.n - a.n || a.kind.localeCompare(b.kind));
}
export const bulkChosen = (targets, off) => (targets ?? []).filter((t) => !off?.has?.(t.id));

// Approves one target, only if its screen still asks what the list showed: an agent that moved on to another question in the meantime is
// left alone ("changed") and answered by hand. io: { hc(args), sleep(ms) } (the same as answerApproval). -> { ok, reason }.
export async function approveTarget(io, t, waitMs = 1800) {
  let scr;
  try { scr = (await io.hc(["read", t.address]))?.stdout ?? ""; } catch { return { ok: false, reason: "unreadable" }; }
  if (!t.print || askPrint(scr) !== t.print) return { ok: false, reason: "changed" };
  try { const r = await answerApproval(io, t.address, "yes", waitMs); return { ok: !!r.ok, reason: r.reason }; } catch { return { ok: false, reason: "send-failed" }; }
}
export const BULK_REASON = {
  ok: "Approved", changed: "Asks something else now: not answered", unreadable: "Screen could not be read: not answered", "no-option": "No \"yes\" on its screen: not answered",
  "send-failed": "Key could not be sent", unchanged: "Pressed, but it still waits: check its terminal",
};
// Each target runs on its own terminal, so they are answered side by side; `onStep(id, result)` as each one ends. -> { id: result }.
export async function approveTargets(io, targets, onStep = () => {}, waitMs = 1800) {
  const out = {};
  await Promise.all((targets ?? []).map(async (t) => { const r = await approveTarget(io, t, waitMs); out[t.id] = r; try { onStep(t.id, r); } catch {} }));
  return out;
}
export const BULK = { w: 560, row: 58, base: 190, maxRows: 7 };
export const bulkHeight = (n, kinds = 1) => BULK.base + (kinds > 1 ? 40 : 0) + Math.min(Math.max(1, n), BULK.maxRows) * BULK.row;
