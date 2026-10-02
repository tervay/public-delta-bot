import { diff, type Feed, type State } from '../lib/diff.js'
import { readJson, writeJson } from '../lib/store.js'
import { fetchState } from '../lib/tba.js'

const YEAR = 2027

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const next = await fetchState(YEAR)
  const [prev, feed] = await Promise.all([
    readJson<State>('state.json', true),
    readJson<Feed>('feed.json', true),
  ])

  const entry = prev ? diff(prev, next) : null
  const entries = feed?.entries ?? []
  const updated: Feed = { lastRun: next.takenAt, entries: entry ? [entry, ...entries] : entries }

  await writeJson(`snapshots/${next.takenAt.slice(0, 10)}.json`, next)
  await writeJson('state.json', next)
  await writeJson('feed.json', updated)

  return Response.json({
    baseline: !prev,
    events: Object.keys(next.events).length,
    teams: Object.values(next.events).reduce((n, e) => n + e.teams.length, 0),
    entry,
  })
}
