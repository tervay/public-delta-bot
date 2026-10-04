import type { Entry, Feed, State } from '../lib/diff.js'
import { readJson } from '../lib/store.js'

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const eastern = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', ...options })

const day = (iso: string) => eastern(iso, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

const shortDay = (iso: string) => eastern(iso, { weekday: 'short', month: 'short', day: 'numeric' })

const timestamp = (iso: string) => eastern(iso, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })

const dayId = (iso: string) => `day-${new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })}`

const team = (key: string) => key.slice(3)

const teams = (keys: string[], sign: '+' | '−', cls: string) =>
  keys.map((k) => `<a class="${cls}" data-team="${team(k)}" href="https://frc-events.firstinspires.org/2027/team/${team(k)}">${sign}${team(k)}</a>`).join(' ')

type Row = { key: string; name: string; group: string; tag: string; body: string; teams: string[]; math?: string; week?: number | null }

type Counts = Map<Entry, Map<string, number>>

const countsAfter = (entries: Entry[], state: State | null): Counts => {
  const counts = new Map(Object.entries(state?.events ?? {}).map(([key, e]) => [key, e.teams.length]))
  return new Map(
    entries.map((e) => {
      const after = new Map<string, number>()
      for (const x of e.changed) {
        const n = counts.get(x.key)
        if (n === undefined) continue
        after.set(x.key, n)
        counts.set(x.key, n - x.added.length + x.removed.length)
      }
      for (const x of [...e.eventsAdded, ...e.eventsRemoved]) counts.delete(x.key)
      return [e, after]
    }),
  )
}

const math = (added: number, removed: number, after: number | undefined) =>
  after === undefined
    ? ''
    : `${after - added + removed}${added ? ` <span class="add">+ ${added}</span>` : ''}${removed ? ` <span class="del">− ${removed}</span>` : ''} = <strong>${after}</strong>`

const event = (r: Row) => `
  <li data-teams="${r.teams.map(team).join(' ')}">
    <div><a class="event" href="https://frc-events.firstinspires.org/2027/${escape(r.key.slice(4).toUpperCase())}">${escape(r.name)}</a>${r.week == null ? '' : `<sup class="week">${r.week + 1}</sup>`}${r.tag}</div>
    <div class="teams">${r.body}</div>
    <div class="math">${r.math ?? ''}</div>
  </li>`

const groupRank = (g: string) => (g === 'Regionals' ? 1 : g === 'Championship' ? 2 : 0)

const byGroup = (a: string, b: string) => groupRank(a) - groupRank(b) || a.localeCompare(b)

const renderGroups = (rows: Row[]) =>
  [...Map.groupBy(rows, (r) => r.group)]
    .sort(([a], [b]) => byGroup(a, b))
    .map(([group, rs]) => `
    <div class="group" data-group="${escape(group)}">
      <h3>${escape(group)}</h3>
      <ul>${rs.sort((a, b) => (a.week ?? Infinity) - (b.week ?? Infinity) || a.name.localeCompare(b.name)).map(event).join('')}</ul>
    </div>`)
    .join('')

const renderEntry = (counts: Counts, events: State['events']) => (e: Entry) => `
  <section id="${dayId(e.at)}">
    <h2>${day(e.at)}</h2>
    ${renderGroups([
      ...e.eventsAdded.map((x) => ({ ...x, tag: ' <span class="tag">new event</span>', body: teams(x.teams, '+', 'add') })),
      ...e.changed.map((x) => ({
        ...x,
        tag: '',
        body: `${teams(x.added, '+', 'add')} ${teams(x.removed, '−', 'del')}`,
        teams: [...x.added, ...x.removed],
        math: math(x.added.length, x.removed.length, counts.get(e)?.get(x.key)),
      })),
      ...e.eventsRemoved.map((x) => ({ ...x, tag: ' <span class="tag del">event removed</span>', body: '', teams: [] })),
    ].map((r) => ({ ...r, week: events[r.key]?.week })))}
  </section>`

const groups = (entries: Entry[]) =>
  [...new Set(entries.flatMap((e) => [...e.eventsAdded, ...e.changed, ...e.eventsRemoved].map((x) => x.group)))].sort(byGroup)

const renderSidebar = (entries: Entry[]) => `
<aside>
  <label class="label" for="team">Team</label>
  <input id="team" type="search" inputmode="numeric" placeholder="e.g. 254" autocomplete="off">
  <h4 class="label">Days</h4>
  <nav class="days">${entries.map((e) => `<a href="#${dayId(e.at)}">${shortDay(e.at)}</a>`).join('')}</nav>
  <h4 class="label">Districts</h4>
  <div class="chips">${groups(entries).map((g) => `<button type="button" data-group="${escape(g)}" aria-pressed="false">${escape(g)}</button>`).join('')}</div>
</aside>`

