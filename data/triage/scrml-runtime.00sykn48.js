// --- scrml reactive runtime ---
const _scrml_state = {};
const _scrml_subscribers = {};
// S103 Phase 3 select-row chip-away (Candidate A) — value-indexed sub-registry
// parallel to _scrml_subscribers. Predicate-shape binds emitted by emit-lift.js
// register here under their static valueKey (the constant they compare the cell
// to). At write time _scrml_reactive_set fires only the OLD-value bucket and
// the NEW-value bucket — O(2) per write instead of O(N) over all rows.
// Shape: { [name]: { [valueKey]: [fn, ...] } }
// TDZ-safe: declared next to _scrml_subscribers since state-decl substrates
// may write to cells during module-init before the helper functions resolve.
const _scrml_value_indexed_subscribers = {};
// scrml: stdlib registry — populated by per-stdlib chunks (see end of runtime).
// Client-emitted code rewrites `import { x } from "scrml:NAME"` to
// `const { x } = _scrml_stdlib.NAME;` (browser cannot resolve bare specifiers).
const _scrml_stdlib = {};

// ---------------------------------------------------------------------------
// P1.B — Per-op runtime instrumentation (SCOPING §2.2, S103).
//
// Gated on `globalThis.__SCRML_DEBUG_PERF`. When the flag is unset (the
// production path), `__SCRML_PERF` is null and every `if (__SCRML_PERF)`
// branch below collapses to a predictable null-check the JIT inlines away.
// When set, the runtime accumulates per-category ms + call counts and emits a
// breakdown via `_scrml_perf_dump()` on demand (or `_scrml_perf_reset()`
// between benchmark iterations).
//
// Categories tracked:
//   reactive_get        every _scrml_reactive_get call
//   reactive_set        every _scrml_reactive_set call (incl. timing-wrapped)
//   reconcile_list      every _scrml_reconcile_list call (keyed list diff)
//   notify_subscribers  the subscriber-fan-out loop inside _scrml_reactive_set
//   dom_write           DOM mutation calls inside _scrml_reconcile_list
//                       (appendChild / insertBefore / removeChild /
//                       replaceChildren)
//   effect_scheduling   reactive-effect re-runs (_scrml_trigger + _scrml_effect
//                       body)
//
// Verify zero-overhead empirically against AC1: warm-run delta < 1ms on a
// representative TodoMVC op.
const __SCRML_PERF = (typeof globalThis !== "undefined" && globalThis.__SCRML_DEBUG_PERF)
  ? {
      reactive_get:         { ms: 0, count: 0 },
      reactive_set:         { ms: 0, count: 0 },
      reconcile_list:       { ms: 0, count: 0 },
      notify_subscribers:   { ms: 0, count: 0 },
      notify_value_indexed: { ms: 0, count: 0 },
      dom_write:            { ms: 0, count: 0 },
      effect_scheduling:    { ms: 0, count: 0 },
    }
  : null;
const __SCRML_PERF_NOW = (typeof performance !== "undefined" && performance.now)
  ? function () { return performance.now(); }
  : function () { return Date.now(); };
function _scrml_perf_reset() {
  if (!__SCRML_PERF) return;
  for (const k in __SCRML_PERF) {
    __SCRML_PERF[k].ms = 0;
    __SCRML_PERF[k].count = 0;
  }
}
function _scrml_perf_snapshot() {
  if (!__SCRML_PERF) return null;
  const out = {};
  for (const k in __SCRML_PERF) {
    const c = __SCRML_PERF[k].count;
    const ms = __SCRML_PERF[k].ms;
    out[k] = { ms: ms, count: c, avgMs: c > 0 ? ms / c : 0 };
  }
  return out;
}
function _scrml_perf_dump(label) {
  if (!__SCRML_PERF) return;
  const snap = _scrml_perf_snapshot();
  const tag = label ? " [" + label + "]" : "";
  for (const k in snap) {
    const s = snap[k];
    if (s.count === 0) continue;
    console.log(
      "[SCRML-RUNTIME]" + tag + " " + k + ": " +
      s.ms.toFixed(3) + " (" + s.count + " calls, " +
      s.avgMs.toFixed(4) + " avg-ms-per-call)"
    );
  }
}
if (typeof globalThis !== "undefined") {
  globalThis._scrml_perf_reset = _scrml_perf_reset;
  globalThis._scrml_perf_snapshot = _scrml_perf_snapshot;
  globalThis._scrml_perf_dump = _scrml_perf_dump;
}

// S79 / §6.13 reactivity attribute registries — hoisted to module top to
// avoid TDZ when _scrml_reactive_set (called early during module-init by
// state-decl substrates) consults them. Implementations of the helpers
// that READ these registries live further down in the utilities chunk.
const _scrml_reactivity_timers = Object.create(null);
const _scrml_reactivity_rules = Object.create(null);
const _scrml_reactivity_bypass = Object.create(null);
const _scrml_throttle_state = Object.create(null);

// --- derived reactive state (§6.6) ---
// _scrml_derived_fns: name → () => value  (evaluation function for each derived node)
// _scrml_derived_cache: name → cached value
// _scrml_derived_dirty: name → boolean  (true = needs re-evaluation on next read)
// _scrml_derived_downstreams: upstream_name → Set of derived names  (dirty propagation edges)
const _scrml_derived_fns = {};
const _scrml_derived_cache = {};
const _scrml_derived_dirty = {};
const _scrml_derived_downstreams = {};

// --- default= storage (§6.8) ---
// _scrml_default_fns: name → () => default-value
// Registered by _scrml_default_set at module-init alongside the cell
// declaration. Read by reset(@cell) lowering (C5) to materialize the default
// when reset is invoked. Per SPEC §6.8.1 the default is the EXPRESSION (not
// a snapshot), so the closure is re-evaluated each reset.
//
// Parallel map (separate from _scrml_state / _scrml_derived_fns) so the
// existing reactive registries keep their shape stability.
//
// NOTE: this declaration LIVES in the 'core' chunk (no marker) so file-init
// _scrml_default_set(...) calls always resolve. The runtime helper that
// USES this map (_scrml_reset) lives in the 'reset' chunk further down.
const _scrml_default_fns = {};
function _scrml_default_set(name, fn) {
  _scrml_default_fns[name] = fn;
}

// --- init-thunk storage (§6.8 — C5) ---
// _scrml_init_fns: name -> () => init-value
// Registered by _scrml_init_set at module-init for each Shape 1 / Shape 2
// state-cell that does NOT carry a "default" attribute.
//
// Same chunk policy as _scrml_default_fns: declaration lives in 'core' so
// file-init _scrml_init_set(...) calls always resolve. The using helper
// (_scrml_reset) lives in 'reset' and is tree-shaken when no reset(@cell)
// occurs in the source.
const _scrml_init_fns = {};
function _scrml_init_set(name, fn) {
  _scrml_init_fns[name] = fn;
}

// --- machine temporal transitions (§51.12) ---
// _scrml_machine_timers: encodedVarName → timeout id for the currently-armed
// temporal transition. Transition-guard codegen clears any existing timer on
// state commit and arms a new one if the destination variant has outgoing
// temporal rules. Re-entering the same variant clears and re-arms (reset
// semantics per the deep-dive default).
const _scrml_machine_timers = {};
function _scrml_machine_clear_timer(name) {
  const id = _scrml_machine_timers[name];
  if (id !== undefined) {
    clearTimeout(id);
    delete _scrml_machine_timers[name];
  }
}
function _scrml_machine_arm_timer(name, ms, target, meta) {
  // meta (optional): { fromVariant, label, auditTarget, rulesJson, setterFn, getterName }
  //   fromVariant — the .From of the temporal rule being armed (used to
  //     build the audit 'rule' key on expiry: fromVariant + ":" + target).
  //   label — the rule's guard label if any, else null. Temporal rules
  //     currently do not take 'given' clauses, so this is conventionally
  //     null; the slot exists so a future temporal+guard syntax can slot
  //     straight in.
  //   auditTarget — the encoded reactive-var name of the machine's audit
  //     target (the 'audit @log' clause in the machine body), else null.
  //   rulesJson — the serialized temporal-rule list so the timer can
  //     re-arm on the downstream variant. Chained temporal rules
  //     (A after 1s => B, B after 1s => C) must continue automatically
  //     without the user driving transitions.
  //   setterFn  — A5-4 (§51.0.M onTimeout): an optional callback invoked
  //     INSTEAD of the bare _scrml_reactive_set(name, target) at expiry.
  //     Engine onTimeout codegen passes a function that routes the write
  //     through the engine's rule= contract guard (the engine helper in
  //     the 'engine' chunk; see §51.0.F + §51.0.G). When absent (the
  //     legacy machine path), the original _scrml_reactive_set write is
  //     used.
  //   getterName — A5-4: the encoded reactive-var name to read for the
  //     __prev audit entry. Defaults to name. Currently unused — reserved
  //     so a future shape (e.g., audit-target read) can opt out.
  //
  // S27 (§51.11): timer-fired transitions now push audit entries and
  // re-arm downstream temporal rules. Previously the timer invoked a
  // bare _scrml_reactive_set, bypassing both the audit clause and the
  // per-transition re-arm logic. This violated §51.11.6 "every
  // successful transition SHALL append" for temporal rules.
  _scrml_machine_clear_timer(name);
  _scrml_machine_timers[name] = setTimeout(function () {
    delete _scrml_machine_timers[name];
    const __prev = _scrml_reactive_get(name);
    if (meta && typeof meta.setterFn === "function") {
      // A5-4: engine-aware setter (routes through the engine's contract
      // guard so the rule= contract check fires; throws
      // E-ENGINE-INVALID-TRANSITION if the timer target violates the
      // contract — defensive, the compile-time check in A5-3 should already
      // have caught this).
      meta.setterFn(target);
    } else {
      _scrml_reactive_set(name, target);
    }
    if (meta && meta.auditTarget) {
      const entry = Object.freeze({
        from: __prev,
        to: target,
        at: Date.now(),
        rule: meta.fromVariant + ":" + target,
        label: meta.label != null ? meta.label : null,
      });
      _scrml_reactive_set(
        meta.auditTarget,
        (_scrml_reactive_get(meta.auditTarget) || []).concat([entry])
      );
    }
    if (meta && meta.rulesJson) {
      _scrml_machine_arm_initial(name, meta.rulesJson, meta.auditTarget);
    }
  }, ms);
}
function _scrml_machine_arm_initial(name, rulesJson, auditTarget) {
  // Called once per machine-bound reactive after its initial _scrml_reactive_set,
  // and also re-invoked from _scrml_machine_arm_timer's expiry path so that
  // chained temporal rules auto-advance. Inspects the current variant and arms
  // the first matching temporal rule, if any.
  //
  // auditTarget (optional, added S27) propagates the machine's audit target
  // through the re-arm cascade so chained temporal transitions keep auditing.
  const val = _scrml_reactive_get(name);
  const variant = (val != null && typeof val === "object" && val.variant != null) ? val.variant : val;
  const rules = JSON.parse(rulesJson);
  for (const r of rules) {
    if (r.from === variant) {
      const meta = {
        fromVariant: r.from,
        label: r.label != null ? r.label : null,
        auditTarget: auditTarget != null ? auditTarget : null,
        rulesJson: rulesJson,
      };
      _scrml_machine_arm_timer(name, r.afterMs, r.to, meta);
      return;
    }
  }
}

// --- §51.14 replay primitive ---
// _scrml_replay(name, log, endIdx?) jumps the machine-bound reactive 'name'
// to the state recorded at index endIdx of the audit array 'log'. Bypasses
// the transition guard (§51.5) and the audit push (§51.11), clears any
// pending temporal timer (§51.12), and emits a standard _scrml_reactive_set
// so subscribers, derived propagation, and effects all fire normally.
//
// Semantics (per SPEC.md §51.14.3):
//   - endIdx > 0         → state lands at log[endIdx - 1].to
//   - endIdx == 0        → state lands at log[0].from (or no-op if empty)
//   - endIdx undefined   → state lands at log[log.length - 1].to (full replay)
//   - endIdx < 0 or > length → throws E-REPLAY-001-RT
function _scrml_replay(name, log, endIdx) {
  const n = (endIdx != null) ? endIdx : log.length;
  if (n < 0 || n > log.length) {
    throw new Error("E-REPLAY-001-RT: replay index " + n +
      " out of bounds for log of length " + log.length +
      ". Index SHALL be in the range [0, log.length].");
  }
  _scrml_machine_clear_timer(name);
  if (n === 0) {
    if (log.length === 0) return;  // empty-log no-op (nothing to replay)
    _scrml_reactive_set(name, log[0].from);
    return;
  }
  _scrml_reactive_set(name, log[n - 1].to);
}

function _scrml_reactive_get(name) {
  if (__SCRML_PERF) {
    const __t0 = __SCRML_PERF_NOW();
    // Bridge with _scrml_effect auto-tracking: record _scrml_state[name] as a dependency
    if (typeof _scrml_track === "function") _scrml_track(_scrml_state, name);
    let __r;
    if (_scrml_derived_fns[name]) __r = _scrml_derived_get(name);
    else __r = _scrml_state[name];
    __SCRML_PERF.reactive_get.ms += __SCRML_PERF_NOW() - __t0;
    __SCRML_PERF.reactive_get.count++;
    return __r;
  }
  // Bridge with _scrml_effect auto-tracking: record _scrml_state[name] as a dependency
  if (typeof _scrml_track === "function") _scrml_track(_scrml_state, name);
  // Derived reactives are stored in _scrml_derived_cache, not _scrml_state.
  // Delegate to _scrml_derived_get for lazy re-evaluation when dirty.
  if (_scrml_derived_fns[name]) return _scrml_derived_get(name);
  return _scrml_state[name];
}

// markup-as-value display (§1.4/§7.4 Pillar 1) — node-aware interpolation.
// A markup-typed interpolation value is a real DOM node (built by the markup-value
// codegen: createElement + appendChild). Assigning a node to el.textContent would
// stringify it to "[object HTMLSpanElement]"; render it into the element instead.
// String / primitive values keep the byte-identical textContent path (null/undefined
// become "" per scrml's absence model — "" is itself a defined value and stringifies).
function _scrml_render_value(el, v) {
  if (v instanceof Node) {
    el.replaceChildren(v);
  } else {
    el.textContent = (v == null ? "" : String(v));
  }
}

