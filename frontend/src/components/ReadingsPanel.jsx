import { LV } from '../logic'
import CountUp from './CountUp'
const CARDS = [
  ['co', 'CO', 'ppm', 0, 'Carbon monoxide: odourless gas that starves the blood of oxygen. Causes headache, dizziness and collapse.'],
  ['so2', 'SO₂', 'ppm', 1, 'Sulfur dioxide: irritates eyes, nose and lungs and can trigger breathing trouble.'],
  ['o2', 'O₂', '%', 1, 'Oxygen: normal air is about 20.9%. Low oxygen causes confusion and fainting.'],
  ['pm25', 'Dust PM2.5', 'µg/m³', 0, 'Fine dust: small enough to reach deep into the lungs. PM10 is the coarser dust shown below it.'],
]

export default function ReadingsPanel({ s }) {
  return (
    <section className="card">
      <h2>Live readings</h2>
      <div className="read">
        {CARDS.map(([k, name, unit, dec, tip]) => {
          const x = s.readings[k], l = x == null ? 3 : s.levels[k]
          return (
            <div key={k} className={'r l' + l} tabIndex={0} title={tip} aria-label={name + '. ' + tip}>
              <span className="u">{name} ({unit})</span>
              <b className="n"><CountUp value={x} dec={dec} /></b>
              <span className="st">{x == null ? '✖ NO DATA' : LV[l].i + ' ' + LV[l].n}</span>
              {k === 'pm25' && <span className="u">PM10: <CountUp value={s.readings.pm10} dec={0} /> µg/m³</span>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
