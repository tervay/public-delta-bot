import { invalidateByTag } from '@vercel/functions'
import { diff, type Feed, type State } from '../lib/diff.js'
import { notify } from '../lib/discord.js'
import { lastModified } from '../lib/first.js'
import { readJson, writeJson } from '../lib/store.js'
import { fetchState } from '../lib/tba.js'

const YEAR = 2027
const DAY_MS = 24 * 60 * 60 * 1000

async function notifyIfFirstUpdated() {
  const at = await lastModified()
  if (Date.now() - at.getTime() > DAY_MS) return null
  await notify(`@everyone FIRST ElasticSearch has updated. Latest change: <t:${Math.floor(at.getTime() / 1000)}:f>`)
  return at.toISOString()
}

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

  const entry = diff(prev ?? { takenAt: '', events: {} }, next)
  const entries = feed?.entries ?? []
  const updated: Feed = { lastRun: next.takenAt, entries: entry ? [entry, ...entries] : entries }

  await writeJson(`snapshots/${next.takenAt.slice(0, 10)}.json`, next)
  await writeJson('state.json', next)
  await writeJson('feed.json', updated)
  await invalidateByTag('feed')
  const firstUpdatedAt = await notifyIfFirstUpdated().catch((e) => (console.error(e), null))

  return Response.json({
    firstUpdatedAt,
    baseline: !prev,
    events: Object.keys(next.events).length,
    teams: Object.values(next.events).reduce((n, e) => n + e.teams.length, 0),
    entry,
  })
}
