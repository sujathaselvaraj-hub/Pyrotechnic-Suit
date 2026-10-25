import { useState } from 'react'
import { LV } from '../logic'
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"'

export default function EventLog({ events, clearLog }) {
  const [alertsOnly, setAlertsOnly] = useState(false)
  const shown = alertsOnly ? events.filter((e) => e.alert) : events
  const csv = () => {
    const rows = events.map((e) => [q(e.time), q(LV[e.lvl].n), q(e.msg), e.vals.co ?? '', e.vals.so2 ?? '', e.vals.o2 ?? '', e.vals.pm25 ?? '', e.vals.pm10 ?? ''].join(','))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['time,level,event,co_ppm,so2_ppm,o2_pct,pm25,pm10\n' + rows.join('\n')], { type: 'text/csv' }))
    a.download = 'pyro-suit-log.csv'; a.click()
  }
  return (
    <section className="card">
      <h2>Event log</h2>
      <div className="bar">
        <label>Show <select value={alertsOnly ? 'a' : 'all'} onChange={(e) => setAlertsOnly(e.target.value === 'a')}><option value="all">All</option><option value="a">Alerts only</option></select></label>
        <button onClick={clearLog}>Clear log</button><button onClick={csv}>Download CSV</button>
      </div>
      <div className="log" aria-live="polite" aria-label="Event log">
        {shown.map((e, i) => <div key={i} className={'e l' + e.lvl}>{e.time}  {LV[e.lvl].i} {e.msg}</div>)}
      </div>
    </section>
  )
}
