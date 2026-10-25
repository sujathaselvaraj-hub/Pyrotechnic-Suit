import { useEffect, useRef, useState } from 'react'
// Numbers glide to their new value instead of jumping.
export default function CountUp({ value, dec = 0 }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (value == null) return
    const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const a = from.current ?? value, t0 = performance.now()
    let raf
    const step = (t) => {
      const p = calm ? 1 : Math.min(1, (t - t0) / 600)
      const v = a + (value - a) * (1 - Math.pow(1 - p, 3))
      from.current = v; setShown(v)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{value == null ? 'FAULT' : Number(shown ?? value).toFixed(dec)}</>
}
