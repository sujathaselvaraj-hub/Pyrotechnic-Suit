import { useState } from 'react'
import { TESTS } from '../logic'

export default function TestPanel() {
  const [out, setOut] = useState('')
  const run = () => setOut(TESTS.map(([n, f]) => { let ok = false; try { ok = f() } catch (e) { /* counts as fail */ } return (ok ? '✓ PASS  ' : '✖ FAIL  ') + n }).join('\n'))
  return (
    <section className="card">
      <details>
        <summary>How it works</summary>
        <p>Sensors on the left shoulder, right shoulder and back send readings once per second. A hazard reading must last 2 seconds if both sides agree (or dust is high), and 6 seconds if only one side reports it. If it keeps going 7 seconds after being confirmed, it becomes CRITICAL. This filters out one-off glitches. At HAZARD the fan starts, the vibration motor buzzes, and the fan stays on a few seconds after the air clears. A sensor that sends the same value 5 times in a row, or a value outside its range, is marked FAULT and ignored by the alert logic.</p>
      </details>
      <details>
        <summary>Run self-tests</summary>
        <button onClick={run}>Run tests</button>
        <pre>{out}</pre>
      </details>
    </section>
  )
}
