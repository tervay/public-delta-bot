const SEARCH = 'https://yifkx4foih.execute-api.us-east-2.amazonaws.com/prod/first-search'

type FirstEvent = { id: string; event_code: string }
type FirstTeam = { team_number_yearly: string; events?: { fk_events: string }[] }

async function search<T>(index: string, body: object): Promise<T[]> {
  const res = await fetch(SEARCH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index, query: { size: 10000, ...body } }),
  })
  if (!res.ok) throw new Error(`FIRST search ${index} returned ${res.status}`)
  return ((await res.json()) as { results: T[] }).results
}

export async function fetchTeamsByEvent(year: number) {
  const [events, teams] = await Promise.all([
    search<FirstEvent>('events_*', {
      _source: ['id', 'event_code'],
      query: { query_string: { query: `(event_type:FRC) AND (event_season:${year})` } },
    }),
    search<FirstTeam>('teams_*', {
      _source: ['team_number_yearly', 'events.fk_events'],
      query: { bool: { must: [{ match: { ff_team_type: 'FRC' } }, { match: { profile_year: String(year) } }] } },
    }),
  ])
  const codes = new Map(events.map((e) => [e.id, e.event_code.toLowerCase()]))
  const byEvent = new Map<string, string[]>()
  for (const team of teams) {
    for (const { fk_events } of team.events ?? []) {
      const code = codes.get(fk_events)
      if (code) byEvent.set(code, [...(byEvent.get(code) ?? []), `frc${team.team_number_yearly}`])
    }
  }
  return byEvent
}