function _scrml_reactive_set(name, value) {
  const __t_set_top = __SCRML_PERF ? __SCRML_PERF_NOW() : 0;
  // S79 / §6.13 — when a reactivity rule is registered for the cell, route
  // the write through the timing wrapper. Guarded so cells without a rule
  // (the common case) take zero overhead beyond a single property lookup.
  // The bypass-flag avoids infinite recursion (the timer helpers eventually
  // call back into _scrml_reactive_set with the resolved value).
  if (typeof _scrml_reactivity_rules === "object" && _scrml_reactivity_rules[name] && !_scrml_reactivity_bypass[name]) {
    const rule = _scrml_reactivity_rules[name];
    _scrml_reactivity_bypass[name] = true;
    try {
      if (rule.kind === "debounced") {
        _scrml_reactive_debounced(name, function () { return value; }, rule.ms);
      } else if (rule.kind === "throttled") {
        _scrml_reactive_throttled(name, function () { return value; }, rule.ms);
      } else {
        // Unknown rule kind — defensive: fall through to immediate set.
        const __oldValue_def = _scrml_state[name];
        _scrml_state[name] = value;
        const dirtied = _scrml_propagate_dirty(name);
        if (_scrml_subscribers[name]) {
          const __t_sub = __SCRML_PERF ? __SCRML_PERF_NOW() : 0;
          for (const fn of _scrml_subscribers[name]) {
            try { fn(value); } catch(e) { console.error("scrml subscriber error:", e); }
          }
          if (__SCRML_PERF) {
            __SCRML_PERF.notify_subscribers.ms += __SCRML_PERF_NOW() - __t_sub;
            __SCRML_PERF.notify_subscribers.count++;
          }
        }
        // S103 Phase 3 select-row chip-away — value-indexed fan-out
        if (_scrml_value_indexed_subscribers[name]) {
          const __t_vi = __SCRML_PERF ? __SCRML_PERF_NOW() : 0;
          _scrml_notify_value_indexed(name, __oldValue_def, value);
          if (__SCRML_PERF) {
            __SCRML_PERF.notify_value_indexed.ms += __SCRML_PERF_NOW() - __t_vi;
            __SCRML_PERF.notify_value_indexed.count++;
          }
        }
        if (typeof _scrml_trigger === "function") _scrml_trigger(_scrml_state, name);
        if (dirtied && dirtied.length > 0 && typeof _scrml_trigger === "function") {
          for (const derived of dirtied) _scrml_trigger(_scrml_state, derived);
        }
      }
    } finally {
      _scrml_reactivity_bypass[name] = false;
    }
    if (__SCRML_PERF) {
      __SCRML_PERF.reactive_set.ms += __SCRML_PERF_NOW() - __t_set_top;
      __SCRML_PERF.reactive_set.count++;
    }
    return value;
  }
  // S103 Phase 3 select-row chip-away — capture OLD value BEFORE the write
  // so value-indexed dispatch can fan out the OLD-value bucket alongside the
  // NEW-value bucket. Cheap read; never null-throws because _scrml_state is
  // a plain object initialized at runtime-template load.
  const __oldValue = _scrml_state[name];
  _scrml_state[name] = value;
  // §6.6.3 Phase 2: eagerly propagate dirty flags to all downstream derived nodes
  // before subscribers fire and before this call returns. Synchronous, no re-evaluation.
  const dirtied = _scrml_propagate_dirty(name);
  if (_scrml_subscribers[name]) {
    const __t_sub = __SCRML_PERF ? __SCRML_PERF_NOW() : 0;
    for (const fn of _scrml_subscribers[name]) {
      try { fn(value); } catch(e) { console.error("scrml subscriber error:", e); }
    }
    if (__SCRML_PERF) {
      __SCRML_PERF.notify_subscribers.ms += __SCRML_PERF_NOW() - __t_sub;
      __SCRML_PERF.notify_subscribers.count++;
    }
  }
  // S103 Phase 3 select-row chip-away — value-indexed fan-out. Fires only the
  // OLD-value bucket + NEW-value bucket; predicate-shape binds emitted by
  // emit-lift.js register here instead of the LEGACY _scrml_subscribers when
  // detectPredicateShapeBind matches. O(2) per write instead of O(N) over all
  // rows.
  if (_scrml_value_indexed_subscribers[name]) {
    const __t_vi = __SCRML_PERF ? __SCRML_PERF_NOW() : 0;
    _scrml_notify_value_indexed(name, __oldValue, value);
    if (__SCRML_PERF) {
      __SCRML_PERF.notify_value_indexed.ms += __SCRML_PERF_NOW() - __t_vi;
      __SCRML_PERF.notify_value_indexed.count++;
    }
  }
  // Bridge with _scrml_effect auto-tracking: fire effects tracking _scrml_state[name]
  if (typeof _scrml_trigger === "function") _scrml_trigger(_scrml_state, name);
  // Also trigger effects for derived nodes that were dirtied — they need to
  // re-evaluate and update any DOM bindings that read them.
  if (dirtied && dirtied.length > 0 && typeof _scrml_trigger === "function") {
    for (const derived of dirtied) {
      _scrml_trigger(_scrml_state, derived);
    }
  }
  if (__SCRML_PERF) {
    __SCRML_PERF.reactive_set.ms += __SCRML_PERF_NOW() - __t_set_top;
    __SCRML_PERF.reactive_set.count++;
  }
  return value;
}

// S79 / §6.13 — _scrml_reactivity_bypass is declared at the top of the
// runtime (next to _scrml_state) for TDZ safety; the bypass map short-
// circuits the timing wrapper when the timer helper itself calls back
// into _scrml_reactive_set, avoiding infinite recursion.

/**
 * Propagate dirty flags from a written upstream name to all downstream derived nodes.
 * Also propagates transitively: if A → B → C, writing A dirties B and C.
 * Uses iterative BFS to avoid stack overflow on deep chains.
 * @param {string} name — the upstream variable name that was just written
 */
function _scrml_propagate_dirty(name) {
  const queue = [name];
  const visited = new Set();
  const dirtied = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const downstreams = _scrml_derived_downstreams[current];
    if (downstreams) {
      for (const derived of downstreams) {
        if (!_scrml_derived_dirty[derived]) {
          _scrml_derived_dirty[derived] = true;
          dirtied.push(derived);
          // Also propagate from this derived node to its downstreams
          queue.push(derived);
        }
      }
    }
  }
  return dirtied;
}

/**
 * Subscribe fn to reactive changes for name.
 * Returns an unsubscribe function that, when called, removes fn from the subscriber list.
 * Required by _scrml_meta_effect for dependency cleanup between re-runs.
 *
 * @param {string} name — reactive variable name (without @ prefix)
 * @param {function} fn — subscriber callback, called with (newValue) on each set
 * @returns {() => void} unsubscribe function
 */
function _scrml_reactive_subscribe(name, fn) {
  if (!_scrml_subscribers[name]) _scrml_subscribers[name] = [];
  _scrml_subscribers[name].push(fn);
  return () => {
    const subs = _scrml_subscribers[name];
    if (subs) {
      const idx = subs.indexOf(fn);
      if (idx !== -1) subs.splice(idx, 1);
    }
  };
}

// S103 Phase 3 select-row chip-away — value-indexed subscription.
//
// Derive a stable property-key string for a primitive valueKey. The key must
// distinguish "5" from 5 and "true" from true so the wrong bucket never gets
// fired. JSON-style type prefixing is sufficient for the supported scope
// (string / number / boolean / null / undefined).
//
// Non-primitive values (objects, arrays, functions) MUST NOT reach here —
// the codegen detector rejects shapes that could yield a non-primitive
// valueKey at registration time. Defensive fallback uses String(v) so the
// runtime never throws, but the registration is effectively useless because
// object identity isn't stable across closures.
function _scrml_value_indexed_key(v) {
  if (v === null || v === undefined) return "\u0000n";
  const t = typeof v;
  if (t === "string") return "s:" + v;
  if (t === "number") return "n:" + v;
  if (t === "boolean") return v ? "b:1" : "b:0";
  // Defensive fallback — not a supported registration path.
  return "x:" + String(v);
}

/**
 * Register fn under (name, valueKey) so it only fires when _scrml_reactive_set
 * for 'name' touches the OLD-value === valueKey OR the NEW-value === valueKey
 * bucket. Mirrors _scrml_reactive_subscribe's unsubscribe-closure shape.
 *
 * @param {string} name — reactive variable name (without @ prefix)
 * @param {string|number|boolean|null|undefined} valueKey — the constant the
 *     bind expression compares the cell to; must be a primitive that survives
 *     _scrml_value_indexed_key() stable derivation
 * @param {function} fn — subscriber callback, called with (newValue) when the
 *     bucket fires (same shape as _scrml_reactive_subscribe)
 * @returns {() => void} unsubscribe function
 */
function _scrml_reactive_subscribe_when(name, valueKey, fn) {
  const key = _scrml_value_indexed_key(valueKey);
  let nameMap = _scrml_value_indexed_subscribers[name];
  if (!nameMap) {
    nameMap = {};
    _scrml_value_indexed_subscribers[name] = nameMap;
  }
  let bucket = nameMap[key];
  if (!bucket) {
    bucket = [];
    nameMap[key] = bucket;
  }
  bucket.push(fn);
  return () => {
    const nm = _scrml_value_indexed_subscribers[name];
    if (!nm) return;
    const b = nm[key];
    if (!b) return;
    const idx = b.indexOf(fn);
    if (idx !== -1) b.splice(idx, 1);
    if (b.length === 0) delete nm[key];
  };
}

// Fire the OLD-value bucket + NEW-value bucket for 'name' (predicate-shape
// dispatch). Called from _scrml_reactive_set after the LEGACY fan-out.
// Bucket entries fire in registration order. Each fn is invoked with
// (newValue) for shape parity with the LEGACY callback contract — note that
// for OLD-bucket subscribers, the predicate result was previously true and
// has now flipped to false (the row that WAS editing is no longer editing).
// The subscriber recomputes its full predicate from current cell state on
// each call so the (newValue) argument is informational, not load-bearing.
function _scrml_notify_value_indexed(name, oldValue, newValue) {
  const nameMap = _scrml_value_indexed_subscribers[name];
  if (!nameMap) return;
  const oldKey = _scrml_value_indexed_key(oldValue);
  const newKey = _scrml_value_indexed_key(newValue);
  const oldBucket = nameMap[oldKey];
  if (oldBucket) {
    // Snapshot length to avoid disturbance from subscribers that mutate the
    // bucket during fire (e.g. via unsubscribe).
    const len = oldBucket.length;
    for (let i = 0; i < len; i++) {
      const fn = oldBucket[i];
      if (!fn) continue;
      try { fn(newValue); } catch(e) { console.error("scrml value-indexed subscriber error:", e); }
    }
  }
  // Skip the new bucket when keys collide (no-op write) — fires the same
  // subscribers twice otherwise.
  if (newKey !== oldKey) {
    const newBucket = nameMap[newKey];
    if (newBucket) {
      const len = newBucket.length;
      for (let i = 0; i < len; i++) {
        const fn = newBucket[i];
        if (!fn) continue;
        try { fn(newValue); } catch(e) { console.error("scrml value-indexed subscriber error:", e); }
      }
    }
  }
}

/**
 * RETIRED: _scrml_reactive_derived was the non-conformant stub from before §6.6.
 * It evaluated once at declaration time and registered no subscriptions.
 * It is superseded by _scrml_derived_declare + _scrml_derived_subscribe per §6.6.7.
 * Any compiled output calling this function was produced by an old compiler and must
 * be recompiled.
 */
function _scrml_reactive_derived(name, fn) {
  throw new Error(
    "scrml runtime: _scrml_reactive_derived is retired (§6.6). " +
    "Recompile this file with the current compiler to use _scrml_derived_declare."
  );
}

// ---------------------------------------------------------------------------
// §6.7.3 Scope-aware cleanup registry
// ---------------------------------------------------------------------------

const _scrml_cleanup_registry = new Map();

function _scrml_register_cleanup(fn, scopeId) {
  if (!scopeId) { window.addEventListener("beforeunload", fn); return; }
  if (!_scrml_cleanup_registry.has(scopeId)) _scrml_cleanup_registry.set(scopeId, []);
  _scrml_cleanup_registry.get(scopeId).push(fn);
}

function _scrml_destroy_scope(scopeId) {
  // Step 1: Run cleanup callbacks in LIFO order (§6.7.3)
  const callbacks = _scrml_cleanup_registry.get(scopeId) || [];
  for (let i = callbacks.length - 1; i >= 0; i--) callbacks[i]();
  _scrml_cleanup_registry.delete(scopeId);

  // Step 2: Stop all timers for this scope (§6.7.2, step 2)
  _scrml_stop_scope_timers(scopeId);

  // Step 4: Cancel all pending animation frames for this scope (§6.7.2, step 4)
  _scrml_cancel_animation_frames(scopeId);
}

// ---------------------------------------------------------------------------
// §6.7.2 / §17.1 if= mount/unmount runtime (Phase 2 of if/show split)
//
// _scrml_create_scope:        fresh scopeId for a mount cycle
// _scrml_mount_template:      clone <template id="..."> content, insert before
//                             a marker comment, return the mounted root node
// _scrml_unmount_scope:       destroy scope (LIFO cleanup, stop timers, cancel
//                             rAF) AND remove the mounted root from the DOM
//
// On each false → true transition of an if= condition, a fresh scope is
// created and the template is cloned and mounted. On each true → false,
// the scope is destroyed and the DOM nodes are removed. This satisfies
// SPEC §6.7.2 (scope-as-lifecycle-boundary, depth-first teardown, LIFO
// cleanup, remount re-runs bare expressions).
// ---------------------------------------------------------------------------

let _scrml_scope_counter = 0;

function _scrml_create_scope() {
  return "if_" + (++_scrml_scope_counter);
}

/**
 * Find the comment marker matching `scrml-if-marker:N (HTML comment)` in the document.
 * Returns the Comment node, or null if not found.
 *
 * Implementation: a TreeWalker over comment nodes is the cheapest scan when
 * the marker count is small. For larger documents the markers can be looked
 * up via a compile-time-emitted Map; deferred to a later sub-phase.
 */
function _scrml_find_if_marker(markerId, scope) {
  // M1 Phase 2/3 — search within scope (default document.body). A soft-nav
  // rehydrate passes the swapped outlet root so a re-invoked if= controller finds
  // the NEW region's marker, never a same-id marker elsewhere.
  const rootNode = (scope && (scope.nodeType === 1 || scope.nodeType === 11)) ? scope : document.body;
  if (!rootNode) return null;
  const needle = "scrml-if-marker:" + markerId;
  const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_COMMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.trim() === needle) return node;
  }
  return null;
}

/**
 * Mount: clone the template content, insert it before the marker
 * comment, and return the inserted root element.
 *
 * The caller is responsible for running any per-mount wiring (event
 * listeners, reactive subscriptions, lifecycle bare-expressions) under the
 * given scopeId. This function does only the DOM insertion; wiring is the
 * compile-time-emitted controller's job.
 *
 * @param {string} markerId — N from scrml-if-marker:N marker comment
 * @param {string} templateId — id of the template element holding the source
 * @returns {HTMLElement|null} — the mounted root element, or null on failure
 */
