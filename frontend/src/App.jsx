import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSimulator, LV } from './simulator'
import Header from './components/Header'
import Scenarios from './components/Controls'
import SuitView from './components/SuitView'
import ReadingsPanel from './components/ReadingsPanel'
import Trends from './components/Trends'
import Timeline from './components/Timeline'
import EventLog from './components/EventLog'
import ThresholdPanel from './components/ThresholdPanel'
import TestPanel from './components/TestPanel'

const TABS = [['log', 'Event log'], ['limits', 'Limits'], ['about', 'About and tests']]

export default function App() {
  const sim = useSimulator()
  const [tab, setTab] = useState('log')
  const s = sim.state
  if (!s) return <div className="wrap"><div className="load"><div className="spinner" /> Connecting to sensors…</div></div>
  return (
    <div className="wrap">
      <Header sim={sim} />
      <section className={'card hero l' + s.level} aria-label="Overall alert status" title={s.why}>
        <span className="hic" aria-hidden="true">{LV[s.level].i}</span>
        <div className="big">{LV[s.level].n}</div>
        <motion.div key={s.level} className="banner" role="alert" aria-live="assertive" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}>{s.banner}</motion.div>
      </section>
      <Scenarios sim={sim} />
      <div className="grid">
        <SuitView s={s} fanMode={sim.fanMode} setFanMode={sim.setFanMode} />
        <div className="stack">
          <ReadingsPanel s={s} />
          <Trends history={sim.history} thresholds={sim.thresholds} />
          <Timeline levels={sim.timeline} />
        </div>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{n}</button>)}
      </div>
      {tab === 'log' && <EventLog events={sim.events} clearLog={sim.clearLog} />}
      {tab === 'limits' && <ThresholdPanel thresholds={sim.thresholds} updateThreshold={sim.updateThreshold} importSettings={sim.importSettings} />}
      {tab === 'about' && <TestPanel />}
    </div>
  )
}
