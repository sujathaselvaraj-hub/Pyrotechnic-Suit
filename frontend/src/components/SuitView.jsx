import { LV, SENS } from '../logic'
const f = (s, k, d) => (s.bad[k] ? 'FAULT' : s.raw[k].toFixed(d))

function Callout({ x, y, w = 96, cls, color, title, lines, x1, y1, x2, y2 }) {
  return (
    <g className={cls} style={color ? { '--c': color } : undefined}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--c)" strokeWidth="1" strokeDasharray="2 2" />
      <rect x={x} y={y} width={w} height={8 + 10 * (lines.length + 1)} rx="4" fill="var(--panel)" stroke="var(--c)" />
      <text x={x + 6} y={y + 12} className="ct">{title}</text>
      {lines.map((t, i) => <text key={i} x={x + 6} y={y + 24 + i * 10} className="cv">{t}</text>)}
    </g>
  )
}

export default function SuitView({ s, fanMode, setFanMode }) {
  const { level, fanOn, vibrationOn, r, bad, dwell } = s
  const dots = [[58, 62, r.R], [142, 62, r.L], [100, 116, r.m.pm]]
  return (
    <section className={'card suit-card l' + (level >= 2 ? level : 0)}>
      <h2>Suit (front view: wearer’s left is on your right)</h2>
      <svg viewBox="0 0 360 300" className={'suit' + (fanOn ? ' spin' : '')} role="img" aria-label="Suit diagram with live sensor values">
        <Callout x={2} y={20} cls={'l' + r.R} title="RIGHT GAS" lines={['CO ' + f(s, 'coR', 0) + ' ppm', 'SO₂ ' + f(s, 'soR', 1) + ' ppm']} x1={98} y1={39} x2={129} y2={62} />
        <Callout x={262} y={20} cls={'l' + r.L} title="LEFT GAS" lines={['CO ' + f(s, 'coL', 0) + ' ppm', 'SO₂ ' + f(s, 'soL', 1) + ' ppm']} x1={262} y1={39} x2={231} y2={62} />
        <Callout x={262} y={98} cls={'l' + r.m.pm} title="DUST (BACK)" lines={['PM2.5 ' + f(s, 'pm', 0), 'PM10 ' + (bad.pm ? 'FAULT' : (s.raw.pm * 1.8).toFixed(0))]} x1={262} y1={117} x2={189} y2={116} />
        <Callout x={2} y={150} cls="l0" color="var(--accent)" title="WAIST FAN" lines={[fanOn ? 'RUNNING' : 'OFF']} x1={98} y1={166} x2={163} y2={178} />
        <g transform="translate(80 0)">
          <g className={vibrationOn ? 'shake' : ''}>
            <path className="draw" pathLength="1" d="M70 40 Q100 20 130 40 L165 62 L178 150 L158 154 L148 100 L146 190 L148 285 L108 285 L100 205 L92 285 L52 285 L54 190 L52 100 L42 154 L22 150 L35 62 Z" fill="var(--suit)" stroke="var(--line)" strokeWidth="2" />
            <circle cx="100" cy="30" r="14" fill="var(--suit)" stroke="var(--line)" strokeWidth="2" />
            {dots.map(([x, y, n]) => (
              <g key={x + '-' + y} className={'l' + n}>
                <circle className={'dot l' + n} cx={x} cy={y} r={x === 100 ? 8 : 9} />
                <text className="ic" x={x} y={y + 3}>{LV[n].i}</text>
              </g>
            ))}
            <rect x="84" y="76" width="32" height="22" rx="5" fill="var(--panel)" stroke="var(--line)" strokeWidth="2" />
            <circle cx="92" cy="87" r="3.5" fill={level === 0 ? 'var(--ok)' : 'var(--line)'} />
            <circle cx="100" cy="87" r="3.5" fill={level === 1 ? 'var(--warn)' : 'var(--line)'} />
            <circle cx="108" cy="87" r="3.5" fill={level >= 2 ? 'var(--bad)' : 'var(--line)'} />
            <text className="lbl" x="100" y="72">CHEST UNIT</text>
            <circle cx="100" cy="178" r="17" fill="var(--panel)" stroke="var(--line)" strokeWidth="2" />
            <g className="fan" fill={fanOn ? 'var(--accent)' : 'var(--muted)'}>
              <path d="M100 178 Q94 164 100 161 Q106 164 100 178Z" /><path d="M100 178 Q114 172 116 178 Q114 184 100 178Z" />
              <path d="M100 178 Q106 192 100 195 Q94 192 100 178Z" /><path d="M100 178 Q86 184 84 178 Q86 172 100 178Z" />
            </g>
          </g>
        </g>
      </svg>
      <div className="mini">
        <div><span>Fan</span><b>{fanOn ? 'ON' : 'OFF'}</b></div>
        <div><span>Vibration</span><b>{vibrationOn ? 'ON' : 'OFF'}</b></div>
        <div><span>Confirming</span><b>{dwell} s</b></div>
        <button onClick={() => setFanMode((fanMode + 1) % 3)}>Fan: {['Auto', 'Forced on', 'Forced off'][fanMode]}</button>
      </div>
      <div className="chips" aria-label="Sensor health">
        {SENS.map(([k, n]) => bad[k]
          ? <span key={k} className="chip f">✖ {n}: FAULT</span>
          : <span key={k} className={'chip l' + r.m[k]}>{LV[r.m[k]].i} {n}</span>)}
      </div>
    </section>
  )
}