function _scrml_mount_template(markerId, templateId, scope) {
  const marker = _scrml_find_if_marker(markerId, scope);
  if (!marker || !marker.parentNode) return null;
  const tpl = document.getElementById(templateId);
  if (!tpl || !(tpl.content instanceof DocumentFragment)) return null;
  const fragment = tpl.content.cloneNode(true);
  // The mounted root is the first element child of the cloned fragment.
  // The compile-time emitter is responsible for wrapping the if= element
  // as the sole element child of the <template>.
  const root = fragment.firstElementChild;
  marker.parentNode.insertBefore(fragment, marker);
  return root;
}

/**
 * Unmount: destroy the scope (cleanup LIFO, stop timers, cancel rAF) and
 * remove the mounted root from the DOM.
 *
 * @param {HTMLElement|null} root — node returned by _scrml_mount_template
 * @param {string} scopeId — scope to destroy
 */
function _scrml_unmount_scope(root, scopeId) {
  if (scopeId) _scrml_destroy_scope(scopeId);
  if (root && root.parentNode) root.parentNode.removeChild(root);
}

// ---------------------------------------------------------------------------
// §6.7.5 / §6.7.6 Timer and Poll runtime
// ---------------------------------------------------------------------------

/**
 * Timer registry: scopeId → Map<timerId, { handle, intervalMs, bodyFn, paused }>
 * - handle: the setInterval return value (null when paused)
 * - paused: true when the timer is suspended
 */
const _scrml_timer_registry = new Map();

/**
 * Start an interval timer and register it under scopeId + timerId.
 * Called at element mount time from compiled output.
 *
 * Phase 2 async tick strategy (SPEC-ISSUE-012 safe default):
 *   Queue ticks — if a tick is in-flight, the next tick waits until it completes.
 *
 * @param {string} scopeId — compile-time generated scope identifier
 * @param {string} timerId — compile-time generated or user-supplied id
 * @param {number} intervalMs — tick interval in milliseconds (must be > 0)
 * @param {function} bodyFn — function to call on each tick
 */
function _scrml_timer_start(scopeId, timerId, intervalMs, bodyFn) {
  if (!_scrml_timer_registry.has(scopeId)) {
    _scrml_timer_registry.set(scopeId, new Map());
  }
  const scopeTimers = _scrml_timer_registry.get(scopeId);

  // If a timer with this ID already exists in this scope, stop it first
  if (scopeTimers.has(timerId)) {
    _scrml_timer_stop(scopeId, timerId);
  }

  let tickInFlight = false;

  async function tick() {
    // Queue tick: skip if previous async tick still running
    if (tickInFlight) return;
    tickInFlight = true;
    try {
      const result = bodyFn();
      // If bodyFn returns a Promise (async server call), await it
      if (result && typeof result.then === "function") {
        await result;
      }
    } catch (e) {
      console.error("scrml timer tick error:", e);
    } finally {
      tickInFlight = false;
    }
  }

  const handle = setInterval(tick, intervalMs);

  scopeTimers.set(timerId, { handle, intervalMs, bodyFn, paused: false, tickInFlight: false });
}

/**
 * Stop a timer (clearInterval) and remove it from the registry.
 *
 * @param {string} scopeId
 * @param {string} timerId
 */
function _scrml_timer_stop(scopeId, timerId) {
  const scopeTimers = _scrml_timer_registry.get(scopeId);
  if (!scopeTimers) return;
  const entry = scopeTimers.get(timerId);
  if (!entry) return;
  if (entry.handle !== null) clearInterval(entry.handle);
  scopeTimers.delete(timerId);
  if (scopeTimers.size === 0) _scrml_timer_registry.delete(scopeId);
}

/**
 * Pause a timer (stop the interval but keep the registry entry for resume).
 * In-flight async ticks complete before the timer is considered paused (§EC-3).
 *
 * @param {string} scopeId
 * @param {string} timerId
 */
function _scrml_timer_pause(scopeId, timerId) {
  const scopeTimers = _scrml_timer_registry.get(scopeId);
  if (!scopeTimers) return;
  const entry = scopeTimers.get(timerId);
  if (!entry || entry.paused) return;
  if (entry.handle !== null) clearInterval(entry.handle);
  entry.handle = null;
  entry.paused = true;
}

/**
 * Resume a paused timer. The interval restarts from the moment of resumption
 * (§6.7.5: "does not fire immediately on resume").
 *
 * @param {string} scopeId
 * @param {string} timerId
 */
function _scrml_timer_resume(scopeId, timerId) {
  const scopeTimers = _scrml_timer_registry.get(scopeId);
  if (!scopeTimers) return;
  const entry = scopeTimers.get(timerId);
  if (!entry || !entry.paused) return;

  let tickInFlight = false;

  async function tick() {
    if (tickInFlight) return;
    tickInFlight = true;
    try {
      const result = entry.bodyFn();
      if (result && typeof result.then === "function") await result;
    } catch (e) {
      console.error("scrml timer tick error:", e);
    } finally {
      tickInFlight = false;
    }
  }

  entry.handle = setInterval(tick, entry.intervalMs);
  entry.paused = false;
}

/**
 * Stop all timers for a given scope (called by _scrml_destroy_scope, step 2).
 *
 * @param {string} scopeId
 */
function _scrml_stop_scope_timers(scopeId) {
  const scopeTimers = _scrml_timer_registry.get(scopeId);
  if (!scopeTimers) return;
  for (const [, entry] of scopeTimers) {
    if (entry.handle !== null) clearInterval(entry.handle);
  }
  _scrml_timer_registry.delete(scopeId);
}

// ---------------------------------------------------------------------------
// §6.7.7 animationFrame runtime
// ---------------------------------------------------------------------------

/**
 * Animation frame registry: scopeId → Set<requestId>
 * Tracks pending rAF handles for scope-aware cancellation on destroy.
 */
const _scrml_raf_registry = new Map();

/**
 * Schedule fn via requestAnimationFrame, registering the handle for scope teardown.
 *
 * animationFrame callbacks are NOT reactive subscribers (§6.7.7). Reads of
 * @variables inside the callback return the current value at frame time and
 * do NOT create reactive subscriptions.
 *
 * The global-accessible `animationFrame` function (defined below) delegates to this.
 *
 * @param {function} fn — the frame callback
 * @param {string} [scopeId] — optional scope for cancellation; if absent, global scope
 * @returns {number} the requestAnimationFrame handle
 */
function _scrml_animation_frame(fn, scopeId) {
  const rafId = requestAnimationFrame(fn);
  if (scopeId) {
    if (!_scrml_raf_registry.has(scopeId)) {
      _scrml_raf_registry.set(scopeId, new Set());
    }
    _scrml_raf_registry.get(scopeId).add(rafId);
  }
  return rafId;
}

/**
 * Cancel all pending animation frames for a given scope.
 * Called by _scrml_destroy_scope (step 4).
 *
 * @param {string} scopeId
 */
function _scrml_cancel_animation_frames(scopeId) {
  const rafIds = _scrml_raf_registry.get(scopeId);
  if (!rafIds) return;
  for (const rafId of rafIds) {
    cancelAnimationFrame(rafId);
  }
  _scrml_raf_registry.delete(scopeId);
}

/**
 * animationFrame(fn) — compiler-recognized built-in (§6.7.7).
 *
 * Schedules fn via requestAnimationFrame. When called from compiled scrml code,
 * this function is called directly (since animationFrame is in the KEYWORDS set,
 * compiled output contains `animationFrame(fn)` which calls this runtime function).
 *
 * NOTE: This function does NOT register @variable reactive subscriptions for reads
 * inside the callback. That is by design — animation loops run on frame timing,
 * not on reactive change events.
 *
 * @param {function} fn — the frame callback
 * @returns {number} the requestAnimationFrame handle
 */
function animationFrame(fn) {
  return _scrml_animation_frame(fn);
}

/**
 * Keyed DOM reconciliation for reactive for/lift loops (§6.5 optimization).
 *
 * Instead of clearing innerHTML and rebuilding all children on every reactive
 * update, this function diffs by key: reuses existing DOM nodes for items that
 * are still present, only creates nodes for new items, and removes nodes for
 * deleted items.
 *
 * @param {HTMLElement} container — the wrapper div that holds the list items
 * @param {Array} newItems — the new array of items to render
 * @param {function} keyFn — (item, index) => key — extracts a stable key from each item
 * @param {function} createFn — (item, index) => HTMLElement — creates a DOM node for a new item
 */
