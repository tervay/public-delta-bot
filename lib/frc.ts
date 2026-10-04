const BASE = 'https://frc-api.firstinspires.org/v3.0'

type TeamsPage = { teams: { teamNumber: number }[]; pageCurrent: number; pageTotal: number }

async function frc<T>(path: string): Promise<T> {
  const { FRC_API_USERNAME: user, FRC_API_TOKEN: token } = process.env
  if (!user || !token) throw new Error('FRC_API_USERNAME and FRC_API_TOKEN must be set')
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Basic ${btoa(`${user}:${token}`)}` } })
  if (!res.ok) throw new Error(`FRC ${path} returned ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchTeamKeys(year: number, eventCode: string) {
  const keys: string[] = []
  for (let page = 1, total = 1; page <= total; page++) {
    const res = await frc<TeamsPage>(`/${year}/teams?eventCode=${eventCode}&page=${page}`)
    keys.push(...res.teams.map((t) => `frc${t.teamNumber}`))
    total = res.pageTotal
  }
  return keys
}
