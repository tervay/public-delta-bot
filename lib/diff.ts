export type EventState = { name: string; group: string; week?: number | null; teams: string[] }

export type State = { takenAt: string; events: Record<string, EventState> }

export type Entry = {
  at: string
  eventsAdded: { key: string; name: string; group: string; teams: string[] }[]
  eventsRemoved: { key: string; name: string; group: string }[]
  changed: { key: string; name: string; group: string; added: string[]; removed: string[] }[]
}

export type Feed = { lastRun: string; entries: Entry[] }

const byTeamNumber = (a: string, b: string) => Number(a.slice(3)) - Number(b.slice(3))

const minus = (a: string[], b: string[]) => {
  const exclude = new Set(b)
  return a.filter((x) => !exclude.has(x)).sort(byTeamNumber)
}

export function diff(prev: State, next: State): Entry | null {
  const keys = (s: State) => Object.keys(s.events).sort()

  const eventsAdded = keys(next)
    .filter((key) => !prev.events[key])
    .map((key) => {
      const { name, group, teams } = next.events[key]
      return { key, name, group, teams: [...teams].sort(byTeamNumber) }
    })

  const eventsRemoved = keys(prev)
    .filter((key) => !next.events[key])
    .map((key) => ({ key, name: prev.events[key].name, group: prev.events[key].group }))

  const changed = keys(next)
    .filter((key) => prev.events[key])
    .map((key) => ({
      key,
      name: next.events[key].name,
      group: next.events[key].group,
      added: minus(next.events[key].teams, prev.events[key].teams),
      removed: minus(prev.events[key].teams, next.events[key].teams),
    }))
    .filter((c) => c.added.length || c.removed.length)

  if (!eventsAdded.length && !eventsRemoved.length && !changed.length) return null
  return { at: next.takenAt, eventsAdded, eventsRemoved, changed }
}