function _scrml_reconcile_list(container, newItems, keyFn, createFn) {
  const __t_rec_top = __SCRML_PERF ? __SCRML_PERF_NOW() : 0;
  // Range (comment fence anchor) vs element mode. In range mode the managed
  // children are the nodes strictly between the fence anchors in the shared
  // parent (static siblings before/after untouched); the container still holds the
  // _scrml_item_by_key / tracking expandos in both modes. Element mode delegates to
  // native methods (nested-each path byte-identical).
  const _isRange = !!container && container.nodeType === 8;
  const _parent = _isRange ? container.parentNode : container;
  const _endAnchor = _isRange ? _scrml_each_end(container) : null;
  // Fail-closed: a range mount with no paired end fence (should never happen —
  // fences are always emitted as a pair) would let the range ops walk to the end
  // of the parent and append PAST trailing static siblings, clobbering them. Bail
  // rather than fall through to parent-end operations.
  if (_isRange && !_endAnchor) return;
  const _childList = () => {
    if (!_isRange) return [...container.childNodes];
    const _out = [];
    let n = container.nextSibling;
    while (n && n !== _endAnchor) { _out.push(n); n = n.nextSibling; }
    return _out;
  };
  const _clearAll = () => {
    if (!_isRange) { container.replaceChildren(); return; }
    if (!_parent) return;
    let n = container.nextSibling;
    while (n && n !== _endAnchor) { const _nx = n.nextSibling; _parent.removeChild(n); n = _nx; }
  };
  const _insert = (node, ref) => {
    // Element mode: insertBefore(node, null) === appendChild(node), so a single
    // call preserves the pre-fix behavior (LIS placement always used insertBefore).
    if (!_isRange) { container.insertBefore(node, ref); return; }
    _parent.insertBefore(node, ref || _endAnchor);
  };
  const _remove = (node) => { if (_parent) _parent.removeChild(node); };
  const _replace = (fresh, old) => { if (_parent) _parent.replaceChild(fresh, old); };
  // Defensive: tolerate an undefined / not-yet-initialized collection. The each
  // render fn can run once at module-init BEFORE the source cell's
  // _scrml_reactive_set(...) runs (same-file cell-init ordering), so newItems may
  // be undefined on the first call. Treat absence as the empty list (render
  // nothing); the each effect re-runs this once the cell-init fires. Also covers a
  // non-array value defensively. Without this, the newItems.length read below throws.
  if (!Array.isArray(newItems)) newItems = [];

  // Bug 64 (S159) — per-item content reactivity on reconcile. Build a fresh
  // key->item map on EVERY pass (before any fast-path bail) so per-item effects
  // (live-keyed text / class: / attr interpolation, created inside createFn)
  // resolve the CURRENT item for their create-time key via
  // _scrml_resolve_item(container, key). Without this, a same-key reconcile
  // (array-replace with stable ids, reorder, or the B2 no-op bail) leaves those
  // effects reading a create-time snapshot item — stale content. The map build
  // is O(n) per ACTUAL reconcile pass (same order as the diff itself) and does
  // NOT re-create nodes; Fast-path-B2 below still bails on a no-op.
  // Compute the key for every item ONCE here (the only keyFn pass for this
  // reconcile call). The map build, the B2 same-order check, and the LIS path
  // all reuse this `newKeys` array instead of re-invoking keyFn — so the total
  // keyFn-call count is exactly N per pass, not 2N/3N.
  const _prevItemMap = container._scrml_item_by_key;
  const newLen = newItems.length;
  const newKeys = new Array(newLen);
  const _itemMap = new Map();
  for (let _k = 0; _k < newLen; _k++) {
    const _kk = keyFn(newItems[_k], _k);
    newKeys[_k] = _kk;
    _itemMap.set(_kk, newItems[_k]);
  }
  container._scrml_item_by_key = _itemMap;
  // Re-fire per-item effects subscribed to this container's item slot so reused
  // nodes resolve the new item BY KEY. Skip the very first pass (no prior map):
  // createFn below creates each effect, which runs once on creation. On an
  // array-replace / reorder the array CELL change already re-ran the list effect
  // (which called us); this trigger propagates that to the per-item effects.
  if (_prevItemMap !== undefined) _scrml_trigger(container, "_scrml_items");
  // Fast path: clear all — avoid iterating old nodes one by one
  if (newItems.length === 0) {
    if (__SCRML_PERF) {
      const __t_dw = __SCRML_PERF_NOW();
      _clearAll();
      __SCRML_PERF.dom_write.ms += __SCRML_PERF_NOW() - __t_dw;
      __SCRML_PERF.dom_write.count++;
      __SCRML_PERF.reconcile_list.ms += __SCRML_PERF_NOW() - __t_rec_top;
      __SCRML_PERF.reconcile_list.count++;
      return;
    }
    _clearAll();
    return;
  }

  // Pause dependency tracking for the rest of this function.
  // The list effect only needs to depend on the array itself (already tracked
  // by the _scrml_reactive_get("todos") call in the render function).
  // Without this, every item.id access through the Proxy adds a tracked dep,
  // causing O(n) subscription cleanup/rebuild on every update.
  const wasPaused = _scrml_tracking_paused;
  _scrml_tracking_paused = true;

  try {

  // SSR DOM-adoption (first reconcile only, §52.8 A-terminus D2). On the very
  // first reconcile for a container the mount may already hold server-rendered
  // rows (SSR D1): each row's ROOT element carries a data-scrml-key HTML
  // ATTRIBUTE but has NO _scrml_key JS property (that property is set only on
  // createFn-built nodes) and NO event listeners / reactive effects. We ADOPT
  // those server nodes into the keyed diff so they get UPGRADED IN PLACE below
  // (a fresh interactive node swapped into the same slot) instead of wiped —
  // this is what kills the SSR client-rebuild double-render. _prevItemMap ===
  // undefined is exactly the first-reconcile signal (container._scrml_item_by_key
  // is written at the top of this fn, so it is undefined only on pass 1); a
  // client-only each with an empty mount adopts nothing and stays byte-identical.
  //
  // KEY-TYPE NORMALIZATION (correctness-critical): the server attribute value is
  // always a STRING ("42"); the client keyFn may return a NUMBER (42) or other
  // type. We resolve this ONCE, here, by mapping each adopted server node back to
  // the correctly-typed client key via String(clientKey) === attr, then storing
  // that CLIENT-typed key as the node's _scrml_key. So oldNodes and every
  // downstream lookup stay byte-identical to the steady-state path — no coercion
  // leaks past this block. A server node whose key is absent from the client list
  // keeps its raw string key (never matched) and is removed by the normal diff.
  let adoptedAny = false;
  if (_prevItemMap === undefined) {
    let _ssrSeen = false;
    for (const child of _childList()) {
      if (child.nodeType === 1 && child._scrml_key === undefined
          && child.getAttribute?.("data-scrml-key") != null) { _ssrSeen = true; break; }
    }
    if (_ssrSeen) {
      const _strToClient = new Map();
      for (let _s = 0; _s < newLen; _s++) _strToClient.set(String(newKeys[_s]), newKeys[_s]);
      for (const child of _childList()) {
        if (child.nodeType !== 1 || child._scrml_key !== undefined) continue;
        const _attrKey = child.getAttribute?.("data-scrml-key");
        if (_attrKey == null) continue;
        child._scrml_key = _strToClient.has(_attrKey) ? _strToClient.get(_attrKey) : _attrKey;
        child._scrml_ssr_adopt = true;
        adoptedAny = true;
      }
    }
  }

  const oldNodes = new Map();
  for (const child of _childList()) {
    const key = child._scrml_key;
    if (key !== undefined) oldNodes.set(key, child);
  }

  // Fast path: bulk create from empty — skip diffing, append directly
  if (oldNodes.size === 0) {
    // 6nz Bug AI — clear any stray NON-keyed content before bulk-appending.
    // oldNodes.size === 0 means this container holds ZERO keyed reconcile
    // children, so anything currently in it is stray: the <empty> fallback left
    // by the each render fn's empty branch (replaceChildren + append fallback +
    // return) on the empty -> non-empty edge, or nothing at all on first render.
    // Without this, the fallback survives beside the first real items. The keyed
    // reconcile path below (oldNodes.size > 0) is NOT affected — it owns its
    // keyed nodes and is reached only when keyed children already exist.
    _clearAll();
    if (__SCRML_PERF) {
      for (let i = 0; i < newItems.length; i++) {
        const node = createFn(newItems[i], i);
        if (!node) continue; // createFn returned undefined (filtered item)
        node._scrml_key = newKeys[i];
        const __t_dw = __SCRML_PERF_NOW();
        _insert(node, null);
        __SCRML_PERF.dom_write.ms += __SCRML_PERF_NOW() - __t_dw;
        __SCRML_PERF.dom_write.count++;
      }
      return;
    }
    for (let i = 0; i < newItems.length; i++) {
      const node = createFn(newItems[i], i);
      if (!node) continue; // createFn returned undefined (filtered item)
      node._scrml_key = newKeys[i];
      _insert(node, null);
    }
    return;
  }

  // Fast path B2 (S106 — same keys in same order): partial-update happy path.
  // When in-place mutations (e.g. toggling .completed on existing rows) leave
  // the key sequence unchanged, skip the LIS pipeline entirely. Per-row effects
  // fire separately via _scrml_prop_subscribers; this function only needs to
  // confirm DOM ordering matches and bail.
  // Single forward pass; bails on first mismatch; allocates nothing on hit.
  // Guard: when this pass ADOPTED server nodes, do NOT take the B2 no-op bail
  // (the adopted keys already match newKeys in order, so B2 would leave the
  // un-upgraded server nodes in place). Fall through to the diff so each
  // adopted node gets its in-place upgrade. Post-hydration passes hit B2 normally.
  if (newItems.length === oldNodes.size && !adoptedAny) {
    let i = 0;
    let sameOrder = true;
    for (const child of _childList()) {
      if (child._scrml_key === undefined) continue;
      if (i >= newItems.length) { sameOrder = false; break; }
      if (newKeys[i] !== child._scrml_key) { sameOrder = false; break; }
      i++;
    }
    if (sameOrder && i === newItems.length) {
      // All keys match in order — no LIS, no DOM moves. (finally block bumps perf.)
      return;
    }
  }

  const newKeySet = new Set(newKeys);
  // Remove nodes whose keys are no longer present
  if (__SCRML_PERF) {
    for (const [key, node] of oldNodes) {
      if (!newKeySet.has(key)) {
        const __t_dw = __SCRML_PERF_NOW();
        _remove(node);
        __SCRML_PERF.dom_write.ms += __SCRML_PERF_NOW() - __t_dw;
        __SCRML_PERF.dom_write.count++;
      }
    }
  } else {
    for (const [key, node] of oldNodes) {
      if (!newKeySet.has(key)) _remove(node);
    }
  }

  // Build old key→position map for LIS computation
  const oldKeyPos = new Map();
  let pos = 0;
  for (const child of _childList()) {
    if (child._scrml_key !== undefined) oldKeyPos.set(child._scrml_key, pos++);
  }

  // Build the desired node array and compute old positions for existing nodes
  const newNodes = new Array(newLen);
  const oldPositions = new Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const key = newKeys[i];
    let node = oldNodes.get(key);
    if (!node) {
      node = createFn(newItems[i], i);
      if (!node) { oldPositions[i] = -2; newNodes[i] = null; continue; } // filtered item
      node._scrml_key = key;
      oldPositions[i] = -1; // new node, no old position
    } else {
      if (node._scrml_ssr_adopt === true) {
        // Hydration upgrade: this node was server-rendered (adopted above) and
        // has NO event listeners / reactive effects. Build a fresh interactive
        // node and swap it into the server node's exact DOM slot — the mount is
        // never emptied, and (identical content) there is no visible flash.
        const _skey = node.getAttribute?.("data-scrml-key");
        const _fresh = createFn(newItems[i], i);
        if (!_fresh) { _remove(node); oldPositions[i] = -2; newNodes[i] = null; continue; } // createFn filtered this item
        _fresh._scrml_key = key;
        // Preserve the server-origin key marker so the upgraded row stays a
        // faithful in-place continuation of the server row. Client-only rows
        // never carry data-scrml-key — its presence marks a server-rendered,
        // adopted-then-upgraded row (honestly absent on post-hydration new rows).
        if (_skey != null && _fresh.nodeType === 1) _fresh.setAttribute("data-scrml-key", _skey);
        _replace(_fresh, node);
        node = _fresh;
      }
      oldPositions[i] = oldKeyPos.get(key) ?? -1;
    }
    newNodes[i] = node;
  }

  // Compute Longest Increasing Subsequence of old positions.
  // Nodes in the LIS are already in correct relative order — don't move them.
  // Only move nodes NOT in the LIS.
  const lisIndices = _scrml_lis(oldPositions);
  const inLIS = new Set(lisIndices);

  // Place nodes: iterate in reverse so insertBefore targets are stable
  let nextSibling = null;
  if (__SCRML_PERF) {
    for (let i = newLen - 1; i >= 0; i--) {
      const node = newNodes[i];
      if (!node) continue; // filtered item (createFn returned undefined)
      if (!inLIS.has(i)) {
        const __t_dw = __SCRML_PERF_NOW();
        _insert(node, nextSibling);
        __SCRML_PERF.dom_write.ms += __SCRML_PERF_NOW() - __t_dw;
        __SCRML_PERF.dom_write.count++;
      }
      nextSibling = node;
    }
  } else {
    for (let i = newLen - 1; i >= 0; i--) {
      const node = newNodes[i];
      if (!node) continue; // filtered item (createFn returned undefined)
      if (!inLIS.has(i)) {
        _insert(node, nextSibling);
      }
      nextSibling = node;
    }
  }

  } finally {
    _scrml_tracking_paused = wasPaused;
    if (__SCRML_PERF) {
      __SCRML_PERF.reconcile_list.ms += __SCRML_PERF_NOW() - __t_rec_top;
      __SCRML_PERF.reconcile_list.count++;
    }
  }
}

// Approach A-unified (g-each-mount-div-foster-parented-in-table): the top-level
// <each> mounts as a parse-safe two-comment fence `<!--scrml-each:N-->…<!--/scrml-each:N-->`
// (foster-safe in every insertion mode, unlike the old <div data-scrml-each-mount>);
// rows are inserted as SIBLINGS between the anchors in the each's real parent. A
// NESTED each still mounts as a runtime <div> (immune), so these helpers are
// polymorphic: comment anchor (nodeType 8) → fence range; element → native methods.
// They live in the 'reconciliation' chunk (only ships when the app uses a list), so
// a list-free app pays nothing. Function decls hoist, so _scrml_reconcile_list above
// may call _scrml_each_end before its textual definition here.

// Paired end anchor `<!--/scrml-each:N-->` for a start anchor (cached per node).
function _scrml_each_end(start) {
  if (!start || start.nodeType !== 8) return null;
  const _cached = start._scrml_each_end_node;
  if (_cached && _cached.parentNode === start.parentNode) return _cached;
  const _want = "/" + String(start.data || "").trim();
  let n = start.nextSibling;
  while (n) {
    if (n.nodeType === 8 && String(n.data || "").trim() === _want) {
      start._scrml_each_end_node = n;
      return n;
    }
    n = n.nextSibling;
  }
  return null;
}

// Per-each-id cache of the START fence anchor node. The anchor is a parse-time
// comment that never moves, so a hot-path reconcile (per-keystroke list filter)
// is a cache hit — no full-document SHOW_COMMENT walk per update. Guarded by
// isConnected: on engine/match-arm re-entry the arm's innerHTML replaces the
// fence → the cached node goes !isConnected → exactly one re-walk + re-cache
// (preserves S153 remount correctness).
const _scrml_each_anchor_cache = new Map();

// Find the START fence anchor for each id N (comments are invisible to
// querySelector; mirrors _scrml_find_if_marker). root: document or element subtree.
function _scrml_find_each_anchor(root, id) {
  const _cached = _scrml_each_anchor_cache.get(id);
  if (_cached && _cached.isConnected) return _cached;
  const _want = "scrml-each:" + id;
  const _doc = (root && root.nodeType === 9) ? root
    : (root && root.ownerDocument) ? root.ownerDocument
    : (typeof document !== "undefined" ? document : null);
  if (!_doc || typeof _doc.createTreeWalker !== "function") return null;
  const _walker = _doc.createTreeWalker(root || _doc, NodeFilter.SHOW_COMMENT);
  let node;
  while ((node = _walker.nextNode())) {
    if (String(node.data || "").trim() === _want) { _scrml_each_anchor_cache.set(id, node); return node; }
  }
  return null;
}

// Clear the each mount — comment anchor: remove the fence range; element: replaceChildren.
function _scrml_each_clear(mount) {
  if (mount && mount.nodeType === 8) {
    const _end = _scrml_each_end(mount);
    const _parent = mount.parentNode;
    if (!_parent) return;
    let n = mount.nextSibling;
    while (n && n !== _end) { const _nx = n.nextSibling; _parent.removeChild(n); n = _nx; }
    return;
  }
  if (mount && typeof mount.replaceChildren === "function") mount.replaceChildren();
}

// Append into the each mount — comment anchor: insert before end fence; element: appendChild.
function _scrml_each_append(mount, node) {
  if (mount && mount.nodeType === 8) {
    const _end = _scrml_each_end(mount);
    const _parent = mount.parentNode;
    if (!_parent) return;
    _parent.insertBefore(node, _end);
    return;
  }
  if (mount && typeof mount.appendChild === "function") mount.appendChild(node);
}

/**
 * Bug 64 (S159) — resolve the CURRENT item for a reconciled list node by its
 * stable create-time key. Per-item content bindings (live-keyed text / class: /
 * attr interpolation) call this on every effect run instead of closing over the
 * create-time `item` argument, so a same-key reconcile (array-replace with
 * stable ids, or reorder) reflects the new data for that key.
 *
 * The `_scrml_track(container, "_scrml_items")` read establishes a dependency on
 * the container's item slot: `_scrml_reconcile_list` triggers it after rebuilding
 * the key->item map, so this effect re-fires and re-resolves. Reading a field of
 * the resolved item (through the reactive Proxy) ALSO subscribes the effect to
 * that field, so an in-place field mutation re-fires it directly — no reconcile
 * needed. Returns null if the key is gone (the node is being removed).
 *
 * @param {HTMLElement} container — the reconcile wrapper holding _scrml_item_by_key
 * @param {*} key — the node's create-time key (keyFn output)
 * @returns {*} the live item for that key, or null (canonical absence)
 */
function _scrml_resolve_item(container, key) {
  _scrml_track(container, "_scrml_items");
  const _m = container._scrml_item_by_key;
  // Canonical compiled-output absence is null (SPEC §42.5) — never the JS
  // `undefined` keyword. The per-item effect guards with `=== null` (the
  // W-CG-UNDEFINED-INTERPOLATION lint forbids `undefined` in emitted JS).
  if (!_m) return null;
  const _v = _m.get(key);
  if (_v === undefined) return null;
  // Return the item as a deep-reactive Proxy so the per-item effect's field
  // reads (`item.label`, `item.active`) go through the get trap and subscribe to
  // `(rawItem, field)` — making in-place field mutation (`@coll[i].f = x`) re-
  // fire the effect. _items passed to _scrml_reconcile_list is the RAW cell value
  // (reactive wrapping is lazy), so without this wrap the stored item is raw and
  // field reads never trap. _scrml_deep_reactive is identity-stable per backing
  // object (proxy cache), so subscriptions + mutation triggers target the same
  // raw object.
  return _scrml_deep_reactive(_v);
}

/**
 * Compute the indices of the Longest Increasing Subsequence.
 * Used by reconcile_list to minimize DOM moves.
 * Ignores -1 values (new nodes with no old position).
 *
 * @param {number[]} arr — array of old positions
 * @returns {number[]} — indices into arr that form the LIS
 */
function _scrml_lis(arr) {
  const len = arr.length;
  if (len === 0) return [];

  // tails[i] = index in arr of smallest tail element for increasing subseq of length i+1
  const tails = [];
  // pred[i] = index of predecessor of arr[i] in the LIS
  const pred = new Array(len);

  for (let i = 0; i < len; i++) {
    if (arr[i] === -1) continue; // skip new nodes

    // Binary search for the position where arr[i] should go
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[tails[mid]] < arr[i]) lo = mid + 1; else hi = mid;
    }

    if (lo > 0) pred[i] = tails[lo - 1];
    tails[lo] = i;
  }

  // Reconstruct the LIS indices
  const result = new Array(tails.length);
  let k = tails[tails.length - 1];
  for (let i = result.length - 1; i >= 0; i--) {
    result[i] = k;
    k = pred[k];
  }
  return result;
}

