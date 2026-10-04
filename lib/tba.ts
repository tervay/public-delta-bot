import type { State } from './diff.js'
import { fetchTeamKeys } from './frc.js'

const BASE = 'https://www.thebluealliance.com/api/v3'
const OFFICIAL_EVENT_TYPES = new Set([0, 1, 2, 3, 4, 5, 6, 7])
const CONCURRENCY = 8

type TbaEvent = {
  key: string
  event_code: string
  name: string
  short_name: string | null
  event_type: number
  week: number | null
  district: { abbreviation: string } | null
  country: string | null
  state_prov: string | null
}

export const groupOf = (e: TbaEvent) =>
  e.district ? e.district.abbreviation.toUpperCase() : e.event_type === 0 ? 'Regionals' : 'Championship'

const regionOf = (e: TbaEvent) => (e.country === 'USA' ? e.state_prov : e.country)

async function tba<T>(path: string): Promise<T> {
  const key = process.env.TBA_AUTH_KEY
  if (!key) throw new Error('TBA_AUTH_KEY is not set')
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-TBA-Auth-Key': key } })
  if (!res.ok) throw new Error(`TBA ${path} returned ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchOfficialEvents(year: number) {
  const events = await tba<TbaEvent[]>(`/events/${year}`)
  return events.filter((e) => OFFICIAL_EVENT_TYPES.has(e.event_type))
}

export async function fetchState(year: number): Promise<State> {
  const takenAt = new Date().toISOString()
  const queue = await fetchOfficialEvents(year)
  const events: State['events'] = {}
  const worker = async () => {
    for (let e = queue.shift(); e; e = queue.shift()) {
      events[e.key] = { name: e.short_name || e.name, group: groupOf(e), week: e.week, region: regionOf(e), teams: await fetchTeamKeys(year, e.event_code) }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return { takenAt, events }
}
