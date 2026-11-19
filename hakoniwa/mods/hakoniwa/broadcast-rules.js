// hakoniwa: one instruction to several agents at once (the rules; pure, so node can run them). keys.js draws the window.
// Only Herdr App agents can be written to from here (`hc send`, the same call as the chat box). Somebody who waits for an answer is
// never written to: the text would be typed into the permission question. That is checked twice: when the list is made (by the
// agent's state) and again right before sending (by its screen, read at that moment).
import { approvalPlan, reportName, reportWhere } from "./approve.js";

export const SEND = { w: 560, row: 44, base: 268, maxRows: 8 };
export const sendHeight = (n, rooms = 0) => SEND.base + (rooms > 1 ? 40 : 0) + Math.min(Math.max(1, n), SEND.maxRows) * SEND.row;

// -> [{ id, address, name, room, status, can }] in the list's own order. `can` false: it waits for an answer.
export function sendTargets(list) {
  return (Array.isArray(list) ? list : []).filter((a) => a && a.source === "app" && a.address)
    .map((a) => ({ id: a.id, address: a.address, name: reportName(a) || a.address, room: reportWhere(a), status: a.status ?? "", can: a.status !== "blocked" }));
}
// The rooms with somebody who can be written to, biggest first: [{ room, n }].
export function sendRooms(rows) {
  const m = new Map(); for (const r of rows ?? []) if (r.can && r.room) m.set(r.room, (m.get(r.room) ?? 0) + 1);
  return [...m].map(([room, n]) => ({ room, n })).sort((a, b) => b.n - a.n || a.room.localeCompare(b.room));
}
export const sendChosen = (rows, on) => (rows ?? []).filter((r) => r.can && on?.has?.(r.id));
// One line, as the chat box sends it: a line break inside would submit the first part alone.
export const sendText = (s) => String(s ?? "").replace(/\s*[\r\n]+\s*/g, " ").trim();

export const SEND_REASON = { ok: "Sent", waiting: "Waits for an answer: not sent", unreadable: "Screen could not be read: not sent", "send-failed": "Could not send", empty: "Nothing to send" };

// io: { hc(args) }. -> { ok, reason }.
export async function sendOne(io, row, text) {
  const t = sendText(text); if (!t) return { ok: false, reason: "empty" };
  let scr;
  try { scr = (await io.hc(["read", row.address]))?.stdout ?? ""; } catch { return { ok: false, reason: "unreadable" }; }
  if (approvalPlan(scr).readable) return { ok: false, reason: "waiting" }; // a numbered question is on its screen now
  try { const r = await io.hc(["send", row.address, t]); return r?.code ? { ok: false, reason: "send-failed" } : { ok: true, reason: "ok" }; } catch { return { ok: false, reason: "send-failed" }; }
}
export async function sendAll(io, rows, text, onStep = () => {}) {
  const out = {};
  await Promise.all((rows ?? []).map(async (r) => { const res = await sendOne(io, r, text); out[r.id] = res; try { onStep(r.id, res); } catch {} }));
  return out;
}