// ---------------------------------------------------------------------------
// engine-gated-each-populate (S153) — each-renderer registry + arm-entry remount.
//
// An <each> whose mount lives inside a NON-`initial=` engine arm is absent from
// the DOM at module-init (the engine renders only the `initial=` arm). The each
// render fn (`_scrml_each_render_N`) registers itself here at module-init keyed
// by its mount id (`each_N`). When an arm later mounts (engine dispatcher writes
// the arm's innerHTML), `_scrml_remount_each(armRoot)` walks the freshly-inserted
// subtree and re-invokes the renderer for every each-mount it finds. The render
// fn's reactive dep was already established at module-init (the dep-first read in
// emit-each.ts runs even when the mount is absent), so re-invoking here renders
// the now-present mount WITHOUT re-subscribing — calling the render fn directly
// (not its `_scrml_effect_static` wrapper) means no new dep edge / no leak. This
// also makes re-entry (Loading->Browsing->Loading->Browsing) idempotent: each
// entry re-renders from the live cell; ongoing mutations while the arm is visible
// re-render via the existing effect subscription.
//
// The SHOW_COMMENT walk in _scrml_remount_each finds each fence anchor at any
// depth inside the arm body (top-level each within the arm). Reusable by any
// dynamic-HTML insertion site (engine arm-entry today; match-block dispatch too).
const _scrml_each_renderers = {};

function _scrml_remount_each(root) {
  if (!root) return;
  // The static each mount is a comment FENCE (invisible to querySelectorAll), so
  // walk SHOW_COMMENT nodes and re-invoke the registered renderer for every START
  // anchor in the freshly-mounted subtree (end anchor "/…" skipped by prefix guard).
  const _doc = (root.nodeType === 9) ? root
    : (root.ownerDocument) ? root.ownerDocument
    : (typeof document !== "undefined" ? document : null);
  if (!_doc || typeof _doc.createTreeWalker !== "function") return;
  const _walker = _doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const _seen = new Set();
  let _node;
  while ((_node = _walker.nextNode())) {
    const _d = String(_node.data || "").trim();
    if (_d.indexOf("scrml-each:") !== 0) continue;
    const _id = "each_" + _d.slice("scrml-each:".length);
    if (_seen.has(_id)) continue;
    _seen.add(_id);
    const _fn = _scrml_each_renderers[_id];
    if (typeof _fn === "function") _fn();
  }
}

// §40.9.7 chunk mount registry (chunk: 'mount')
// ---------------------------------------------------------------------------
//
// Called from the per-(EP, role, tier) chunk file's IIFE for every admitted
// markup node (atom-emitter.ts:emitComponentAtom). Records the per-chunk
// admission set on the global `_SCRML_MOUNTS` registry for adopter-debug
// surfaces and downstream runtime instrumentation.
//
// In v0.3 the actual DOM-tree construction is performed by the per-file
// `.html` payload (`emit-html.ts` renders the static markup tree directly).
// This helper is the chunk-side record-keeping pair: it observes which
// markup nodes belong to the chunk so adopter tooling (debug overlays,
// reachability inspectors) can map chunk → admitted markup. The helper is
// intentionally a no-op-friendly shape (assignment only; no DOM mutation,
// no event dispatch) so adopters pay zero production overhead per §40.9.7
// SHOULD on chunk-side instrumentation cost.
//
// Tree-shake (chunk: 'mount'): when no chunks are emitted for the compile
// unit (the dominant pre-A-4 case), the atom-emitter produces no
// `_scrml_chunk_mount(...)` references and `detectRuntimeChunks` does NOT
// add 'mount' to `ctx.usedRuntimeChunks`. The helper is elided from
// per-file embed-mode runtimes; in full-runtime mode (`scrml-runtime.js`)
// it ships unconditionally.

var _SCRML_MOUNTS = (typeof _SCRML_MOUNTS !== "undefined")
  ? _SCRML_MOUNTS
  : Object.create(null);

function _scrml_chunk_mount(id, tag) {
  _SCRML_MOUNTS[id] = tag;
}

// ---------------------------------------------------------------------------
// --- Transition CSS injection (§38 transition directives) ---
// Inject transition keyframes and classes into the document head once.
(function() {
  if (typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = [
    "@keyframes scrml-fade-in { from { opacity: 0 } to { opacity: 1 } }",
    "@keyframes scrml-fade-out { from { opacity: 1 } to { opacity: 0 } }",
    ".scrml-enter-fade { animation: scrml-fade-in 300ms ease }",
    ".scrml-exit-fade { animation: scrml-fade-out 300ms ease }",
    "@keyframes scrml-slide-in { from { transform: translateY(-20px); opacity: 0 } to { transform: none; opacity: 1 } }",
    "@keyframes scrml-slide-out { from { transform: none; opacity: 1 } to { transform: translateY(-20px); opacity: 0 } }",
    ".scrml-enter-slide { animation: scrml-slide-in 300ms ease }",
    ".scrml-exit-slide { animation: scrml-slide-out 300ms ease }",
    "@keyframes scrml-fly-in { from { transform: translateX(-100%); opacity: 0 } to { transform: none; opacity: 1 } }",
    "@keyframes scrml-fly-out { from { transform: none; opacity: 1 } to { transform: translateX(100%); opacity: 0 } }",
    ".scrml-enter-fly { animation: scrml-fly-in 300ms ease }",
    ".scrml-exit-fly { animation: scrml-fly-out 300ms ease }",
  ].join("\n");
  document.head.appendChild(style);
})();

// --- §19 Built-in error types ---
// Each error type is a class extending Error with .type and .cause fields.
// The .type field stores the type name as a string for serialization and
// arm pattern matching across the server/client boundary.

class _ScrmlError extends Error {
  constructor(message, opts) {
    super(message ?? "An error occurred");
    this.cause = opts?.cause ?? null;
    // .name and .type set by subclass
  }
}

class NetworkError extends _ScrmlError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "NetworkError";
    this.type = "NetworkError";
  }
}

class ValidationError extends _ScrmlError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "ValidationError";
    this.type = "ValidationError";
  }
}

class SQLError extends _ScrmlError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "SQLError";
    this.type = "SQLError";
  }
}

class AuthError extends _ScrmlError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "AuthError";
    this.type = "AuthError";
  }
}

class TimeoutError extends _ScrmlError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "TimeoutError";
    this.type = "TimeoutError";
  }
}

class ParseError extends _ScrmlError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "ParseError";
    this.type = "ParseError";
  }
}

class NotFoundError extends _ScrmlError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "NotFoundError";
    this.type = "NotFoundError";
  }
}

class ConflictError extends _ScrmlError {
  constructor(message, opts) {
    super(message, opts);
    this.name = "ConflictError";
    this.type = "ConflictError";
  }
}

// ---------------------------------------------------------------------------
// §19.6 / §19.6.8 — errorBoundary runtime support.
//
// The compiler emits the per-binding catch + variant-dispatch inline (see
// emit-event-wiring.ts); this helper provides the loud, non-swallowing logging
// the §19.6.8 B5 backstop requires. It NEVER throws and NEVER hides the error —
// it only reports. The decision to render fallback / re-propagate is made by
// the emitted dispatch, not here.
// ---------------------------------------------------------------------------

function _scrml_error_boundary_log(boundaryId, err) {
  if (typeof console === "undefined") return;
  // A typed scrml '!'-error envelope { __scrml_error, type, variant, data } vs.
  // a host throw — report both shapes loudly with the boundary id for context.
  if (err && typeof err === "object" && err.__scrml_error) {
    if (typeof console.error === "function") {
      console.error(
        "[scrml errorBoundary " + boundaryId + "] caught error variant " +
        (err.type || "Error") + "::" + (err.variant || "?"),
        err,
      );
    }
  } else {
    if (typeof console.error === "function") {
      console.error(
        "[scrml errorBoundary " + boundaryId + "] caught non-! runtime error (host backstop, §19.6.8)",
        err,
      );
    }
  }
}

// §19.6.8 B3 — wrap an uncaught typed error variant (no 'renders', no
// 'fallback') into a host Error so the throw propagates to the nearest
// enclosing boundary's host-JS backstop (inner-catches-first, §19.6.4). The
// wrapped Error carries the original envelope on '.scrmlError' so a debugger /
// log sees the variant. E-ERROR-005 (§19.6.6) makes this path statically
// unreachable for well-typed code; it exists only as the runtime tail of the
// C-hybrid model when an enclosing boundary CAN render the variant.
function _scrml_error_boundary_uncaught(envelope) {
  var msg = "scrml errorBoundary: error variant " +
    ((envelope && envelope.type) || "Error") + "::" +
    ((envelope && envelope.variant) || "?") +
    " has no 'renders' clause and the boundary has no 'fallback' (propagating, §19.6.8 B3)";
  var e = new Error(msg);
  e.scrmlError = envelope;
  return e;
}

// ---------------------------------------------------------------------------
// §45 Structural equality — deep value comparison for structs and enums
// ---------------------------------------------------------------------------

function _scrml_structural_eq(a, b, seen) {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;
  // Cycle guard: value-cycles are FORBIDDEN in scrml (§6.5.1 reassignment-
  // canonical), but a malformed JS-host value reaching == could still carry
  // one. Track visited (a, b) pairs so a revisit terminates instead of
  // stack-overflowing. seen maps each a-object to the WeakSet of b-objects
  // already compared against it. The standard structural-eq cycle convention
  // is assume-equal-on-revisit: the only way to reach a matching (a, b)
  // revisit is a structurally-matching cyclic shape.
  if (seen === undefined) seen = new WeakMap();
  let seenBs = seen.get(a);
  if (seenBs === undefined) {
    seenBs = new WeakSet();
    seen.set(a, seenBs);
  } else if (seenBs.has(b)) {
    return true;
  }
  seenBs.add(b);
  // Array comparison (for tuple-like fields)
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!_scrml_structural_eq(a[i], b[i], seen)) return false;
    }
    return true;
  }
  // §59 Value-native map: order-INDEPENDENT structural equality (§59.9). Two
  // maps are equal iff they have the same canonical-key set with structurally-
  // equal values, regardless of insertion / iteration order. This holds EVEN
  // for @ordered maps — == ignores order (the `order` sidecar is NOT compared);
  // @ordered governs iteration, not equality. Gate on the __scrml_map tag FIRST
  // so non-map values fall through to the array / enum / struct branches with
  // their existing behavior unchanged.
  if (a.__scrml_map === true || b.__scrml_map === true) {
    if (a.__scrml_map !== true || b.__scrml_map !== true) return false;
    var aEntries = a.entries;
    var bEntries = b.entries;
    var aMapKeys = Object.keys(aEntries);
    var bMapKeys = Object.keys(bEntries);
    if (aMapKeys.length !== bMapKeys.length) return false;
    for (var mk = 0; mk < aMapKeys.length; mk++) {
      var ckey = aMapKeys[mk];
      // Same canonical-key set (canonical strings are collision-free for
      // distinct values, §59.5 — so key-string presence IS key-identity).
      if (!Object.prototype.hasOwnProperty.call(bEntries, ckey)) return false;
      if (!_scrml_structural_eq(aEntries[ckey].v, bEntries[ckey].v, seen)) return false;
    }
    return true;
  }
  // Enum: compare tag + payload
  if (a._tag !== undefined && b._tag !== undefined) {
    if (a._tag !== b._tag) return false;
    // Unit variant (no payload beyond _tag)
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (key === "_tag") continue;
      if (!_scrml_structural_eq(a[key], b[key], seen)) return false;
    }
    return true;
  }
  // Struct: field-by-field comparison
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!_scrml_structural_eq(a[key], b[key], seen)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Fine-grained reactivity primitives (Reactivity Phase 1)
// ---------------------------------------------------------------------------

/**
 * Effect tracking context stack.
 * Each entry is { deps: Map<target, Set<prop>> } where target is a reactive proxy's
 * backing object and prop is the property name read during the effect.
 */
const _scrml_effect_stack = [];

/**
 * WeakMap from backing object → Map<prop, Set<effectFn>>
 * Tracks which effects depend on which properties of which objects.
 */
const _scrml_prop_subscribers = new WeakMap();

/**
 * WeakMap from backing object → Proxy. Ensures we return the same Proxy for the
 * same object (identity stability).
 */
const _scrml_proxy_cache = new WeakMap();

/**
 * WeakMap from Proxy → backing object. Used by _scrml_deep_reactive to unwrap
 * if a Proxy is passed in.
 */
const _scrml_proxy_targets = new WeakMap();

/**
 * Track a property read for the current effect context.
 * @param {object} target — the backing object
 * @param {string|symbol} prop — the property key
 */
let _scrml_tracking_paused = false;

function _scrml_track(target, prop) {
  if (_scrml_tracking_paused) return;
  if (_scrml_effect_stack.length === 0) return;
  const current = _scrml_effect_stack[_scrml_effect_stack.length - 1];
  if (!current.deps.has(target)) current.deps.set(target, new Set());
  current.deps.get(target).add(prop);
}

/**
 * Run fn without tracking property reads.
 * Used by reconcile_list to avoid tracking every item.id access
 * in the key extraction loop — the list only needs to track the
 * array itself, not individual item properties.
 */
function _scrml_untracked(fn) {
  _scrml_tracking_paused = true;
  try { return fn(); } finally { _scrml_tracking_paused = false; }
}

/**
 * Trigger all effects that depend on target[prop].
 * @param {object} target — the backing object
 * @param {string|symbol} prop — the property key
 */
function _scrml_trigger(target, prop) {
  const propMap = _scrml_prop_subscribers.get(target);
  if (!propMap) return;
  const effects = propMap.get(prop);
  if (!effects) return;
  // Copy to avoid mutation during iteration.
  // Each effect is wrapped in try/catch so that a throwing effect (e.g. a
  // derived expression that evaluates null.property) does not halt the
  // trigger loop or propagate up to the reactive-set caller — Bug K.
  if (__SCRML_PERF) {
    const __t_eff = __SCRML_PERF_NOW();
    for (const effect of [...effects]) {
      try { effect(); } catch(e) { console.error("scrml effect error:", e); }
    }
    __SCRML_PERF.effect_scheduling.ms += __SCRML_PERF_NOW() - __t_eff;
    __SCRML_PERF.effect_scheduling.count++;
    return;
  }
  for (const effect of [...effects]) {
    try { effect(); } catch(e) { console.error("scrml effect error:", e); }
  }
}


/**
 * Array methods that mutate and should trigger reactivity.
 */
const _scrml_array_mutators = new Set([
  "push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill", "copyWithin"
]);

