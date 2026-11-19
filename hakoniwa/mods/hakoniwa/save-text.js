// hakoniwa: saving one of the mod's own small files. Herdr's writeTextFile(path, text, expected) replaces a file only when it still holds
// `expected` (the text that was read), and `expected` left out means "this file must not exist yet": a second save of the same file then
// fails with "The file changed outside Herdr". So every save reads first: the same text is not written again, another text is replaced with
// what was just read as `expected`, and when another copy of the mod wrote in between (the read is stale) it is read and tried again.
// Pure: io = { read(path) -> text | null, write(path, text, expected) }. -> "same" | "saved"; throws the last error after `tries`.
export async function saveText(io, path, text, tries = 3) {
  let last = null;
  for (let n = 0; n < Math.max(1, tries); n++) {
    let cur = null;
    try { cur = (await io.read(path)) ?? null; } catch { cur = null; } // absent or unreadable: tried as a new file
    if (cur === text) return "same";
    try { await io.write(path, text, cur); return "saved"; } catch (e) { last = e; }
  }
  throw last ?? new Error(`could not save ${path}`);
}
