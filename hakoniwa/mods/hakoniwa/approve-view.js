// 22nd N2 (office-fix27b): "what is being approved", read from the waiting person's screen copy (the permission dialog: its header / first body line and its question).
// Nothing is guessed: only lines that the dialog itself shows are returned. A screen with no readable dialog gives { readable: false } and the card says where to look instead.
import { approvalPlan, stripApprovalDialog } from "./approve.js";

export const NO_DETAIL_TEXT = "See the last action in the conversation for details";
const BOX = /[│┃║╭╮╰╯┌┐└┘╔╗╚╝─━═╌┄┈]/g, OPT = /^\s*(?:[❯>›»▶▸→*]\s*)?\d{1,2}[.)]\s+\S/;
const FOOT = /^(esc\b|enter\b|tab\b|ctrl\b|shift\b|press\b|↑|↓)/i; // key hint lines under the options are not part of the ask
const clean = (s) => String(s ?? "").replace(BOX, " ").replace(/\s+/g, " ").trim();
const clip = (s, n) => { const a = [...String(s)]; return a.length > n ? a.slice(0, n - 1).join("") + "…" : String(s); };

// { readable, question, what }  question: the dialog's own question line ("Do you want to create hello.txt?"); what: its first one or two lines ("Create file · hello.txt"), "" when it has none.
export function approvalSummary(screen) {
  const text = String(screen ?? ""), plan = approvalPlan(text);
  if (!plan.readable || (plan.yes == null && plan.no == null)) return { readable: false, question: "", what: "" };
  const lines = text.split(/\r?\n/), cut = stripApprovalDialog(text);
  const start = cut.cut && cut.text !== "" ? cut.text.split(/\r?\n/).length : 0; // the dialog begins where the conversation copy ends (same cut as the screen tab)
  let first = -1;
  for (let i = start; i < lines.length; i++) if (OPT.test(lines[i])) { first = i; break; }
  if (first < 0) return { readable: false, question: "", what: "" };
  const before = lines.slice(start, first).map(clean).filter(Boolean).filter((l) => !FOOT.test(l));
  if (!before.length) return { readable: true, question: "", what: "" };
  const question = before[before.length - 1], body = before.slice(0, -1);
  return { readable: true, question: clip(question, 70), what: clip(body.slice(0, 2).join(" · "), 70) };
}

// 26th S3 (office-fix31b): the Japanese UI added a gloss to the dialog's English heading and question. The English UI shows them as they are
// (the dialog is already in English); any other text is returned as it is too (nothing made up). inbox.js inboxRawJa reads the known headings itself.
export function glossWhat(what) {
  return String(what ?? "");
}
export function glossQuestion(q) {
  return String(q ?? "");
}

// The lines the card shows over its description: at most two. Unreadable or empty -> the one fallback line.
export function approvalDetailLines(screen) {
  const s = approvalSummary(screen);
  const out = [glossWhat(s.what), glossQuestion(s.question)].filter(Boolean);
  return out.length ? out : [NO_DETAIL_TEXT];
}
