// save-text.js: a file that already exists is replaced (the "changed outside Herdr" error came from writing it as if it were new).
import assert from "node:assert/strict";
const { saveText } = await import(new URL("../hakoniwa/mods/hakoniwa/save-text.js", import.meta.url).pathname);

// The App's writeTextFile: replaces only when the file still equals `expected` (null: the file must not exist).
const disk = (files = {}) => ({ files, writes: 0,
  async read(p) { if (!(p in this.files)) throw new Error("not found"); return this.files[p]; },
  async write(p, text, expected = null) { this.writes++; if ((this.files[p] ?? null) !== expected) throw new Error("The file changed outside Herdr."); this.files[p] = text; } });

let d = disk();
assert.equal(await saveText(d, "a.json", "one"), "saved"); assert.equal(d.files["a.json"], "one");
assert.equal(await saveText(d, "a.json", "two"), "saved"); assert.equal(d.files["a.json"], "two"); // the second save: the one that failed
assert.equal(await saveText(d, "a.json", "two"), "same"); assert.equal(d.writes, 2);

// Somebody else writes between the read and the write: read again and try once more.
d = disk({ "a.json": "old" });
const write = d.write.bind(d); let raced = false;
d.write = async (p, text, expected) => { if (!raced) { raced = true; d.files[p] = "theirs"; } return write(p, text, expected); };
assert.equal(await saveText(d, "a.json", "mine"), "saved"); assert.equal(d.files["a.json"], "mine");

// It never stops failing: the last error comes out, after `tries` attempts.
d = disk({ "a.json": "old" }); let n = 0;
d.write = async () => { n++; throw new Error("disk full"); };
await assert.rejects(() => saveText(d, "a.json", "x", 3), /disk full/); assert.equal(n, 3);
console.log("save-text ok");
