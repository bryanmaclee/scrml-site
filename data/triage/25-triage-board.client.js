// Requires: scrml-runtime.00sykn48.js



// --- enum toEnum() lookup tables (compiler-generated) ---
const DragPhase_toEnum = { "Idle": "Idle" };
const DragPhase_variants = ["Idle", "Dragging"];
const DragMsg_toEnum = { "End": "End" };
const DragMsg_variants = ["Start", "Drop", "End"];

// --- enum variant objects (compiler-generated) ---
const DragPhase = Object.freeze({ Idle: "Idle", Dragging: function(id) { return { variant: "Dragging", data: { id } }; }, variants: ["Idle", "Dragging"] });
const DragMsg = Object.freeze({ Start: function(id) { return { variant: "Start", data: { id } }; }, Drop: function(col) { return { variant: "Drop", data: { col } }; }, End: "End", variants: ["Start", "Drop", "End"] });

// --- engine substrate (compiler-generated, §51.0) ---
// §51.0.F transition table for engine dragPhase: DragPhase
const __scrml_engine_dragPhase_transitions = Object.freeze({
  "Idle": ["Dragging"],
  "Dragging": ["Idle"]
});
// §51.0.S message-arm dispatch table for engine dragPhase: DragPhase × DragMsg
const __scrml_engine_dragPhase_msg_arms = Object.freeze({
  "Idle": {
    "Start": function (_stateData, _msgData) {
    var id = _msgData ? _msgData["id"] : null;
    return { variant: "Dragging", data: { id: id } };
  },
    "_": function (_stateData, _msgData) {
    return _scrml_reactive_get("dragPhase");
  }
  },
  "Dragging": {
    "Drop": function (_stateData, _msgData) {
    var id = _stateData ? _stateData["id"] : null;
    var col = _msgData ? _msgData["col"] : null;
    _scrml_reactive_set("tasks", _scrml_taskMovedTo_3(_scrml_reactive_get("tasks"), id, col));
    return "Idle";
  },
    "End": function (_stateData, _msgData) {
    var id = _stateData ? _stateData["id"] : null;
    return "Idle";
  },
    "_": function (_stateData, _msgData) {
    var id = _stateData ? _stateData["id"] : null;
    return _scrml_reactive_get("dragPhase");
  }
  }
});
// §51.0.C auto-declared engine variable: dragPhase (DragPhase)
_scrml_reactive_set("dragPhase", "Idle");
// §51.0.D engine mount position: dragPhase (DragPhase) — body render via emitEngineBodyRenderForFile

