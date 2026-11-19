import assert from "node:assert/strict";
const k = await import(new URL("../hakoniwa/mods/hakoniwa", import.meta.url).pathname + "/keys-rules.js");
const L = [{ id: "a", status: "working" }, { id: "b", status: "blocked", source: "app", address: "t2", since: 5 }, { id: "c", status: "done" }, { id: "d", status: "blocked", source: "tui", address: "p1", since: 1 }];
assert.equal(k.navStep(L, null, 1).id, "a"); assert.equal(k.navStep(L, null, -1).id, "d"); assert.equal(k.navStep(L, "d", 1).id, "a"); assert.equal(k.navStep(L, "a", -1).id, "d"); assert.equal(k.navStep(L, "gone", 1).id, "a"); assert.equal(k.navStep([], "a"), null);
const Q = [L[3], L[1], L[2]];
assert.equal(k.attentionStep(Q, null).id, "d"); assert.equal(k.attentionStep(Q, "d").id, "b"); assert.equal(k.attentionStep(Q, "c").id, "d"); assert.equal(k.attentionStep(Q, "a").id, "d"); assert.equal(k.attentionStep([], "a"), null);
assert.deepEqual(k.answerKeyPlan(L, null, Q), { act: "select", agent: L[3] });
assert.equal(k.answerKeyPlan(L, null, [L[2]]).act, "none"); assert.equal(k.answerKeyPlan(L, "a", Q).act, "not-waiting"); assert.equal(k.answerKeyPlan(L, "d", Q).act, "terminal"); assert.equal(k.answerKeyPlan(L, "b", Q).act, "answer"); assert.equal(k.answerKeyPlan(L, "gone", Q).act, "select");
assert.equal(k.askKind("Bash command · npm test"), "Bash command"); assert.equal(k.askKind("Edit file"), "Edit file"); assert.equal(k.askKind(""), "Other");

const dialog = (head, body, q) => `● I'll do it.\n\n● Bash(x)\n  ⎿  Running…\n\n────────────────────────────\n ${head}\n\n   ${body}\n\n ${q}\n ❯ 1. Yes\n   2. Yes, and don't ask again for this\n   3. No, and tell Claude what to do differently (esc)\n`;
const long = "npm run build -- --mode production --verbose --report --outDir /very/long/path/to/some/output/dir";
const s1 = dialog("Bash command", long + " && echo ok", "Do you want to proceed?"), s1b = dialog("Bash command", long + " && rm -rf /", "Do you want to proceed?");
const s2 = dialog("Edit file", "src/app.ts", "Do you want to make this edit to app.ts?");
const agents = [{ id: "x", status: "blocked", source: "app", address: "t1", name: "Claude (Opus)", space: "Web", since: 9 }, { id: "y", status: "blocked", source: "app", address: "t2", name: "Codex", since: 3 },
  { id: "z", status: "blocked", source: "app", address: "t3", name: "NoScreen", since: 1 }, { id: "w", status: "blocked", source: "tui", address: "p", name: "Tui" }, { id: "v", status: "working", source: "app", address: "t9" }];
const { targets, skipped } = k.bulkTargets(agents, { x: s1, y: s2, z: "just some text\nno dialog" });
assert.deepEqual(targets.map((t) => [t.id, t.kind, t.name, t.where]), [["y", "Edit file", "Codex", ""], ["x", "Bash command", "Claude", "Web"]]);
assert.deepEqual(skipped.map((t) => t.id).sort(), ["w", "z"]);
assert.ok(targets[1].full.includes("&& echo ok") && targets[1].full.includes("1. Yes"), targets[1].full);
assert.equal(k.bulkTargets(agents, { x: s1 }).targets[0].what, k.bulkTargets(agents, { x: s1b }).targets[0].what); // the short line cannot tell these two apart...
assert.notEqual(k.askPrint(s1), k.askPrint(s1b));                                                                  // ...the whole dialog can
assert.equal(k.askPrint(s1), k.askPrint(s1.replace(" ❯ 1. Yes\n   2. Yes", "   1. Yes\n ❯ 2. Yes")));                // a moved cursor is the same question
assert.deepEqual(k.bulkKinds([...targets, { ...targets[0], id: "q" }]), [{ kind: "Edit file", n: 2 }, { kind: "Bash command", n: 1 }]);
assert.deepEqual(k.bulkChosen(targets, new Set(["y"])).map((t) => t.id), ["x"]);
// approve: a fake hc. t1 still shows the listed question, t2 moved on to another one, t3 fails to send.
const screens = { t1: s1, t2: dialog("Bash command", "rm -rf build", "Do you want to proceed?"), t3: s2 }, pressed = [], status = { t1: "blocked", t2: "blocked", t3: "blocked" };
const io = { sleep: async () => {}, hc: async (a) => {
  if (a[0] === "read") return { code: 0, stdout: screens[a[1]] };
  if (a[0] === "get") return { code: 0, stdout: JSON.stringify({ status: status[a[1]], status_msg: "m" }) };
  if (a[0] === "keys") { if (a[1] === "t3") return { code: 1, stderr: "nope" }; pressed.push([a[1], a[2]]); status[a[1]] = "working"; return { code: 0 }; }
} };
const T = [{ id: "x", address: "t1", print: k.askPrint(s1) }, { id: "y", address: "t2", print: k.askPrint(s2) }, { id: "z", address: "t3", print: k.askPrint(s2) }, { id: "n", address: "t1", print: "" }];
const steps = [], out = await k.approveTargets(io, T, (id, r) => steps.push(id), 0);
assert.deepEqual(out, { x: { ok: true, reason: "ok" }, y: { ok: false, reason: "changed" }, z: { ok: false, reason: "send-failed" }, n: { ok: false, reason: "changed" } });
assert.deepEqual(pressed, [["t1", "1"]]); assert.equal(steps.length, 4);
assert.ok(k.bulkHeight(1) < k.bulkHeight(3, 2) && k.bulkHeight(50) === k.bulkHeight(7));
for (const r of ["ok", "changed", "unreadable", "no-option", "send-failed", "unchanged"]) assert.ok(k.BULK_REASON[r]);
console.log("keys ok");
