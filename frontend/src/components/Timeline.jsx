export default function Timeline({ levels }) {
  const pad = 60 - levels.length
  return (
    <section className="card">
      <h2>Alert level, last 60 seconds</h2>
      <div className="tl" role="img" aria-label="Alert levels over the last 60 seconds">
        {Array.from({ length: 60 }, (_, i) => <i key={i} className={i < pad ? '' : 'l' + levels[i - pad]} />)}
      </div>
      <p className="note">Taller bar = more danger.</p>
    </section>
  )
}