// --- engine + match + each body render (Phase A10, §51.0.D + §18.0.1 + §17.X) ---
function _scrml_each_render_126() {
  const _items = columns;
  const _mount = _scrml_find_each_anchor(document, 126);
  if (!_mount) return;
  if (!_items) {
    _scrml_each_clear(_mount);
    return;
  }
  _scrml_reconcile_list(
    _mount,
    _items,
    (col, _scrml_each_idx) => (col?.id != null ? col.id : _scrml_each_idx),
    (col, _scrml_each_idx) => {
      const _itemFrag = document.createDocumentFragment();
      const _scrml_each_key_1 = (col?.id != null ? col.id : _scrml_each_idx);
      const _scrml_el_2 = document.createElement("section");
      _scrml_el_2.setAttribute("class", "column");
      const _scrml_frag_3 = document.createDocumentFragment();
      const _scrml_el_4 = document.createElement("h2");
      _scrml_el_4.setAttribute("class", "column-title");
      const _scrml_frag_5 = document.createDocumentFragment();
      const _scrml_each_tn_6 = document.createTextNode("");
      _scrml_frag_5.appendChild(_scrml_each_tn_6);
      _scrml_effect(() => {
        let col = _scrml_resolve_item(_mount, _scrml_each_key_1);
        if (col === null) return;
        _scrml_each_tn_6.textContent = String(col);
      });
      _scrml_el_4.appendChild(_scrml_frag_5);
      _scrml_frag_3.appendChild(_scrml_el_4);
      const _scrml_el_7 = document.createElement("ul");
      _scrml_el_7.setAttribute("class", "task-list");
      _scrml_el_7.addEventListener("dragover", function(event) { _scrml_allowDrop_7(event); });
      _scrml_el_7.addEventListener("drop", function(event) { let col = _scrml_resolve_item(_mount, _scrml_each_key_1); if (col === null) return; _scrml_engine_dispatch_message("dragPhase", { variant: "Drop", data: { col: col } }, __scrml_engine_dragPhase_msg_arms, __scrml_engine_dragPhase_transitions); });
      const _scrml_frag_8 = document.createDocumentFragment();
      const _scrml_each_mount_9 = document.createElement("div");
      _scrml_each_mount_9.setAttribute("data-scrml-each-mount", "each_120");
      _scrml_frag_8.appendChild(_scrml_each_mount_9);
      _scrml_effect(() => {
        let col = _scrml_resolve_item(_mount, _scrml_each_key_1);
        if (col === null) return;
        const _scrml_each_items_10 = _scrml_reactive_get("tasks").filter(t => t.column == col).sort((a, b) => a.order - b.order);
        if (!_scrml_each_items_10) {
          _scrml_each_clear(_scrml_each_mount_9);
          return;
        }
        _scrml_reconcile_list(
          _scrml_each_mount_9,
          _scrml_each_items_10,
          (task, _scrml_each_idx) => task.id,
          (task, _scrml_each_idx) => {
            const _itemFrag = document.createDocumentFragment();
            const _scrml_each_key_11 = task.id;
            const _scrml_el_12 = document.createElement("li");
            _scrml_el_12.setAttribute("class", "task");
            _scrml_effect(() => {
              let task = _scrml_resolve_item(_scrml_each_mount_9, _scrml_each_key_11);
              if (task === null) return;
              _scrml_el_12.classList.toggle("dragging", !!((_scrml_isDraggingTask_4(_scrml_reactive_get("dragPhase"), task.id))));
            });
            _scrml_el_12.setAttribute("draggable", "true");
            _scrml_el_12.addEventListener("dragstart", function(event) { let task = _scrml_resolve_item(_scrml_each_mount_9, _scrml_each_key_11); if (task === null) return; _scrml_engine_dispatch_message("dragPhase", { variant: "Start", data: { id: task.id } }, __scrml_engine_dragPhase_msg_arms, __scrml_engine_dragPhase_transitions); });
            _scrml_el_12.addEventListener("dragend", function(event) { _scrml_engine_dispatch_message("dragPhase", "End", __scrml_engine_dragPhase_msg_arms, __scrml_engine_dragPhase_transitions); });
            const _scrml_frag_13 = document.createDocumentFragment();
            const _scrml_each_tn_14 = document.createTextNode("");
            _scrml_frag_13.appendChild(_scrml_each_tn_14);
            _scrml_effect(() => {
              let task = _scrml_resolve_item(_scrml_each_mount_9, _scrml_each_key_11);
              if (task === null) return;
              _scrml_each_tn_14.textContent = String(task.title);
            });
            _scrml_el_12.appendChild(_scrml_frag_13);
            _itemFrag.appendChild(_scrml_el_12);
            return _itemFrag.firstChild;
          }
        );
      });
      _scrml_el_7.appendChild(_scrml_frag_8);
      _scrml_frag_3.appendChild(_scrml_el_7);
      _scrml_el_2.appendChild(_scrml_frag_3);
      _itemFrag.appendChild(_scrml_el_2);
      return _itemFrag.firstChild;
    }
  );
}

function _scrml_nextOrderIn_1(tasks, column) {
  const existing = tasks.filter((t) => _scrml_structural_eq(t.column, column));
  if ((existing.length === 0)) {
    return 0;
  }
  return Math.max(...existing.map((t) => t.order)) + 1;
}

function _scrml_updateIfMatched_2(t, id, column, order) {
  if (_scrml_structural_eq(t.id, id)) {
    return {...t, column: column, order: order};
  }
  return t;
}

function _scrml_taskMovedTo_3(tasks, id, toColumn) {
  const order = _scrml_nextOrderIn_1(tasks, toColumn);
  return tasks.map((t) => _scrml_updateIfMatched_2(t, id, toColumn, order));
}

function _scrml_isDraggingTask_4(phase, id) {
  return (function() {
    const _scrml_match_5 = phase;
    const _scrml_tag_6 = (_scrml_match_5 != null && typeof _scrml_match_5 === "object") ? _scrml_match_5.variant : _scrml_match_5;
    if (_scrml_tag_6 === "Dragging") { const draggingId = _scrml_match_5.data.id; return draggingId === id; }
    else if (_scrml_tag_6 === "Idle") return false;
  })();
}

function _scrml_allowDrop_7(e) {
  e.preventDefault();
}

const columns = ["Inbox", "Doing", "Done"];
_scrml_reactive_set("tasks", _scrml_deep_reactive([{id: 1, title: "Triage incoming bug reports", column: "Inbox", order: 0}, {id: 2, title: "Review PR #42", column: "Inbox", order: 1}, {id: 3, title: "Wire up onboarding flow", column: "Doing", order: 0}, {id: 4, title: "Update changelog", column: "Done", order: 0}]));
_scrml_init_set("tasks", () => [{id: 1, title: "Triage incoming bug reports", column: "Inbox", order: 0}, {id: 2, title: "Review PR #42", column: "Inbox", order: 1}, {id: 3, title: "Wire up onboarding flow", column: "Doing", order: 0}, {id: 4, title: "Update changelog", column: "Done", order: 0}]);

// --- each body-render dispatchers (deferred post-cell-init, §17.X) ---
_scrml_each_renderers["each_126"] = _scrml_each_render_126;

_scrml_each_render_126();

_scrml_effect_static(_scrml_each_render_126);
//# sourceMappingURL=25-triage-board.client.js.map
