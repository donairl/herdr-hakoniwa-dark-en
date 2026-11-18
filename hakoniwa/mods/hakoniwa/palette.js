// hakoniwa: light / dark colours. The look follows Herdr's appearance (the layout's theme is {light: paper, dark: graphite}):
// light keeps the mod's own warm-paper colours exactly; dark swaps each UI chrome colour (surfaces, text, borders, tints) for its
// counterpart below. The pixel art (PNG sprites, the floor pictures, LEDs, agent colours, the code monitor) is drawn the same in both.
//
// How it works:
//  - AgentHud.render() calls syncAppearance() first on every draw. Herdr draws every mod copy again when the theme changes
//    (AGENTS.md: render runs again "whenever Herdr's live data changes (... theme ...)"), so a switch of appearance repaints at once.
//    The flag is module state: every copy shares it, and every copy sees the same appearance.
//  - paint("#fff1df") (a light colour written in the code) gives that colour in light, its DARK counterpart in dark.
//    An 8-digit colour keeps its alpha ("#fffdf8ee" -> DARK["#fffdf8"] + "ee"). A colour without an entry is the same in both.
//  - P (common.js) and STATE[..].wash resolve through isDark() as well, so `P.ink` call sites follow without changes.
import { theme, settings } from "herdr";

let dark = false;

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

