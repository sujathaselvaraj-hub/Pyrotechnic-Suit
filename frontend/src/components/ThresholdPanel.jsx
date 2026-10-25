import { useRef, useState } from 'react'
const ROWS = [['co', 'CO caution / hazard (ppm)'], ['so2', 'SO₂ caution / hazard (ppm)'], ['o2', 'O₂ low / critical (%)'], ['pm25', 'Dust PM2.5 caution / hazard']]

export default function ThresholdPanel({ thresholds, updateThreshold, importSettings }) {
  const [draft, setDraft] = useState({})
  const [bad, setBad] = useState({})
  const [err, setErr] = useState('')
  const file = useRef()
  const onChange = (k, j, text) => {
    const id = k + j
    setDraft((d) => ({ ...d, [id]: text }))
    const x = parseFloat(text)
    const e = isNaN(x) ? 'Enter a number. Change ignored.' : updateThreshold(k, j, x)
    setBad((b) => ({ ...b, [id]: !!e })); setErr(e)
  }
  const exportJson = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ thresholds }, null, 2)], { type: 'application/json' }))
    a.download = 'pyro-suit-settings.json'; a.click()
  }
  const onFile = async (e) => {
    const msg = importSettings(await e.target.files[0].text())
    setErr(msg); if (!msg) { setDraft({}); setBad({}) }
    e.target.value = ''
  }
  return (
    <section className="card">
      <h2>Limits (placeholders)</h2>
      <div className="th">
        {ROWS.map(([k, label]) => (
          <div key={k} style={{ display: 'contents' }}>
            <span>{label}</span>
            {[0, 1].map((j) => (
              <input key={j} type="number" step="any" aria-label={label + ' value ' + (j + 1)} aria-invalid={!!bad[k + j]}
                value={draft[k + j] ?? thresholds[k][j]} onChange={(e) => onChange(k, j, e.target.value)} />
            ))}
          </div>
        ))}
      </div>
      <div className="err" role="status">{err}</div>
      <div className="bar">
        <button onClick={exportJson}>Export settings</button>
        <button onClick={() => file.current.click()}>Import settings</button>
        <input ref={file} type="file" accept="application/json" hidden onChange={onFile} />
      </div>
      <p className="note"><b>Disclaimer:</b> these numbers are placeholders for a student prototype. Real limits must come from OSHA and NIOSH sources.</p>
    </section>
  )
}
