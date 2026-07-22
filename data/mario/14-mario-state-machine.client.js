// Requires: scrml-runtime.01iufbor.js



// --- enum toEnum() lookup tables (compiler-generated) ---
const PowerUp_variants = ["Mushroom", "Flower", "Feather"];
const MarioState_toEnum = { "Small": "Small", "Big": "Big", "Fire": "Fire", "Cape": "Cape" };
const MarioState_variants = ["Small", "Big", "Fire", "Cape"];
const HealthRisk_toEnum = { "AtRisk": "AtRisk", "Safe": "Safe" };
const HealthRisk_variants = ["AtRisk", "Safe"];

// --- enum variant objects (compiler-generated) ---
const PowerUp = Object.freeze({ Mushroom: function(coins) { return { variant: "Mushroom", data: { coins } }; }, Flower: function(coins) { return { variant: "Flower", data: { coins } }; }, Feather: function(coins) { return { variant: "Feather", data: { coins } }; }, variants: ["Mushroom", "Flower", "Feather"] });
const MarioState = Object.freeze({ Small: "Small", Big: "Big", Fire: "Fire", Cape: "Cape", variants: ["Small", "Big", "Fire", "Cape"] });
const HealthRisk = Object.freeze({ AtRisk: "AtRisk", Safe: "Safe", variants: ["AtRisk", "Safe"] });

// --- engine substrate (compiler-generated, §51.0) ---
// §51.0.F transition table for engine marioState: MarioState
const __scrml_engine_marioState_transitions = Object.freeze({
  "Small": ["Big","Fire","Cape"],
  "Big": ["Fire","Cape","Small"],
  "Fire": ["Small"],
  "Cape": ["Small"]
});
// §51.0.C auto-declared engine variable: marioState (MarioState)
_scrml_reactive_set("marioState", "Small");
// §51.0.D engine mount position: marioState (MarioState) — body render via emitEngineBodyRenderForFile

// --- derived engine substrate (compiler-generated, §51.0.J) ---
// §51.0.J derived engine: healthRisk (HealthRisk) — derived from marioState
_scrml_derived_declare("healthRisk", () => {
  const __scrml_derived_v = _scrml_reactive_get("marioState");
  if (__scrml_derived_v == null) {
    throw new Error("E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT: derived engine 'healthRisk' yielded no value " +
      "(upstream 'marioState' is undefined). " +
      "Per §51.0.J + §34: derived=expr must produce a defined variant for the source's initial state. " +
      "Add a default arm or a wildcard arm in the derivation.");
  }
  return __scrml_derived_v;
});
_scrml_derived_subscribe("healthRisk", "marioState");
_scrml_derived_get("healthRisk");
// §51.0.D engine mount position: healthRisk (HealthRisk) — DERIVED — body render via emitDerivedEngineBodyRenderForFile

function _scrml_eatPowerUp_17(powerUp) {
  if (_scrml_reactive_get("gameOver")) {
  return;
}
  (function() {
  const _scrml_match_18 = powerUp;
  const _scrml_tag_19 = (_scrml_match_18 != null && typeof _scrml_match_18 === "object") ? _scrml_match_18.variant : _scrml_match_18;
  if (_scrml_tag_19 === "Mushroom") { const n = _scrml_match_18.data.coins; _scrml_reactive_set("coins", _scrml_reactive_get("coins") + n);; // §51.0.F engine direct-write hook: marioState (MarioState)
_scrml_engine_direct_set("marioState", (function() {
  const _scrml_match_20 = _scrml_reactive_get("marioState");
  if (_scrml_match_20 === "Small") return MarioState.Big;
  else return _scrml_reactive_get("marioState");
})(), __scrml_engine_marioState_transitions); }
  else if (_scrml_tag_19 === "Flower") { const n = _scrml_match_18.data.coins; _scrml_reactive_set("coins", _scrml_reactive_get("coins") + n);; // §51.0.F engine direct-write hook: marioState (MarioState)
_scrml_engine_direct_set("marioState", "Fire", __scrml_engine_marioState_transitions); }
  else if (_scrml_tag_19 === "Feather") { const n = _scrml_match_18.data.coins; _scrml_reactive_set("coins", _scrml_reactive_get("coins") + n);; // §51.0.F engine direct-write hook: marioState (MarioState)
_scrml_engine_direct_set("marioState", "Cape", __scrml_engine_marioState_transitions); }
})()
}

