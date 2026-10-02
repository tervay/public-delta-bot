import type { Entry, Feed } from '../lib/diff.js'
import { readJson } from '../lib/store.js'

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const team = (key: string) => key.slice(3)

const teams = (keys: string[], sign: '+' | '−', cls: string) =>
  keys.map((k) => `<a class="${cls}" href="https://www.thebluealliance.com/team/${team(k)}/2027">${sign}${team(k)}</a>`).join(' ')

const event = (key: string, name: string, tag: string, body: string) => `
  <li>
    <a class="event" href="https://www.thebluealliance.com/event/${escape(key)}">${escape(name)}</a>${tag}
    <div class="teams">${body}</div>
  </li>`

const renderEntry = (e: Entry) => `
  <section>
    <h2>${new Date(e.at).toUTCString().slice(0, 16)}</h2>
    <ul>
      ${e.eventsAdded.map((x) => event(x.key, x.name, ' <span class="tag">new event</span>', teams(x.teams, '+', 'add'))).join('')}
      ${e.changed.map((x) => event(x.key, x.name, '', `${teams(x.added, '+', 'add')} ${teams(x.removed, '−', 'del')}`)).join('')}
      ${e.eventsRemoved.map((x) => event(x.key, x.name, ' <span class="tag del">event removed</span>', '')).join('')}
    </ul>
  </section>`

const render = (feed: Feed | null) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>2027 FRC Signup Deltas</title>
<meta name="description" content="Daily changes to team lists for official 2027 FRC events, from The Blue Alliance.">
<style>
  :root { --bg: #fff; --fg: #1a1a1a; --muted: #666; --line: #e5e5e5; --add: #1a7f37; --del: #cf222e; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0d1117; --fg: #e6edf3; --muted: #8b949e; --line: #30363d; --add: #3fb950; --del: #f85149; } }
  body { margin: 0 auto; max-width: 760px; padding: 24px 16px; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; }
  h1 { font-size: 1.5rem; margin: 0; }
  h2 { font-size: 1rem; margin: 32px 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--line); }
  .meta { color: var(--muted); margin: 4px 0 0; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { padding: 8px 0; border-bottom: 1px solid var(--line); }
  a { color: inherit; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .event { font-weight: 600; }
  .teams { font-variant-numeric: tabular-nums; word-spacing: 4px; }
  .add { color: var(--add); }
  .del { color: var(--del); }
  .tag { font-size: 0.75rem; color: var(--muted); border: 1px solid var(--line); border-radius: 4px; padding: 0 4px; margin-left: 6px; }
</style>
</head>
<body>
<h1>2027 FRC Signup Deltas</h1>
<p class="meta">Teams added to or dropped from official 2027 events on The Blue Alliance.
${feed ? `Last checked <time id="last-run" datetime="${escape(feed.lastRun)}" title="${escape(new Date(feed.lastRun).toUTCString())}">${escape(new Date(feed.lastRun).toUTCString())}</time>.` : 'No data yet.'}</p>
<script>
  const t = document.getElementById('last-run')
  if (t) {
    const s = (Date.now() - new Date(t.dateTime)) / 1000
    t.textContent = s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'min ago' : s < 86400 ? Math.floor(s / 3600) + 'hr ago' : Math.floor(s / 86400) + 'd ago'
  }
</script>
${feed?.entries.length ? feed.entries.map(renderEntry).join('') : '<p class="meta">No changes recorded yet.</p>'}
</body>
</html>`

export async function GET() {
  const feed = await readJson<Feed>('feed.json')
  return new Response(render(feed), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
