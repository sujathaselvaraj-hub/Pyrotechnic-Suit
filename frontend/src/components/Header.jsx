import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { SettingsMenu } from './Controls'

export default function Header({ sim }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  return (
    <header className="top">
      <div className="brand"><ShieldAlert size={26} aria-hidden="true" /><h1>PYRO<span>-SUIT</span></h1></div>
      <div className="meta">
        <span>Wearer W01</span>
        <span>{now.toLocaleTimeString()}</span>
        <span className="badge">● {sim.src === 'simulator' ? 'SIMULATED' : 'LIVE (stub)'}</span>
        <SettingsMenu sim={sim} />
      </div>
    </header>
  )
}
