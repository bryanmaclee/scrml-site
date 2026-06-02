// Requires: scrml-runtime.01f11ozs.js



// --- enum toEnum() lookup tables (compiler-generated) ---
const DragPhase_toEnum = { "Idle": "Idle", "Dragging": "Dragging" };
const DragPhase_variants = ["Idle", "Dragging"];

// --- enum variant objects (compiler-generated) ---
const DragPhase = Object.freeze({ Idle: "Idle", Dragging: "Dragging", variants: ["Idle", "Dragging"] });

// --- engine substrate (compiler-generated, §51.0) ---
// §51.0.F transition table for engine dragPhase: DragPhase
const __scrml_engine_dragPhase_transitions = Object.freeze({
  "Idle": ["Dragging"],
  "Dragging": ["Idle"]
});
// §51.0.C auto-declared engine variable: dragPhase (DragPhase)
_scrml_reactive_set("dragPhase", "Idle");
// §51.0.D engine mount position: dragPhase (DragPhase) — body render via emitEngineBodyRenderForFile

function _scrml_nextOrderIn_3(tasks, column) {
  const existing = tasks.filter((t) => _scrml_structural_eq(t.column, column));
  if ((existing.length === 0)) {
    return 0;
  }
  return Math.max(...existing.map((t) => t.order)) + 1;
}

function _scrml_updateIfMatched_4(t, id, column, order) {
  if (_scrml_structural_eq(t.id, id)) {
    return {...t, column: column, order: order};
  }
  return t;
}

function _scrml_taskMovedTo_5(tasks, id, toColumn) {
  const order = _scrml_nextOrderIn_3(tasks, toColumn);
  return tasks.map((t) => _scrml_updateIfMatched_4(t, id, toColumn, order));
}

function _scrml_isDraggingTask_6(id, phase, currentId) {
  return (function() {
    const _scrml_match_7 = phase;
    if (_scrml_match_7 === "Dragging") return currentId === id;
    else if (_scrml_match_7 === "Idle") return false;
  })();
}

function _scrml_startDrag_8(id) {
  _scrml_reactive_set("draggingTaskId", id);
  // §51.0.F engine direct-write hook: dragPhase (DragPhase)
_scrml_engine_direct_set("dragPhase", "Dragging", __scrml_engine_dragPhase_transitions);
}

function _scrml_endDrag_9() {
  _scrml_reactive_set("draggingTaskId", 0);
  // §51.0.F engine direct-write hook: dragPhase (DragPhase)
_scrml_engine_direct_set("dragPhase", "Idle", __scrml_engine_dragPhase_transitions);
}

function _scrml_dropOn_10(toColumn) {
  if (_scrml_structural_eq(_scrml_reactive_get("dragPhase"), "Idle")) {
  return;
}
  _scrml_reactive_set("tasks", _scrml_taskMovedTo_5(_scrml_reactive_get("tasks"), _scrml_reactive_get("draggingTaskId"), toColumn));
  _scrml_reactive_set("draggingTaskId", 0);
  // §51.0.F engine direct-write hook: dragPhase (DragPhase)
_scrml_engine_direct_set("dragPhase", "Idle", __scrml_engine_dragPhase_transitions);
}

function _scrml_allowDrop_11(e) {
  e.preventDefault();
}


const __scrml_transitions_dragPhase = {

};
const columns = ["Inbox", "Doing", "Done"];
_scrml_reactive_set("tasks", _scrml_deep_reactive([{id: 1, title: "Triage incoming bug reports", column: "Inbox", order: 0}, {id: 2, title: "Review PR #42", column: "Inbox", order: 1}, {id: 3, title: "Wire up onboarding flow", column: "Doing", order: 0}, {id: 4, title: "Update changelog", column: "Done", order: 0}]));
_scrml_init_set("tasks", () => [{id: 1, title: "Triage incoming bug reports", column: "Inbox", order: 0}, {id: 2, title: "Review PR #42", column: "Inbox", order: 1}, {id: 3, title: "Wire up onboarding flow", column: "Doing", order: 0}, {id: 4, title: "Update changelog", column: "Done", order: 0}]);
_scrml_reactive_set("draggingTaskId", 0);
_scrml_init_set("draggingTaskId", () => 0);
const _scrml_lift_tgt_20 = document.querySelector('[data-scrml-logic="_scrml_logic_2"]');
_scrml_effect(function() {
  _scrml_lift_tgt_20.innerHTML = "";
  _scrml_lift_target = _scrml_lift_tgt_20;
  for (const col of columns) {
  _scrml_lift(() => {
  const _scrml_lift_el_12 = document.createElement("section");
  _scrml_lift_el_12.setAttribute("class", "column");
  const _scrml_lift_el_13 = document.createElement("h2");
  _scrml_lift_el_13.setAttribute("class", "column-title");
  _scrml_lift_el_13.appendChild(document.createTextNode(String((col) ?? "")));
  _scrml_lift_el_12.appendChild(_scrml_lift_el_13);
  const _scrml_lift_el_14 = document.createElement("ul");
  _scrml_lift_el_14.setAttribute("class", "task-list");
  _scrml_lift_el_14.addEventListener("dragover", function(event) { _scrml_allowDrop_11(event); });
  _scrml_lift_el_14.addEventListener("drop", function(event) { _scrml_dropOn_10(col); });
  const _scrml_list_wrapper_15 = document.createElement("div");
_scrml_lift_el_14.appendChild(_scrml_list_wrapper_15);
function _scrml_create_item_17(task, _scrml_idx) {
  const _scrml_tmp_18 = document.createDocumentFragment();
  _scrml_tmp_18.appendChild((() => {
    const _scrml_lift_el_19 = document.createElement("li");
    _scrml_lift_el_19.setAttribute("class", "task");
    _scrml_effect(() => { _scrml_lift_el_19.classList.toggle("dragging", !!(_scrml_isDraggingTask_6(task.id, _scrml_reactive_get("dragPhase"), _scrml_reactive_get("draggingTaskId")))); });
    _scrml_lift_el_19.setAttribute("draggable", true);
    _scrml_lift_el_19.addEventListener("dragstart", function(event) { _scrml_startDrag_8(task.id); });
    _scrml_lift_el_19.addEventListener("dragend", function(event) { _scrml_endDrag_9(); });
    _scrml_lift_el_19.appendChild(document.createTextNode(String((task.title) ?? "")));
    return _scrml_lift_el_19;
  })());
  return _scrml_tmp_18.firstChild;
}
function _scrml_render_list_16() {
  _scrml_reconcile_list(_scrml_list_wrapper_15, _scrml_reactive_get("tasks").filter((t) => _scrml_structural_eq(t.column, col)).sort((a, b) => a.order - b.order), (item, i) => item?.id != null ? item.id : i, _scrml_create_item_17);
}
_scrml_render_list_16();
_scrml_effect_static(_scrml_render_list_16);
  _scrml_lift_el_12.appendChild(_scrml_lift_el_14);
  return _scrml_lift_el_12;
});
}
  _scrml_lift_target = null;
});
//# sourceMappingURL=25-triage-board.client.js.map
