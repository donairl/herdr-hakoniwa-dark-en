// hakoniwa: launch presets ("New agent" window): a provider + model + effort + folder + first instruction under one name, started
// again with one press. The rules (pure); launch.js draws the chips and saves presets.json (hakoniwa-office/).
export const PRESET_MAX = 12, PRESET_NAME_MAX = 28;

const str = (v, max = 400) => String(v ?? "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, max);
const tail = (p) => str(p).replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "";

// What is read from presets.json: only well-formed presets, unique names, at most PRESET_MAX.
export function cleanPresets(raw) {
  const out = [], seen = new Set();
  for (const p of Array.isArray(raw?.presets) ? raw.presets : Array.isArray(raw) ? raw : []) {
    const name = str(p?.name, PRESET_NAME_MAX), kind = str(p?.kind, 20);
    if (!name || !kind || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name, kind, model: str(p.model, 80), effort: str(p.effort, 20), folder: str(p.folder), task: str(p.task, 2000), parentMode: p.parentMode === "child" ? "child" : "parent" });
    if (out.length >= PRESET_MAX) break;
  }
  return out;
}
// The name a preset gets when none was typed: "Claude · Opus · api" (provider, model when chosen, the folder's last part).
export function presetName(form, kindLabel = "", modelLabel = "") {
  return str([str(form?.name) || kindLabel || str(form?.kind), str(form?.name) ? "" : modelLabel, str(form?.name) ? "" : tail(form?.folder)].filter(Boolean).join(" · "), PRESET_NAME_MAX);
}
// Adds (or replaces the one of the same name, in place). The newest goes last; the oldest falls out past PRESET_MAX.
export function addPreset(list, p) {
  const [one] = cleanPresets([p]); if (!one) return cleanPresets(list);
  const cur = cleanPresets(list), i = cur.findIndex((x) => x.name.toLowerCase() === one.name.toLowerCase());
  if (i >= 0) { cur[i] = one; return cur; }
  return [...cur, one].slice(-PRESET_MAX);
}
export const removePreset = (list, name) => cleanPresets(list).filter((x) => x.name.toLowerCase() !== String(name ?? "").toLowerCase());
export const presetsText = (list) => JSON.stringify({ presets: cleanPresets(list) }, null, 2);