/**
 * Wrap an object or array in a deep reactive Proxy.
 *
 * - Property reads track dependencies for the current effect
 * - Property writes trigger only effects that read THAT property
 * - Nested objects are lazily wrapped on access
 * - Array mutating methods (push/pop/splice/etc.) trigger via Proxy set trap
 *
 * @param {*} value — the value to wrap
 * @returns {*} — Proxy-wrapped if object/array, otherwise the value unchanged
 */
function _scrml_deep_reactive(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  // Unwrap if already a proxy
  const unwrapped = _scrml_proxy_targets.get(value);
  if (unwrapped) return value; // already a proxy, return as-is

  // Return cached proxy if we already wrapped this object
  if (_scrml_proxy_cache.has(value)) return _scrml_proxy_cache.get(value);

  const proxy = new Proxy(value, {
    get(target, prop, receiver) {
      // Track the read
      if (typeof prop === "string" || typeof prop === "symbol") {
        _scrml_track(target, prop);
      }

      const val = Reflect.get(target, prop, receiver);

      // For array mutating methods, return a wrapped version that triggers "length"
      if (Array.isArray(target) && typeof prop === "string" && _scrml_array_mutators.has(prop) && typeof val === "function") {
        return function(...args) {
          const result = val.apply(target, args);
          // Trigger length and the array itself to notify effects
          _scrml_trigger(target, "length");
          _scrml_trigger(target, prop);
          return result;
        };
      }

      // Lazily wrap nested objects
      if (val !== null && typeof val === "object" && !_scrml_proxy_targets.has(val)) {
        return _scrml_deep_reactive(val);
      }

      return val;
    },

    set(target, prop, newValue, receiver) {
      const oldValue = target[prop];
      const result = Reflect.set(target, prop, newValue, receiver);
      if (oldValue !== newValue) {
        _scrml_trigger(target, prop);
        // For arrays, setting an index also changes length conceptually
        if (Array.isArray(target) && typeof prop === "string" && /^\d+$/.test(prop)) {
          _scrml_trigger(target, "length");
        }
      }
      return result;
    },

    deleteProperty(target, prop) {
      const had = prop in target;
      const result = Reflect.deleteProperty(target, prop);
      if (had) {
        _scrml_trigger(target, prop);
      }
      return result;
    },
  });

  _scrml_proxy_cache.set(value, proxy);
  _scrml_proxy_targets.set(proxy, value);
  return proxy;
}

// §20.8.2 Client-Router region reactivity (navigate-wave1b, findings #1/#2).
//
// Disposers for reactive-display effects bound to elements INSIDE the persistent
// shell's outlet. The soft-nav rehydrator wires the outlet's display effects
// through _scrml_region_track(el, _scrml_effect(fn)) instead of the bare form, so each
// outlet-region effect's disposer lands here; _scrml_teardown_region drains + runs
// the list before the next swap (no leak, no double-update). Shell effects
// (outside the outlet) go through the bare _scrml_effect and persist. A page with
// no outlet never registers anything (the closest() check fails).
var _scrml_region_cleanups = [];

// Track a reactive-display effect's disposer for region teardown WHEN its target
// element is inside the shell outlet. Wraps the disposer returned by a bare
// _scrml_effect(fn) (the codegen emits _scrml_region_track(el, _scrml_effect(fn)),
// preserving the _scrml_effect(fn) shape) so the next soft-nav swap can dispose it
// (no leak / no double-update). Shell effects (element outside the outlet) fail
// the closest() check and are left untracked so they persist. Returns the
// disposer unchanged.
function _scrml_region_track(el, dispose) {
  if (el && typeof el.closest === "function" && el.closest("[data-scrml-outlet]")) {
    _scrml_region_cleanups.push(dispose);
  }
  return dispose;
}

/**
 * Create a reactive effect that auto-tracks property-level dependencies.
 *
 * Runs fn immediately, recording which reactive properties it reads.
 * When any tracked property changes, fn is re-run (after clearing old deps).
 *
 * Supports nested effects — inner effects don't leak deps to outer.
 *
 * @param {function} fn — the effect function
 * @returns {function} dispose — call to stop the effect and clean up subscriptions
 */
function _scrml_effect(fn) {
  let disposed = false;
  let cleanupEntries = []; // Array of { target, prop } for subscriber removal

  function effectFn() {
    if (disposed) return;

    // Remove old subscriptions
    for (const entry of cleanupEntries) {
      const propMap = _scrml_prop_subscribers.get(entry.target);
      if (propMap) {
        const effects = propMap.get(entry.prop);
        if (effects) effects.delete(effectFn);
      }
    }
    cleanupEntries = [];

    // Push tracking context
    const ctx = { deps: new Map() };
    _scrml_effect_stack.push(ctx);

    // S139 Bug 11 (6nz-V class-binding on for-lift) fix — each _scrml_effect
    // owns its own tracking scope; un-pause around fn() so a paused outer
    // caller (e.g. _scrml_reconcile_list setting _scrml_tracking_paused=true
    // to suppress Proxy item.id reads from leaking onto the outer effect's
    // deps) does NOT silently swallow the nested effect's own dependency
    // tracking. Without this, per-item attribute-interpolation effects
    // registered during reconcile never subscribe and never re-fire.
    const wasPaused = _scrml_tracking_paused;
    _scrml_tracking_paused = false;
    try {
      fn();
    } finally {
      _scrml_tracking_paused = wasPaused;
      _scrml_effect_stack.pop();
    }

    // Subscribe to all tracked properties
    for (const [target, props] of ctx.deps) {
      if (!_scrml_prop_subscribers.has(target)) {
        _scrml_prop_subscribers.set(target, new Map());
      }
      const propMap = _scrml_prop_subscribers.get(target);
      for (const prop of props) {
        if (!propMap.has(prop)) propMap.set(prop, new Set());
        propMap.get(prop).add(effectFn);
        cleanupEntries.push({ target, prop });
      }
    }
  }

  // Initial run
  effectFn();

  // Return dispose function
  return function dispose() {
    disposed = true;
    for (const entry of cleanupEntries) {
      const propMap = _scrml_prop_subscribers.get(entry.target);
      if (propMap) {
        const effects = propMap.get(entry.prop);
        if (effects) effects.delete(effectFn);
      }
    }
    cleanupEntries = [];
  };
}

/**
 * Static effect — like _scrml_effect but deps are tracked only on the first run.
 * Subsequent re-runs skip the cleanup/re-track/re-subscribe cycle entirely.
 * Use for effects that always read the same reactive properties (e.g. list reconcile).
 * DO NOT use for effects with conditional deps.
 */
function _scrml_effect_static(fn) {
  let disposed = false;
  let cleanupEntries = [];
  let hasRun = false;

  function effectFn() {
    if (disposed) return;

    if (hasRun) {
      fn();
      return;
    }

    const ctx = { deps: new Map() };
    _scrml_effect_stack.push(ctx);
    // S139 Bug 11 (6nz-V) fix — symmetric with _scrml_effect: each effect
    // owns its own tracking scope; un-pause around fn() so a paused outer
    // caller does NOT silently swallow this effect's first-run dep tracking.
    const wasPaused = _scrml_tracking_paused;
    _scrml_tracking_paused = false;
    try { fn(); } finally {
      _scrml_tracking_paused = wasPaused;
      _scrml_effect_stack.pop();
    }

    for (const [target, props] of ctx.deps) {
      if (!_scrml_prop_subscribers.has(target)) _scrml_prop_subscribers.set(target, new Map());
      const propMap = _scrml_prop_subscribers.get(target);
      for (const prop of props) {
        if (!propMap.has(prop)) propMap.set(prop, new Set());
        propMap.get(prop).add(effectFn);
        cleanupEntries.push({ target, prop });
      }
    }
    hasRun = true;
  }

  effectFn();

  return function dispose() {
    disposed = true;
    for (const entry of cleanupEntries) {
      const propMap = _scrml_prop_subscribers.get(entry.target);
      if (propMap) {
        const effects = propMap.get(entry.prop);
        if (effects) effects.delete(effectFn);
      }
    }
    cleanupEntries = [];
  };
}

/**
 * Create a computed reactive value.
 *
 * Lazily evaluates fn when .value is accessed. Caches result until a tracked
 * dependency changes. Is itself reactive — effects that read .value track it.
 *
 * @param {function} fn — the computation function
 * @returns {{ readonly value: * }} — object with a reactive .value getter
 */
function _scrml_computed(fn) {
  let cachedValue;
  let dirty = true;
  let disposed = false;
  let cleanupEntries = [];

  function recompute() {
    // Remove old subscriptions
    for (const entry of cleanupEntries) {
      const propMap = _scrml_prop_subscribers.get(entry.target);
      if (propMap) {
        const effects = propMap.get(entry.prop);
        if (effects) effects.delete(invalidate);
      }
    }
    cleanupEntries = [];

    // Push tracking context
    const ctx = { deps: new Map() };
    _scrml_effect_stack.push(ctx);

    try {
      cachedValue = fn();
    } finally {
      _scrml_effect_stack.pop();
    }

    dirty = false;

    // Subscribe to tracked properties with invalidate (not recompute)
    for (const [target, props] of ctx.deps) {
      if (!_scrml_prop_subscribers.has(target)) {
        _scrml_prop_subscribers.set(target, new Map());
      }
      const propMap = _scrml_prop_subscribers.get(target);
      for (const prop of props) {
        if (!propMap.has(prop)) propMap.set(prop, new Set());
        propMap.get(prop).add(invalidate);
        cleanupEntries.push({ target, prop });
      }
    }
  }

  function invalidate() {
    if (disposed) return;
    dirty = true;
    // Trigger effects that depend on this computed's backing object
    _scrml_trigger(_computed_backing, "value");
  }

  // Backing object for tracking by effects that read .value
  const _computed_backing = {};

  const computed = {
    get value() {
      // Track that this computed's value was read
      _scrml_track(_computed_backing, "value");
      if (dirty) recompute();
      return cachedValue;
    },
    dispose() {
      disposed = true;
      for (const entry of cleanupEntries) {
        const propMap = _scrml_prop_subscribers.get(entry.target);
        if (propMap) {
          const effects = propMap.get(entry.prop);
          if (effects) effects.delete(invalidate);
        }
      }
      cleanupEntries = [];
    },
  };

  return computed;
}

// ---------------------------------------------------------------------------
// §51.0.F + §51.0.G Engine state-machine runtime hooks (chunk: 'engine')
// ---------------------------------------------------------------------------
// C13: rule= contract enforcement on the auto-declared engine variable.
//
// Substrate from C12 (per-engine, compile-time-baked):
//   - __scrml_engine_<varName>_transitions — Object.freeze({...}) keyed by
//     from-variant. Entries: ["X"] (single), ["A","B"] (multi), "*" (wildcard
//     escape hatch), [] (terminal — no transitions).
//   - The variant cell uses standard reactive substrate; current variant via
//     _scrml_reactive_get(varName) (returns bare-string variant tag), write
//     via _scrml_reactive_set(varName, value).
//
// This chunk adds three helpers:
//   - _scrml_engine_check_transition(currentVariant, target, table)
//       Pure boolean predicate. Looks up the from-variant entry; legal iff
//       the entry is "*" OR includes the target. No side effects.
//   - _scrml_engine_advance(varName, target, table, timersTable, idleEntry, internalTable, historyMap)
//       For `@var.advance(.X)`. Reads current variant, checks, throws with
//       "asserted advance failed" framing on failure, else sets the cell.
//       Per §51.0.G "loud failure" semantics. Returns true on EXTERNAL
//       transition, false on INTERNAL transition (§51.0.O). Codegen gates
//       the post-commit hook-firing call on the return value.
//   - _scrml_engine_direct_set(varName, target, table, timersTable, idleEntry, internalTable, historyMap)
//       For `@var = .X`. Reads current variant, checks, throws plain
//       E-ENGINE-INVALID-TRANSITION on failure, else sets the cell.
//       Per §51.0.F direct-write enforcement (Move 12). Returns the same
//       external/internal boolean as _scrml_engine_advance.
//
// A5-7 Wave 2.2 (§51.0.O): when internalTable is non-null AND the target is
// internal-legal from the current variant, the internal write-path runs:
// the cell value updates WITHOUT firing subscribers, no <onTransition>
// hooks fire, no timer clear/arm, no history-cell write. The helper returns
// false so the codegen-emitted post-commit hook-firing call is skipped.
// The idle watchdog DOES reset (§51.0.R — internal is engine activity).
//
// A5-7 Wave 2.3 (§51.0.N, Bug #3): when historyMap is non-null AND the
// EXTERNAL branch is taken AND currentVariant is a key in historyMap AND
// currentVariant !== target (real outer-exit, not self-loop), the helper
// captures the inner-engine variant from `_scrml_state[historyMap[current]]`
// into the synth history cell `_scrml_state["_" + varName + "_" + current
// + "_history"]` BEFORE the cell write. The internal branch explicitly
// skips this capture (per §51.0.O — internal does not exit the composite,
// so its history is never written). The history cell is read-only from
// user code (synth — §51.0.N "synth cell"); writes from anywhere outside
// these helpers are not addressable through any user-authored expression.
//
// Both throwing helpers funnel through _scrml_engine_check_transition so
// the lookup logic exists in exactly one place. Codegen emits ONE call per
// write site — no per-call message construction.

function _scrml_engine_check_transition(currentVariant, target, table) {
  if (table == null) return false;
  // S95 Bug 2 — normalize both sides to the bare tag string. Unit variants
  // are stored as bare strings; payload-bearing variants as `{ variant, data }`
  // tagged-objects (SPEC §51.3.2 Implementation notes, landed S22). The
  // transition table is keyed/valued by bare tags, so both sides need
  // extraction. Self-write idempotent check and the `entry.indexOf(target)`
  // lookup both depend on tag-shaped comparands.
  const fromTag = _scrml_engine_variant_tag(currentVariant);
  const toTag = _scrml_engine_variant_tag(target);
  const entry = table[fromTag];
  if (entry === "*") return true;
  if (Array.isArray(entry) && entry.indexOf(toTag) !== -1) return true;
  return false;
}

// S95 Bug 2 — Extract the bare tag string from an enum variant value.
// Unit variants are stored as bare strings (`"Idle"`); payload-bearing
// variants as `{ variant: "X", data: {...} }` tagged-objects per SPEC §51.3.2.
// Used by engine helpers + dispatchers that need to switch / compare against
// the variant tag without caring whether a payload is present. Returns the
// input untouched when neither shape applies (defensive; non-variant values
// are not legitimate engine cell values and would already be a contract
// violation at the codegen level).
function _scrml_engine_variant_tag(value) {
  if (value != null && typeof value === "object" && typeof value.variant === "string") {
    return value.variant;
  }
  return value;
}

