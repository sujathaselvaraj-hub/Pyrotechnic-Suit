import { useEffect, useState } from 'react'
import { Flame, Home, ArrowLeft, Zap, Unplug, RotateCcw, Settings } from 'lucide-react'
const SCEN = [['burst', 'Firework burst', Flame], ['enclosed', 'Enclosed area', Home], ['left', 'Left-side source', ArrowLeft], ['glitch', 'Sensor glitch', Zap], ['fault', 'Sensor fault', Unplug], ['reset', 'Reset', RotateCcw]]

function applyTheme(x) {
  const r = document.documentElement
  if (x === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', x)
  try { localStorage.setItem('pyro-theme', x) } catch (e) { /* storage blocked */ }
}

export function SettingsMenu({ sim }) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(() => { try { const t = localStorage.getItem('pyro-theme') || 'system'; applyTheme(t); return t } catch (e) { return 'system' } })
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [open])
  return (
    <div className="gear">
      <button aria-label="Settings" aria-expanded={open} onClick={() => setOpen(!open)}><Settings size={18} /></button>
      {open && (
        <div className="pop" role="dialog" aria-label="Settings">
          <label>Theme <select value={theme} onChange={(e) => { setTheme(e.target.value); applyTheme(e.target.value) }}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
          <label><input type="checkbox" onChange={(e) => sim.setBeep(e.target.checked)} /> Beep on hazard</label>
          <label>Data source <select value={sim.src} onChange={(e) => sim.setSrc(e.target.value)}><option value="simulator">Simulator</option><option value="websocket">WebSocket (stub)</option></select></label>
        </div>
      )}
    </div>
  )
}

export default function Scenarios({ sim }) {
  return (
    <div className="scen">
      {SCEN.map(([k, n, Icon]) => <button key={k} onClick={() => sim.scenario(k)}><Icon size={16} aria-hidden="true" /> {n}</button>)}
    </div>
  )
}
