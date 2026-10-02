import type { State } from './diff.js'

const BASE = 'https://www.thebluealliance.com/api/v3'
const OFFICIAL_EVENT_TYPES = new Set([0, 1, 2, 3, 4, 5, 6, 7])
const CONCURRENCY = 8

type SimpleEvent = { key: string; name: string; event_type: number }

async function tba<T>(path: string): Promise<T> {
  const key = process.env.TBA_AUTH_KEY
  if (!key) throw new Error('TBA_AUTH_KEY is not set')
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-TBA-Auth-Key': key } })
  if (!res.ok) throw new Error(`TBA ${path} returned ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchOfficialEvents(year: number) {
  const events = await tba<SimpleEvent[]>(`/events/${year}/simple`)
  return events.filter((e) => OFFICIAL_EVENT_TYPES.has(e.event_type))
}

export const fetchTeamKeys = (eventKey: string) => tba<string[]>(`/event/${eventKey}/teams/keys`)

export async function fetchState(year: number): Promise<State> {
  const takenAt = new Date().toISOString()
  const queue = await fetchOfficialEvents(year)
  const events: State['events'] = {}
  const worker = async () => {
    for (let e = queue.shift(); e; e = queue.shift()) {
      events[e.key] = { name: e.name, teams: await fetchTeamKeys(e.key) }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return { takenAt, events }
}