// A5-7 Wave 2.4 (§51.0.Q.1 + §51.0.N, Bug #2) — pending-history-restore flag map.
// Keyed by outer engine var name; value is the target outer variant tag when the
// most recent write to that outer var was the .Tag.history structured target
// form. Read+cleared by the outer dispatcher's composite-arm postMountJs after
// the inner mount slot lands in DOM. When the flag is set AND the synth cell
// _scrml_state["_<outerVar>_<targetTag>_history"] is non-null, the inner cell
// restores from the synth cell. When unset OR cell null, the inner falls
// through to its initial= attribute (per §51.0.N empty-history fallback).
//
// The flag is SET by _scrml_engine_direct_set / _scrml_engine_advance when
// the codegen-emitted 8th arg (isHistoryRestore) is true. The flag is CLEARED
// by the dispatcher (postMountJs) immediately after consumption so subsequent
// non-history-form writes don't accidentally restore.
const _scrml_engine_pending_history_restore = {};

// A5-7 Wave 2.3 (§51.0.N, Bug #3) — Capture the inner-engine variant into
// the synth history cell on an external outer-exit. Called by both
// _scrml_engine_advance and _scrml_engine_direct_set in the EXTERNAL branch
// BEFORE the cell write, when historyMap is non-null AND historyMap[current]
// names an inner-engine var.
//
// The "real exit" guard (current !== target) ensures a self-loop transition
// (rule=.X from .X) doesn't capture stale state — a self-loop is conceptually
// equivalent to a re-entry, where the inner re-initializes per §51.0.N + Q.1.
// (Self-loop semantics may evolve; current conservative behavior is "do not
// capture on self-loop"; if user-feedback flags this as wrong, the guard can
// be widened.)
function _scrml_engine_history_capture_on_exit(varName, current, target, historyMap) {
  if (historyMap == null) return;
  if (current === target) return; // self-loop — not a real exit, do not capture
  var innerVarName = historyMap[current];
  if (typeof innerVarName !== "string" || innerVarName.length === 0) return;
  // Capture the inner-engine var's current value into the synth cell.
  // The synth cell key matches the codegen convention in
  // emit-engine.ts:engineHistoryCellKey: "_<outerVar>_<currentVariant>_history".
  var cellKey = "_" + varName + "_" + current + "_history";
  // Read inner directly from _scrml_state (synth cells / engine cells live
  // in the same flat reactive store).
  _scrml_state[cellKey] = _scrml_state[innerVarName];
}

function _scrml_engine_advance(varName, target, table, timersTable, idleEntry, internalTable, historyMap, isHistoryRestore) {
  // timersTable (optional, A5-4): per-state-tag timer-config map for engines
  // with at least one <onTimeout>. When provided, clear-on-exit fires before
  // the cell write and arm-on-entry fires after. When null/undefined (engines
  // with zero <onTimeout>), the timer paths short-circuit (no-op).
  // internalTable (optional, A5-7 Wave 2.2 §51.0.O): per-engine INTERNAL
  // transition table. When provided AND the target is internal-legal from
  // the current variant, the internal write-path runs (no subscriber fire,
  // no <onTransition>, no timer arm/clear, no history) and the helper returns
  // false. Otherwise (or when internalTable is null), the canonical external
  // path runs and returns true. Codegen gates the post-commit hook-firing
  // call on this boolean.
  // historyMap (optional, A5-7 Wave 2.3 §51.0.N): per-engine HISTORY MAP
  // {outerVariantTag → innerEngineVarName}. When provided AND the EXTERNAL
  // branch is taken AND current is a key in the map AND current !== target,
  // the helper captures _scrml_state[innerEngineVarName] into the synth
  // cell _scrml_state["_" + varName + "_" + current + "_history"] BEFORE
  // the cell write. The internal branch (above) skips this capture by
  // construction (no real exit).
  const current = _scrml_reactive_get(varName);
  // S95 Bug 2 — normalize both sides to bare tag for control-flow decisions.
  // The CELL writes still store the full `target` (which may be a payload-
  // bearing `{ variant, data }` tagged-object); only the tag is used for
  // rule= comparison, self-write detection, timer/history lookup keys, and
  // the pending-history-restore flag (which lives in tag space).
  const currentTag = _scrml_engine_variant_tag(current);
  const targetTag = _scrml_engine_variant_tag(target);
  // §51.0.F (v0.3 Option-d synthesis) — IDEMPOTENT SELF-WRITE NO-OP.
  // When target equals the current variant, this is a self-write — by spec
  // a true no-op (NOT a rule= violation, even when the from-state's rule=
  // does not list itself). No <onTransition> fires, no history capture,
  // no timer rearm, no idle-watchdog reset, no subscriber fire. Returns
  // false (matches the "no external transition occurred" signal so any
  // caller that gates post-commit hooks on the return value treats this
  // as a non-event).
  // Precedent: _scrml_engine_history_capture_on_exit:2390 already short-
  // circuits self-loops as "not a real exit"; this guard makes the front-
  // door helpers consistent with that intuition. W-ENGINE-SELF-WRITE-DETECTED
  // (info-level) surfaces the no-op at compile time when statically detectable.
  //
  // S95 Bug 2 — self-write detection runs on TAGS (a payload-bearing self-
  // write `@phase = .Dragging(otherId)` is a tag-identity self-write — same
  // state-child, just refreshing payload). Re-evaluating semantics here:
  // SPEC §51.0.F.1 frames idempotency as "self-write to the current variant"
  // which is variant-identity, not value-identity. A payload-refresh self-
  // write IS a tag self-write under this spec — runtime no-op. If adopters
  // need payload-refresh-fires-subscribers semantics in the future, that's
  // a SPEC amendment, not a runtime change here.
  if (currentTag === targetTag) return false;
  // A5-7 Wave 2.2 — internal-path check FIRST. Per §51.0.O an internal
  // transition is preferred when both an internal rule and an external rule
  // permit the same target (canonical example: composite self-loop
  // internal-rule=.Playing from .Playing; if the user also has
  // rule=.Playing for some reason, the internal semantics win — they're
  // the more-specific "stay in place" intent).
  if (internalTable != null && _scrml_engine_check_transition(currentTag, targetTag, internalTable)) {
    // §51.0.O internal write path:
    //   - Update the cell value WITHOUT firing subscribers (variant-guard
    //     dispatcher would tear down + re-create the arm body, including the
    //     inner engine — which is exactly what internal:rule= avoids).
    //   - SKIP <onTransition> hook fire (helper returns false; codegen gates).
    //   - SKIP timer clear/arm (timers are state-child-scoped; the composite
    //     did not exit — timers stay armed).
    //   - SKIP history-cell write (§51.0.N — internal does not write history).
    //   - DO reset the idle watchdog: §51.0.R counts ANY transition as
    //     engine activity, internal included.
    _scrml_state[varName] = target;
    if (idleEntry != null) _scrml_engine_reset_idle_watchdog(varName, idleEntry, table);
    return false;
  }
  if (!_scrml_engine_check_transition(currentTag, targetTag, table)) {
    throw new Error(
      "E-ENGINE-INVALID-TRANSITION: asserted advance failed. " +
      "Variable: " + varName + ". Move: ." + String(currentTag) + " => ." + String(targetTag) +
      ". The from-state's rule= contract does not permit this target."
    );
  }
  // A5-7 Wave 2.3 §51.0.N — history capture on EXTERNAL outer-exit. Fires
  // BEFORE the cell write so the captured inner variant reflects the state
  // at the moment of exit (not after any side effect of the write). Tree-
  // shaken via null historyMap.
  //
  // S95 Bug 2 — pass currentTag (not raw `current`) so history-cell key
  // construction operates on tag space. The captured inner-engine value
  // stored in the synth cell IS the inner cell value (also potentially a
  // tagged-object — handled by the inner engine's read sites).
  if (historyMap != null) _scrml_engine_history_capture_on_exit(varName, currentTag, targetTag, historyMap);
  // A5-7 Wave 2.4 §51.0.Q.1 — set the pending-history-restore flag BEFORE
  // the cell write (which fires the outer dispatcher's subscriber). The
  // dispatcher composite-arm postMountJs reads the flag, restores inner
  // from the synth cell when set, and clears the flag. Tree-shaken via
  // isHistoryRestore default-false.
  //
  // S95 Bug 2 — historyMap is keyed by tag (outerVariantTag → innerVarName),
  // pending-restore flag is keyed by tag too. Use targetTag.
  if (isHistoryRestore === true && historyMap != null && historyMap[targetTag] != null) {
    _scrml_engine_pending_history_restore[varName] = targetTag;
  }
  // Clear timers attached to the OUTGOING state-child first (timers belong
  // to the from-state — the spec semantics are "armed on entry, cleared on
  // exit"). Re-entering the same state-child clears + re-arms below.
  //
  // S95 Bug 2 — timersTable is keyed by tag (state-child names map directly).
  if (timersTable != null) _scrml_engine_clear_state_timers(varName, currentTag, timersTable);
  _scrml_reactive_set(varName, target);
  // Arm timers for the INCOMING state-child. Re-entering the same state-child
  // (current === target) re-arms a fresh timer per §51.12.4 reset semantics.
  if (timersTable != null) _scrml_engine_arm_state_timers(varName, targetTag, timersTable, table);
  // A5-6 §51.0.R — reset the engine's idle watchdog on every successful
  // transition (machine-wide event-timeout). idleEntry is null when the
  // engine declares no <onIdle> (tree-shake).
  if (idleEntry != null) _scrml_engine_reset_idle_watchdog(varName, idleEntry, table);
  return true;
}

function _scrml_engine_direct_set(varName, target, table, timersTable, idleEntry, internalTable, historyMap, isHistoryRestore) {
  // timersTable: see _scrml_engine_advance above.
  // idleEntry (A5-6 §51.0.R): per-engine event-timeout watchdog config or null.
  // internalTable (A5-7 Wave 2.2 §51.0.O): per-engine internal transition
  // table or null. Returns true on external transition, false on internal.
  // historyMap (A5-7 Wave 2.3 §51.0.N): per-engine history map or null. See
  // _scrml_engine_advance above for full semantics.
  const current = _scrml_reactive_get(varName);
  // S95 Bug 2 — tag-space normalization (see _scrml_engine_advance for the
  // full rationale). The cell stores the full target value (payload-bearing
  // variants are `{ variant, data }`); transition-table lookups, self-write
  // detection, history-map / pending-restore lookups, and timer-table
  // lookups all operate in tag space.
  const currentTag = _scrml_engine_variant_tag(current);
  const targetTag = _scrml_engine_variant_tag(target);
  // §51.0.F (v0.3 Option-d synthesis) — IDEMPOTENT SELF-WRITE NO-OP.
  // See _scrml_engine_advance above for the full rationale. A self-write
  // (target === current) is a true no-op, NOT a rule= violation. Returns
  // false (matches the non-external-transition signal). Surfaced at compile
  // time by W-ENGINE-SELF-WRITE-DETECTED (info-level lint).
  if (currentTag === targetTag) return false;
  // A5-7 Wave 2.2 — internal-path check FIRST (see _scrml_engine_advance).
  if (internalTable != null && _scrml_engine_check_transition(currentTag, targetTag, internalTable)) {
    // §51.0.O internal write path — see _scrml_engine_advance for full
    // rationale. Side-effect-free write: update cell value, do NOT fire
    // subscribers, do NOT touch timers, do NOT touch history. Idle watchdog
    // resets per §51.0.R (internal IS engine activity).
    _scrml_state[varName] = target;
    if (idleEntry != null) _scrml_engine_reset_idle_watchdog(varName, idleEntry, table);
    return false;
  }
  if (!_scrml_engine_check_transition(currentTag, targetTag, table)) {
    throw new Error(
      "E-ENGINE-INVALID-TRANSITION: illegal direct write to engine variable. " +
      "Variable: " + varName + ". Move: ." + String(currentTag) + " => ." + String(targetTag) +
      ". The from-state's rule= contract does not permit this target."
    );
  }
  // A5-7 Wave 2.3 §51.0.N — history capture on EXTERNAL outer-exit (see
  // _scrml_engine_advance for rationale). Tree-shaken via null historyMap.
  if (historyMap != null) _scrml_engine_history_capture_on_exit(varName, currentTag, targetTag, historyMap);
  // A5-7 Wave 2.4 §51.0.Q.1 — pending-history-restore flag (see
  // _scrml_engine_advance for rationale).
  if (isHistoryRestore === true && historyMap != null && historyMap[targetTag] != null) {
    _scrml_engine_pending_history_restore[varName] = targetTag;
  }
  if (timersTable != null) _scrml_engine_clear_state_timers(varName, currentTag, timersTable);
  _scrml_reactive_set(varName, target);
  if (timersTable != null) _scrml_engine_arm_state_timers(varName, targetTag, timersTable, table);
  if (idleEntry != null) _scrml_engine_reset_idle_watchdog(varName, idleEntry, table);
  return true;
}

// ---------------------------------------------------------------------------
// 51.0.E engine hydration — S198 (#Approach F A-leg, dynamic initial=@cell)
// ---------------------------------------------------------------------------
// Boot-only runtime-cell hydration. `initial=@cell` snapshots the named cell's
// value at engine-construction and seeds the engine variable to it. Hydration is
// CONSTRUCTION, not transition: it asserts the machine WAS at that state, so the
// from-state `rule=` guard does NOT apply. This is the GUARD-FREE counterpart of
// _scrml_engine_direct_set — it performs a bare reactive set, never routing
// through the transition guard (which would hard-throw E-ENGINE-INVALID-TRANSITION
// on a non-rule=-legal target).
//
// Decoder boundary: a guard-free construction must not silently corrupt the cell.
// The snapshot may be any persisted value (a DB-status string, a localStorage
// read). If it is absence (null/undefined) or not a legal variant of the engine's
// for=T type, this throws E-ENGINE-INITIAL-INVALID-VARIANT — the runtime
// counterpart of the compile-time static-literal check (symbol-table B15).
//   varName     — the engine's auto-declared variable (51.0.C).
//   snapshot    — the cell value read at construction (a variant string, or a
//                 `{ variant, data }` tagged-object for a payload variant).
//   validTags   — the engine's legal state tags (its for=T variant set).
//   forType     — the engine's for= type name (for the error message).
function _scrml_engine_hydrate_init(varName, snapshot, validTags, forType) {
  // Absence is never a valid hydration source (null + undefined do not exist in
  // scrml; an empty/absent persisted value is a decode failure, not a state).
  if (snapshot == null) {
    throw new Error(
      "E-ENGINE-INITIAL-INVALID-VARIANT: engine '" + varName + "' (for=" + forType +
      ") hydrates from a cell that resolved to absence at construction. " +
      "An initial=@cell source must hold a defined " + forType + " variant " +
      "(its value must be resolved at construction — e.g. an SSR/server-loaded " +
      "value, not an async-fetch-on-mount that is not ready yet)."
    );
  }
  // Normalize to the tag: a unit variant is a bare string; a payload variant is
  // a `{ variant, data }` tagged-object (the tag selects the legal-state check).
  var tag = _scrml_engine_variant_tag(snapshot);
  var ok = false;
  if (Array.isArray(validTags)) {
    for (var i = 0; i < validTags.length; i++) {
      if (validTags[i] === tag) { ok = true; break; }
    }
  }
  if (!ok) {
    var listed = Array.isArray(validTags) && validTags.length > 0
      ? validTags.map(function (v) { return "." + String(v); }).join(", ")
      : "(none)";
    throw new Error(
      "E-ENGINE-INITIAL-INVALID-VARIANT: engine '" + varName + "' (for=" + forType +
      ") hydrated from a cell whose value '" + String(tag) + "' is not a valid " +
      forType + " variant. Valid variants: " + listed + ". " +
      "The persisted value must decode to a legal " + forType + " state."
    );
  }
  // Guard-free construction set — bare reactive set, NOT _scrml_engine_direct_set
  // (hydration is construction, not a guarded transition).
  _scrml_reactive_set(varName, snapshot);
}

