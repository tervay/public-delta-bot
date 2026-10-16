import type { EventState, State } from './diff.js'
import { fetchTeamsByEvent as first } from './first.js'
import { fetchTeamsByEvent as frc } from './frc.js'

const BASE = 'https://www.thebluealliance.com/api/v3'
const OFFICIAL_EVENT_TYPES = new Set([0, 1, 2, 3, 4, 5, 6, 7])
const SOURCES: Record<string, typeof frc> = { frc, first }

function teamSource() {
  const name = process.env.TEAM_SOURCE || 'frc'
  const source = SOURCES[name]
  if (!source) throw new Error(`TEAM_SOURCE must be one of ${Object.keys(SOURCES).join(', ')}, got ${name}`)
  return source
}

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

export const eventState = (e: TbaEvent, teams: string[]): EventState => ({
  name: e.short_name || e.name,
  group: groupOf(e),
  week: e.week,
  region: regionOf(e),
  teams,
})

export async function fetchState(year: number): Promise<State> {
  const takenAt = new Date().toISOString()
  const events = await fetchOfficialEvents(year)
  const byEvent = await teamSource()(year, events.map((e) => e.event_code))
  return { takenAt, events: Object.fromEntries(events.map((e) => [e.key, eventState(e, byEvent.get(e.event_code) ?? [])])) }
}
