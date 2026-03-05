// IOsense SDK — getDataByTimeRangeWithCalibration
// All calls are authenticated with the user's Bearer JWT (no server-side secrets)

const CONNECTOR_BASE =
  "https://connector.iosense.io/api/account/deviceData/getDataCalibration"

interface DataPoint {
  time: string
  value: number
}

async function fetchSensorData(
  token: string,
  devId: string,
  sensor: string,
  startMs: number,
  endMs: number
): Promise<DataPoint[]> {
  const url = `${CONNECTOR_BASE}/${devId}/${sensor}/${startMs}/${endMs}/true`
  const res = await fetch(url, {
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
  })

  if (res.status === 401) throw new Error("AUTH_EXPIRED")
  if (!res.ok) throw new Error(`Data fetch failed: ${res.status}`)

  const json = await res.json()
  if (!json.success) throw new Error("Data fetch unsuccessful")

  return (json.data?.[0] as DataPoint[]) ?? []
}

function getDayBoundsMs(date: Date) {
  const startMs = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0, 0, 0, 0
  ).getTime()
  const endMs = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0, 0, 0, 0
  ).getTime()
  return { startMs, endMs }
}

// Find the value of the closest data point to a target timestamp
function getClosestValue(points: DataPoint[], targetMs: number): number | null {
  if (points.length === 0) return null
  let closest = points[0]
  let minDiff = Math.abs(new Date(points[0].time).getTime() - targetMs)
  for (const p of points) {
    const diff = Math.abs(new Date(p.time).getTime() - targetMs)
    if (diff < minDiff) {
      minDiff = diff
      closest = p
    }
  }
  return closest.value
}

// Compute delta (end - start) for a 15-min slot from a full-day time series.
// D12/D13 are cumulative energy counters — delta = consumption for that slot.
function getSlotDelta(
  points: DataPoint[],
  slotStart: number,
  slotEnd: number
): number {
  const startVal = getClosestValue(points, slotStart)
  const endVal = getClosestValue(points, slotEnd)
  if (startVal === null || endVal === null) return 0
  return Math.max(0, endVal - startVal)
}

// --- Public API ---

export async function fetchPredictionData(
  token: string,
  date: Date
): Promise<Record<number, number>> {
  const { startMs, endMs } = getDayBoundsMs(date)
  const points = await fetchSensorData(token, "JSWDLV_PREDICTION", "D6", startMs, endMs)

  const map: Record<number, number> = {}
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()

  for (const point of points) {
    const t = new Date(point.time)
    if (t.getFullYear() !== y || t.getMonth() !== m || t.getDate() !== d) continue
    const slot = Math.floor((t.getHours() * 60 + t.getMinutes()) / 15) + 1
    if (slot >= 1 && slot <= 96) {
      map[slot] = parseFloat(String(point.value)) || 0
    }
  }

  return map
}

// Replaces 192 individual browser calls — now 2 authenticated requests for the whole day
export async function fetchConsumptionData(
  token: string,
  date: Date
): Promise<Record<number, number>> {
  const { startMs, endMs } = getDayBoundsMs(date)

  const [d12Points, d13Points] = await Promise.all([
    fetchSensorData(token, "JSWDLV_A", "D12", startMs, endMs),
    fetchSensorData(token, "JSWDLV_A", "D13", startMs, endMs),
  ])

  const map: Record<number, number> = {}

  for (let slot = 1; slot <= 96; slot++) {
    const slotStart = startMs + (slot - 1) * 15 * 60 * 1000
    const slotEnd = startMs + slot * 15 * 60 * 1000

    const d12 = getSlotDelta(d12Points, slotStart, slotEnd)
    const d13 = getSlotDelta(d13Points, slotStart, slotEnd)
    const total = d12 + d13

    if (total > 0) {
      map[slot] = total
    }
  }

  return map
}
