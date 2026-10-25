// DATA HOOK: everything the screen needs comes from here.
// TO USE REAL HARDWARE LATER: replace simulate() with data from a WebSocket (see readSource).
import { useEffect, useRef, useState } from 'react'
import { sendTick } from './api'
import { BASE, DEFAULT_TH, LV, assess, makeHealth, summarize, whyText, validTh } from './logic'
export { LV }

const BANNERS = ['All clear.', 'Getting close to a limit.', 'Danger: fan and vibration are on.', 'Critical: leave the area now.']

export function useSimulator() {
  const R = useRef({ S: { v: { ...BASE }, t: { ...BASE }, ticks: 0, glitch: false, stuck: null }, E: { dwell: 0, level: 0, hold: 0 }, health: makeHealth(), th: DEFAULT_TH, fanMode: 0, fanOn: false, paused: false, speed: 1, beep: false, src: 'simulator', snap: {}, ac: null })
  const [state, setState] = useState(null)
  const [history, setHistory] = useState([])
  const [timeline, setTimeline] = useState([])
  const [events, setEvents] = useState([])
  const [ui, setUi] = useState({ thresholds: DEFAULT_TH, fanMode: 0, paused: false, speed: 1, src: 'simulator' })

  const logEv = (msg, lvl = 0, alert = false) =>
    setEvents((e) => [{ time: new Date().toLocaleTimeString(), msg, lvl, alert, vals: { ...R.current.snap } }, ...e].slice(0, 200))

  const beep = () => {
    if (!R.current.beep) return
    try { const c = R.current; c.ac = c.ac || new AudioContext(); const o = c.ac.createOscillator(), g = c.ac.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(c.ac.destination); o.start(); o.stop(c.ac.currentTime + 0.25) } catch (e) { /* sound blocked */ }
  }

  const simulate = () => {
    const S = R.current.S
    if (S.ticks > 0 && --S.ticks === 0) { S.t = { ...BASE }; logEv('Hazard source cleared', 0, true) }
    for (const k in S.v) {
      if (k === S.stuck) continue
      const n = (Math.random() - 0.5) * (k === 'pm' ? 3 : k[0] === 'o' ? 0.05 : 0.6)
      S.v[k] = Math.max(0, S.v[k] + (S.t[k] - S.v[k]) * 0.45 + n)
    }
    const v = { ...S.v }
    if (S.glitch) { v.coL = 95; S.glitch = false }
    return v
  }
  // STUB: a real WebSocket source goes here, e.g. keep the latest message in a ref and return it.
  const readSource = () => { if (R.current.src !== 'simulator') throw new Error('WebSocket source is not connected (stub).'); return simulate() }

  const tick = () => {
    const c = R.current
    let v
    try { v = readSource() } catch (e) { setState((s) => s && { ...s, why: e.message }); return }
    sendTick(v) // log this second on the backend (does nothing if VITE_API_URL is empty)
    const bad = c.health(v), prev = c.E.level, r = assess(v, c.th, c.E, bad), lvl = c.E.level
    c.snap = { co: Math.max(v.coL, v.coR).toFixed(1), so2: Math.max(v.soL, v.soR).toFixed(2), o2: Math.min(v.o2L, v.o2R).toFixed(2), pm25: v.pm.toFixed(1), pm10: (v.pm * 1.8).toFixed(1) }
    if (lvl !== prev) { logEv('Alert level: ' + LV[lvl].n, lvl, true); if (lvl >= 2 && prev < 2) beep() }
    else if (r.raw === 2 && lvl < 2 && c.E.dwell === 0) logEv('Spike seen. Waiting to confirm it is real…', 1, true)
    const nf = c.fanMode === 1 ? true : c.fanMode === 2 ? false : r.fan
    if (nf !== c.fanOn) { c.fanOn = nf; logEv('Fan ' + (nf ? 'ON' : 'OFF')) }
    const sm = summarize(v, bad, r)
    setState({ ...sm, raw: v, r, bad, level: lvl, fanOn: nf, vibrationOn: lvl >= 2, dwell: c.E.dwell, banner: BANNERS[lvl], why: whyText(r, bad, c.E) })
    setHistory((h) => [...h, { i: Date.now(), ...sm.readings }].slice(-60))
    setTimeline((t) => [...t, lvl].slice(-60))
  }

  useEffect(() => {
    let timer, dead = false, next = performance.now() + 1000
    const loop = () => { // drift-corrected loop that pauses when the tab is hidden
      if (dead) return
      const c = R.current, now = performance.now(), iv = 1000 / c.speed
      if (c.paused || document.hidden) next = now + iv
      else if (now >= next) { tick(); next += iv; if (next < now) next = now + iv }
      timer = setTimeout(loop, Math.max(10, Math.min(next - performance.now(), 250)))
    }
    logEv('System online. Using simulated sensors.'); tick(); loop()
    return () => { dead = true; clearTimeout(timer) }
  }, [])

  const set = (patch) => setUi((u) => ({ ...u, ...patch }))
  const scenario = (n) => {
    const S = R.current.S
    if (n === 'glitch') { S.glitch = true; return logEv('Sensor glitch injected (1 tick)', 1, true) }
    if (n === 'fault') { S.stuck = S.stuck ? null : 'coR'; return logEv(S.stuck ? 'Right CO sensor frozen (fault test)' : 'Right CO sensor restored', S.stuck ? 1 : 0, true) }
    S.t = { ...BASE }
    if (n === 'reset') { S.ticks = 0; S.stuck = null; return logEv('Scenario reset') }
    if (n === 'burst') { Object.assign(S.t, { coL: 70, coR: 68, soL: 6, soR: 6.2, pm: 120 }); S.ticks = 12 }
    if (n === 'enclosed') { Object.assign(S.t, { coL: 45, coR: 46, soL: 3, soR: 3, o2L: 17.5, o2R: 17.6, pm: 60 }); S.ticks = 20 }
    if (n === 'left') { Object.assign(S.t, { coL: 80, soL: 7 }); S.ticks = 14 }
    logEv('Scenario: ' + n, 1, true)
  }
  const setFanMode = (m) => { R.current.fanMode = m; set({ fanMode: m }); logEv('Fan override: ' + ['auto', 'forced on', 'forced off'][m]) }
  const togglePause = () => { R.current.paused = !R.current.paused; set({ paused: R.current.paused }) }
  const setSpeed = (s) => { R.current.speed = s; set({ speed: s }) }
  const setSrc = (s) => { R.current.src = s; set({ src: s }); if (s !== 'simulator') logEv('Data source: ' + s + ' (stub, no data)', 1) }
  const setBeep = (b) => { R.current.beep = b; if (b) beep() }
  const updateThreshold = (k, j, x) => { // returns an error message, or '' when accepted
    const t = R.current.th[k].slice(); t[j] = x
    if (!validTh(k, t)) return k === 'o2' ? 'O₂: the caution value must be higher than the critical value. Change ignored.' : 'The caution value must be lower than the hazard value. Change ignored.'
    R.current.th = { ...R.current.th, [k]: t }; set({ thresholds: R.current.th }); return ''
  }
  const importSettings = (text) => {
    try {
      const t = JSON.parse(text).thresholds
      for (const k in DEFAULT_TH) if (!Array.isArray(t[k]) || t[k].length !== 2 || !validTh(k, t[k])) throw new Error(k)
      R.current.th = t; set({ thresholds: t }); logEv('Settings imported'); return ''
    } catch (e) { return 'Import failed: the file is not valid settings JSON.' }
  }
  const clearLog = () => setEvents([])
  return { state, history, timeline, events, ...ui, scenario, setFanMode, togglePause, setSpeed, setSrc, setBeep, updateThreshold, importSettings, clearLog }
}