const render = (feed: Feed | null, state: State | null) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>2027 FRC Signup Deltas</title>
<meta name="description" content="Daily changes to team lists for official 2027 FRC events, from FIRST's FRC Events.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;600;700&display=swap">
<style>
  :root { --bg: #fff; --fg: #1a1a1a; --muted: #666; --line: #e5e5e5; --add: #1a7f37; --del: #cf222e; --hit: #fff3b0; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0d1117; --fg: #e6edf3; --muted: #8b949e; --line: #30363d; --add: #3fb950; --del: #f85149; --hit: #5a4a00; } }
  [hidden] { display: none !important; }
  body { margin: 0 auto; max-width: 1040px; padding: 24px 16px; background: var(--bg); color: var(--fg); font: 15px/1.5 "Albert Sans", system-ui, sans-serif; }
  h1 { font-size: 1.5rem; margin: 0; }
  .by { font-size: 0.95rem; font-weight: 400; color: var(--muted); }
  .by a { text-decoration: underline; }
  .meta { color: var(--muted); margin: 4px 0 0; }
  .layout { display: grid; grid-template-columns: 180px 1fr; gap: 40px; margin-top: 24px; }
  aside { position: sticky; top: 24px; align-self: start; display: flex; flex-direction: column; gap: 8px; }
  .label { font-size: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); margin: 12px 0 0; font-weight: 600; }
  .label:first-child { margin-top: 0; }
  input { font: inherit; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--fg); width: 100%; box-sizing: border-box; }
  .days { display: flex; flex-direction: column; gap: 2px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { font: inherit; font-size: 0.8rem; padding: 2px 8px; border: 1px solid var(--line); border-radius: 999px; background: none; color: var(--fg); cursor: pointer; }
  .chips button[aria-pressed="true"] { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  main { min-width: 0; }
  h2 { font-size: 1rem; margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--line); scroll-margin-top: 24px; }
  section + section h2 { margin-top: 32px; }
  h3 { font-size: 0.8rem; letter-spacing: 0.05em; color: var(--muted); margin: 16px 0 0; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { display: grid; grid-template-columns: 16rem 1fr auto; gap: 16px; padding: 6px 0; border-bottom: 1px solid var(--line); }
  .math { color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .math strong { color: var(--fg); }
  a { color: inherit; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .event { font-weight: 600; }
  .week { color: var(--muted); font-size: 0.7rem; margin-left: 2px; }
  .teams { font-variant-numeric: tabular-nums; word-spacing: 4px; }
  .add { color: var(--add); }
  .del { color: var(--del); }
  .hit { background: var(--hit); border-radius: 3px; }
  .tag { font-size: 0.75rem; color: var(--muted); border: 1px solid var(--line); border-radius: 4px; padding: 0 4px; margin-left: 6px; white-space: nowrap; }
  @media (max-width: 720px) {
    .layout { grid-template-columns: 1fr; gap: 16px; }
    aside { position: static; }
    .days { flex-direction: row; flex-wrap: wrap; gap: 4px 12px; }
    li { grid-template-columns: 1fr; gap: 0; }
  }
</style>
</head>
<body>
<h1>2027 FRC Signup Deltas <span class="by">by <a href="https://www.chiefdelphi.com/u/jtrv/summary">Justin</a></span></h1>
<p class="meta">Teams added to or dropped from official 2027 events on FRC Events, checked daily at 8pm Eastern.
${feed ? `Last checked <time id="last-run" datetime="${escape(feed.lastRun)}" title="${timestamp(feed.lastRun)}">${timestamp(feed.lastRun)}</time>.` : 'No data yet.'}</p>
<script>
  const t = document.getElementById('last-run')
  if (t) {
    const s = (Date.now() - new Date(t.dateTime)) / 1000
    t.textContent = s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'min ago' : s < 86400 ? Math.floor(s / 3600) + 'hr ago' : Math.floor(s / 86400) + 'd ago'
  }
</script>
${feed?.entries.length ? `<div class="layout">
${renderSidebar(feed.entries)}
<main>
${feed.entries.map(renderEntry(countsAfter(feed.entries, state), state?.events ?? {})).join('')}
<p id="empty" class="meta" hidden>No matching changes.</p>
</main>
</div>
<script>
  const input = document.getElementById('team')
  const picked = new Set()
  const apply = () => {
    const q = input.value.trim()
    document.querySelectorAll('main li').forEach((li) => (li.hidden = !!q && !li.dataset.teams.split(' ').includes(q)))
    document.querySelectorAll('.group').forEach((g) => (g.hidden = (picked.size > 0 && !picked.has(g.dataset.group)) || !g.querySelector('li:not([hidden])')))
    document.querySelectorAll('main section').forEach((s) => (s.hidden = !s.querySelector('.group:not([hidden])')))
    document.querySelectorAll('[data-team]').forEach((a) => a.classList.toggle('hit', a.dataset.team === q))
    document.getElementById('empty').hidden = !!document.querySelector('main section:not([hidden])')
  }
  input.addEventListener('input', apply)
  document.querySelectorAll('.chips button').forEach((b) =>
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true'
      b.setAttribute('aria-pressed', on)
      on ? picked.add(b.dataset.group) : picked.delete(b.dataset.group)
      apply()
    }),
  )
</script>` : '<p class="meta">No changes recorded yet.</p>'}
</body>
</html>`

export async function GET() {
  const [feed, state] = await Promise.all([readJson<Feed>('feed.json', true), readJson<State>('state.json', true)])
  return new Response(render(feed, state), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Vercel-Cache-Tag': 'feed',
    },
  })
}
