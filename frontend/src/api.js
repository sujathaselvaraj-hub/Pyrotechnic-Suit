// Sends each second of sensor data to the backend. The dashboard keeps working
// if the backend is off or asleep: failures are ignored on purpose.
const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const apiOn = API !== ''

export function sendTick(v, wearer = 'W01') {
  if (!apiOn) return
  fetch(API + '/tick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wearer, co_left: v.coL, co_right: v.coR, so2_left: v.soL, so2_right: v.soR, o2_left: v.o2L, o2_right: v.o2R, pm25: v.pm }),
  }).catch(() => { /* backend offline: ignore */ })
}
