// hakoniwa: the keyboard commands and "approve all". Methods join AgentHud (main.js); the rules are in keys-rules.js (pure).
// A key in keys.json ("alt-a": "hakoniwa.approve") arrives in the band's copy as a command (main.js nextCommand loop -> keyCommand).
//   next / prev      the person after / before the chosen one
//   attention        the next person who waits for an answer or has a report
//   approve / reject the chosen person's waiting request (the same press as the card's buttons; nobody chosen: only chooses the first one who waits)
//   approve-all      a window that lists every request that can be answered from here; nothing is pressed before its button
//   tab              the right window: Terminal <-> Chat
//   broadcast        a window to write one instruction to several agents (broadcast-rules.js); nothing is sent before its button
// What a key did (or why it did nothing) is said in a toast, because the band's copy has no card of its own to say it on.
import { div } from "gpui-kit";
import { h_flex, v_flex, Input, InputState } from "gpui-base";
import { closeOverlay, hc, notify, openOverlay, props, setShared, shared } from "herdr";
import { P, STATE } from "./common.js";
import { icon } from "./icons.js";
import { paint } from "./palette.js";
import { answerApproval, REASON_TEXT, reportName, seenNext } from "./approve.js";
import { sendTargets, sendRooms, sendChosen, sendText, sendAll, sendHeight, SEND, SEND_REASON } from "./broadcast-rules.js";
import { KEY_COMMANDS, navStep, attentionStep, answerKeyPlan, bulkTargets, bulkKinds, bulkChosen, approveTargets, bulkHeight, BULK, BULK_REASON } from "./keys-rules.js";

const say = (title, body = "", level = "info") => { try { notify({ title, body, level, timeout: 4000 }); } catch {} };

export class KeysPart {
  // Chooses a person the way a click does: the office opens its right window; the board (no right window) opens the conversation window.
  pickAgent(a) {
    if (!a) return;
    if (props()?.switch && shared("hakoniwa.view") !== "board") setShared("hakoniwa.pick", { state: a.status, id: a.id, at: Date.now() });
    else this.openChat(a);
  }

  // True when `command` was one of the key commands (the band's loop then goes on to the next one).
  keyCommand(command, cx) {
    if (!KEY_COMMANDS.includes(command)) return false;
    const list = this.items(), selId = shared("hakoniwa.sel") ?? null;
    if (command === "next" || command === "prev") this.pickAgent(navStep(list, selId, command === "prev" ? -1 : 1));
    else if (command === "attention") { const t = attentionStep(this.queue(list), selId); if (t) this.pickAgent(t); else say("Nobody needs you right now"); }
    else if (command === "tab") { if (selId != null) setShared("hakoniwa.tab", { id: selId, tab: "toggle", at: Date.now() }); }
    else if (command === "approve" || command === "reject") this.answerKey(command === "reject" ? "no" : "yes", list, selId, cx);
    else if (command === "approve-all") this.openApproveAll(list, cx);
    else if (command === "broadcast") this.openBroadcast(list);
    return true;
  }

  answerKey(want, list, selId, cx) {
    const plan = answerKeyPlan(list, selId, this.queue(list)), a = plan.agent, name = a ? reportName(a) : "";
    if (plan.act === "none") return say("Nobody is waiting for an answer");
    if (plan.act === "select") { this.pickAgent(a); return say(`${name} is waiting`, `Chosen. Press the key again to ${want === "no" ? "reject" : "approve"}`); }
    if (plan.act === "not-waiting") return say(`${name} is not waiting for an answer`);
    if (plan.act === "terminal") return say(`${name}: answer in its own window`, "Only Herdr App agents can be answered from here", "warning");
    if ((this.keyBusy ??= new Set()).has(a.id)) return;
    this.keyBusy.add(a.id);
    cx.spawn(async (cx2) => {
      let res;
      try { res = await answerApproval({ hc, sleep: (ms) => cx2.sleep(ms) }, a.address, want); } catch (err) { res = { ok: false, reason: "send-failed" }; }
      this.keyBusy.delete(a.id);
      if (res.ok) { // the same marks the card's button leaves: every copy hides the card at once
        try { const pc = shared("hakoniwa.apcache") ?? {}; if (pc[a.id]) { const { [a.id]: _x, ...rest } = pc; setShared("hakoniwa.apcache", rest); } } catch {}
        try { const prev = shared("hakoniwa.seenstate") ?? {}, n = seenNext({ ...a, status: "working" }, prev[a.id]); if (n) setShared("hakoniwa.seenstate", { ...prev, [a.id]: n }); } catch {}
        say(`${want === "no" ? "Rejected" : "Approved"}: ${name}`, "", "success");
      } else say(`${name}: not answered`, REASON_TEXT[res.reason] ?? "Could not answer", "warning");
    });
  }