// ---------------------------------------------------------------------------
// 51.0.S engine message dispatch — S155 batch 3 (#14 event-payload-transition)
// ---------------------------------------------------------------------------
// Runtime backbone for `@<engineVar>.advance(.MsgVariant)` — the message-plane
// dispatch path (51.0.S.2.5). The codegen STAMPS the plane (state vs message)
// at compile time per 51.0.G.1, so a message-plane `.advance` lowers to a call
// to THIS helper instead of `_scrml_engine_advance`.
//
// armTable shape (compile-time-baked per engine — see emit-engine.ts
// `emitEngineMessageArmTable`). Keyed by from-state tag, then message tag, to
// an arm fn of (stateData, msgData) returning the resolved target state. The
// `"_"` key is the wildcard arm (51.0.S.2.4). A state with no message arms is
// absent from the table.
//
// Semantics (51.0.S.3):
//   - The matched arm body ALWAYS runs (effects are the message's purpose) --
//     even when the resolved target equals the current state.
//   - The state-change machinery (onTransition / history / onTimeout) fires
//     iff the resolved target differs from the current state -- achieved by
//     delegating the transition to `_scrml_engine_advance`, which no-ops the
//     self-target case per 51.0.F.1.
//   - THE ONE DIVERGENCE (51.0.R handled-message reset): the `<onIdle>`
//     watchdog resets EVEN on a same-state arm (a handled message is activity,
//     not silence). `_scrml_engine_advance` skips the idle reset on a
//     self-target no-op, so this helper force-resets it after a no-op commit.
//   - A message dispatched to a state with NO arm for it is a runtime no-op
//     (51.0.S.2.6) -- no effect, no transition, no idle reset.
//
// Returns the boolean `_scrml_engine_advance` returned (true = external
// transition fired, false = self-target no-op / no arm) so the codegen
// hook-firing wrap can gate the post-commit fire-hooks call on it.
function _scrml_engine_dispatch_message(
  varName, msg, armTable, table, timersTable, idleEntry, internalTable, historyMap
) {
  if (armTable == null) return false;
  // Resolve the dispatched message's tag + payload data. Messages are ordinary
  // enum values: unit variants are bare strings; payload variants are
  // `{ variant, data }` tagged-objects per 51.3.2 (same shape as state values).
  var msgTag = _scrml_engine_variant_tag(msg);
  var msgData = (msg != null && typeof msg === "object" && msg.data && typeof msg.data === "object") ? msg.data : null;
  // The CURRENT engine state -- its tag selects the per-state arm map; its data
  // provides the state-payload binding (`id` from `.Dragging(id)`, 51.0.B.1).
  var current = _scrml_reactive_get(varName);
  var currentTag = _scrml_engine_variant_tag(current);
  var stateData = (current != null && typeof current === "object" && current.data && typeof current.data === "object") ? current.data : null;
  // Find the arm for this (state, message). No arm for the current state, or no
  // arm for this message (and no wildcard) -> no-op (51.0.S.2.6). The
  // exhaustiveness check (51.0.S.2.4) guarantees a state WITH any arms covers
  // the full message set or carries a wildcard, so the only no-op-reachable
  // case is a state that declared NO arms at all.
  var stateArms = armTable[currentTag];
  if (stateArms == null || typeof stateArms !== "object") return false;
  var armFn = stateArms[msgTag];
  if (typeof armFn !== "function") armFn = stateArms["_"]; // 51.0.S.2.4 wildcard
  if (typeof armFn !== "function") return false; // no arm -> no-op
  // Run the arm body (effects ALWAYS run, 51.0.S.3) and resolve the target.
  // The arm fn receives (stateData, msgData) so both payload planes are in
  // scope; its return value is the resolved target state.
  var target = armFn(stateData, msgData);
  // Transition through the canonical advance helper -- it validates against the
  // from-state rule= (51.0.S.2.7 -> E-ENGINE-INVALID-TRANSITION), fires
  // onTransition / history / onTimeout iff target !== current, and resets onIdle
  // on a real transition. Self-target -> no-op (returns false), and we force the
  // idle reset below per 51.0.R handled-message reset.
  var external = _scrml_engine_advance(
    varName, target, table, timersTable, idleEntry, internalTable, historyMap
  );
  // 51.0.R handled-message reset (the 51.0.S.3 divergence): a handled message
  // resets the idle watchdog EVEN on a same-state arm. `_scrml_engine_advance`
  // skips the reset on a self-target no-op, so re-assert it here when the arm
  // resolved the current state (external === false) and the engine has an
  // `<onIdle>` watchdog.
  if (external === false && idleEntry != null) {
    _scrml_engine_reset_idle_watchdog(varName, idleEntry, table);
  }
  return external;
}

// ---------------------------------------------------------------------------
// §51.0.M onTimeout runtime — A5-4 engine state-child timer arm/clear
// ---------------------------------------------------------------------------
// Runtime support for the <onTimeout after=DURATION to=.Variant/> element.
// Backbone is shared with §51.12 (_scrml_machine_arm_timer /
// _scrml_machine_clear_timer); these two helpers provide the per-state-entry
// arm + per-state-exit clear bookkeeping for engine state-children.
//
// timersTable shape (compile-time-baked per engine, see emit-engine.ts):
//   const __scrml_engine_<varName>_timers = Object.freeze({
//     "Loading": [
//       { ms: 30000, target: "TimedOut" },
//       // OR for computed-delay (§51.12.3.1, A5-5):
//       { msExpr: function(){ return Math.min(1000 * 2 ** _scrml_reactive_get("attempt"), 30000) * 1; },
//         target: "Retry" },
//     ],
//     "Idle": [],
//     // ...
//   });
// (Tree-shake: emitted ONLY when the engine has at least one <onTimeout>; for
//  engines with zero timers, codegen passes null for the timersTable arg and
//  these helpers no-op.)
//
// Timer-key encoding (per SCOPE §3 decision #5): varName + "::" + stateName + "::" + index.
// The flat _scrml_machine_timers map is shared with legacy <machine> rules;
// composite keys avoid collision when an app mixes both surfaces or uses the
// same state name across multiple engines.

function _scrml_engine_arm_state_timers(varName, stateName, timersTable, table) {
  // Arm every <onTimeout> entry attached to stateName on engine varName.
  // table is the engine's transition table — needed so the timer's setterFn
  // can route through _scrml_engine_direct_set and enforce the rule= contract
  // at fire time (defensive — A5-3 typer already validated to= compile-time,
  // so a legitimate <onTimeout> never throws here).
  if (timersTable == null) return;
  var list = timersTable[stateName];
  if (!Array.isArray(list) || list.length === 0) return;
  for (var i = 0; i < list.length; i++) {
    var ent = list[i];
    var ms;
    if (typeof ent.ms === "number") {
      // Literal-form duration (constant-folded at compile time).
      ms = ent.ms;
    } else if (typeof ent.msExpr === "function") {
      // Computed-form duration (§51.12.3.1 — S67 amendment, A5-5).
      // The arrow-fn returns the runtime ms value; clamp negative/NaN to 0
      // per spec (equivalent to firing on the next tick per setTimeout).
      var v;
      try { v = ent.msExpr(); } catch (e) { v = 0; }
      ms = (typeof v === "number" && isFinite(v) && v >= 0) ? Math.round(v) : 0;
    } else {
      continue; // malformed entry — defensive skip
    }
    // A5-6 Feature 1 (S79) -- named-timer key. When the entry has 'name',
    // the key uses 'n:NAME' instead of the index, so cancelTimer("NAME")
    // can reconstruct the same key from the same (varName, stateName).
    // Identifier-shape validation at compile time (E-TIMER-NAME-INVALID)
    // guarantees 'name' is never digits-only and so cannot collide with
    // an index-keyed sibling. Defensive runtime: still namespace named
    // entries with the 'n:' prefix to make collisions structurally
    // impossible.
    var keySuffix = (typeof ent.name === "string" && ent.name.length > 0)
      ? "n:" + ent.name
      : String(i);
    var timerKey = varName + "::" + stateName + "::" + keySuffix;
    var target = ent.target;
    // setterFn: route the timer-fire write through the engine's transition
    // table (A5-4 §51.0.M Semantics — a timer-induced transition is a legal
    // transition event that obeys the rule= contract).
    var setterFn = (function (vn, tbl) {
      return function (tg) { _scrml_engine_direct_set(vn, tg, tbl); };
    })(varName, table);
    _scrml_machine_arm_timer(timerKey, ms, target, {
      fromVariant: stateName,
      label: null,
      auditTarget: null,
      rulesJson: null,
      setterFn: setterFn,
    });
  }
}

function _scrml_engine_clear_state_timers(varName, stateName, timersTable) {
  // Clear every timer armed for stateName on engine varName. Called on
  // exit (any rule= transition or external write). No-ops when the state had
  // no <onTimeout> entries OR when the table is null (tree-shake path).
  if (timersTable == null) return;
  var list = timersTable[stateName];
  if (!Array.isArray(list) || list.length === 0) return;
  for (var i = 0; i < list.length; i++) {
    var ent = list[i];
    // A5-6 Feature 1 (S79) -- mirror the keying scheme used at arm time.
    var keySuffix = (ent && typeof ent.name === "string" && ent.name.length > 0)
      ? "n:" + ent.name
      : String(i);
    var timerKey = varName + "::" + stateName + "::" + keySuffix;
    _scrml_machine_clear_timer(timerKey);
  }
}

// A5-6 Feature 1 (SPEC sec 51.0.M name= extension, S79).
// cancelTimer("NAME") -- invoked from within an engine state-child arm body
// (event handler / interpolation expression) -- lowers to a call to this
// helper with the surrounding (varName, stateName) baked in by codegen.
// The helper reconstructs the same composite key the arm-on-entry path used
// and clears just that one timer via the shared _scrml_machine_clear_timer.
//
// Per SPEC sec 51.0.M S79 amendment + SCOPE sec 3.2 Option A:
//   - Names are scope-local to the state-child; cancelTimer can only address
//     timers declared in the SAME state-child. Codegen guarantees this by
//     using the static (varName, stateName) of the enclosing arm.
//   - Unknown names are a runtime no-op (matches clearTimeout(undefined)
//     browser semantics; SCOPE sec 3.3 explicit decision).
//   - Already-fired and not-yet-armed timers are no-ops.
function _scrml_engine_clear_named_timer(varName, stateName, name) {
  if (typeof name !== "string" || name.length === 0) return;
  var timerKey = varName + "::" + stateName + "::n:" + name;
  _scrml_machine_clear_timer(timerKey);
}

// ---------------------------------------------------------------------------
// §51.0.R onIdle runtime — A5-6 engine event-timeout watchdog
// ---------------------------------------------------------------------------
// Runtime support for the <onIdle after=DURATION to=.Variant/> element. One
// watchdog per engine. Armed at module-init alongside the variant cell;
// RESET on every successful transition (any _scrml_engine_direct_set or
// _scrml_engine_advance commit). Fires through the same write-path as a
// direct write — rule= validation applies at fire time.
//
// idleEntry shape (compile-time-baked per engine, see emit-engine.ts):
//   const __scrml_engine_<varName>_idle = {
//     ms: 300000, target: "Idle"
//   };
//   // OR for computed-delay (§51.12.3.1, A5-5):
//   const __scrml_engine_<varName>_idle = {
//     msExpr: function(){ return _scrml_reactive_get("backoffDelay") * 1; },
//     target: "Idle"
//   };
// (Tree-shake: emitted ONLY when the engine declares <onIdle>; codegen passes
//  null when absent and these helpers no-op.)
//
// Timer-key encoding: varName + "::__idle". The "::__idle" suffix cannot
// collide with state-child timer keys (state names start with PascalCase, not
// double-underscore).

function _scrml_engine_arm_idle_watchdog(varName, idleEntry, table) {
  // Arm the engine's machine-wide idle watchdog (A5-6 §51.0.R).
  // table is the engine's transition table — the setterFn routes the
  // watchdog-fire write through _scrml_engine_direct_set so rule= validation
  // applies (§51.0.R sub-A1: rule=-honoring fires).
  if (idleEntry == null) return;
  var ms;
  if (typeof idleEntry.ms === "number") {
    ms = idleEntry.ms;
  } else if (typeof idleEntry.msExpr === "function") {
    var v;
    try { v = idleEntry.msExpr(); } catch (e) { v = 0; }
    ms = (typeof v === "number" && isFinite(v) && v >= 0) ? Math.round(v) : 0;
  } else {
    return; // malformed entry — defensive skip
  }
  var timerKey = varName + "::__idle";
  var target = idleEntry.target;
  var setterFn = (function (vn, tbl) {
    return function (tg) { _scrml_engine_direct_set(vn, tg, tbl); };
  })(varName, table);
  _scrml_machine_arm_timer(timerKey, ms, target, {
    fromVariant: null,
    label: null,
    auditTarget: null,
    rulesJson: null,
    setterFn: setterFn,
  });
}

function _scrml_engine_reset_idle_watchdog(varName, idleEntry, table) {
  // Reset the watchdog: clear any pending timer + re-arm. Called after
  // every successful _scrml_engine_direct_set / _scrml_engine_advance commit
  // (per A5-6 §51.0.R "reset on every transition" semantics). Module-init
  // arm uses _scrml_engine_arm_idle_watchdog directly (no clear needed).
  if (idleEntry == null) return;
  var timerKey = varName + "::__idle";
  _scrml_machine_clear_timer(timerKey);
  _scrml_engine_arm_idle_watchdog(varName, idleEntry, table);
}

// ---------------------------------------------------------------------------