function _scrml_getHurt_21() {
  if (_scrml_reactive_get("gameOver")) {
  return;
}
  let wasSmall = _scrml_structural_eq(_scrml_reactive_get("marioState"), MarioState.Small);
  // §51.0.F engine direct-write hook: marioState (MarioState)
_scrml_engine_direct_set("marioState", "Small", __scrml_engine_marioState_transitions);
  if (wasSmall) {
  _scrml_reactive_set("lives", _scrml_reactive_get("lives") - 1);
  if (_scrml_structural_eq(_scrml_reactive_get("lives"), 0)) {
  _scrml_reactive_set("gameOver", true);
}
}
}

function _scrml_restart_22() {
  // §51.0.F engine direct-write hook: marioState (MarioState)
_scrml_engine_direct_set("marioState", "Small", __scrml_engine_marioState_transitions);
  _scrml_reset("coins");
  _scrml_reactive_set("lives", 3);
  _scrml_reactive_set("gameOver", false);
}

function _scrml_riskBanner_23(risk) {
  return (function() {
    const _scrml_match_24 = risk;
    if (_scrml_match_24 === "AtRisk") return "ONE HIT AND YOU LOSE A LIFE!";
    else if (_scrml_match_24 === "Safe") return "POWERED UP — YOU CAN ABSORB A HIT";
  })();
}


function _scrml_project_healthRisk(src) {
  var tag = (src != null && typeof src === "object") ? src.variant : src;
  if (tag === "Small") return "AtRisk";
  if (tag === "Big") return "Safe";
  if (tag === "Fire") return "Safe";
  if (tag === "Cape") return "Safe";
  return null;
}
// §51.9 derived machine: @healthRisk projects @marioState through healthRisk
_scrml_derived_fns["healthRisk"] = function() { return _scrml_project_healthRisk(_scrml_reactive_get("marioState")); };
_scrml_derived_dirty["healthRisk"] = true;
(_scrml_derived_downstreams["marioState"] = _scrml_derived_downstreams["marioState"] || new Set()).add("healthRisk");
_scrml_reactive_set("coins", 0);
_scrml_init_set("coins", () => 0);
_scrml_reactive_set("lives", 3);
_scrml_init_set("lives", () => 3);
_scrml_reactive_set("gameOver", false);
_scrml_init_set("gameOver", () => false);
_scrml_derived_declare("marioEmoji", () => (function() {
  const _scrml_match_25 = _scrml_reactive_get("marioState");
  if (_scrml_match_25 === "Small") return "🧍";
  else if (_scrml_match_25 === "Big") return "🦸";
  else if (_scrml_match_25 === "Fire") return "🔥";
  else if (_scrml_match_25 === "Cape") return "🦅";
})());
_scrml_derived_subscribe("marioEmoji", "marioState");
_scrml_derived_declare("marioName", () => (function() {
  const _scrml_match_26 = _scrml_reactive_get("marioState");
  if (_scrml_match_26 === "Small") return "SMALL MARIO";
  else if (_scrml_match_26 === "Big") return "SUPER MARIO";
  else if (_scrml_match_26 === "Fire") return "FIRE MARIO";
  else if (_scrml_match_26 === "Cape") return "CAPE MARIO";
})());
_scrml_derived_subscribe("marioName", "marioState");
_scrml_riskBanner_23(_scrml_reactive_get("healthRisk"));

