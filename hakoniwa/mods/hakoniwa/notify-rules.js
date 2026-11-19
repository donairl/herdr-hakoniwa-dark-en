// hakoniwa: desktop notifications (the system's own: notify-send / osascript / a Windows toast) when somebody starts to wait for an
// answer or brings a report. The small pure rules (no gpui, no App API, so node can run them); feed.js sends what they return.
// Herdr already shows its own toast inside the window and plays a sound, so by default the system is asked only while the Herdr
// window is not the one in front ("away"): that is when the toast inside it cannot be seen.

export const NOTIFY_STATES = ["blocked", "done"];
export const NOTIFY_MAX_EACH = 3;   // more state changes than this at one moment: one notification that counts them
export const NOTIFY_BODY_MAX = 160;

// office.notify in config.json: { enabled, on: ["blocked", "done"], when: "away" | "always" }. Anything left out keeps its default.
export function notifySettings(config) {
  const raw = config?.office?.notify ?? config?.officeSettings?.notify, n = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const on = Array.isArray(n.on) ? n.on.filter((k) => NOTIFY_STATES.includes(k)) : NOTIFY_STATES;
  return { enabled: n.enabled !== false, on: [...new Set(on)], when: n.when === "always" ? "always" : "away" };
}

// What an agent says about itself comes from its terminal: printable text on one line, cut to a length.
export const notifyText = (s, max = NOTIFY_BODY_MAX) => {
  const t = String(s ?? "").replace(/[\u0000-\u001f\u007f-\u009f�]+/g, " ").replace(/\s+/g, " ").trim();
  return [...t].length > max ? `${[...t].slice(0, max - 1).join("")}…` : t;
};

const one = (e, where) => {
  const name = notifyText(e.name, 60) || "An agent", room = notifyText(where, 60);
  return e.to === "blocked"
    ? { kind: "blocked", title: `${name} needs your answer`, body: notifyText(e.msg) || (room ? `Waiting in ${room}` : "Waiting for approval") }
    : { kind: "done", title: `${name} has a report`, body: notifyText(e.msg) || (room ? `Finished in ${room}` : "Finished its turn") };
};

// `added`: the entries feed-rules.js trackMoves made at this moment ({ id, name, from, to, msg }). `whereOf(id)`: the room's name, or "".
// Returns the notifications to send: [{ kind, title, body }]. Nothing when it is off, when the window is in front (unless "always"),
// or when no entry is of a wanted kind. Waiting people come first; more than NOTIFY_MAX_EACH become one that counts them.
export function notifyPlan(added, settings, windowActive, whereOf = () => "") {
  const s = settings ?? notifySettings(null);
  if (!s.enabled || (s.when !== "always" && windowActive)) return [];
  const want = (Array.isArray(added) ? added : []).filter((e) => e && s.on.includes(e.to));
  if (!want.length) return [];
  const sorted = [...want.filter((e) => e.to === "blocked"), ...want.filter((e) => e.to !== "blocked")];
  if (sorted.length <= NOTIFY_MAX_EACH) return sorted.map((e) => one(e, whereOf(e.id)));
  const b = sorted.filter((e) => e.to === "blocked").length, d = sorted.length - b;
  const parts = [b ? `${b} need${b === 1 ? "s" : ""} your answer` : "", d ? `${d} ${d === 1 ? "has a report" : "have reports"}` : ""].filter(Boolean);
  return [{ kind: b ? "blocked" : "done", title: `Hakoniwa: ${parts.join(", ")}`, body: notifyText(sorted.map((e) => notifyText(e.name, 30)).filter(Boolean).join(", ")) }];
}

// notify-send reads a small markup in the body on most desktops: the agent's text must stay text.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const noDash = (s) => String(s).replace(/^-+\s*/, ""); // osascript has no "--": a text must not look like one of its options
// The program and its words for one notification on this system. Every text is its own argument (no shell, nothing is spliced into a
// script), and a text that starts with "-" cannot be taken for an option (`--` for notify-send, the dashes dropped for osascript). null: no way known.
// `files`: { icon, ps1 } absolute paths of the mod's own files.
export function notifyArgv(platform, n, files = {}) {
  const title = notifyText(n?.title, 120) || "Hakoniwa", body = notifyText(n?.body);
  if (platform === "linux")
    return { cmd: "notify-send", args: ["--app-name=Hakoniwa", ...(files.icon ? [`--icon=${files.icon}`] : []), "--urgency=normal", // never "critical": that one ignores Do Not Disturb and stays until it is clicked away
      "--expire-time=12000", "--", title, esc(body)] };
  if (platform === "macos")
    return { cmd: "osascript", args: ["-e", "on run argv", "-e", "display notification (item 2 of argv) with title (item 1 of argv)", "-e", "end run", noDash(title), noDash(body)] };
  if (platform === "windows" && files.ps1)
    return { cmd: "powershell.exe", args: ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", files.ps1, "-Title", title, "-Body", body || " "] };
  return null;
}