// Dark when the theme Herdr shows now has a dark terminal background (what the person actually sees), else settings().dark.
export function syncAppearance() {
  let d = null;
  try { const bg = theme()?.background; if (typeof bg === "string" && /^#[0-9a-fA-F]{6}/.test(bg)) d = lum(bg) < 0.2; } catch {}
  if (d == null) { try { d = settings()?.dark === true; } catch { d = false; } }
  dark = d;
  return dark;
}
export const isDark = () => dark;

// The dark surfaces everything below is tuned against (graphite: canvas #131518, background #17191d, popover #25272b).
export const DARK_BASE = { page: "#151619", paper: "#1e2024", card: "#222428" };

// light (lower-case #rrggbb as written in the code) -> dark.
export const DARK = {
  // surfaces
  "#f3efe7": "#151619", // the office floor's surroundings (office-root)
  "#f6f3ec": "#17181b", // P.bg
  "#fffdf8": "#1e2024", // P.paper: panels, popups, plates (also with alpha: #fffdf8ee / f2 / e8)
  "#ffffff": "#222428", // P.white, cards, inputs, menus (only where written as a background: text on a fill stays white)
  "#fafbfc": "#1b1d21", // head bars
  "#fcfcfd": "#1b1d21",
  "#faf8f2": "#26282c", // a framed icon button
  "#f6f7f9": "#262a30", // a tool record's pale fill
  "#ede6d8": "#2a2b2f", // the face box behind an agent's picture
  // neutral hovers / pressed
  "#f3efe4": "#2c2e33",
  "#f0ede4": "#2a2c31",
  "#f1f3f6": "#2c2e33",
  "#f8f5ee": "#2a2c30",
  "#f3f0e8": "#26282c", // cleanup chip, off
  "#efe9da": "#33353a", // cleanup chip, on
  "#eae5d8": "#2e3035",
  "#e6dfcc": "#3a3c42",
  "#e8e3d6": "#34363c",
  "#e7e5df": "#34363b", // TUI / Shell badge
  "#eceff3": "#2e3137",
  "#e8eaee": "#303339",
  "#e9e5da": "#34363b", // bar tracks
  "#ece8dd": "#34363b",
  // lines
  "#e6e2d8": "#383a40", // P.line
  "#e3e6ec": "#34373d",
  "#d9d4c8": "#44474e",
  "#d9d2c3": "#44474e",
  "#d9d3c4": "#44474e",
  "#cfc9bb": "#4a4d54",
  "#c9c2b2": "#55585f",
  "#c3beb1": "#55585f", // a disabled icon
  "#b9b4a6": "#5a5d65",
  // text
  "#1f2a37": "#e4e7ec", // P.ink
  "#374151": "#d5d9e0",
  "#4b5563": "#c3c8d0",
  "#5a6272": "#aab1bd",
  "#5b6472": "#aab1bd",
  "#5f5b50": "#b8b3a7",
  "#7a766b": "#aaa69b",
  "#7b8494": "#9aa1ad", // P.muted
  "#89909d": "#9aa1ad",
  "#a3aab4": "#7d838d", // pale text stays pale (low emphasis)
  "#a8a396": "#86827a",
  "#b0aa9b": "#8a8579",
  "#b8b2a6": "#80838a",
  "#9a9588": "#7a7d84",
  // platform icon tints (dark marks on light; light marks on dark)
  "#24292f": "#d8dce2",
  "#1f2937": "#d8dce2",
  "#111827": "#e4e7ec",
  // blue
  "#1e6fe0": "#4285f4", // P.blue (white text on it still reads)
  "#2f80ed": "#6aa5f5",
  "#2f7cf6": "#6ea2f7",
  "#2563eb": "#60a5fa", // = chat.js toolMark's own dark variant
  "#7c4dff": "#a58bff",
  "#e8f0fe": "#1f2d44", // selected row / chosen option
  "#e1ecfd": "#213049",
  "#cfe0fb": "#2a3c5a",
  "#dcebff": "#2a3c5a",
  "#d6e4fb": "#2a3c5a",
  "#f1f7ff": "#1b2638",
  "#eef4ff": "#1c2840",
  "#e3edff": "#22314c",
  "#d6e6fb": "#24365a", // the person's own chat bubble
  "#bcd3f5": "#35507a",
  "#9bbdf0": "#3d5f92",
  // red
  "#d6455d": "#e8697e",
  "#d64545": "#ef6b6b",
  "#b3261e": "#ff8a80",
  "#fde8e8": "#3d2226",
  "#fdecea": "#3a2124",
  "#fff4f2": "#2d1f20",
  "#f0d2d8": "#5c323a",
  "#e3a9b3": "#7a3e4a",
  // orange / amber (the approval card)
  "#fff1df": "#3a2a17",
  "#f2c58a": "#8a5e2a",
  "#8a4a06": "#f5b56b",
  "#fde7cf": "#3d2c1a",
  "#fff4e5": "#3a2a17",
  "#e8c79a": "#7a5a30",
  "#8a5a1f": "#eab575",
  "#a24e00": "#f5a35a",
  "#b7791f": "#fbbf24", // = chat.js toolMark's own dark variant
  "#fdf1d6": "#3a3018",
  "#fbf1d6": "#3a3018",
  "#fbeccb": "#463a1e",
  "#8a6a12": "#e6c35c",
  // green
  "#eaf6ef": "#1b2e24",
  "#b9dfca": "#2f5a43",
  "#f3faf6": "#1a2a21",
  "#2f9e6f": "#4cc08d",
  "#39a380": "#4fbf95",
};

// The dark counterpart of a light colour, whatever the appearance now (for tables that hold both).
export const darkOf = (hex) => DARK[String(hex).toLowerCase()] ?? hex;

export function paint(hex) {
  if (!dark || typeof hex !== "string") return hex;
  const k = hex.toLowerCase();
  if (k.length === 7) return DARK[k] ?? hex;
  if (k.length === 9) { const d = DARK[k.slice(0, 7)]; return d ? d + k.slice(7) : hex; }
  return hex;
}

// A dark tint of a state colour for the state's "wash" (chips, hovers): the colour at 22% over the dark paper.
export function darkWash(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) return DARK_BASE.paper;
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), b = [1, 3, 5].map((i) => parseInt(DARK_BASE.paper.slice(i, i + 2), 16));
  return "#" + a.map((v, i) => Math.round(v * 0.22 + b[i] * 0.78).toString(16).padStart(2, "0")).join("");
}

// theme() for the mod's own drawing: in light it keeps the colours the layout used to force (foreground #303746, border #e5e7ec),
// so the light look stays as it was; in dark it is the theme as Herdr shows it.
export function uiTheme() {
  const t = theme();
  return dark ? t : { ...t, foreground: "#303746", border: "#e5e7ec" };
}