// --- Event handler wiring (compiler-generated) ---
(function() {
function _scrml_boot() {
  const _scrml_click = {
    "_scrml_attr_onclick_11": function(event) { _scrml_eatPowerUp_17(PowerUp.Mushroom(1)); },
    "_scrml_attr_onclick_12": function(event) { _scrml_eatPowerUp_17(PowerUp.Flower(3)); },
    "_scrml_attr_onclick_13": function(event) { _scrml_eatPowerUp_17(PowerUp.Feather(5)); },
    "_scrml_attr_onclick_14": function(event) { _scrml_getHurt_21(); },
    "_scrml_attr_onclick_16": function(event) { _scrml_restart_22(); },
  };
  document.addEventListener("click", function(event) {
    let t = event.target;
    while (t && t !== document) {
      const id = t.getAttribute("data-scrml-bind-onclick");
      if (id && _scrml_click[id]) { _scrml_click[id](event); return; }
      t = t.parentElement;
    }
  });

  // --- Reactive display wiring ---

  // --- element-scoped wiring (non-delegable handlers + reactive display); re-run on soft-nav ---
  function _scrml_nav_rewire(root) {
    {
      const el = (root || document).querySelector('[data-scrml-logic="_scrml_logic_1"]');
      if (el) {
        _scrml_render_value(el, _scrml_reactive_get("lives"));
        const _scrml_disp = _scrml_effect(function() { _scrml_render_value(el, _scrml_reactive_get("lives")); });
        _scrml_region_track(el, _scrml_disp);
      }
    }
    {
      const el = (root || document).querySelector('[data-scrml-logic="_scrml_logic_2"]');
      if (el) {
        _scrml_render_value(el, _scrml_reactive_get("coins"));
        const _scrml_disp = _scrml_effect(function() { _scrml_render_value(el, _scrml_reactive_get("coins")); });
        _scrml_region_track(el, _scrml_disp);
      }
    }
    {
      const el = (root || document).querySelector('[data-scrml-logic="_scrml_logic_3"]');
      if (el) {
        _scrml_render_value(el, _scrml_reactive_get("marioState"));
        const _scrml_disp = _scrml_effect(function() { _scrml_render_value(el, _scrml_reactive_get("marioState")); });
        _scrml_region_track(el, _scrml_disp);
      }
    }
    {
      const el = (root || document).querySelector('[data-scrml-logic="_scrml_logic_4"]');
      if (el) {
        _scrml_render_value(el, _scrml_derived_get("marioEmoji"));
        const _scrml_disp = _scrml_effect(function() { _scrml_render_value(el, _scrml_derived_get("marioEmoji")); });
        _scrml_region_track(el, _scrml_disp);
      }
    }
    {
      const el = (root || document).querySelector('[data-scrml-logic="_scrml_logic_5"]');
      if (el) {
        _scrml_render_value(el, _scrml_derived_get("marioName"));
        const _scrml_disp = _scrml_effect(function() { _scrml_render_value(el, _scrml_derived_get("marioName")); });
        _scrml_region_track(el, _scrml_disp);
      }
    }
    {
      const el = (root || document).querySelector('[data-scrml-bind-if="_scrml_attr_if_6"]');
      if (el) {
        el.style.display = (_scrml_structural_eq(_scrml_reactive_get("healthRisk"), HealthRisk.AtRisk) && !_scrml_reactive_get("gameOver")) ? "" : "none";
        const _scrml_disp = _scrml_effect(function() { el.style.display = (_scrml_structural_eq(_scrml_reactive_get("healthRisk"), HealthRisk.AtRisk) && !_scrml_reactive_get("gameOver")) ? "" : "none"; });
        _scrml_region_track(el, _scrml_disp);
      }
    }
    {
      const el = (root || document).querySelector('[data-scrml-logic="_scrml_logic_7"]');
      if (el) {
        if ((_scrml_structural_eq(_scrml_reactive_get("healthRisk"), HealthRisk.AtRisk) && !_scrml_reactive_get("gameOver"))) { _scrml_render_value(el, _scrml_riskBanner_23(_scrml_reactive_get("healthRisk"))); }
        const _scrml_disp = _scrml_effect(function() { if (!((_scrml_structural_eq(_scrml_reactive_get("healthRisk"), HealthRisk.AtRisk) && !_scrml_reactive_get("gameOver")))) return; _scrml_render_value(el, _scrml_riskBanner_23(_scrml_reactive_get("healthRisk"))); });
        _scrml_region_track(el, _scrml_disp);
      }
    }
    {
      // if= mount/unmount controller — marker _scrml_if_marker_9, template _scrml_scrml_tpl_8
      var _scrml_ifm__scrml_if_marker_9 = (typeof _scrml_find_if_marker === "function") ? _scrml_find_if_marker("_scrml_if_marker_9", (root || document)) : null;
      if (_scrml_ifm__scrml_if_marker_9) {
        var _scrml_ifa__scrml_if_marker_9 = _scrml_ifm__scrml_if_marker_9.parentElement || null;
        let _scrml_mr__scrml_if_marker_9 = null;
        let _scrml_ms__scrml_if_marker_9 = null;
        function _scrml_if_mount__scrml_if_marker_9() {
          _scrml_ms__scrml_if_marker_9 = _scrml_create_scope();
          _scrml_mr__scrml_if_marker_9 = _scrml_mount_template("_scrml_if_marker_9", "_scrml_scrml_tpl_8", (root || document));
        }
        function _scrml_if_unmount__scrml_if_marker_9() {
          if (_scrml_mr__scrml_if_marker_9 !== null) {
            _scrml_unmount_scope(_scrml_mr__scrml_if_marker_9, _scrml_ms__scrml_if_marker_9);
            _scrml_mr__scrml_if_marker_9 = null;
            _scrml_ms__scrml_if_marker_9 = null;
          }
        }
        if ((_scrml_reactive_get("gameOver"))) _scrml_if_mount__scrml_if_marker_9();
        var _scrml_ifd__scrml_if_marker_9 = _scrml_effect(function() {
          if ((_scrml_reactive_get("gameOver"))) {
            if (_scrml_mr__scrml_if_marker_9 === null) _scrml_if_mount__scrml_if_marker_9();
          } else {
            if (_scrml_mr__scrml_if_marker_9 !== null) _scrml_if_unmount__scrml_if_marker_9();
          }
        });
        if (typeof _scrml_region_track === "function") _scrml_region_track(_scrml_ifa__scrml_if_marker_9, function() { _scrml_if_unmount__scrml_if_marker_9(); _scrml_ifd__scrml_if_marker_9(); });
      }
    }
    {
      const el = (root || document).querySelector('[data-scrml-bind-if="_scrml_attr_if_10"]');
      if (el) {
        el.style.display = (!_scrml_reactive_get("gameOver")) ? "" : "none";
        const _scrml_disp = _scrml_effect(function() { el.style.display = (!_scrml_reactive_get("gameOver")) ? "" : "none"; });
        _scrml_region_track(el, _scrml_disp);
      }
    }
    {
      const el = (root || document).querySelector('[data-scrml-bind-if="_scrml_attr_if_15"]');
      if (el) {
        el.style.display = (_scrml_reactive_get("gameOver")) ? "" : "none";
        const _scrml_disp = _scrml_effect(function() { el.style.display = (_scrml_reactive_get("gameOver")) ? "" : "none"; });
        _scrml_region_track(el, _scrml_disp);
      }
    }
  }
  _scrml_nav_rewire(document);
  if (typeof _scrml_register_rehydrator === "function") _scrml_register_rehydrator(_scrml_nav_rewire);
}
if (typeof document === "undefined") { return; }
if (typeof _scrml_chunk_loading !== "undefined" && _scrml_chunk_loading) {
  _scrml_boot();
} else {
  document.addEventListener("DOMContentLoaded", _scrml_boot);
}
})();
//# sourceMappingURL=14-mario-state-machine.client.js.map