  // Reads every waiting App agent's screen now (never an older copy), then opens the list. Nothing is pressed here.
  openApproveAll(list, cx) {
    if (this.bulkOpening) return;
    const waiting = (list ?? this.items()).filter((a) => a.status === "blocked");
    if (!waiting.length) return say("Nobody is waiting for an answer");
    this.bulkOpening = true;
    cx.spawn(async () => {
      const screens = {};
      try {
        await Promise.all(waiting.filter((a) => a.source === "app" && a.address).map(async (a) => { try { screens[a.id] = (await hc(["read", a.address]))?.stdout ?? ""; } catch {} }));
        const { targets, skipped } = bulkTargets(waiting, screens);
        if (!targets.length) return say("Nothing can be approved from here", `${skipped.length} waiting: answer ${skipped.length === 1 ? "it" : "them"} in the terminal`, "warning");
        openOverlay({ mod: "hakoniwa", kind: "dialog", modal: true, width: BULK.w, height: bulkHeight(targets.length, bulkKinds(targets).length) + (skipped.length ? 22 : 0),
          props: { role: "approve-all", targets, skipped } });
      } finally { this.bulkOpening = false; }
    });
  }

  // One instruction to several App agents. `ticked`: ids ticked when the window opens (the left list's search hits); none otherwise.
  openBroadcast(list, ticked = null) {
    const rows = sendTargets(list ?? this.items());
    if (!rows.length) return say("No agent to write to", "Only Herdr App agents can be written to from here", "warning");
    openOverlay({ mod: "hakoniwa", kind: "dialog", modal: true, width: SEND.w, height: sendHeight(rows.length, sendRooms(rows).length),
      props: { role: "broadcast", rows, ticked: Array.isArray(ticked) ? ticked : [] } });
  }
  initBroadcast() {
    const p = props() ?? {}, rows = Array.isArray(p.rows) ? p.rows : [];
    this.bcText = InputState.new({ placeholder: "Instruction for the chosen agents" });
    this.bc = { on: new Set(sendChosen(rows, new Set(p.ticked ?? [])).map((r) => r.id)), running: false, done: false, results: {}, error: null };
  }
  // Role "broadcast": who gets it (a switch per room and per agent), the text, and the one button that sends.
  broadcastView(cx) {
    const p = props() ?? {}, rows = Array.isArray(p.rows) ? p.rows : [], st = (this.bc ??= { on: new Set(), running: false, done: false, results: {}, error: null });
    const rooms = sendRooms(rows), chosen = sendChosen(rows, st.on), locked = st.running || st.done, close = () => closeOverlay(p.overlay);
    const run = () => {
      if (locked) return;
      const text = sendText(this.bcText?.value?.());
      if (!chosen.length || !text) { st.error = !chosen.length ? "Choose at least one agent" : "Type the instruction first"; cx.notify(); return; }
      st.error = null; st.running = true; cx.notify();
      cx.spawn(async (cx2) => {
        try { await sendAll({ hc }, chosen, text, (id, r) => { st.results[id] = r; cx2.notify(); }); }
        finally { st.running = false; st.done = true; cx2.notify(); }
      });
    };
    const toggle = (ids) => { if (locked) return; const allOn = ids.length > 0 && ids.every((id) => st.on.has(id)); for (const id of ids) { if (allOn) st.on.delete(id); else st.on.add(id); } st.error = null; cx.notify(); };
    const box = (on, dim) => h_flex().flex_none().w(20).h(20).items_center().justify_center().rounded(5).border(1.5).border_color(on ? P.blue : P.line).bg(on ? P.blue : paint("#ffffff")).when(dim, (e) => e.opacity(0.4)).when(on, (e) => e.child(icon("check", 14, "#ffffff")));
    const btn = (id, label, fn, fill, dim = false) => div().id(id).flex_none().px(16).py(8).rounded(8).border(1).border_color(fill ? P.blue : P.line).bg(fill ? P.blue : paint("#ffffff"))
      .text_size(14).font_weight(700).text_color(fill ? "#ffffff" : P.ink).when(dim, (e) => e.opacity(0.45)).when(!dim, (e) => e.cursor_pointer().hover((s) => s.opacity(0.88)).on_click(fn)).child(label);
    const row = (t) => {
      const on = t.can && st.on.has(t.id), r = st.results[t.id], pending = st.running && on && !r, sc = STATE[t.status];
      return h_flex().id(`bc-row-${t.id}`).w_full().flex_none().h(SEND.row - 6).gap(10).px(10).items_center().rounded(10).border(1).border_color(on ? P.blue : P.line).bg(on ? paint("#e8f0fe") : paint("#ffffff"))
        .when(t.can && !locked, (e) => e.cursor_pointer().on_click(() => toggle([t.id])))
        .child(box(on, !t.can))
        .child(div().flex_none().w(10).h(10).rounded(5).bg(sc?.color ?? paint("#b8b2a6")))
        .child(div().flex_none().max_w(240).truncate().text_size(15).font_weight(700).text_color(t.can ? P.ink : P.muted).child(t.name))
        .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(P.muted).child(t.room))
        .when(!t.can && !r, (e) => e.child(div().flex_none().text_size(12).text_color(STATE.blocked.color).child("Waits for an answer")))
        .when(pending, (e) => e.child(div().flex_none().text_size(12).text_color(P.muted).child("Sending…")))
        .when(!!r, (e) => e.child(div().id(`bc-res-${t.id}`).flex_none().max_w(220).truncate().text_size(12).font_weight(600).text_color(r?.ok ? paint("#2f9e6f") : paint("#d6455d")).child(SEND_REASON[r?.reason] ?? "Not sent")));
    };
    const okN = Object.values(st.results).filter((r) => r.ok).length, failN = Object.values(st.results).length - okN, canIds = rows.filter((r) => r.can).map((r) => r.id);
    const chipEl = (id, label, ids) => { const on = ids.length > 0 && ids.every((x) => st.on.has(x));
      return h_flex().id(id).flex_none().h(28).px(10).items_center().rounded(8).border(1).border_color(on ? P.blue : P.line).bg(on ? paint("#e3edff") : paint("#ffffff"))
        .when(!locked, (x) => x.cursor_pointer().on_click(() => toggle(ids))).child(div().max_w(160).truncate().text_size(13).font_weight(600).text_color(on ? P.blue : P.muted).child(label)); };
    return v_flex().id("bc-root").size_full().p(18).gap(12).bg(P.paper).overflow_hidden()
      .on_key_down((e, c) => { if (e.key === "escape" && !st.running) { close(); c.stop_propagation(); } else if (e.key === "enter" && !locked) { run(); c.stop_propagation(); } })
      .child(h_flex().flex_none().gap(8).items_center()
        .child(div().text_size(17).font_weight(700).text_color(P.ink).child("Message several agents"))
        .child(div().text_size(14).font_weight(700).text_color(P.muted).child(`${chosen.length} / ${canIds.length}`)))
      .child(h_flex().id("bc-rooms").flex_none().h(28).gap(6).items_center().overflow_hidden()
        .child(chipEl("bc-all", "Everybody", canIds))
        .when(rooms.length > 1, (e) => e.children(rooms.map((k, i) => chipEl(`bc-room-${i}`, `${k.room} ${k.n}`, rows.filter((r) => r.can && r.room === k.room).map((r) => r.id))))))
      .child(v_flex().id("bc-scroll").flex_1().min_h(0).overflow_y_scrollbar().gap(6).children(rows.map(row)))
      .when(!!this.bcText, (e) => e.child(div().flex_none().child(Input.new(this.bcText))))
      .child(h_flex().flex_none().gap(10).items_center()
        .child(div().flex_1().min_w(0).truncate().text_size(13).text_color(st.error || (st.done && failN) ? paint("#d6455d") : st.done ? paint("#2f9e6f") : P.muted)
          .child(st.error ?? (st.done ? `${okN} sent${failN ? `, ${failN} not sent` : ""}` : "Never sent to somebody who waits for an answer")))
        .child(btn("bc-no", st.done ? "Close" : "Cancel", close, false, st.running))
        .when(!st.done, (e) => e.child(btn("bc-yes", st.running ? "Sending…" : `Send to ${chosen.length}`, run, true, st.running || !chosen.length))));
  }

  // Role "approve-all": who asks what, a switch per kind of request and per person, and the one button that approves the chosen ones.
  // Each is approved only if its screen still shows the question listed here (keys-rules.js approveTarget).
  approveAllView(cx) {
    const p = props(), targets = Array.isArray(p.targets) ? p.targets : [], skipped = Array.isArray(p.skipped) ? p.skipped : [];
    const st = (this.bulk ??= { off: new Set(), running: false, done: false, results: {} }), kinds = bulkKinds(targets), chosen = bulkChosen(targets, st.off), locked = st.running || st.done;
    const close = () => closeOverlay(p.overlay);
    const run = () => {
      if (locked || !chosen.length) return;
      st.running = true; cx.notify();
      cx.spawn(async (cx2) => {
        try { await approveTargets({ hc, sleep: (ms) => cx2.sleep(ms) }, chosen, (id, r) => { st.results[id] = r; if (r.ok) { try { const pc = shared("hakoniwa.apcache") ?? {}; if (pc[id]) { const { [id]: _x, ...rest } = pc; setShared("hakoniwa.apcache", rest); } } catch {} } cx2.notify(); }); }
        finally { st.running = false; st.done = true; cx2.notify(); }
      });
    };
    const toggle = (ids) => { if (locked) return; const allOn = ids.every((id) => !st.off.has(id)); for (const id of ids) { if (allOn) st.off.add(id); else st.off.delete(id); } cx.notify(); };
    const box = (on) => h_flex().flex_none().w(20).h(20).items_center().justify_center().rounded(5).border(1.5).border_color(on ? P.blue : P.line).bg(on ? P.blue : paint("#ffffff")).when(on, (e) => e.child(icon("check", 14, "#ffffff")));
    const btn = (id, label, fn, fill, dim = false) => div().id(id).flex_none().px(16).py(8).rounded(8).border(1).border_color(fill ? P.blue : P.line).bg(fill ? P.blue : paint("#ffffff"))
      .text_size(14).font_weight(700).text_color(fill ? "#ffffff" : P.ink).when(dim, (e) => e.opacity(0.45)).when(!dim, (e) => e.cursor_pointer().hover((s) => s.opacity(0.88)).on_click(fn)).child(label);
    const row = (t) => {
      const on = !st.off.has(t.id), r = st.results[t.id], pending = st.running && on && !r;
      return h_flex().id(`bulk-row-${t.id}`).w_full().flex_none().h(BULK.row - 6).gap(10).px(10).items_center().rounded(10).border(1).border_color(on ? paint("#f2c58a") : P.line).bg(on ? paint("#fff1df") : paint("#ffffff"))
        .when(!locked, (e) => e.cursor_pointer().on_click(() => toggle([t.id]))).tooltip(t.full || t.what)
        .child(box(on))
        .child(v_flex().flex_1().min_w(0)
          .child(h_flex().gap(6).items_center().min_w(0)
            .child(div().flex_none().max_w(220).truncate().text_size(15).font_weight(700).text_color(P.ink).child(t.name))
            .when(!!t.where, (e) => e.child(div().flex_1().min_w(0).truncate().text_size(12).text_color(P.muted).child(t.where))))
          .child(div().truncate().text_size(13).text_color(P.ink).child(t.what)))
        .when(pending, (e) => e.child(div().flex_none().text_size(12).text_color(P.muted).child("Sending…")))
        .when(!!r, (e) => e.child(div().id(`bulk-res-${t.id}`).flex_none().max_w(200).truncate().text_size(12).font_weight(600).text_color(r?.ok ? paint("#2f9e6f") : paint("#d6455d")).tooltip(BULK_REASON[r?.reason] ?? "Not answered").child(r?.ok ? "Approved" : BULK_REASON[r?.reason] ?? "Not answered")));
    };
    const okN = Object.values(st.results).filter((r) => r.ok).length, failN = Object.values(st.results).length - okN;
    return v_flex().id("bulk-root").size_full().p(18).gap(12).bg(P.paper).overflow_hidden()
      .on_key_down((e, c) => { if (e.key === "escape" && !st.running) { close(); c.stop_propagation(); } })
      .child(h_flex().flex_none().gap(8).items_center()
        .child(div().text_size(17).font_weight(700).text_color(P.ink).child("Approve requests"))
        .child(div().text_size(14).font_weight(700).text_color(STATE.blocked.color).child(String(targets.length))))
      .when(kinds.length > 1, (e) => e.child(h_flex().id("bulk-kinds").flex_none().h(28).gap(6).items_center()
        .children(kinds.map((k) => { const ids = targets.filter((t) => t.kind === k.kind).map((t) => t.id), on = ids.some((id) => !st.off.has(id));
          return h_flex().id(`bulk-kind-${k.kind}`).flex_none().h(28).px(10).gap(6).items_center().rounded(8).border(1).border_color(on ? P.blue : P.line).bg(on ? paint("#e3edff") : paint("#ffffff"))
            .when(!locked, (x) => x.cursor_pointer().on_click(() => toggle(ids))).tooltip(on ? `Leave out every "${k.kind}"` : `Include every "${k.kind}"`)
            .child(div().text_size(13).font_weight(600).text_color(on ? P.blue : P.muted).child(`${k.kind} ${k.n}`)); }))))
      .child(v_flex().id("bulk-scroll").flex_1().min_h(0).overflow_y_scrollbar().gap(6).children(targets.map(row)))
      .when(skipped.length > 0, (e) => e.child(div().id("bulk-skipped").flex_none().truncate().text_size(12).text_color(P.muted).tooltip(skipped.map((s) => s.name).join(", ")).child(`${skipped.length} more waiting cannot be answered from here (answer in the terminal)`)))
      .child(h_flex().flex_none().gap(10).items_center()
        .child(div().flex_1().min_w(0).truncate().text_size(13).text_color(st.done ? (failN ? paint("#d6455d") : paint("#2f9e6f")) : P.muted)
          .child(st.done ? `${okN} approved${failN ? `, ${failN} not answered` : ""}` : "Approves only a request that still shows the question listed here"))
        .child(btn("bulk-no", st.done ? "Close" : "Cancel", close, false, st.running))
        .when(!st.done, (e) => e.child(btn("bulk-yes", st.running ? "Approving…" : `Approve ${chosen.length}`, run, true, st.running || !chosen.length))));
  }
}
