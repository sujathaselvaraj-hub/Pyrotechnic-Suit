// PURE ALERT LOGIC: no React in here, so it is easy to test.
// Same numbers and timings as backend/thresholds.py and backend/detector.py. Change both together.
export const DEFAULT_TH = { co: [35, 50], so2: [2, 5], o2: [20.0, 19.5], pm25: [35, 75] }
const DWELL_BOTH = 2, DWELL_ONE = 6, CRITICAL_AFTER = 7 // seconds
export const BASE = { coL: 3, coR: 3, soL: 0.2, soR: 0.2, o2L: 20.9, o2R: 20.9, pm: 12 }
export const SENS = [['coL', 'CO left'], ['coR', 'CO right'], ['soL', 'SO₂ left'], ['soR', 'SO₂ right'], ['o2L', 'O₂ left'], ['o2R', 'O₂ right'], ['pm', 'Dust back']]
export const LV = [{ n: 'SAFE', i: '●' }, { n: 'CAUTION', i: '▲' }, { n: 'HAZARD', i: '◆' }, { n: 'CRITICAL', i: '✖' }]
const RANGE = { co: 500, so: 20, o2: 25, pm: 1000 }
const lv = (x, w, d, rev) => (rev ? (x <= d ? 2 : x <= w ? 1 : 0) : x >= d ? 2 : x >= w ? 1 : 0)

export function assess(v, T, E, bad = {}) {
  const g = (k, w, d, r) => (bad[k] ? 0 : lv(v[k], w, d, r))
  const m = { coL: g('coL', ...T.co), coR: g('coR', ...T.co), soL: g('soL', ...T.so2), soR: g('soR', ...T.so2), o2L: g('o2L', ...T.o2, true), o2R: g('o2R', ...T.o2, true), pm: g('pm', ...T.pm25) }
  const raw = Math.max(...Object.values(m))
  const L = Math.max(m.coL, m.soL, m.o2L), R = Math.max(m.coR, m.soR, m.o2R)
  const both = m.pm == 2 || (m.coL == 2 && m.coR == 2) || (m.soL == 2 && m.soR == 2) || (m.o2L == 2 && m.o2R == 2)
  const anyGas = [m.coL, m.coR, m.soL, m.soR, m.o2L, m.o2R].some((x) => x == 2)
  // three timers, as in backend/detector.py (-1 means "not running")
  E.b = both ? (E.b >= 0 ? E.b + 1 : 0) : -1   // seconds both sides (or dust) have been over the limit
  E.o = anyGas ? (E.o >= 0 ? E.o + 1 : 0) : -1 // seconds any gas sensor has been over the limit
  const ok = E.b >= DWELL_BOTH || E.o >= DWELL_ONE
  E.c = ok ? (E.c >= 0 ? E.c + 1 : 0) : -1     // seconds since the hazard was confirmed
  E.dwell = Math.max(E.b, E.o, 0)
  E.level = ok ? (E.c >= CRITICAL_AFTER ? 3 : 2) : raw >= 1 ? 1 : 0
  E.hold = E.level >= 2 ? 5 : Math.max(0, E.hold - 1)
  return { m, raw, L, R, corr: both, need: both ? DWELL_BOTH : DWELL_ONE, fan: E.level >= 2 || E.hold > 0 }
}

export function makeHealth() { // marks stuck or out-of-range sensors as FAULT
  const last = {}, same = {}
  return (v) => {
    const bad = {}
    for (const k in BASE) {
      const x = v[k]; same[k] = x === last[k] ? (same[k] || 0) + 1 : 0; last[k] = x
      if (!isFinite(x) || x < 0 || x > RANGE[k.slice(0, 2)]) bad[k] = 'out of range'
      else if (same[k] >= 5) bad[k] = 'no change (stuck)'
    }
    return bad
  }
}

