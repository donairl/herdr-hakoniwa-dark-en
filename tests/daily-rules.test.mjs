// search-rules.js, broadcast-rules.js, preset-rules.js
import assert from "node:assert/strict";
const dir = new URL("../hakoniwa/mods/hakoniwa", import.meta.url).pathname;
const s = await import(dir + "/search-rules.js"), b = await import(dir + "/broadcast-rules.js"), p = await import(dir + "/preset-rules.js");

// search: every word must be found; name, room, folder, CLI, model, state
const row = { label: "Claude Code (Opus 5.5)", status: "blocked", app: "claude", model: "claude-opus-5-5" }, ag = { cwd: "/home/u/work/api-server", space: "Web" };
const hit = (q, r = row, a = ag, room = "Web") => s.hayMatches(s.searchTokens(q), s.rowHay(r, a, room));
assert.ok(hit("claude")); assert.ok(hit("API-server")); assert.ok(hit("web")); assert.ok(hit("opus blocked")); assert.ok(hit("waiting")); assert.ok(hit("  "));
assert.ok(!hit("codex")); assert.ok(!hit("claude idle")); assert.ok(!hit("done"));
assert.ok(hit("shell", { label: "zsh", shell: true }, null, "")); assert.ok(!hit("shell")); assert.ok(hit("report", { label: "x", status: "done" }, null));
assert.deepEqual(s.searchTokens(" A  b "), ["a", "b"]);

// broadcast: App agents only; somebody who waits is listed but can never be chosen or written to
const list = [{ id: 1, source: "app", address: "t1", name: "Claude (Opus 5.5)", space: "Web", status: "idle" }, { id: 2, source: "app", address: "t2", name: "Codex", space: "Web", status: "blocked" },
  { id: 3, source: "tui", address: "p3", name: "Tui", status: "idle" }, { id: 4, source: "app", address: "t4", name: "Cursor", space: "Api", status: "working" }, { id: 5, source: "app", name: "no address" }];
const rows = b.sendTargets(list);
assert.deepEqual(rows.map((r) => [r.id, r.can, r.room]), [[1, true, "Web"], [2, false, "Web"], [4, true, "Api"]]);
assert.deepEqual(b.sendRooms(rows), [{ room: "Api", n: 1 }, { room: "Web", n: 1 }]);
assert.deepEqual(b.sendChosen(rows, new Set([1, 2, 4, 99])).map((r) => r.id), [1, 4]);
assert.equal(b.sendText("  run tests\n\n then report \r\n"), "run tests then report");
const dialog = "● Bash(x)\n────────────\n Bash command\n\n   rm -rf x\n\n Do you want to proceed?\n ❯ 1. Yes\n   2. Yes, and don't ask again\n   3. No (esc)\n";
const sent = [], io = { hc: async (a) => { if (a[0] === "read") { if (a[1] === "t9") throw new Error("gone"); return { stdout: a[1] === "t4" ? dialog : "● Done.\n\n> \n" }; } if (a[1] === "t7") return { code: 1, stderr: "no" }; sent.push(a); return { code: 0 }; } };
const steps = [], out = await b.sendAll(io, [rows[0], rows[2], { id: 9, address: "t9" }, { id: 7, address: "t7" }], "hello\nthere", (id, r) => steps.push(id));
assert.deepEqual(out, { 1: { ok: true, reason: "ok" }, 4: { ok: false, reason: "waiting" }, 9: { ok: false, reason: "unreadable" }, 7: { ok: false, reason: "send-failed" } });
assert.deepEqual(sent, [["send", "t1", "hello there"]]); assert.equal(steps.length, 4);
assert.deepEqual(await b.sendOne(io, rows[0], "  \n "), { ok: false, reason: "empty" });
for (const r of ["ok", "waiting", "unreadable", "send-failed", "empty"]) assert.ok(b.SEND_REASON[r]);
assert.ok(b.sendHeight(1) < b.sendHeight(4, 2) && b.sendHeight(99) === b.sendHeight(8));

// presets
assert.deepEqual(p.cleanPresets(null), []); assert.deepEqual(p.cleanPresets({ presets: [{ name: "", kind: "claude" }, { name: "a" }, 5, null] }), []);
let ps = p.addPreset([], { name: "Api", kind: "claude", model: "opus", effort: "high", folder: "/w/api", task: "run\ntests", junk: 1 });
assert.deepEqual(ps, [{ name: "Api", kind: "claude", model: "opus", effort: "high", folder: "/w/api", task: "run tests", parentMode: "parent" }]);
ps = p.addPreset(ps, { name: "Web", kind: "codex" }); ps = p.addPreset(ps, { name: "api", kind: "codex", model: "x" });
assert.deepEqual(ps.map((x) => [x.name, x.kind]), [["api", "codex"], ["Web", "codex"]]); // the same name (any case) is replaced in place
assert.deepEqual(p.removePreset(ps, "WEB").map((x) => x.name), ["api"]);
assert.deepEqual(p.cleanPresets(JSON.parse(p.presetsText(ps))), ps);
let many = []; for (let i = 0; i < 20; i++) many = p.addPreset(many, { name: `n${i}`, kind: "claude" });
assert.equal(many.length, p.PRESET_MAX); assert.equal(many.at(-1).name, "n19");
assert.equal(p.presetName({ kind: "claude", folder: "/home/u/work/api/" }, "Claude", "Opus 5.5"), "Claude · Opus 5.5 · api");
assert.equal(p.presetName({ kind: "claude", name: " Reviewer ", folder: "/x" }, "Claude", "Opus"), "Reviewer");
assert.ok(p.presetName({ kind: "claude", folder: "/" + "x".repeat(90) }, "Claude", "").length <= p.PRESET_NAME_MAX);
console.log("daily rules ok");
