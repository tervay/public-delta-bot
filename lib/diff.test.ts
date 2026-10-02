import { describe, expect, it } from 'vitest'
import { diff, type State } from './diff.js'

const state = (events: State['events'], takenAt = '2026-10-02T10:00:00.000Z'): State => ({ takenAt, events })

describe('diff', () => {
  it('returns null when nothing changed', () => {
    const s = state({ '2027casf': { name: 'SF', teams: ['frc254', 'frc1678'] } })
    expect(diff(s, s)).toBeNull()
  })

  it('reports added and removed teams sorted by number', () => {
    const prev = state({ '2027casf': { name: 'SF', teams: ['frc254', 'frc971'] } })
    const next = state({ '2027casf': { name: 'SF', teams: ['frc1678', 'frc254', 'frc8'] } })
    expect(diff(prev, next)?.changed).toEqual([
      { key: '2027casf', name: 'SF', added: ['frc8', 'frc1678'], removed: ['frc971'] },
    ])
  })

  it('reports new events with their teams', () => {
    const prev = state({})
    const next = state({ '2027txhou': { name: 'Houston', teams: ['frc118', 'frc16'] } })
    const entry = diff(prev, next)
    expect(entry?.eventsAdded).toEqual([{ key: '2027txhou', name: 'Houston', teams: ['frc16', 'frc118'] }])
    expect(entry?.changed).toEqual([])
  })

  it('reports removed events', () => {
    const prev = state({ '2027old': { name: 'Old', teams: ['frc1'] } })
    const entry = diff(prev, state({}))
    expect(entry?.eventsRemoved).toEqual([{ key: '2027old', name: 'Old' }])
  })

  it('stamps the entry with the new snapshot time', () => {
    const prev = state({ e: { name: 'E', teams: [] } })
    const next = state({ e: { name: 'E', teams: ['frc1'] } }, '2026-10-03T10:00:00.000Z')
    expect(diff(prev, next)?.at).toBe('2026-10-03T10:00:00.000Z')
  })
})