export function summarize(v, bad, r) {
  const pick = (ks, f) => { const a = ks.filter((k) => !bad[k]).map((k) => v[k]); return a.length ? f(...a) : null }
  const pm = bad.pm ? null : v.pm
  return {
    readings: { co: pick(['coL', 'coR'], Math.max), so2: pick(['soL', 'soR'], Math.max), o2: pick(['o2L', 'o2R'], Math.min), pm25: pm, pm10: pm == null ? null : pm * 1.8 },
    levels: { co: Math.max(r.m.coL, r.m.coR), so2: Math.max(r.m.soL, r.m.soR), o2: Math.max(r.m.o2L, r.m.o2R), pm25: r.m.pm, pm10: r.m.pm },
  }
}

export function whyText(r, bad, E) {
  const nm = Object.fromEntries(SENS)
  const names = (n) => Object.keys(r.m).filter((k) => r.m[k] === n).map((k) => nm[k]).join(', ')
  let s
  if (E.level >= 2) s = `${names(2)} above the hazard limit for ${E.dwell} s. ${r.corr ? 'Both sides (or dust) agree, so the fast 2 s rule applied.' : 'Only one side reports it, so the slower 6 s rule applied.'} Result: ${LV[E.level].n}. Fan and vibration are on.`
  else if (names(2)) s = `${names(2)} above the hazard limit for ${E.dwell} s. Waiting for ${r.need} s to rule out a glitch (${r.corr ? 'both sides agree' : 'one side only'}).`
  else if (names(1)) s = `${names(1)} near the limit. Caution only.`
  else s = 'All healthy sensors are within their limits.'
  if (E.level < 2 && r.fan) s += ' The fan stays on for a few seconds after the air clears.'
  const f = Object.keys(bad)
  if (f.length) s += ' FAULT: ' + f.map((k) => nm[k] + ' (' + bad[k] + ')').join(', ') + '. Ignored until it recovers.'
  return s
}

export const validTh = (k, t) => t.every((x) => isFinite(x) && x >= 0) && (k === 'o2' ? t[0] > t[1] : t[0] < t[1])
export const domain = (k, T) => (k === 'o2' ? [15, 22] : k === 'pm10' ? [0, T.pm25[1] * 1.8 * 1.5] : [0, T[k][1] * 1.5]) // fixed graph scales

const seq = (fr) => { const e = { dwell: 0, level: 0, hold: 0 }; return fr.map((o) => { const r = assess({ ...BASE, ...o }, DEFAULT_TH, e, {}); return { l: e.level, f: r.fan } }) }
const rep = (n, o) => Array(n).fill(o)
export const TESTS = [
  ['Glitch (1 tick) is ignored', () => seq([{}, { coL: 95 }, {}, {}, {}]).every((x) => x.l < 2)],
  ['Both sides confirm after 2 s', () => { const r = seq(rep(3, { coL: 70, coR: 70 })); return r[1].l < 2 && r[2].l === 2 }],
  ['One side needs 6 s', () => { const r = seq(rep(7, { coL: 70 })); return r[5].l < 2 && r[6].l === 2 }],
  ['Hazard stays on when the second side joins', () => { const r = seq([...rep(7, { coL: 70 }), ...rep(4, { coL: 70, coR: 70 })]); return r.slice(6).every((x) => x.l >= 2) }],
  ['Critical 7 s after confirmation', () => { const r = seq(rep(10, { coL: 70, coR: 70 })); return r[8].l === 2 && r[9].l === 3 }],
  ['Fan holds on briefly after clearing', () => { const r = seq([...rep(3, { coL: 70, coR: 70 }), ...rep(6, {})]); return r[3].f && r[6].f && !r[7].f }],
  ['O₂ logic is reversed (low is bad)', () => seq(rep(3, { o2L: 17.5, o2R: 17.5 }))[2].l === 2 && seq(rep(3, { o2L: 21, o2R: 21 })).every((x) => x.l === 0)],
]
