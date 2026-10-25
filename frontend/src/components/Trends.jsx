import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer, CartesianGrid } from 'recharts'
import { domain } from '../logic'
const TABS = [['co', 'CO', 'ppm'], ['so2', 'SO₂', 'ppm'], ['o2', 'O₂', '%'], ['pm25', 'PM2.5', 'µg/m³']]

export default function Trends({ history, thresholds }) {
  const [tab, setTab] = useState('co')
  const [, label, unit] = TABS.find((t) => t[0] === tab)
  const [warn, danger] = thresholds[tab]
  const dom = domain(tab, thresholds)
  return (
    <section className="card">
      <h2>Trends (last 60 seconds)</h2>
      <div className="bar">{TABS.map(([k, n]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{n}</button>)}</div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={history}>
          <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4cc9ff" stopOpacity={0.55} /><stop offset="100%" stopColor="#4cc9ff" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid stroke="#2a416655" />
          <XAxis dataKey="i" hide />
          <YAxis stroke="#9db0cc" width={42} domain={dom} allowDataOverflow />
          <Tooltip contentStyle={{ background: '#0d1628', border: '1px solid #2a4166', color: '#e8f1ff' }} labelFormatter={() => ''} formatter={(v) => [Number(v).toFixed(1) + ' ' + unit, label]} />
          <ReferenceArea y1={tab === 'o2' ? dom[0] : danger} y2={tab === 'o2' ? danger : dom[1]} fill="#ff5a6b" fillOpacity={0.13} ifOverflow="hidden" />
          <ReferenceLine y={warn} stroke="#ffb938" strokeDasharray="4 4" />
          <ReferenceLine y={danger} stroke="#ff5a6b" strokeDasharray="4 4" />
          <Area type="monotone" dataKey={tab} stroke="#4cc9ff" strokeWidth={2} fill="url(#g)" isAnimationActive={false} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
      <p className="note">Amber line = getting close. Red zone = danger.</p>
    </section>
  )
}
